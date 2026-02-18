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
            // Validate basic fields
            if (!productName || !description || !category) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'Product name, description, and category are required',
                    isError: true
                });
            }

            // Validate description length
            if (description.trim().length < 10 || description.trim().length > 1000) {
                const categories = await Category.find({ isListed: true });
                return res.render('admin/addProduct', {
                    categories,
                    admin: req.session.admin,
                    message: 'Description must be between 10 and 1000 characters',
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

                // Validate sale price <= regular price
                if (parseFloat(salePrice) > parseFloat(regularPrice)) {
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

                if (variantImages.length === 0) {
                  
                    await Product.findByIdAndDelete(product._id);
                    await Variant.deleteMany({ productId: product._id });
                    const categories = await Category.find({ isListed: true });
                    return res.render('admin/addProduct', {
                        categories,
                        admin: req.session.admin,
                        message: `Variant ${parseInt(index) + 1}: At least one image is required`,
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
                    // Validate sale price <= regular price
                    if (parseFloat(salePrice) > parseFloat(regularPrice)) {
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
                    variant.quantity = parseInt(quantity);
                    variant.regularPrice = parseFloat(regularPrice);
                    variant.salePrice = parseFloat(salePrice);
                    
                    // Handle removed images
                    if (removedImages && removedImages.trim() !== '') {
                        const imagesToRemove = removedImages.split(',').map(img => img.trim());
                        variant.images = variant.images.filter(img => !imagesToRemove.includes(img));
                    }
                    
                    // Handle new images added to existing variant
                    if (existingVariantFilesMap[variantId] && existingVariantFilesMap[variantId].length > 0) {
                        variant.images = [...variant.images, ...existingVariantFilesMap[variantId]];
                    }
                    
                    // Validate that variant has at least one image
                    if (variant.images.length === 0) {
                        const categories = await Category.find({ isListed: true });
                        return res.render('admin/editProduct', {
                            product,
                            categories,
                            admin: req.session.admin,
                            message: `Variant "${color}" must have at least one image`,
                            isError: true
                        });
                    }
                    
                    await variant.save();
                    variantIds.push(variant._id);
                    totalQuantity += parseInt(quantity);
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

                // Validate sale price <= regular price
                if (parseFloat(salePrice) > parseFloat(regularPrice)) {
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

                if (variantImages.length === 0) {
                    continue; // Skip variants without images
                }

                const variant = new Variant({
                    productId: product._id,
                    color,
                    quantity: parseInt(quantity),
                    regularPrice: parseFloat(regularPrice),
                    salePrice: parseFloat(salePrice),
                    images: variantImages
                });

                await variant.save();
                variantIds.push(variant._id);
                totalQuantity += parseInt(quantity);
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