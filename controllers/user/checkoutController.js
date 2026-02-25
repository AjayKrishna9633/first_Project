import Cart from '../../models/cartSchema.js';
import Order from '../../models/orderModel.js';
import Address from '../../models/AddressModal.js';
import Product from '../../models/porductsModal.js';
import Coupon from '../../models/couponModel.js';
import User from '../../models/userModal.js';
import WalletTransaction from '../../models/WalletTransaction.js';
import StatusCodes from '../../utils/statusCodes.js';
import razorpayInstance from '../../config/razorpay.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { applyBestDiscountToProduct } from '../../utils/discountCalculator.js';
import { 
    CART_MESSAGES, 
    PRODUCT_MESSAGES, 
    ADDRESS_MESSAGES, 
    ORDER_MESSAGES, 
    PAYMENT_MESSAGES,
    COUPON_MESSAGES,
    CHECKOUT_MESSAGES,
    formatMessage 
} from '../../constants/messages.js';
dotenv.config();

const getCheckOut = async(req,res)=>{
    try{
        const userId= req.session.user.id;

        const cart = await Cart.findOne({userId})
        .populate({
            path :'items.productId',
            populate:{
                path:'variants category'
            }
        }).populate('items.variantId');

        if(!cart || cart.items.length===0){
            return res.status(StatusCodes.BAD_REQUEST).redirect('/cart');
        }

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

        const stockIssues = [];
        
        for (const item of cart.items) {
            if (!item.productId || !item.variantId) {
                stockIssues.push({
                    productName: 'Unknown Product',
                    cartQuantity: item.quantity,
                    availableQuantity: 0,
                    issue: 'Product not found'
                });
                continue;
            }

            if (item.productId.IsBlocked) {
                stockIssues.push({
                    productName: item.productId.productName,
                    cartQuantity: item.quantity,
                    availableQuantity: 0,
                    issue: 'Product is not available'
                });
                continue;
            }

            if (!item.productId.category || !item.productId.category.isListed) {
                stockIssues.push({
                    productName: item.productId.productName,
                    cartQuantity: item.quantity,
                    availableQuantity: 0,
                    issue: 'Product is not available'
                });
                continue;
            }

            const variant = item.productId.variants.find(
                v => v._id.toString() === item.variantId._id.toString()
            );

            if (!variant) {
                stockIssues.push({
                    productName: item.productId.productName,
                    cartQuantity: item.quantity,
                    availableQuantity: 0,
                    issue: 'Variant not found'
                });
                continue;
            }

            if (item.quantity > variant.quantity) {
                stockIssues.push({
                    productName: item.productId.productName,
                    color: variant.color,
                    cartQuantity: item.quantity,
                    availableQuantity: variant.quantity,
                    issue: 'Insufficient stock'
                });
            }
        }

        if (stockIssues.length > 0) {
            req.session.stockValidationError = {
                message: 'Some items in your cart exceed available stock',
                issues: stockIssues
            };
            return res.redirect('/cart');
        }

        const addressDoc = await Address.findOne({ userId });
        const addresses = addressDoc ? addressDoc.address : [];

        const user = await User.findById(userId);
        const walletBalance = user ? user.Wallet : 0;

        res.render('user/checkout', {
            cart,
            addresses,
            user: req.session.user,
            walletBalance
        });

    }catch(error){
        console.error('Get checkout error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/cart');
    }
}

