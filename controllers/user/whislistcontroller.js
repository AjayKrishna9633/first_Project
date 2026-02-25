import Wishlist from '../../models/wishlist.js';
import Product from '../../models/porductsModal.js';
import { WISHLIST_MESSAGES, PRODUCT_MESSAGES, CART_MESSAGES } from '../../constants/messages.js';



const addToWishlist = async(req,res)=>{
    try{
        const userId = req.session.user.id;
        const { productId } = req.body;

        const product = await Product.findById(productId).populate('category');
        if(!product){
            return res.json({
                success:false,
                message:PRODUCT_MESSAGES.PRODUCT_NOT_FOUND 
            })
        }

        if (!product.category || !product.category.isListed) {
            return res.json({
                success: false,
                message: 'Product not available'
            });
        }

        let wishlist = await Wishlist.findOne({userId});
        
        if (!wishlist) {
            wishlist = new Wishlist({ userId, products: [] });
        }

        const existingIndex = wishlist.products.findIndex(
            item => item.productId.toString() === productId
        );

        if(existingIndex > -1){
            // Remove from wishlist if already exists
            wishlist.products.splice(existingIndex, 1);
            await wishlist.save();
            
            return res.json({ 
                success: true, 
                action: 'removed',
                message: WISHLIST_MESSAGES.REMOVED_FROM_WISHLIST,
                wishlistCount: wishlist.products.length 
            });
        } else {
            // Add to wishlist
            wishlist.products.push({productId});
            await wishlist.save();

            return res.json({ 
                success: true, 
                action: 'added',
                message: WISHLIST_MESSAGES.ADDED_TO_WISHLIST,
                wishlistCount: wishlist.products.length 
            });
        }

    }catch(error){
        console.error('Add to wishlist error:', error);
        res.json({ success: false, message: WISHLIST_MESSAGES.WISHLIST_UPDATE_FAILED });
    }
}

const getWishlist = async(req,res)=>{
    try{
        const userId = req.session.user.id;
const page = parseInt(req.query.page)||1;
const limit = 10;
const skip = (page-1)*limit;
        const wishlist = await Wishlist.findOne({userId})
            .populate({
                path: 'products.productId',
                populate: { path: 'variants category' }
            });
            if(!wishlist){
                return res.render('user/wishlist', {
                    wishlist: {products:[]},
                    totalPages:0,
                    currentPage:page,
                    totalProducts:0,
                    user: req.session.user
                });
            }

            wishlist.products = wishlist.products.filter(item => {
                const product = item.productId;
                return product && !product.IsBlocked && product.category && product.category.isListed;
            });

            // Add stock status to each wishlist item
            wishlist.products.forEach(item => {
                if (item.productId && item.productId.variants) {
                    const totalStock = item.productId.variants.reduce((sum, v) => sum + v.quantity, 0);
                    item.isOutOfStock = totalStock === 0;
                    item.totalStock = totalStock;
                }
            });

            const totalProducts =wishlist.products.length;
            const totalPages= Math.ceil(totalProducts/10);
            const paginatedProducts= wishlist.products.slice(skip,skip+limit)
        res.render('user/wishlist', {
            wishlist: {products:paginatedProducts} || { products: [] },
            totalPages,
            currentPage:page,
            totalProducts,
            user: req.session.user
        });

    }catch(error){
        console.error('Get wishlist error:', error);
        res.redirect('/');
    }
}
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId } = req.body;

        const wishlist = await Wishlist.findOne({ userId });
        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );
        await wishlist.save();

        res.json({ success: true, message: WISHLIST_MESSAGES.REMOVED_FROM_WISHLIST });

    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.json({ success: false, message: WISHLIST_MESSAGES.WISHLIST_REMOVE_FAILED });
    }
};




const moveToCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId } = req.body;

        // Get product and variant details
        const product = await Product.findById(productId).populate('variants');
        if (!product) {
            return res.json({
                success: false,
                message: PRODUCT_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.json({
                success: false,
                message: PRODUCT_MESSAGES.VARIANT_NOT_FOUND
            });
        }

        if (variant.quantity === 0) {
            return res.json({
                success: false,
                message: PRODUCT_MESSAGES.OUT_OF_STOCK
            });
        }

        
        const Cart = (await import('../../models/cartSchema.js')).default;
        
        let cart = await Cart.findOne({ userId });
        
        if (!cart) {
            cart = new Cart({
                userId,
                items: [{
                    productId,
                    variantId,
                    quantity: 1,
                    price: variant.salePrice,
                    totalPrice: variant.salePrice
                }]
            });
        } else {
            const existingItemIndex = cart.items.findIndex(
                item => item.productId.toString() === productId && 
                        item.variantId.toString() === variantId
            );

            if (existingItemIndex > -1) {
                // Increase quantity if already in cart
                const newQuantity = cart.items[existingItemIndex].quantity + 1;
                
                if (newQuantity > 3) {
                    return res.json({
                        success: false,
                        message: PRODUCT_MESSAGES.MAX_QUANTITY_EXCEEDED
                    });
                }

                if (newQuantity > variant.quantity) {
                    return res.json({
                        success: false,
                        message: `Only ${variant.quantity} items available in stock`
                    });
                }
                
                cart.items[existingItemIndex].quantity = newQuantity;
                cart.items[existingItemIndex].totalPrice = variant.salePrice * newQuantity;
            } else {
                cart.items.push({
                    productId,
                    variantId,
                    quantity: 1,
                    price: variant.salePrice,
                    totalPrice: variant.salePrice
                });
            }
        }

        await cart.save();

        // Remove from wishlist
        await Wishlist.findOneAndUpdate(
            { userId },
            { $pull: { products: { productId: productId } } }
        );

        res.json({ 
            success: true, 
            message: WISHLIST_MESSAGES.MOVED_TO_CART 
        });

    } catch (error) {
        console.error('Move to cart error:', error);
        res.json({ success: false, message: WISHLIST_MESSAGES.MOVE_TO_CART_FAILED });
    }
};

export default {
    addToWishlist,
    getWishlist,
    removeFromWishlist,
    moveToCart
};
