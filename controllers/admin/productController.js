import Product from "../../models/porductsModal.js";
import Category from '../../models/categoryModel.js';
import Variant from '../../models/variantModel.js';


const getProduct = async (req,res)=>{
try{
    const page = parseInt(req.query.page)||1;
    const limit = 10;
    const skip = (page-1)*limit;

    const search = req.query.search||"";
    const categoryFilter = req.query.category||"";
    
    let query = {};

    if(search){
        query.productName =  {$regex:search,$options:'i'}
    }

    if(categoryFilter && categoryFilter!=='all'){
        query.category= categoryFilter;
    }


    const product =await Product.find(query)
    .populate('category','name')
    .populate('variants') 
    .sort({createdAt:-1})
    .skip(skip)
    .limit(limit);

    // Update product status based on variant quantities
    for (const prod of product) {
        if (prod.variants && prod.variants.length > 0) {
            const totalStock = prod.variants.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
            const newStatus = totalStock > 0 ? 'Available' : 'Out of Stock';
            
            // Only update if status has changed
            if (prod.status !== newStatus) {
                prod.status = newStatus;
                await prod.save();
            }
        }
    }

console.log(product)
// const products = product.filter(v=>)

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts/limit);

    const categories = await Category.find({isListed:true},{name:"keyboard"})

     res.render('admin/products',{
        product,
        categories,
        currentPage:page,
        totalPages,
        search,
        selectedCategory:categoryFilter,
        admin:req.session.admin
     });


}catch(error){
console.log(error);

res.redirect('/admin/dashboard');
}
};