const applyCoupon = async (req, res) => {
    try {
        const { couponCode, cartTotal } = req.body;
        const userId = req.session.user.id;

        if (!couponCode) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: COUPON_MESSAGES.COUPON_CODE_REQUIRED
            });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isListed: true });

        if (!coupon) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: COUPON_MESSAGES.INVALID_COUPON
            });
        }

        if (new Date() > coupon.endDate) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: COUPON_MESSAGES.COUPON_EXPIRED
            });
        }
        
        if (new Date() < coupon.startDate) {
             return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: COUPON_MESSAGES.COUPON_NOT_ACTIVE
            });
        }

        if (cartTotal < coupon.minimumPrice) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPrice} required`
            });
        }

        // Check total usage limit
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: COUPON_MESSAGES.COUPON_LIMIT_REACHED
            });
        }

        // Check per-user usage limit
        const userUsage = coupon.usedBy.find(u => u.userId.toString() === userId);
        const userUsageCount = userUsage ? userUsage.usageCount : 0;
        
        if (coupon.usagePerUser !== null && userUsageCount >= coupon.usagePerUser) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: COUPON_MESSAGES.COUPON_USER_LIMIT_REACHED
            });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotal * coupon.offerPrice) / 100;
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            discountAmount = coupon.offerPrice;
        }

        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        const finalAmount = cartTotal - discountAmount;
        
        if (finalAmount <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'This coupon cannot be applied as it would make the order total zero or negative. Please contact support.'
            });
        }

        if (finalAmount < 1) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Order total must be at least ₹1 after discount'
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: COUPON_MESSAGES.COUPON_APPLIED,
            discountAmount: Math.round(discountAmount),
            newTotal: Math.round(finalAmount),
            couponCode: coupon.code
        });

    } catch (error) {
        console.error('Apply coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: COUPON_MESSAGES.COUPON_APPLY_FAILED
        });
    }
};

const removeCoupon = async (req, res) => {
    res.status(StatusCodes.OK).json({
        success: true,
        message: COUPON_MESSAGES.COUPON_REMOVED
    });
};

const getAvailableCoupons = async (req, res) => {
    try {
        const currentDate = new Date();
        
        const coupons = await Coupon.find({
            isListed: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        })
        .select('name code description discountType offerPrice minimumPrice maxDiscountAmount endDate')
        .sort({ createdon: -1 });

        res.status(StatusCodes.OK).json({
            success: true,
            coupons
        });
    } catch (error) {
        console.error('Get available coupons error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: COUPON_MESSAGES.COUPON_FETCH_FAILED
        });
    }
};

const placeOrder=async(req,res)=>{
    try{
        let cart;
        let isBuyNow = false;

        const userId = req.session.user.id;
        const { 
            addressId, 
            newAddress, 
            paymentMethod, 
            orderNotes,
            couponCode,
            useWallet
        } = req.body;

        if (req.session.buyNowData) {
            isBuyNow = true;
            cart = {
                items: req.session.buyNowData.items.map(item => ({
                    productId: { _id: item.productId },
                    variantId: { _id: item.variantId },
                    quantity: item.quantity,
                    price: item.price,
                    totalPrice: item.totalPrice
                }))
            };
        } else {
        
            cart = await Cart.findOne({userId})
                .populate('items.productId')
                .populate('items.variantId');
        }

        if(!cart || cart.items.length === 0){
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: isBuyNow ? 'Buy now data not found' : 'Cart is empty',
                success: false
            });
        }

        for (const item of cart.items) {
            let product;
            
            if (isBuyNow) {
                product = await Product.findById(item.productId._id).populate('variants').populate('category');
            } else {
                product = item.productId;
            }
            
            if (!product || product.IsBlocked) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: PRODUCT_MESSAGES.PRODUCT_BLOCKED
                });
            }

            if (!product.category || !product.category.isListed) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: PRODUCT_MESSAGES.PRODUCT_UNAVAILABLE
                });
            }
        }

        for (let item of cart.items) {
            const variant = item.variantId;
            
            if (!variant || variant.quantity < item.quantity) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: `Insufficient stock for ${item.productId.productName}. Available: ${variant ? variant.quantity : 0}, Requested: ${item.quantity}`
                });
            }
        }

        let shippingAddress;
        if (addressId) {
            const addressDoc = await Address.findOne({ userId });
            if (!addressDoc) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: ADDRESS_MESSAGES.NO_ADDRESSES_FOUND
                });
            }
            
            const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
            if (!address) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: ADDRESS_MESSAGES.INVALID_ADDRESS_SELECTED
                });
            }

            shippingAddress = {
                fullName: address.name,
                phone: address.phone.toString(),
                streetAddress: address.streetAddress,
                city: address.city,
                state: address.state,
                pinCode: address.pinCode.toString(),
                country: 'India',
                addressType: address.addressType
            };
        } else if (newAddress) {
            shippingAddress = newAddress;
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: ADDRESS_MESSAGES.ADDRESS_REQUIRED
            });
        }

        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        let shippingCost = 0;
        let tax = 0;
        let discountAmount = 0;
        let couponApplied = null;

        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isListed: true });
            if (coupon) {
                 if (new Date() <= coupon.endDate && new Date() >= coupon.startDate && subtotal >= coupon.minimumPrice) {
                    if (coupon.discountType === 'percentage') {
                        discountAmount = (subtotal * coupon.offerPrice) / 100;
                        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                            discountAmount = coupon.maxDiscountAmount;
                        }
                    } else {
                        discountAmount = coupon.offerPrice;
                    }
                     if (discountAmount > subtotal) discountAmount = subtotal;
                     couponApplied = coupon.code;
                 }
            }
        }

        let totalAmount = subtotal + shippingCost + tax - discountAmount;
        let walletAmountUsed = 0;

        if (useWallet) {
             const user = await User.findById(userId);
             if (user && user.Wallet > 0) {
                 if (user.Wallet >= totalAmount) {
                     walletAmountUsed = totalAmount;
                     totalAmount = 0;
                 } else {
                     walletAmountUsed = user.Wallet;
                     totalAmount -= user.Wallet;
                 }
             }
        }

        // Validate COD limit - Orders above Rs 1000 cannot use COD
        if (paymentMethod === 'cod' && (subtotal + shippingCost + tax - discountAmount) > 1000) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: PAYMENT_MESSAGES.COD_LIMIT_EXCEEDED
            });
        }

        const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substring(2, 7).toUpperCase();

        const order = new Order({
            userId,
            orderNumber,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                variantId: item.variantId._id,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
            })),
            shippingAddress,
            paymentMethod, 
            subtotal,
            shippingCost,
            tax,
            couponCode: couponApplied,
            couponDiscount: discountAmount,
            walletAmountUsed,
            totalAmount: Math.round(totalAmount), 
            orderNotes: orderNotes || ''
        });
        
        if (Math.round(totalAmount) === 0 && walletAmountUsed > 0) {
             order.paymentStatus = 'paid'; 
             order.orderStatus = 'confirmed'; 
        } else if (paymentMethod === 'cod') {
             order.orderStatus = 'confirmed';
        } else if (paymentMethod === 'online') {
             order.orderStatus = 'pending';
             order.paymentStatus = 'pending';
        } else {
             order.orderStatus = 'pending';
        }

        let razorpayOrderDetails = null;
        if (order.orderStatus === 'pending' && Math.round(totalAmount) > 0) {
             
             try {
                const instance = razorpayInstance;

                const options = {
                    amount: Math.round(totalAmount) * 100,
                    currency: "INR",
                    receipt: orderNumber
                };

                const razorpayOrder = await instance.orders.create(options);
                order.razorpayOrderId = razorpayOrder.id;
                razorpayOrderDetails = {
                    id: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    key_id: process.env.RAZORPAY_KEY_ID,
                    name: "GearGrid",
                    description: "Order Payment",
                    contact: shippingAddress.phone,
                    email: req.session.user.email
                };
             } catch (err) {
                 console.error("Razorpay Order Creation Failed:", err);
                 
                 return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                     success: false,
                     message: 'Failed to initiate payment gateway. Please check configuration or try again.'
                 });
             }
        }


        await order.save();

        // Increment coupon usage if coupon was applied
        if (couponApplied) {
            const coupon = await Coupon.findOne({ code: couponApplied });
            if (coupon) {
                // Increment total usage count
                coupon.usedCount = (coupon.usedCount || 0) + 1;
                
                // Update user-specific usage
                const userUsageIndex = coupon.usedBy.findIndex(u => u.userId.toString() === userId);
                if (userUsageIndex >= 0) {
                    coupon.usedBy[userUsageIndex].usageCount += 1;
                    coupon.usedBy[userUsageIndex].lastUsed = new Date();
                } else {
                    coupon.usedBy.push({
                        userId,
                        usageCount: 1,
                        lastUsed: new Date()
                    });
                }
                
                await coupon.save();
            }
        }

        if (walletAmountUsed > 0) {
            const user = await User.findById(userId);
             user.Wallet -= walletAmountUsed;
             await user.save();

             await WalletTransaction.create({
                userId,
                amount: walletAmountUsed,
                type: 'debit',
                balance: user.Wallet,
                paymentMethod: 'wallet',
                status: 'success',
                description: `Payment for Order #${orderNumber}`,
                orderId: order._id
            });
        }

        if (paymentMethod === 'cod' || paymentMethod === 'wallet') {
            const Variant = (await import('../../models/variantModel.js')).default;
            
            for (let item of cart.items) {
                try {
                    const variantId = item.variantId._id;
                    
                    const updateResult = await Variant.findByIdAndUpdate(
                        variantId,
                        { $inc: { quantity: -item.quantity } },
                        { new: true }
                    );
                    
                    if (!updateResult) {
                        console.error(`Failed to update stock for variant ${variantId}`);
                    }
                } catch (error) {
                    console.error(`Error updating stock for variant:`, error);
                }
            }
        }

        if (isBuyNow) {
            delete req.session.buyNowData;
        } else {
            await Cart.findOneAndDelete({ userId });
        }

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: ORDER_MESSAGES.ORDER_CREATED,
            orderNumber: order.orderNumber,
            orderId: order._id,
            totalAmount: Math.round(totalAmount),
            razorpayOrder: razorpayOrderDetails,
            paymentMethod
        });

    } catch (error) {
        console.error('Place order error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: ORDER_MESSAGES.ORDER_FAILED
        });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
             const order = await Order.findById(order_id).populate('items.variantId');
             if (order) {
                 order.paymentStatus = 'paid';
                 order.orderStatus = 'confirmed';
                 order.razorpayPaymentId = razorpay_payment_id;
                 await order.save();
                 
                 const Variant = (await import('../../models/variantModel.js')).default;
                 
                 for (let item of order.items) {
                     try {
                         const variantId = item.variantId._id;
                         
                         const updateResult = await Variant.findByIdAndUpdate(
                             variantId,
                             { $inc: { quantity: -item.quantity } },
                             { new: true }
                         );
                         
                         if (!updateResult) {
                             console.error(`Failed to update stock for variant ${variantId}`);
                         }
                     } catch (error) {
                         console.error(`Error updating stock for variant:`, error);
                     }
                 }
                 
                 return res.status(StatusCodes.OK).json({
                     success: true,
                     message: PAYMENT_MESSAGES.PAYMENT_SUCCESS
                 });
             }
        }
        
        const order = await Order.findById(order_id);
        if (order) {
             order.paymentStatus = 'failed';
             order.orderStatus = 'failed';
             
             // Mark all items as cancelled
             order.items.forEach(item => {
                 item.status = 'cancelled';
                 item.cancellationReason = 'Payment failed';
                 item.cancelledAt = new Date();
             });
             
             await order.save();
             
             // Restore product stock
             await restoreProductStock(order.items);
        }

        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: PAYMENT_MESSAGES.PAYMENT_FAILED
        });

    } catch (error) {
         console.error('Verify payment error:', error);
         
         try {
             const order = await Order.findById(req.body.order_id);
             if (order) {
                 order.paymentStatus = 'failed';
                 order.orderStatus = 'failed';
                 
                 // Mark all items as cancelled
                 order.items.forEach(item => {
                     item.status = 'cancelled';
                     item.cancellationReason = 'Payment failed';
                     item.cancelledAt = new Date();
                 });
                 
                 await order.save();
                 
                 // Restore product stock
                 await restoreProductStock(order.items);
             }
         } catch (err) {
             console.error('Error updating order status:', err);
         }
         
         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Verification failed internally'
        });
    }
};

