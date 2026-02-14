import Cart from '../../models/cartSchema.js';
import Order from '../../models/orderModel.js';
import Address from '../../models/AddressModal.js';
import Product from '../../models/porductsModal.js';
import Coupon from '../../models/couponModel.js';
import User from '../../models/userModal.js';
import WalletTransaction from '../../models/WalletTransaction.js';
import { StatusCodes } from 'http-status-codes';
import razorpayInstance from '../../config/razorpay.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Razorpay instance will be initialized lazily in the controller methods
// to prevent crashing if environment variables are missing at startup.

const getCheckOut = async(req,res)=>{
    try{
        const userId= req.session.user.id;

        const cart = await Cart.findOne({userId})
        .populate({
            path :'items.productId',
            populate:{
                path:'variants category',
                select:'name color salePrice regularPrice quantity images'
            }
        }).populate('items.variantId');

        if(!cart || cart.items.length===0){
            return res.status(StatusCodes.BAD_REQUEST).redirect('/cart');
        }

        // Validate stock for all cart items
        const stockIssues = [];
        
        for (const item of cart.items) {
            if (!item.productId || !item.variantId) {
                stockIssues.push({
                    productName: 'Unknown Product',
                    cartQuantity: item.quantity,
                    availableQuantity: 0
                });
                continue;
            }

            // Check if product is blocked
            if (item.productId.IsBlocked) {
                stockIssues.push({
                    productName: item.productId.productName,
                    cartQuantity: item.quantity,
                    availableQuantity: 0
                });
                continue;
            }

            // Find the specific variant
            const variant = item.productId.variants.find(
                v => v._id.toString() === item.variantId._id.toString()
            );

            if (!variant) {
                stockIssues.push({
                    productName: item.productId.productName,
                    cartQuantity: item.quantity,
                    availableQuantity: 0
                });
                continue;
            }

            // Check if cart quantity exceeds available stock
            if (item.quantity > variant.quantity) {
                stockIssues.push({
                    productName: item.productId.productName,
                    color: variant.color,
                    cartQuantity: item.quantity,
                    availableQuantity: variant.quantity
                });
            }
        }

        // If there are stock issues, redirect back to cart with error
        if (stockIssues.length > 0) {
            req.session.stockValidationError = {
                message: 'Some items in your cart exceed available stock',
                issues: stockIssues
            };
            return res.redirect('/cart');
        }

        // Get user's addresses - your model stores addresses in an array
        const addressDoc = await Address.findOne({ userId });
        const addresses = addressDoc ? addressDoc.address : [];

        // Get Wallet Balance
        const user = await User.findById(userId);
        const walletBalance = user ? user.Wallet : 0;

        res.render('user/checkout', {
            cart,
            addresses,
            user: req.session.user,
            walletBalance // Pass wallet balance to view
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
                message: 'Coupon code is required'
            });
        }

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isListed: true });

        if (!coupon) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Validate expiry
        if (new Date() > coupon.endDate) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Coupon has expired'
            });
        }
        
        if (new Date() < coupon.startDate) {
             return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Coupon is not yet active'
            });
        }

        // Validate minimum purchase
        if (cartTotal < coupon.minimumPrice) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPrice} required`
            });
        }

        // Validation usage limit per user (Check order history?)
        // Assuming we check if user has used this coupon before if strict logic needed
        // For 4-day sprint, maybe skip or basic check if Order model stores used coupons.
        
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotal * coupon.offerPrice) / 100;
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            discountAmount = coupon.offerPrice;
        }

        // Ensure discount doesn't exceed total
        if (discountAmount > cartTotal) {
            discountAmount = cartTotal;
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Coupon applied successfully',
            discountAmount: Math.round(discountAmount),
            newTotal: Math.round(cartTotal - discountAmount),
            couponCode: coupon.code
        });

    } catch (error) {
        console.error('Apply coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to apply coupon'
        });
    }
};

const removeCoupon = async (req, res) => {
    // Just a placeholder for UI interaction if needed, mostly client side sufficient
    res.status(StatusCodes.OK).json({
        success: true,
        message: 'Coupon removed'
    });
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
            // Buy Now flow - use session data
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
        // Validate all cart items for blocked products
        for (const item of cart.items) {
            let product;
            
            if (isBuyNow) {
                // For buy now, we need to fetch the product
                product = await Product.findById(item.productId._id).populate('variants');
            } else {
                // For regular cart, product is already populated
                product = item.productId;
            }
            
            if (!product || product.IsBlocked) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: `Product "${product ? product.productName : 'Unknown'}" is no longer available for purchase. Please remove it from your cart and try again.`
                });
            }
        }

        for (let item of cart.items) {
            // Use the populated variantId directly
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
            // Find the address document and the specific address in the array
            const addressDoc = await Address.findOne({ userId });
            if (!addressDoc) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'No addresses found'
                });
            }
            
            const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
            if (!address) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Invalid address selected'
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
                message: 'Shipping address is required'
            });
        }

        // Calculate totals
        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        let shippingCost = 0; // Free shipping
        let tax = 0; // No tax for now
        let discountAmount = 0;
        let couponApplied = null;

        // Apply Coupon Validation if code provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isListed: true });
            if (coupon) {
                 // Re-validate conditions to be safe
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

        // Apply Wallet
        if (useWallet) {
             const user = await User.findById(userId);
             if (user && user.Wallet > 0) {
                 if (user.Wallet >= totalAmount) {
                     walletAmountUsed = totalAmount;
                     totalAmount = 0; // Fully paid by wallet
                 } else {
                     walletAmountUsed = user.Wallet;
                     totalAmount -= user.Wallet;
                 }
             }
        }

        // Generate order number
        const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Create order
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
             // Online payment via Razorpay
             order.orderStatus = 'pending';
             order.paymentStatus = 'pending';
        } else {
             order.orderStatus = 'pending';
        }

        // If online payment, Create Razorpay Order
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

        // Update Stock ONLY if Order is Placed/Paid (or if we reserve stock? Usually reserve on order creation)
        // With Pending order, we should probably reserve stock. 
        // If payment fails, we can release it later (or keep it reserved for a bit).
        // Let's reserve it now as per original logic.

        // Deduct from Wallet
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

      
        // Update product stock - Direct variant collection update
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


        if (isBuyNow) {
            delete req.session.buyNowData;
        } else {
            await Cart.findOneAndDelete({ userId });
        }


        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Order created',
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
            message: 'Failed to place order'
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
             const order = await Order.findById(order_id);
             if (order) {
                 order.paymentStatus = 'paid';
                 order.orderStatus = 'confirmed';
                 order.razorpayPaymentId = razorpay_payment_id;
                 await order.save();
                 
                 return res.status(StatusCodes.OK).json({
                     success: true,
                     message: 'Payment verified successfully'
                 });
             }
        }
        
        // If Failed
        const order = await Order.findById(order_id);
        if (order) {
             order.paymentStatus = 'failed';
             await order.save();
        }

        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Payment verification failed'
        });

    } catch (error) {
         console.error('Verify payment error:', error);
         res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Verification success failed internally'
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

        // Validate quantity limit
        if (quantity > 3) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Maximum 3 units allowed per product'
            });
        }


        const product = await Product.findById(productId).populate('variants');
        
        if(!product||product.IsBlocked){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:"Product is not available"
            })
        }

        const variant = await product.variants.find(v=>v._id.toString()===variantId);
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
        
        const orderData = {
              items: [{
                productId: product._id,
                variantId: variant._id,
                quantity: parseInt(quantity),
                price: variant.salePrice, // Should be Best Offer Price ideally
                totalPrice: variant.salePrice * parseInt(quantity),
                productName: product.productName,
                variantColor: variant.color,
                image: variant.images[0]
            }],
                  subtotal: variant.salePrice * parseInt(quantity),
            total: variant.salePrice * parseInt(quantity)
      
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
        
        // Check if buy now data exists in session
        if (!req.session.buyNowData) {
            return res.status(StatusCodes.BAD_REQUEST).redirect('/shop');
        }

        // Get productId from session data
        const productId = req.session.buyNowData.items[0].productId;
        const product = await Product.findById(productId).populate('variants');
        if(!product||product.IsBlocked){
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:"Product is not available"
            })
        }

        // Get user's addresses
        const addressDoc = await Address.findOne({ userId });
        const addresses = addressDoc ? addressDoc.address : [];

        // Get Wallet Balance
        const user = await User.findById(userId);
        const walletBalance = user ? user.Wallet : 0;

        // Create a cart-like object for the checkout page
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
            isBuyNow: true,  // Flag to indicate this is buy now flow
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
        // If order exists, show failure page.
        res.render('user/orderFailure', { 
            order,
            user: req.session.user 
        });
    } catch (error) {
        console.error('Order failure error:', error);
        res.redirect('/orders');
    }
};

export default {
    getCheckOut,
    placeOrder,
    buyNow,
    getBuyNowCheckout,
    applyCoupon,
    removeCoupon,
    verifyPayment,
    getOrderSuccess,
    getOrderFailure
};