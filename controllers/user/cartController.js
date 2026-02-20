import Cart from '../../models/cartSchema.js';
import Product from "../../models/porductsModal.js";
import StatusCodes from '../../utils/statusCodes.js';
import { applyBestDiscountToProduct } from '../../utils/discountCalculator.js';

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId, quantity } = req.body;

        if (!productId || !variantId || !quantity) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Missing fields'
            });
        }

        // Validate quantity limit
        if (quantity > 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Maximum 3 units allowed per product'
            });
        }

        let product = await Product.findById(productId).populate('variants').populate('category').lean();

        if (!product || product.IsBlocked) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Product not available'
            });
        }

        product = applyBestDiscountToProduct(product);

        const variant = product.variants.find(v => v._id.toString() === variantId);

        if (!variant) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Variant not found'
            });
        }

        if (variant.quantity < quantity) {
            return res.status(StatusCodes.BAD_REQUEST).json({
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

        const finalPrice = variant.finalPrice !== undefined ? variant.finalPrice : variant.salePrice;

        // Check if cart already has 3 different products
        const existingItemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (existingItemIndex === -1) {
            // New product - check if cart already has 3 different products
            if (cart.items.length >= 3) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Maximum 3 different products allowed in cart'
                });
            }

            // Add new item
            cart.items.push({
                productId,
                variantId,
                quantity: parseInt(quantity),
                price: finalPrice,
                totalPrice: finalPrice * parseInt(quantity)
            });
        } else {
            // Update existing item
            const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
            
            // Check quantity limit
            if (newQuantity > 3) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Maximum 3 units allowed per product. You already have some in cart.'
                });
            }

            if (newQuantity > variant.quantity) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: `Only ${variant.quantity} items available`
                });
            }

            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].price = finalPrice; // Update price in case it changed
            cart.items[existingItemIndex].totalPrice = finalPrice * newQuantity;
        }

        await cart.save();

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Product added to cart'
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to add to cart'
        });
    }
};


const getCart =async(req,res)=>{
    try{
        const userId = req.session.user.id;

        const cart = await Cart.findOne({ userId })
            .populate({
                path: 'items.productId',
                populate: { 
                    path: 'variants category'
                }
            })
            .populate('items.variantId');

        const stockValidationError = req.session.stockValidationError;
        delete req.session.stockValidationError;

         if(cart && cart.items.length > 0){
             let cartUpdated = false;
             for(let item of cart.items){
                 if(item.productId && item.variantId && item.productId.variants){
                    let productObj = item.productId.toObject ? item.productId.toObject() : item.productId;

                    productObj = applyBestDiscountToProduct(productObj);
                    
                    const itemVariantId = item.variantId._id || item.variantId;
                    const variant = productObj.variants.find(v => 
                        v._id.toString() === itemVariantId.toString()
                    );
                    
                    if(variant && variant.finalPrice !== undefined){
                        const currentBestPrice = variant.finalPrice;
                        if(item.price !== currentBestPrice){
                            item.price = currentBestPrice;
                            item.totalPrice = currentBestPrice * item.quantity;
                            cartUpdated = true;
                        }
                    }
                 }
             }
             if(cartUpdated){
                 await cart.save();
             }
         }

        res.render('user/cart', {
            cart: cart || { items: [] },
            user: req.session.user,
            stockValidationError: stockValidationError || null
        });

    }catch(error){
        console.error('Get cart error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/');
    }
}

const updateCartItem = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { productId, variantId, quantity } = req.body;

        if (!productId || !variantId || !quantity) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Validate quantity limit
        if (quantity > 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Maximum 3 units allowed per product'
            });
        }

        if (quantity < 1) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Quantity must be at least 1'
            });
        }

        // Get cart first to check current quantity
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId && item.variantId.toString() === variantId
        );

        if (itemIndex === -1) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        const currentQuantity = cart.items[itemIndex].quantity;
        const newQuantity = parseInt(quantity);
        const isIncreasing = newQuantity > currentQuantity;

        let product = await Product.findById(productId).populate('variants').populate('category').lean();
        if (!product) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Product not found'
            });
        }

        product = applyBestDiscountToProduct(product);

        const variant = product.variants.find(v => v._id.toString() === variantId);
        if (!variant) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Variant not found'
            });
        }

        // Only check stock availability when INCREASING quantity
        if (isIncreasing && variant.quantity < newQuantity) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Only ${variant.quantity} items available. Please decrease quantity to ${variant.quantity} or less.`,
                availableQuantity: variant.quantity
            });
        }

        const finalPrice = variant.finalPrice !== undefined ? variant.finalPrice : variant.salePrice;

     
        if (!isIncreasing && newQuantity > variant.quantity) {
           
            cart.items[itemIndex].quantity = newQuantity;
            cart.items[itemIndex].price = finalPrice;
            cart.items[itemIndex].totalPrice = finalPrice * newQuantity;
            await cart.save();

            return res.status(StatusCodes.OK).json({
                success: true,
                message: `Cart updated. Note: Only ${variant.quantity} items currently available.`,
                warning: true,
                availableQuantity: variant.quantity
            });
        }

        // Normal update
        cart.items[itemIndex].quantity = newQuantity;
        cart.items[itemIndex].price = finalPrice;
        cart.items[itemIndex].totalPrice = finalPrice * newQuantity;

        await cart.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Cart updated successfully'
        });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Cart not found'
            });
        }

        res.status(StatusCodes.OK).json({ 
            success: true, 
            message: 'Item removed successfully',
            remainingItems: result.items.length
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to remove item' });
    }
};

export default{
    removeFromCart,
    getCart,
    addToCart,
    updateCartItem
}