import Order from '../../models/orderModel.js';
import User from '../../models/userModal.js';
import Product from '../../models/porductsModal.js';
import { formatNumber, formatCurrency, getFullNumber } from '../../utils/numberFormatter.js';
import StatusCodes from '../../utils/statusCodes.js';
import { ORDER_MESSAGES, ADMIN_MESSAGES, PAYMENT_MESSAGES } from '../../constants/messages.js';

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
       
        // Get filter parameters
        const { status, paymentStatus, returnStatus, search, sortBy, sortOrder } = req.query;
        
        // Build filter object
        let filter = {};
        if (status && status !== 'all') {
            filter.orderStatus = status;
        }
        if (paymentStatus && paymentStatus !== 'all') {
            filter.paymentStatus = paymentStatus;
        }
        if (returnStatus && returnStatus !== 'all') {
            if (returnStatus === 'none') {
                filter.$or = [
                    { returnStatus: { $exists: false } },
                    { returnStatus: 'none' }
                ];
            } else {
                filter.returnStatus = returnStatus;
            }
        }
        
        // Build sort object
        let sort = {};
        if (sortBy) {
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        } else {
            sort.createdAt = -1; // Default: newest first
        }
        
        // Search functionality
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                { 'shippingAddress.phone': { $regex: search, $options: 'i' } }
            ];
        }
        
        // Get orders with pagination
        const orders = await Order.find(filter)
            .populate({
                path: 'userId',
                select: 'fullName email phone'
            })
            .populate({
                path: 'items.productId',
                select: 'productName'
            })
            .sort(sort)
            .skip(skip)
            .limit(limit);
        
        // Get total count for pagination
        const totalOrders = await Order.countDocuments(filter);
        const totalPages = Math.ceil(totalOrders / limit);
        
        // Get order statistics
        const stats = await getOrderStats();
        
        res.render('admin/orders', {
            orders,
            currentPage: page,
            totalPages,
            totalOrders,
            limit,
            stats,
            filters: { status, paymentStatus, returnStatus, search, sortBy, sortOrder },
            admin: req.session.admin || { fullName: 'Admin' },
            formatNumber,
            formatCurrency,
            getFullNumber
        });
        
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('admin/error', { message: ADMIN_MESSAGES.ORDERS_LOAD_FAILED });
    }
};


    const getOrderDetails = async(req,res)=>{
        try{
             const id = req.params.id;
             const order = await Order.findById(id)
             .populate({
                path:'userId',
                 select: 'fullName email phone createdOn'
        
             }).populate({
                path:'items.productId',
                select:'productName category',
                populate:{
                    path:'category',
                    select:'name'
                }
             })
             .populate({
                path:'items.variantId',
                select:'color images'
             })

             if(!order){
                return res.status(StatusCodes.NOT_FOUND).render('admin/error',{message:ORDER_MESSAGES.ORDER_NOT_FOUND})
             }
             
              res.render('admin/orderDetails', { 
                  order,
                  formatNumber,
                  formatCurrency,
                  getFullNumber
              });

        }catch(error){
console.error('Get order details error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('admin/error', { message: ADMIN_MESSAGES.ORDER_DETAILS_FAILED });
   
        }
    }
    const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus, paymentStatus, notes } = req.body;
        
        // First, get the current order to check its status
        const currentOrder = await Order.findById(id);
        
        if (!currentOrder) {
            return res.json({ success: false, message: ORDER_MESSAGES.ORDER_NOT_FOUND });
        }
        
        // Prevent status updates for cancelled orders
        if (currentOrder.orderStatus === 'cancelled') {
            return res.json({ 
                success: false, 
                message: ORDER_MESSAGES.CANNOT_UPDATE_CANCELLED 
            });
        }
        
        const updateData = {
            updatedAt: new Date()
        };
        
        if (orderStatus) {
            // Prevent changing status to cancelled from admin side
            if (orderStatus === 'cancelled') {
                return res.json({ 
                    success: false, 
                    message: ORDER_MESSAGES.CANNOT_CANCEL_FROM_ADMIN 
                });
            }
            
            // Define status hierarchy (lower number = earlier stage)
            const statusHierarchy = {
                'pending': 1,
                'confirmed': 2,
                'processing': 3,
                'shipped': 4,
                'delivered': 5,
                'returned': 6
            };
            
            const currentStatusLevel = statusHierarchy[currentOrder.orderStatus];
            const newStatusLevel = statusHierarchy[orderStatus];
            
            // Prevent backward status changes
            if (newStatusLevel < currentStatusLevel) {
                return res.json({ 
                    success: false, 
                    message: `Cannot change status backward from ${currentOrder.orderStatus} to ${orderStatus}. Orders can only progress forward.`
                });
            }
            
            updateData.orderStatus = orderStatus;
        }
        
        if (paymentStatus) {
            // Prevent changing payment status backward from paid to pending/failed
            if (currentOrder.paymentStatus === 'paid' && paymentStatus !== 'paid') {
                return res.json({ 
                    success: false, 
                    message: 'Cannot change payment status from paid to unpaid. Payment status can only progress forward.'
                });
            }
            
            // Additional check for online/wallet payments
            if ((currentOrder.paymentMethod === 'online' || currentOrder.paymentMethod === 'wallet') && 
                currentOrder.paymentStatus === 'paid') {
                return res.json({ 
                    success: false, 
                    message: PAYMENT_MESSAGES.CANNOT_CHANGE_PAYMENT_STATUS 
                });
            }
            
            updateData.paymentStatus = paymentStatus;
        }
        
        if (notes) {
            updateData.adminNotes = notes;
        }
        
        const order = await Order.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );
        
        res.json({
            success: true,
            message: ORDER_MESSAGES.ORDER_UPDATED,
            order: {
                orderStatus: order.orderStatus,
                paymentStatus: order.paymentStatus,
                updatedAt: order.updatedAt
            }
        });
        
    } catch (error) {
        console.error('Update order status error:', error);
        res.json({ success: false, message: ORDER_MESSAGES.ORDER_UPDATE_FAILED });
    }
};



