import Order from '../models/orderModel.js';
import StatusCodes from '../utils/statusCodes.js';

/**
 * Payment Adjustment Guard Middleware
 * Blocks checkout if user has pending payment adjustments from previous orders
 */

export const checkPendingAdjustments = async (req, res, next) => {
    try {
        const userId = req.session?.user?.id;

        if (!userId) {
            return next();
        }

        // Check for orders with pending adjustments
        const ordersWithPendingAdjustments = await Order.find({
            userId,
            pendingAdjustment: { $gt: 0 }
        }).select('orderNumber pendingAdjustment adjustmentReason');

        if (ordersWithPendingAdjustments.length > 0) {
            const totalPending = ordersWithPendingAdjustments.reduce(
                (sum, order) => sum + order.pendingAdjustment,
                0
            );

            // Block checkout
            return res.status(StatusCodes.PAYMENT_REQUIRED).json({
                success: false,
                blocked: true,
                reason: 'pending_adjustment',
                message: 'You have a pending payment from previous order adjustment. Please clear it before placing a new order.',
                details: {
                    totalPendingAmount: totalPending,
                    affectedOrders: ordersWithPendingAdjustments.map(order => ({
                        orderNumber: order.orderNumber,
                        pendingAmount: order.pendingAdjustment,
                        reason: order.adjustmentReason
                    }))
                }
            });
        }

        next();
    } catch (error) {
        console.error('Payment adjustment guard error:', error);
        // Don't block checkout on error, but log it
        next();
    }
};

/**
 * Get user's total pending adjustments
 */
export const getUserPendingAdjustments = async (userId) => {
    try {
        const orders = await Order.find({
            userId,
            pendingAdjustment: { $gt: 0 }
        });

        const totalPending = orders.reduce(
            (sum, order) => sum + order.pendingAdjustment,
            0
        );

        return {
            hasPending: totalPending > 0,
            totalAmount: totalPending,
            orderCount: orders.length,
            orders: orders.map(order => ({
                orderId: order._id,
                orderNumber: order.orderNumber,
                amount: order.pendingAdjustment,
                reason: order.adjustmentReason,
                createdAt: order.adjustmentCreatedAt
            }))
        };
    } catch (error) {
        console.error('Get pending adjustments error:', error);
        return {
            hasPending: false,
            totalAmount: 0,
            orderCount: 0,
            orders: []
        };
    }
};

/**
 * Clear pending adjustment after payment
 */
export const clearPendingAdjustment = async (orderId, paymentDetails) => {
    try {
        const order = await Order.findById(orderId);

        if (!order || order.pendingAdjustment <= 0) {
            return {
                success: false,
                message: 'No pending adjustment found'
            };
        }

        // Add to payment ledger
        order.paymentLedger.push({
            type: 'adjustment',
            amount: order.pendingAdjustment,
            method: paymentDetails.method || 'online',
            timestamp: new Date(),
            description: 'Payment adjustment cleared',
            transactionId: paymentDetails.transactionId || `ADJ-${Date.now()}`
        });

        // Clear pending adjustment
        const clearedAmount = order.pendingAdjustment;
        order.pendingAdjustment = 0;
        order.adjustmentReason = null;

        // Restore normal order status if it was in adjustment pending state
        if (order.orderStatus === 'payment_adjustment_pending') {
            order.orderStatus = 'confirmed';
        }

        order.updatedAt = new Date();
        await order.save();

        return {
            success: true,
            message: 'Payment adjustment cleared successfully',
            clearedAmount
        };
    } catch (error) {
        console.error('Clear pending adjustment error:', error);
        return {
            success: false,
            message: 'Failed to clear adjustment'
        };
    }
};

export default {
    checkPendingAdjustments,
    getUserPendingAdjustments,
    clearPendingAdjustment
};
