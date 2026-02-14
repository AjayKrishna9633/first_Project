import Order from '../../models/orderModel.js';
import Product from '../../models/porductsModal.js';
import User from '../../models/userModal.js';
import WalletTransaction from '../../models/WalletTransaction.js';
import InvoiceService from '../../config/invoiceService.js';
import { ObjectId } from 'mongodb';
import { StatusCodes } from 'http-status-codes';
import { formatNumber, formatCurrency, getFullNumber } from '../../utils/numberFormatter.js';
import razorpayInstance from '../../config/razorpay.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
      
        const { status, search } = req.query;
        

        let filter = { userId };
        if (status && status !== 'all') {
            filter.orderStatus = status;
        }
       

console.log('Search filter:', filter);

       
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } }
            ];
        }
        
       
        const orders = await Order.find(filter)
            .populate({
                path: 'items.productId',
                select: 'productName'
            })
            .populate({
                path: 'items.variantId',
                select: 'color images'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        // Get total count for pagination
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);
        
        // Get order statistics for user
        const stats = await getUserOrderStats(userId);
        
        res.render('user/orders', {
            orders,
            currentPage: page,
            totalPages,
            totalOrders,
            limit,
            stats,
            filters: { status, search },
            user: req.session.user,
            formatNumber: formatNumber,
            formatCurrency: formatCurrency,
            getFullNumber: getFullNumber
        });
        
    } catch (error) {
        console.error('Get user orders error:', error);
       res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('user/error', { message: 'Failed to load orders' });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        
        const order = await Order.findOne({ _id: id, userId })
                    .populate({
                path:'userId',
                select: 'fullName email phone createdOn' 
            })

            .populate({
                path: 'items.productId',
                select: 'productName category',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            })
            .populate({
                path: 'items.variantId',
                select: 'color images salePrice'
            });
        
        if (!order) {
          return  res.status(StatusCodes.NOT_FOUND).render('user/error', { 
                message: 'Order not found or you do not have permission to view this order' 
            });
        }
        
        // Calculate order progress
        const orderProgress = calculateOrderProgress(order.orderStatus);
        
        res.render('user/orderDetails', { 
            order,
            orderProgress, 
            user: req.session.user,
            formatNumber,
            formatCurrency,
            getFullNumber
        });
        
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('user/error', { message: 'Failed to load order details' });
    }
};

    const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        const { reason, category, reasonCode } = req.body;
        
        const order = await Order.findOne({ _id: id, userId });
        
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }
        
       
        if (!['pending', 'confirmed','processing'].includes(order.orderStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Order cannot be cancelled at this stage' 
            });
        }
        
       
        order.orderStatus = 'cancelled';
        order.cancellationReason = reason || 'No reason provided';
        order.cancelledAt = new Date();
        order.updatedAt = new Date();
        
        // Handle Refund for Prepaid Orders
        let refundAmount = 0;
        
        // Check if order was paid online (not COD)
        if (order.paymentMethod !== 'cod' && order.paymentStatus === 'paid') {
            refundAmount += order.totalAmount;
        }
        
        // Add wallet amount used
        if (order.walletAmountUsed > 0) {
            refundAmount += order.walletAmountUsed;
        }
        
        // Process refund if there's an amount to refund
        if (refundAmount > 0) {
            const user = await User.findById(userId);
            user.Wallet += refundAmount;
            await user.save();
            
            await WalletTransaction.create({
                userId,
                amount: refundAmount,
                type: 'credit',
                balance: user.Wallet,
                paymentMethod: 'refund',
                status: 'success',
                description: `Refund for cancelled order #${order.orderNumber}`,
                orderId: order._id
            });
            
            order.refundAmount = refundAmount;
            order.refundStatus = 'processed';
        }

        await order.save();
        
        // Restore product stock
        await restoreProductStock(order.items);
        
        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
        
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Failed to cancel order' });
    }
};

const getUserOrderStats = async (userId) => {
    try {
        const stats = await Order.aggregate([
            { $match: { userId: new ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$totalAmount' },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] }
                    },
                    processingOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'processing'] }, 1, 0] }
                    },
                    shippedOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'shipped'] }, 1, 0] }
                    },
                    deliveredOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
                    }
                }
            }
        ]);
      
        
        return stats[0] || {
            totalOrders: 0,
            totalSpent: 0,
            pendingOrders: 0,
            processingOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0
        };
        
    } catch (error) {
        console.error('Get user order stats error:', error);
        return {
            totalOrders: 0,
            totalSpent: 0,
            pendingOrders: 0,
            processingOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0
        };
    }
};