const getAddProduct = async(req,res)=>{
    try {
        const categories = await Category.find({isListed:true});

        res.render('admin/addProduct',{
            categories,
            admin:req.session.admin,
            message:null,
            isError:false
        });

    }catch(error){
        console.log(error);
        res.redirect('/admin/dashboard')
    }


}
    const addProduct = async (req, res) => {
        try {
            const { productName, description, category, variants } = req.body;

            console.log(variants)
            
            // Validate product name
            if (!productName || productName.trim().length < 3 || productName.trim().length > 100) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'Product name must be between 3 and 100 characters',
                    isError: true
                });
            }
            
            // Validate description
            if (!description || description.trim().length < 10 || description.trim().length > 1000) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'Description must be between 10 and 1000 characters',
                    isError: true
                });
            }
            
            // Validate category
            if (!category) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'Please select a category',
                    isError: true
                });
            }

            // Validate variants data
            if (!variants || Object.keys(variants).length === 0) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'At least one variant is required',
                    isError: true
                });
            }

            // Check if files are uploaded
            if (!req.files || req.files.length === 0) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'At least one image per variant is required',
                    isError: true
                });
            }

            const product = new Product({
                productName,
                description,
                category,
                status: 'Available',
                variants: []
            });

            await product.save();

            // Step 2: Process variants and create variant documents
            const variantIds = [];
            let totalQuantity = 0;

            // Get all uploaded files
            const uploadedFiles = req.files;
            
            // Group files by variant index (based on field name)
            const variantFilesMap = {};
            uploadedFiles.forEach(file => {
                // Extract variant index from fieldname: variants[0][images]
                const match = file.fieldname.match(/variants\[(\d+)\]\[images\]/);
                if (match) {
                    const variantIndex = match[1];
                    if (!variantFilesMap[variantIndex]) {
                        variantFilesMap[variantIndex] = [];
                    }
                    variantFilesMap[variantIndex].push(file.path);
                }
            });

            // Loop through each variant
            for (const [index, variantData] of Object.entries(variants)) {
                const { color, quantity, regularPrice, salePrice } = variantData;

                // Validate variant data
                if (!color || !quantity || !regularPrice || !salePrice) {
                    // Rollback: delete the created product
                    await Product.findByIdAndDelete(product._id);
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: All fields are required`,
                        isError: true
                    });
                }

                // Validate color is not just special characters
                if (color.trim().length < 2 || /^[-_\s!@#$%^&*()+=\[\]{};:'",.<>?\/\\|`~]+$/.test(color.trim())) {
                    // Rollback: delete the created product
                    await Product.findByIdAndDelete(product._id);
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Invalid color "${color}". Please enter a proper color name (e.g., Black, White, Red)`,
                        isError: true
                    });
                }
                
                // Validate stock quantity
                const parsedQuantity = parseInt(quantity);
                if (isNaN(parsedQuantity) || parsedQuantity < 0 || parsedQuantity > 10000) {
                    // Rollback: delete the created product
                    await Product.findByIdAndDelete(product._id);
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Stock quantity must be between 0 and 10000`,
                        isError: true
                    });
                }
                
                // Validate regular price
                const parsedRegularPrice = parseFloat(regularPrice);
                if (isNaN(parsedRegularPrice) || parsedRegularPrice <= 0 || parsedRegularPrice > 1000000) {
                    // Rollback: delete the created product
                    await Product.findByIdAndDelete(product._id);
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Regular price must be between 1 and 1000000`,
                        isError: true
                    });
                }
                
                // Validate sale price
                const parsedSalePrice = parseFloat(salePrice);
                if (isNaN(parsedSalePrice) || parsedSalePrice <= 0 || parsedSalePrice > 1000000) {
                    // Rollback: delete the created product
                    await Product.findByIdAndDelete(product._id);
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Sale price must be between 1 and 1000000`,
                        isError: true
                    });
                }

                // Validate sale price <= regular price
                if (parsedSalePrice > parsedRegularPrice) {
                    // Rollback: delete the created product
                    await Product.findByIdAndDelete(product._id);
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Sale price (₹${salePrice}) cannot be greater than regular price (₹${regularPrice})`,
                        isError: true
                    });
                }

               
                const variantImages = variantFilesMap[index] || [];

                // Validate minimum 3 images per variant
                if (variantImages.length < 3) {
                    await Product.findByIdAndDelete(product._id);
                    await Variant.deleteMany({ productId: product._id });
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Minimum 3 images required (currently: ${variantImages.length})`,
                        isError: true
                    });
                }
                
                // Validate maximum 5 images per variant
                if (variantImages.length > 5) {
                    await Product.findByIdAndDelete(product._id);
                    await Variant.deleteMany({ productId: product._id });
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: Maximum 5 images allowed (currently: ${variantImages.length})`,
                        isError: true
                    });
                }

                // Step 3: Create variant document
                const variant = new Variant({
                    productId: product._id,
                    color,
                    quantity: parseInt(quantity),
                    regularPrice: parseFloat(regularPrice),
                    salePrice: parseFloat(salePrice),
                    images: variantImages
                });

                await variant.save();

                // Step 4: Push variant _id to array
                variantIds.push(variant._id);
                totalQuantity += parseInt(quantity);
            }

            // Step 5: Update product with variant references and total quantity
            product.variants = variantIds;
            product.quantity = totalQuantity;
            product.status = totalQuantity > 0 ? 'Available' : 'Out of Stock';

            await product.save();

            res.redirect('/admin/products');

        } catch (error) {
            console.log('Error in addProduct:', error);
            console.log('Error message:', error.message);
            console.log('Request body:', req.body);
            console.log('Files received:', req.files);
            
            const categories = await Category.find({ isListed: true });
            res.render('admin/addProduct', {
                categories,
                admin: req.session.admin,
                message: "Failed to add product: " + error.message,
                isError: true
            });
        }
    };









const getEditProductPage = async(req,res)=>{
    try {

        const productId =req.params.id;
        const product = await Product.findById(productId)
            .populate('category')
            .populate('variants'); // Populate variants for editing
        const categories = await Category.find({isListed:true});

        if(!product){
            return res.redirect('/admin/products');
        }

        res.render("admin/editProduct",{
            product,
            categories,
            admin: req.session.admin,
            message:null,
            isError:false
        })



    }catch (error){
        console.log('Get product page',error);
        res.redirect('/admin/product');
    }
};


const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, description, category, variants, existingVariants, deletedVariants } = req.body;

        const product = await Product.findById(productId).populate('variants');

        if (!product) {
            return res.redirect('/admin/products');
        }

        // Validate product name
        if (!productName || productName.trim().length < 3 || productName.trim().length > 100) {
            const categories = await Category.find({ isListed: true });
            return res.render('admin/editProduct', {
                product,
                categories,
                admin: req.session.admin,
                message: 'Product name must be between 3 and 100 characters',
                isError: true
            });
        }
        
        // Validate description
        if (!description || description.trim().length < 10 || description.trim().length > 1000) {
            const categories = await Category.find({ isListed: true });
            return res.render('admin/editProduct', {
                product,
                categories,
                admin: req.session.admin,
                message: 'Description must be between 10 and 1000 characters',
                isError: true
            });
        }
        
        // Validate category
        if (!category) {
            const categories = await Category.find({ isListed: true });
            return res.render('admin/editProduct', {
                product,
                categories,
                admin: req.session.admin,
                message: 'Please select a category',
                isError: true
            });
        }

        // Update basic product info
        product.productName = productName;
        product.description = description;
        product.category = category;

        // Handle deleted variants
        if (deletedVariants) {
            const deletedIds = Array.isArray(deletedVariants) ? deletedVariants : [deletedVariants];
            for (const variantId of deletedIds) {
                await Variant.findByIdAndDelete(variantId);
                product.variants = product.variants.filter(v => v.toString() !== variantId);
            }
        }

        // Group uploaded files by variant index and type (new variants vs existing variants)
        const variantFilesMap = {};
        const existingVariantFilesMap = {};
        
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                // Check for new variant images: variants[0][images]
                const newVariantMatch = file.fieldname.match(/variants\[(\d+)\]\[images\]/);
                if (newVariantMatch) {
                    const variantIndex = newVariantMatch[1];
                    if (!variantFilesMap[variantIndex]) {
                        variantFilesMap[variantIndex] = [];
                    }
                    variantFilesMap[variantIndex].push(file.path);
                }
                
                // Check for existing variant new images: existingVariants[variantId][newImages]
                const existingVariantMatch = file.fieldname.match(/existingVariants\[([^\]]+)\]\[newImages\]/);
                if (existingVariantMatch) {
                    const variantId = existingVariantMatch[1];
                    if (!existingVariantFilesMap[variantId]) {
                        existingVariantFilesMap[variantId] = [];
                    }
                    existingVariantFilesMap[variantId].push(file.path);
                }
            });
        }

        let totalQuantity = 0;
        const variantIds = [];

        // Handle existing variants (updates)
        if (existingVariants) {
            for (const [variantId, variantData] of Object.entries(existingVariants)) {
                const { color, quantity, regularPrice, salePrice, removedImages } = variantData;
                
                const variant = await Variant.findById(variantId);
                if (variant) {
                    // Validate color is not just special characters
                    if (color.trim().length < 2 || /^[-_\s!@#$%^&*()+=\[\]{};:'",.<>?\/\\|`~]+$/.test(color.trim())) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant: Invalid color "${color}". Please enter a proper color name (e.g., Black, White, Red)`,
                            isError: true
                        });
                    }
                    
                    // Validate stock quantity
                    const parsedQuantity = parseInt(quantity);
                    if (isNaN(parsedQuantity) || parsedQuantity < 0 || parsedQuantity > 10000) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}": Stock quantity must be between 0 and 10000`,
                            isError: true
                        });
                    }
                    
                    // Validate regular price
                    const parsedRegularPrice = parseFloat(regularPrice);
                    if (isNaN(parsedRegularPrice) || parsedRegularPrice <= 0 || parsedRegularPrice > 1000000) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}": Regular price must be between 1 and 1000000`,
                            isError: true
                        });
                    }
                    
                    // Validate sale price
                    const parsedSalePrice = parseFloat(salePrice);
                    if (isNaN(parsedSalePrice) || parsedSalePrice <= 0 || parsedSalePrice > 1000000) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}": Sale price must be between 1 and 1000000`,
                            isError: true
                        });
                    }
                    
                    // Validate sale price <= regular price
                    if (parsedSalePrice > parsedRegularPrice) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}": Sale price (₹${salePrice}) cannot be greater than regular price (₹${regularPrice})`,
                            isError: true
                        });
                    }
                    
                    variant.color = color;
                    variant.quantity = parsedQuantity;
                    variant.regularPrice = parsedRegularPrice;
                    variant.salePrice = parsedSalePrice;
                    
                    // Handle removed images
                    if (removedImages && removedImages.trim() !== '') {
                        const imagesToRemove = removedImages.split(',').map(img => img.trim());
                        variant.images = variant.images.filter(img => !imagesToRemove.includes(img));
                    }
                    
                    // Handle new images added to existing variant
                    if (existingVariantFilesMap[variantId] && existingVariantFilesMap[variantId].length > 0) {
                        variant.images = [...variant.images, ...existingVariantFilesMap[variantId]];
                    }
                    
                    // Validate minimum 3 images (after adding new and removing old)
                    if (variant.images.length < 3) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}": Minimum 3 images required. Currently has ${variant.images.length} image(s). Please add ${3 - variant.images.length} more image(s).`,
                            isError: true
                        });
                    }
                    
                    // Validate maximum 5 images (after adding new and removing old)
                    if (variant.images.length > 5) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}": Maximum 5 images allowed. Currently has ${variant.images.length} image(s). Please remove ${variant.images.length - 5} image(s).`,
                            isError: true
                        });
                    }
                    
                    await variant.save();
                    variantIds.push(variant._id);
                    totalQuantity += parsedQuantity;
                }
            }
        }

        // Handle new variants
        if (variants) {
            for (const [index, variantData] of Object.entries(variants)) {
                const { color, quantity, regularPrice, salePrice } = variantData;

                if (!color || !quantity || !regularPrice || !salePrice) {
                    continue; // Skip incomplete variants
                }

                // Validate color is not just special characters
                if (color.trim().length < 2 || /^[-_\s!@#$%^&*()+=\[\]{};:'",.<>?\/\\|`~]+$/.test(color.trim())) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant: Invalid color "${color}". Please enter a proper color name (e.g., Black, White, Red)`,
                        isError: true
                    });
                }
                
                // Validate stock quantity
                const parsedQuantity = parseInt(quantity);
                if (isNaN(parsedQuantity) || parsedQuantity < 0 || parsedQuantity > 10000) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant "${color}": Stock quantity must be between 0 and 10000`,
                        isError: true
                    });
                }
                
                // Validate regular price
                const parsedRegularPrice = parseFloat(regularPrice);
                if (isNaN(parsedRegularPrice) || parsedRegularPrice <= 0 || parsedRegularPrice > 1000000) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant "${color}": Regular price must be between 1 and 1000000`,
                        isError: true
                    });
                }
                
                // Validate sale price
                const parsedSalePrice = parseFloat(salePrice);
                if (isNaN(parsedSalePrice) || parsedSalePrice <= 0 || parsedSalePrice > 1000000) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant "${color}": Sale price must be between 1 and 1000000`,
                        isError: true
                    });
                }

                // Validate sale price <= regular price
                if (parsedSalePrice > parsedRegularPrice) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant "${color}": Sale price (₹${salePrice}) cannot be greater than regular price (₹${regularPrice})`,
                        isError: true
                    });
                }

                const variantImages = variantFilesMap[index] || [];

                // Validate minimum 3 images
                if (variantImages.length < 3) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant "${color}": Minimum 3 images required (currently: ${variantImages.length})`,
                        isError: true
                    });
                }
                
                // Validate maximum 5 images
                if (variantImages.length > 5) {
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/editProduct', {
                        product,
                        categories,
                        admin: req.session.admin,
                        message: `New Variant "${color}": Maximum 5 images allowed (currently: ${variantImages.length})`,
                        isError: true
                    });
                }

                const variant = new Variant({
                    productId: product._id,
                    color,
                    quantity: parsedQuantity,
                    regularPrice: parsedRegularPrice,
                    salePrice: parsedSalePrice,
                    images: variantImages
                });

                await variant.save();
                variantIds.push(variant._id);
                totalQuantity += parsedQuantity;
            }
        }

        // Update product with variant references and total quantity
        product.variants = variantIds;
        product.quantity = totalQuantity;
        product.status = totalQuantity > 0 ? 'Available' : 'Out of Stock';

        await product.save();

        res.redirect('/admin/products');

    } catch (error) {
        console.log('error in updating product', error);
        res.redirect('/admin/products');
    }
}


    const toggleBlockProduct = async(req,res)=>{
        try{

            const productId = req.params.id;
            const product = await Product.findById(productId);

            if(!product){
                return res.json({success :false,message:'product not found'})
            }

            product.IsBlocked = !product.IsBlocked;
            await product.save();

            res.json({
                success:true,
                isBlocked:product.IsBlocked,
                message:product.IsBlocked?'Product blocked' : 'Product unblocked'
            })


        }catch(error){
            console.log('error in toggleBlockProduct',error)
        }
    }


    // const deleteProduct = async(req,res)=>{
    //     try{
    //         const productId =req.params.id;
    //         await Product.findByIdAndDelete(productId);

    //         res.json({success:true, message:'product is deleted'})
    //     }catch(error){
    //         console.log('Error in deletePorduct:',error);
    //         res.json({success:false, message:'failed to add product'})
    //     }
    // }



    export default {
        getAddProduct,
        getProduct,
        addProduct,
        getEditProductPage,
        updateProduct,
        // deleteProduct,
        toggleBlockProduct,

    }