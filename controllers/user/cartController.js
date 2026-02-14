

import Cart from '../../models/cartSchema.js';
import Product from "../../models/porductsModal.js";
import Wishlist from "../../models/wishlist.js";
import Offer from "../../models/OfferModel.js"; 
import { StatusCodes } from 'http-status-codes';

const calculateBestOffer = async (product) => {
    const currentDate = new Date();
    
    // Fetch active offers
    const activeOffers = await Offer.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        isActive: true
    });

    // Check for Product Offer
    const productOffer = activeOffers.find(offer => 
        offer.targetType === 'product' && 
        offer.selectedProduct && 
        offer.selectedProduct.toString() === product._id.toString()
    );

    // Check for Category Offer
    const categoryOffer = activeOffers.find(offer => 
        offer.targetType === 'category' && 
        offer.selectedCategory && 
        offer.selectedCategory.toString() === product.category._id.toString()
    );

    let finalProductOffer = productOffer || null;
    let finalCategoryOffer = categoryOffer || null;

    if (product.variants && product.variants.length > 0) {
        product.variants = product.variants.map(variant => {
            let price = variant.salePrice;
            let productOfferPrice = price;
            let categoryOfferPrice = price;

            // Calculate Product Offer Price
            if (finalProductOffer) {
                if (finalProductOffer.type === 'percentage') {
                    productOfferPrice = price - (price * (finalProductOffer.value / 100));
                } else {
                    productOfferPrice = price - finalProductOffer.value;
                }
            }

            // Calculate Category Offer Price
            if (finalCategoryOffer) {
                if (finalCategoryOffer.type === 'percentage') {
                    categoryOfferPrice = price - (price * (finalCategoryOffer.value / 100));
                } else {
                    categoryOfferPrice = price - finalCategoryOffer.value;
                }
            }

            // Select the lower price (Best Offer)
            let finalPrice = price;
            let appliedOffer = null;

            if (finalProductOffer && finalCategoryOffer) {
                if (productOfferPrice < categoryOfferPrice) {
                    finalPrice = productOfferPrice;
                    appliedOffer = finalProductOffer;
                } else {
                    finalPrice = categoryOfferPrice;
                    appliedOffer = finalCategoryOffer;
                }
            } else if (finalProductOffer) {
                finalPrice = productOfferPrice;
                appliedOffer = finalProductOffer;
            } else if (finalCategoryOffer) {
                finalPrice = categoryOfferPrice;
                appliedOffer = finalCategoryOffer;
            }

            return {
                ...variant, // Spread variant properties (using lean() or similar object structure)
                discountedPrice: Math.round(Math.max(0, finalPrice)),
                appliedOffer
            };
        });
    }
    return product;
};

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

        // Validate if product and variant exist
        let product = await Product.findById(productId).populate('variants').populate('category').lean();

        if (!product || product.IsBlocked) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Product not available'
            });
        }

        // Calculate Best Offer
        product = await calculateBestOffer(product);

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

        // Determine price to use (Discounted if available, else Sale Price)
        const finalPrice = variant.discountedPrice !== undefined ? variant.discountedPrice : variant.salePrice;

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
                    path: 'variants category',
                    // select: 'name color salePrice regularPrice quantity images' // Removing select to get full category for offer check
                }
            })
            .populate('items.variantId');

        // Check for stock validation error from checkout redirect
        const stockValidationError = req.session.stockValidationError;
        delete req.session.stockValidationError; // Clear after reading

         // Recalculate prices with Best Offer logic for display (and potentially update cart?)
         // For now, let's just ensure the cart view shows the valid price.
         // Ideally, we should update the cart in DB if prices changed, but for read operation, let's just display.
         // BUT, the Total in cart depends on DB data.
         // Let's iterate and update if necessary.
         
         if(cart && cart.items.length > 0){
             let cartUpdated = false;
             for(let item of cart.items){
                 if(item.productId){
                    // Need to apply lean() or clone to modify if strictly using mongoose doc, but here we calculate price.
                    // We need to fetch full product with category to calculate offer. 
                    // Populate already did this.
                    // But 'calculateBestOffer' expects a lean object or mutable doc.
                    
                    let product = item.productId; // This is the populated document
                    // Convert to object to avoid mongoose strictness issues with added fields
                    let productObj = product.toObject ? product.toObject() : product;

                    productObj = await calculateBestOffer(productObj);
                    
                    const variant = productObj.variants.find(v => v._id.toString() === item.variantId._id.toString());
                    
                    if(variant){
                        const currentBestPrice = variant.discountedPrice !== undefined ? variant.discountedPrice : variant.salePrice;
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

        // Get product to check stock AND price
        let product = await Product.findById(productId).populate('variants').populate('category').lean();
        if (!product) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Calculate Best Offer
        product = await calculateBestOffer(product);

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

        // Calculate valid price
        const finalPrice = variant.discountedPrice !== undefined ? variant.discountedPrice : variant.salePrice;

        // When decreasing, allow it even if new quantity > available stock
        // This helps users adjust their cart when stock is reduced
        if (!isIncreasing && newQuantity > variant.quantity) {
            // Still update but inform user about stock limitation
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