const calculateOrderProgress = (orderStatus) => {
    const statusSteps = {
        'pending': { step: 1, percentage: 20, label: 'Order Placed' },
        'confirmed': { step: 2, percentage: 40, label: 'Order Confirmed' },
        'processing': { step: 3, percentage: 60, label: 'Processing' },
        'shipped': { step: 4, percentage: 80, label: 'Shipped' },
        'delivered': { step: 5, percentage: 100, label: 'Delivered' },
        'cancelled': { step: 0, percentage: 0, label: 'Cancelled' }
    };
    
    return statusSteps[orderStatus] || { step: 1, percentage: 20, label: 'Order Placed' };
};

const restoreProductStock = async (orderItems) => {
    try {
        // Import Variant model for direct variant collection updates
        const Variant = (await import('../../models/variantModel.js')).default;
        
        for (let item of orderItems) {
            const productId = item.productId._id || item.productId;
            const variantId = item.variantId._id || item.variantId;
            
            console.log('Restoring stock for:', { productId, variantId, quantity: item.quantity });
            
            // Update variant stock directly in the variant collection
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


// Add this function to your existing orderController
const downloadInvoice = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        
        // Get the order with populated data
        const order = await Order.findOne({ _id: id, userId })
            .populate({
                path: 'items.productId',
                select: 'productName'
            })
            .populate({
                path: 'items.variantId',
                select: 'color'
            });
        
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false, 
                message: 'Order not found or you do not have permission to access this order' 
            });
        }
        
        // Only allow invoice download for delivered orders
        if (order.orderStatus !== 'delivered') {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Invoice is only available for delivered orders' 
            });
        }
        
        // Generate invoice
        const invoiceService = new InvoiceService();
        const pdfBuffer = await invoiceService.generateInvoice(order, req.session.user);
        
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Download invoice error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to generate invoice' 
        });
    }
};

const requestReturn = async (req, res) => {
    try {
        const { orderId, returnReason, returnNotes } = req.body;
        const userId = req.session.user.id;

        const order = await Order.findOne({ _id: orderId, userId });

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (order.orderStatus !== 'delivered') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Only delivered orders can be returned'
            });
        }

        if (order.returnStatus !== 'none') {
            return res.status(StatusCodes.CONFLICT).json({
                success: false,
                message: 'Return request already exists for this order'
            });
        }

    
        const deliveryDate = order.updatedAt;
        const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
        const currentDate = new Date();

        if (currentDate - deliveryDate > returnWindow) {
            return res.status(StatusCodes.GONE).json({
                success: false,
                message: 'Return window has expired. Returns are only allowed within 7 days of delivery.'
            });
        }

        order.returnStatus = 'requested';
        order.returnReason = returnReason;
        order.returnNotes = returnNotes;
        order.returnRequestDate = new Date();

        await order.save();

        res.status(StatusCodes.ACCEPTED).json({
            success: true,
            message: 'Return request submitted successfully.'
        });

    } catch (error) {
        console.error('Request return error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to submit return request'
        });
    }
};
const updateReturnStatus = async (req, res) => {
    try {
        const { orderId, action, adminNotes } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (action === 'approve') {
            order.returnStatus = 'approved';
            order.returnApprovedDate = new Date();
            order.adminReturnNotes = adminNotes;
        } else if (action === 'reject') {
            order.returnStatus = 'rejected';
            order.adminReturnNotes = adminNotes;
        } else if (action === 'complete') {
            order.returnStatus = 'completed';
            order.returnCompletedDate = new Date();
            order.orderStatus = 'returned';
            order.refundAmount = order.totalAmount;
            order.refundStatus = 'processed';
            order.adminReturnNotes = adminNotes;

         
            for (const item of order.items) {
                await Product.findOneAndUpdate(
                    { _id: item.productId, 'variants._id': item.variantId },
                    { $inc: { 'variants.$.quantity': item.quantity } }
                );
            }
        }

        await order.save();

        res.status(StatusCodes.ACCEPTED).json({
            success: true,
            message: `Return ${action}d successfully`
        });

    } catch (error) {
        console.error('Update return status error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update return status'
        });
    }
};