const cancelPayment = async (req, res) => {
    try {
        const { order_id } = req.body;
        
        const order = await Order.findById(order_id);
        if (order) {
            order.paymentStatus = 'cancelled';
            order.orderStatus = 'cancelled';
            
            // Mark all items as cancelled
            order.items.forEach(item => {
                item.status = 'cancelled';
                item.cancellationReason = PAYMENT_MESSAGES.PAYMENT_CANCELLED;
                item.cancelledAt = new Date();
            });
            
            await order.save();
            
            // Rollback coupon usage if coupon was applied
            if (order.couponCode) {
                const coupon = await Coupon.findOne({ code: order.couponCode });
                if (coupon) {
                    // Decrement total usage count
                    if (coupon.usedCount > 0) {
                        coupon.usedCount -= 1;
                    }
                    
                    // Decrement user-specific usage
                    const userUsageIndex = coupon.usedBy.findIndex(u => u.userId.toString() === order.userId.toString());
                    if (userUsageIndex >= 0) {
                        if (coupon.usedBy[userUsageIndex].usageCount > 1) {
                            coupon.usedBy[userUsageIndex].usageCount -= 1;
                        } else {
                            // Remove user from usedBy array if count becomes 0
                            coupon.usedBy.splice(userUsageIndex, 1);
                        }
                    }
                    
                    await coupon.save();
                }
            }
            
            // Restore product stock
            await restoreProductStock(order.items);
            
            return res.status(StatusCodes.OK).json({
                success: true,
                message: PAYMENT_MESSAGES.PAYMENT_CANCELLED
            });
        }
        
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: 'Order not found'
        });
        
    } catch (error) {
        console.error('Cancel payment error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: PAYMENT_MESSAGES.PAYMENT_CANCEL_FAILED
        });
    }
};

