
import Cart from '../../models/cartSchema.js';
import Product from "../../models/porductsModal.js";
import Wishlist from "../../models/wishlist.js";

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId, quantity } = req.body;

        if (!productId || !variantId || !quantity) {
            return res.json({
                success: false,
                message: 'Missing fields'
            });
        }

        // Validate quantity limit
        if (quantity > 3) {
            return res.json({
                success: false,
                message: 'Maximum 3 units allowed per product'
            });
        }

        const product = await Product.findById(productId).populate('variants');

        if (!product || product.IsBlocked) {
            return res.json({
                success: false,
                message: 'Product not available'
            });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);

        if (!variant) {
            return res.json({
                success: false,
                message: 'Variant not found'
            });
        }

        if (variant.quantity < quantity) {
            return res.json({
                success: false,
                message: `Only ${variant.quantity} items available`
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: []
            });
        }

        // Check if cart already has 3 different products
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (existingItemIndex === -1) {
            // New product - check if cart already has 3 different products
            if (cart.items.length >= 3) {
                return res.json({
                    success: false,
                    message: 'Maximum 3 different products allowed in cart'
                });
            }

            // Add new item
            cart.items.push({
                productId,
                variantId,
                quantity: parseInt(quantity),
                price: variant.salePrice,
                totalPrice: variant.salePrice * parseInt(quantity)
            });
        } else {
            // Update existing item
            const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
            
            // Check quantity limit
            if (newQuantity > 3) {
                return res.json({
                    success: false,
                    message: 'Maximum 3 units allowed per product. You already have some in cart.'
                });
            }

            if (newQuantity > variant.quantity) {
                return res.json({
                    success: false,
                    message: `Only ${variant.quantity} items available`
                });
            }

            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].totalPrice = variant.salePrice * newQuantity;
        }

        await cart.save();

        res.json({
            success: true,
            message: 'Product added to cart'
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.json({
            success: false,
            message: 'Failed to add to cart'
        });
    }
};


const getCart =async(req,res)=>{
    try{
      const  userId = req.session.user.id;

        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: { 
                    path: 'variants category',
                    select: 'name color salePrice regularPrice quantity images'
                }
            })
            .populate('items.variantId');


              res.render('user/cart', {
            cart: cart || { items: [] },
            user: req.session.user
        });




    }catch(error){
console.error('Get cart error:', error);
        res.redirect('/');
    }
}

const updateCartItem = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId, quantity } = req.body;

        if (!productId || !variantId || !quantity) {
            return res.json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate quantity limit
        if (quantity > 3) {
            return res.json({
                success: false,
                message: 'Maximum 3 units allowed per product'
            });
        }

        if (quantity < 1) {
            return res.json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Get product to check stock
        const product = await Product.findById(productId).populate('variants');
        if (!product) {
            return res.json({
                success: false,
                message: 'Product not found'
            });
        }

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.json({
                success: false,
                message: 'Variant not found'
            });
        }

        if (variant.quantity < quantity) {
            return res.json({
                success: false,
                message: `Only ${variant.quantity} items available`
            });
        }

        // Update cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (itemIndex === -1) {
            return res.json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items[itemIndex].quantity = parseInt(quantity);
        cart.items[itemIndex].totalPrice = variant.salePrice * parseInt(quantity);

        await cart.save();

        res.json({
            success: true,
            message: 'Cart updated successfully'
        });

    } catch (error) {
        console.error('Update cart error:', error);
        res.json({
            success: false,
            message: 'Failed to update cart'
        });
    }
};


const removeFromCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { itemId } = req.body;

        const result = await Cart.findOneAndUpdate(
            { userId: userId },
            { $pull: { items: { _id: itemId } } },
            { new: true }
        );

        if (!result) {
            return res.json({
                success: false,
                message: 'Cart not found'
            });
        }

        res.json({ 
            success: true, 
            message: 'Item removed successfully',
            remainingItems: result.items.length
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.json({ success: false, message: 'Failed to remove item' });
    }
};

export default{
    removeFromCart,
    getCart,
    addToCart,
    updateCartItem

}