const cancelOrderItem = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;
        
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId')
            .populate('items.variantId');
        
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }
        
        // Check if order can be modified
        if (!['pending', 'confirmed', 'processing'].includes(order.orderStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Items cannot be cancelled at this stage' 
            });
        }
        
        // Find the specific item
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);
        
        if (itemIndex === -1) {
            return res.status(StatusCodes.NOT_FOUND).json({ 
                success: false, 
                message: 'Item not found in order' 
            });
        }
        
        const item = order.items[itemIndex];
        
        // Check if item is already cancelled
        if (item.status === 'cancelled') {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Item is already cancelled' 
            });
        }
        
        // Cancel the item
        order.items[itemIndex].status = 'cancelled';
        order.items[itemIndex].cancellationReason = reason || 'Cancelled by customer';
        order.items[itemIndex].cancelledAt = new Date();
        order.items[itemIndex].cancelledBy = 'user';
        
        // Calculate refund amount for this item
        const itemRefundAmount = item.totalPrice;
        
        // Recalculate order totals
        const activeItems = order.items.filter(item => item.status === 'active');
        
        if (activeItems.length === 0) {
            // If all items are cancelled, cancel the entire order
            order.orderStatus = 'cancelled';
            order.cancellationReason = 'All items cancelled';
            order.cancelledAt = new Date();
            
            // Refund entire order amount
            let totalRefund = 0;
            
            if (order.paymentMethod !== 'cod' && order.paymentStatus === 'paid') {
                totalRefund += order.totalAmount;
            }
            
            if (order.walletAmountUsed > 0) {
                totalRefund += order.walletAmountUsed;
            }
            
            if (totalRefund > 0) {
                const user = await User.findById(userId);
                user.Wallet += totalRefund;
                await user.save();
                
                await WalletTransaction.create({
                    userId,
                    amount: totalRefund,
                    type: 'credit',
                    balance: user.Wallet,
                    paymentMethod: 'refund',
                    status: 'success',
                    description: `Refund for cancelled order #${order.orderNumber}`,
                    orderId: order._id
                });
                
                order.refundAmount = totalRefund;
                order.refundStatus = 'processed';
            }
        } else {
            // Partial cancellation - recalculate totals and refund item amount
            const oldSubtotal = order.subtotal;
            order.subtotal = activeItems.reduce((sum, item) => sum + item.totalPrice, 0);
            
            // Recalculate discount proportionally
            let newDiscount = 0;
            if (order.couponDiscount > 0) {
                newDiscount = Math.round((order.couponDiscount / oldSubtotal) * order.subtotal);
            }
            
            order.totalAmount = order.subtotal - newDiscount + (order.shippingCost || 0) + (order.tax || 0);
            
            // Refund the item amount if order was prepaid
            if (order.paymentMethod !== 'cod' && order.paymentStatus === 'paid') {
                const user = await User.findById(userId);
                user.Wallet += itemRefundAmount;
                await user.save();
                
                await WalletTransaction.create({
                    userId,
                    amount: itemRefundAmount,
                    type: 'credit',
                    balance: user.Wallet,
                    paymentMethod: 'refund',
                    status: 'success',
                    description: `Refund for cancelled item in order #${order.orderNumber}`,
                    orderId: order._id
                });
                
                order.refundAmount = (order.refundAmount || 0) + itemRefundAmount;
                order.refundStatus = 'processed';
            }
        }
        
        order.updatedAt = new Date();
        await order.save();
        
        // Restore stock for the cancelled item
        const Variant = (await import('../../models/variantModel.js')).default;
        await Variant.findByIdAndUpdate(
            item.variantId._id,
            { $inc: { quantity: item.quantity } }
        );
        
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Item cancelled successfully',
            orderStatus: order.orderStatus,
            newTotal: order.totalAmount
        });
        
    } catch (error) {
        console.error('Cancel order item error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Failed to cancel item' 
        });
    }
};



// Pay COD Order Online
const payCODOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        
        const order = await Order.findOne({ _id: id, userId });
        
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Check if order is COD and not delivered
        if (order.paymentMethod !== 'cod') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'This order is not a Cash on Delivery order'
            });
        }
        
        if (['delivered', 'cancelled', 'returned'].includes(order.orderStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Cannot pay for this order at this stage'
            });
        }
        
        if (order.paymentStatus === 'paid') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Order is already paid'
            });
        }
        
        // Create Razorpay order
        const instance = razorpayInstance;
        
        const timestamp = Date.now().toString().slice(-8);
        const orderIdShort = order._id.toString().slice(-8);
        const receipt = `COD${orderIdShort}${timestamp}`;
        
        const options = {
            amount: Math.round(order.totalAmount) * 100,
            currency: "INR",
            receipt: receipt
        };
        
        const razorpayOrder = await instance.orders.create(options);
        
        res.status(StatusCodes.OK).json({
            success: true,
            razorpayOrder: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key_id: process.env.RAZORPAY_KEY_ID
            },
            orderNumber: order.orderNumber
        });
        
    } catch (error) {
        console.error('Pay COD order error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to initiate payment'
        });
    }
};

// Verify COD Payment
const verifyCODPayment = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        
        const order = await Order.findOne({ _id: id, userId });
        
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Order not found'
            });
        }
        
        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");
        
        if (expectedSignature !== razorpay_signature) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Payment verification failed'
            });
        }
        
        // Update order
        order.paymentMethod = 'online';
        order.paymentStatus = 'paid';
        order.razorpayOrderId = razorpay_order_id;
        order.razorpayPaymentId = razorpay_payment_id;
        order.updatedAt = new Date();
        await order.save();
        
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Payment successful'
        });
        
    } catch (error) {
        console.error('Verify COD payment error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
};


export default {
    getUserOrders,
    getOrderDetails,
    cancelOrder,
    downloadInvoice,
    updateReturnStatus,
    requestReturn,
    cancelOrderItem,
    payCODOrder,
    verifyCODPayment
};