const buyNow = async(req,res)=>{
    try{
        const userId = req.session.user.id;
        const {productId, variantId, quantity } = req.body;

        if(!productId||!variantId||!quantity){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"Missing required fields"
            })
        }

        if (quantity > 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Maximum 3 units allowed per product'
            });
        }

        let product = await Product.findById(productId).populate('variants').populate('category').lean();
        
        if(!product||product.IsBlocked){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:"Product is not available"
            })
        }

        if (!product.category || !product.category.isListed) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Product not available'
            });
        }

        product = applyBestDiscountToProduct(product);

        const variant = product.variants.find(v=>v._id.toString()===variantId);
        if(!variant){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:"variant not found"
            })
        }

        if (variant.quantity < quantity) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Only ${variant.quantity} items available`
            });
        }
        
        const finalPrice = variant.finalPrice !== undefined ? variant.finalPrice : variant.salePrice;
        
        const orderData = {
              items: [{
                productId: product._id,
                variantId: variant._id,
                quantity: parseInt(quantity),
                price: finalPrice,
                totalPrice: finalPrice * parseInt(quantity),
                productName: product.productName,
                variantColor: variant.color,
                image: variant.images[0]
            }],
            subtotal: finalPrice * parseInt(quantity),
            total: finalPrice * parseInt(quantity)
      
        }
        req.session.buyNowData = orderData;
     res.status(StatusCodes.OK).json({
            success: true,
            message: 'Redirecting to checkout',
            redirectUrl: '/checkout/buy-now'
        });

    }catch (error) {
        console.error('Buy now error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            productId: req.body.productId,
            variantId: req.body.variantId,
            quantity: req.body.quantity
        });
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process buy now: ' + error.message
        });
    }
}
const getBuyNowCheckout = async(req, res) => {
    try {
        const userId = req.session.user.id;
        
        if (!req.session.buyNowData) {
            return res.status(StatusCodes.BAD_REQUEST).redirect('/shop');
        }

        const productId = req.session.buyNowData.items[0].productId;
        const product = await Product.findById(productId).populate('variants').populate('category');
        if(!product||product.IsBlocked){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message: PRODUCT_MESSAGES.PRODUCT_UNAVAILABLE
            })
        }

        if (!product.category || !product.category.isListed) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: PRODUCT_MESSAGES.PRODUCT_UNAVAILABLE
            });
        }

        const addressDoc = await Address.findOne({ userId });
        const addresses = addressDoc ? addressDoc.address : [];

        const user = await User.findById(userId);
        const walletBalance = user ? user.Wallet : 0;

        const buyNowCart = {
            items: req.session.buyNowData.items.map(item => ({
                productId: {
                    _id: item.productId,
                    productName: item.productName,
                    variants: [{
                        images: [item.image]
                    }]
                },
                quantity: item.quantity,
                totalPrice: item.totalPrice
            }))
        };

        res.render('user/checkout', {
            cart: buyNowCart,
            addresses,
            user: req.session.user,
            isBuyNow: true,
            walletBalance
        });

    } catch (error) {
        console.error('Get buy now checkout error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/shop');
    }
}

const getOrderSuccess = async (req, res) => {
    try {
        const { orderId } = req.query;
        if (!orderId) return res.redirect('/orders');
        
        const order = await Order.findById(orderId);
        if (!order) return res.redirect('/orders');

        res.render('user/orderSuccess', { 
            order,
            user: req.session.user 
        });
    } catch (error) {
        console.error('Order success error:', error);
        res.redirect('/orders');
    }
};

const getOrderFailure = async (req, res) => {
    try {
        const { orderId } = req.query;
        if (!orderId) return res.redirect('/orders');
        
        const order = await Order.findById(orderId);
        
        res.render('user/orderFailure', { 
            order,
            user: req.session.user 
        });
    } catch (error) {
        console.error('Order failure error:', error);
        res.redirect('/orders');
    }
};

// Helper function to restore product stock
const restoreProductStock = async (orderItems) => {
    try {
        const Variant = (await import('../../models/variantModel.js')).default;
        
        for (let item of orderItems) {
            const productId = item.productId._id || item.productId;
            const variantId = item.variantId._id || item.variantId;
            
            console.log('Restoring stock for:', { productId, variantId, quantity: item.quantity });
            
            const updateResult = await Variant.findByIdAndUpdate(
                variantId,
                { $inc: { quantity: item.quantity } },
                { new: true }
            );
            
            if (!updateResult) {
                console.error(`Failed to restore stock for variant ${variantId}`);
            } else {
                console.log(`Successfully restored ${item.quantity} units for variant ${variantId}`);
            }
        }
    } catch (error) {
        console.error('Error restoring product stock:', error);
    }
};

export default {
    getCheckOut,
    placeOrder,
    buyNow,
    getBuyNowCheckout,
    applyCoupon,
    removeCoupon,
    getAvailableCoupons,
    verifyPayment,
    cancelPayment,
    getOrderSuccess,
    getOrderFailure
};
