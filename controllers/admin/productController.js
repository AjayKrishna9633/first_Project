import Product from "../../models/porductsModal.js";
import Category from '../../models/categoryModel.js';


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
    .sort({createdAt:-1})
    .skip(skip)
    .limit(limit);


    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts/limit);

    const categories = await Category.find({isListed:true})

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
    const addProduct= async(req,res)=>{

        try{
           const{
            productName,
            description,
            category,
            regularPrice,
            salePrice,
            quantity,
            color
           }=req.body;


           if(!productName || !description||!category || !regularPrice||!quantity){
            const categories = await Category.find({isListed:true})

                return res.render('admin/addProduct',{
                    categories,
                    admin:req.session.admin,
                    message:'All fields are required',
                    isError:true
                });
           }


           // Get Cloudinary URLs from uploaded files
           const productImages = req.files ? req.files.map(file => file.path) : [];

           if(productImages.length === 0){
            const categories = await Category.find({isListed:true})
                return res.render('admin/addProduct',{
                    categories,
                    admin:req.session.admin,
                    message:'At least one product image is required',
                    isError:true
                });
           }

           const product = new Product({
            productName,
            description,
            category,
            regularPrice,
            salePrice,
            quantity,
            color,
            productImage: productImages,
            status:quantity>0?'Available':'Out Of Stock'

           });
           await product.save();

           res.redirect('/admin/products');

        }catch(error){
            console.log('Error in addProduct:', error);
            console.log('Error message:', error.message);
            console.log('Files received:', req.files);
            const categories = await Category.find({isListed:true});

            res.render('admin/addProduct',{
                categories,
                admin:req.session.admin,
               message:"Failed to add product: " + error.message,
                isError:true
            });
        }
};









const getEditProductPage = async(req,res)=>{
    try {

        const productId =req.params.id;
        const product = await Product.findById(productId);
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


const updateProduct = async (req,res)=>{
    try{
        const productId= req.params.id;
        const {
            productName,
            description,
            category,
            regularPrice,
            salePrice,
            quantity,
            color
        }=req.body;

        const product = await Product.findById(productId);


        if(!product){
            return  res.redirect('/admin/products')

        }

        product.productName = productName;
        product.description= description;
        product.category= category;
        product.regularPrice = regularPrice;
        product.salePrice= salePrice;
        product.quantity= quantity;
        product.color=color
        product.status= quantity>0?'Available':'Out Of Stock'


        // Add new Cloudinary images if uploaded
        if(req.files && req.files.length >0){
            const newImages = req.files.map(file=>file.path);
            product.productImage = [...product.productImage,...newImages]
        }


        await product.save();

        res.redirect('/admin/products');

    }catch(error){
        console.log('error in updating product',error)
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


    const deleteProduct = async(req,res)=>{
        try{
            const productId =req.params.id;
            await Product.findByIdAndDelete(productId);

            res.json({success:true, message:'product is deleted'})
        }catch(error){
            console.log('Error in deletePorduct:',error);
            res.json({success:false, message:'failed to add product'})
        }
    }



    export default {
        getAddProduct,
        getProduct,
        addProduct,
        getEditProductPage,
        updateProduct,
        deleteProduct,
        toggleBlockProduct,

    }