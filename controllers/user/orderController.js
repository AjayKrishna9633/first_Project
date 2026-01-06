import Order from '../../models/orderModel.js';
import Product from '../../models/porductsModal.js';
import InvoiceService from '../../config/invoiceService.js';
import { ObjectId } from 'mongodb';
import { StatusCodes } from 'http-status-codes'

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
            user: req.session.user
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
            user: req.session.user
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
        const { reason } = req.body;
        
        const order = await Order.findOne({ _id: id, userId });
        
        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Order not found' });
        }
        
       
        if (!['pending', 'confirmed'].includes(order.orderStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: 'Order cannot be cancelled at this stage' 
            });
        }
        
       
        order.orderStatus = 'cancelled';
        order.cancellationReason = reason || 'Cancelled by customer';
        order.cancelledAt = new Date();
        order.updatedAt = new Date();
        
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
        for (let item of orderItems) {
            
            const productId = item.productId._id || item.productId;
            const variantId = item.variantId._id || item.variantId;
            
            console.log('Restoring stock for:', { productId, variantId, quantity: item.quantity });
            
            await Product.updateOne(
                { 
                    '_id': productId,
                    'variants._id': variantId
                },
                { 
                    '$inc': { 'variants.$.quantity': item.quantity }
                }
            );
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



export default {
    getUserOrders,
    getOrderDetails,
    cancelOrder,
    downloadInvoice,
    updateReturnStatus,
    requestReturn
};