const getOrderStats = async () => {
    try {
        const stats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
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
                    },
                    returnRequests: {
                        $sum: { $cond: [{ $eq: ['$returnStatus', 'requested'] }, 1, 0] }
                    }
                }
            }
        ]);
        
        return stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            processingOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            returnRequests: 0
        };
        
    } catch (error) {
        console.error('Get order stats error:', error);
        return {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            processingOrders: 0,
            shippedOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            returnRequests: 0
        };
    }
};

const exportOrders = async (req, res) => {
    try {
        const { format, status, dateFrom, dateTo } = req.query;
        
        let filter = {};
        if (status && status !== 'all') {
            filter.orderStatus = status;
        }
        
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo);
        }
        
        const orders = await Order.find(filter)
            .populate('userId', 'fullName email')
            .populate('items.productId', 'productName')
            .sort({ createdAt: -1 });
        
        if (format === 'csv') {
            // Generate CSV
            const csv = generateCSV(orders);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
            res.send(csv);
        } else {
            // Return JSON
            res.json({ success: true, orders });
        }
        
    } catch (error) {
        console.error('Export orders error:', error);
        res.json({ success: false, message: 'Failed to export orders' });
    }
};

const generateCSV = (orders) => {
    const headers = [
        'Order Number',
        'Customer Name',
        'Customer Email',
        'Order Date',
        'Status',
        'Payment Status',
        'Total Amount',
        'Items Count'
    ];
    
    let csv = headers.join(',') + '\n';
    
    orders.forEach(order => {
        const row = [
            order.orderNumber,
            order.userId?.fullName || 'N/A',
            order.userId?.email || 'N/A',
            order.createdAt.toISOString().split('T')[0],
            order.orderStatus,
            order.paymentStatus,
            order.totalAmount,
            order.items.length
        ];
        csv += row.join(',') + '\n';
    });
    
    return csv;
};

const updateReturnStatus = async (req, res) => {
    try {
        const { orderId, action, adminNotes } = req.body;

        console.log('Update return status request:', { orderId, action, adminNotes });

        const order = await Order.findById(orderId).populate('userId');

        if (!order) {
            console.log('Order not found:', orderId);
            return res.json({
                success: false,
                message: ORDER_MESSAGES.ORDER_NOT_FOUND
            });
        }

        console.log('Order found, current return status:', order.returnStatus);

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
            
            // Credit User Wallet
             if (order.totalAmount > 0) {
                 const user = await User.findById(order.userId._id);
                 if (user) {
                     user.Wallet += order.totalAmount;
                     await user.save();
                     
                     await WalletTransaction.create({
                        userId: user._id,
                        amount: order.totalAmount,
                        type: 'credit',
                        balance: user.Wallet,
                        paymentMethod: 'wallet',
                        status: 'success',
                        description: `Refund for Returned Order #${order.orderNumber}`,
                        orderId: order._id
                    });
                 }
             }

            // Restore stock for returned items
            console.log('Restoring stock for items:', order.items.length);
            for (const item of order.items) {
                try {
                    console.log('Updating stock for product:', item.productId, 'variant:', item.variantId, 'quantity:', item.quantity);
                    
                    const result = await Product.findOneAndUpdate(
                        { _id: item.productId, 'variants._id': item.variantId },
                        { $inc: { 'variants.$.quantity': item.quantity } },
                        { new: true }
                    );
                    
                    if (!result) {
                        console.log('Failed to update stock for product:', item.productId, 'variant:', item.variantId);
                    } else {
                        console.log('Stock updated successfully for product:', item.productId);
                    }
                } catch (stockError) {
                    console.error('Stock update error for item:', item, stockError);
                    // Continue with other items even if one fails
                }
            }
        }

        console.log('Saving order with new status:', order.returnStatus);
        await order.save();

        console.log(ORDER_MESSAGES.RETURN_STATUS_UPDATED);
        res.json({
            success: true,
            message: `Return ${action}d successfully`
        });

    } catch (error) {
        console.error('Update return status error:', error);
        res.json({
            success: false,
            message: 'Failed to update return status: ' + error.message
        });
    }
};

// Admin invoice download function
const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get the order with populated data (admin can access any order)
        const order = await Order.findById(id)
            .populate({
                path: 'userId',
                select: 'fullName email phone'
            })
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
                message: ORDER_MESSAGES.ORDER_NOT_FOUND 
            });
        }
        
        // Only allow invoice download for confirmed, processing, shipped, or delivered orders
        if (!['confirmed', 'processing', 'shipped', 'delivered'].includes(order.orderStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ 
                success: false, 
                message: ORDER_MESSAGES.INVOICE_NOT_AVAILABLE 
            });
        }
        
        // Import invoice service
        const { default: InvoiceService } = await import('../../config/invoiceService.js');
        
        // Generate invoice
        const invoiceService = new InvoiceService();
        const pdfBuffer = await invoiceService.generateInvoice(order, order.userId);
        
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the PDF
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Admin download invoice error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: ORDER_MESSAGES.INVOICE_FAILED 
        });
    }
};

export default {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    exportOrders,
    updateReturnStatus,
    downloadInvoice
};
