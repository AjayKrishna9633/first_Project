import Order from '../../models/orderModel.js';
import StatusCodes from '../../utils/statusCodes.js';
import { ORDER_MESSAGES } from '../../constants/messages.js';
import couponRecalculationService from '../../utils/couponRecalculationService.js';

/**
 * Coupon-Safe Item Cancellation
 * Handles cancellation of items from orders with coupons applied
 * Includes automatic recalculation and payment adjustment
 */

const cancelOrderItemWithCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        // Fetch order without transaction (standalone MongoDB doesn't support transactions)
        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId')
            .populate('items.variantId');

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: ORDER_MESSAGES.ORDER_NOT_FOUND
            });
        }

        // Verify order has coupon
        if (!order.couponCode) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'This order does not have a coupon. Use regular cancellation.'
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

        // STEP 1: Cancel item immediately (do NOT block cancellation)
        order.items[itemIndex].status = 'cancelled';
        order.items[itemIndex].cancellationReason = reason || 'Cancelled by customer';
        order.items[itemIndex].cancelledAt = new Date();
        order.items[itemIndex].cancelledBy = 'user';

        // STEP 2-6: Recalculate order with coupon validation
        const recalcResult = await couponRecalculationService.recalculateOrder(order, 'cancellation');

        console.log('Recalculation result:', recalcResult);

        if (!recalcResult.success) {
            console.error('Recalculation failed:', recalcResult.message);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: recalcResult.message || 'Failed to recalculate order'
            });
        }

        // Apply recalculation manually (without saving yet)
        if (!order.originalSubtotal) {
            order.originalSubtotal = order.subtotal;
            order.originalCouponDiscount = order.couponDiscount;
            order.originalTotalAmount = order.totalAmount;
        }

        order.subtotal = recalcResult.newSubtotal;
        order.couponDiscount = recalcResult.newCouponDiscount;
        order.totalAmount = recalcResult.newTotalAmount;
        order.couponValid = recalcResult.couponValid;

        if (!recalcResult.couponValid) {
            order.couponInvalidatedAt = new Date();
            order.couponInvalidationReason = recalcResult.couponInvalidationReason;
        }

        // If all items cancelled, mark order as cancelled
        if (recalcResult.activeItemsCount === 0) {
            order.orderStatus = 'cancelled';
            order.cancellationReason = 'All items cancelled';
            order.cancelledAt = new Date();
        }

        // Handle financial actions
        if (recalcResult.action === 'refund') {
            const User = (await import('../../models/userModal.js')).default;
            const WalletTransaction = (await import('../../models/WalletTransaction.js')).default;
            
            const user = await User.findById(userId);
            if (!user) {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Add refund to wallet
            user.Wallet += recalcResult.refundAmount;
            await user.save();

            // Create wallet transaction
            await WalletTransaction.create({
                userId,
                amount: recalcResult.refundAmount,
                type: 'credit',
                balance: user.Wallet,
                paymentMethod: 'refund',
                status: 'success',
                description: `Refund for cancellation - Order #${order.orderNumber}`,
                orderId: order._id
            });

            // Add to payment ledger
            order.paymentLedger.push({
                type: 'refund',
                amount: recalcResult.refundAmount,
                method: 'wallet',
                timestamp: new Date(),
                description: `Refund due to cancellation`,
                transactionId: `REF-${Date.now()}`
            });

            order.refundAmount = (order.refundAmount || 0) + recalcResult.refundAmount;
            order.refundStatus = 'processed';
        } else if (recalcResult.action === 'adjustment') {
            order.pendingAdjustment = recalcResult.adjustmentAmount;
            order.adjustmentReason = `Payment adjustment due to cancellation`;
            order.adjustmentCreatedAt = new Date();

            // Check wallet balance but DON'T auto-deduct
            // Let user confirm first via popup
            const User = (await import('../../models/userModal.js')).default;
            const user = await User.findById(userId);
            
            const hasWalletBalance = user && user.Wallet >= recalcResult.adjustmentAmount;
            
            // Store wallet balance info for response
            recalcResult.hasWalletBalance = hasWalletBalance;
            recalcResult.walletBalance = user ? user.Wallet : 0;
        }

        order.updatedAt = new Date();

        // Save order
        await order.save();

        // Restore stock for the cancelled item
        const Variant = (await import('../../models/variantModel.js')).default;
        await Variant.findByIdAndUpdate(
            item.variantId._id,
            { $inc: { quantity: item.quantity } }
        );

        // Generate user-friendly message
        let message = 'Item cancelled successfully.';
        if (!recalcResult.couponValid) {
            message += ' Coupon removed as order no longer meets minimum requirements.';
        } else {
            message += ' Coupon eligibility recalculated.';
        }
        
        if (recalcResult.action === 'refund') {
            message += ` Refund of ₹${recalcResult.refundAmount} processed to wallet.`;
        } else if (recalcResult.action === 'adjustment') {
            if (order.pendingAdjustment > 0) {
                message += ` Payment adjustment of ₹${recalcResult.adjustmentAmount} required.`;
            } else {
                message += ` Payment adjustment of ₹${recalcResult.adjustmentAmount} deducted from wallet.`;
            }
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message,
            orderStatus: order.orderStatus,
            newTotal: recalcResult.newTotalAmount,
            requiresWalletConfirmation: recalcResult.action === 'adjustment' && recalcResult.hasWalletBalance,
            data: {
                orderNumber: order.orderNumber,
                cancelledItem: {
                    productName: item.productId.productName,
                    quantity: item.quantity
                },
                recalculation: {
                    couponStillValid: recalcResult.couponValid,
                    couponInvalidationReason: recalcResult.couponInvalidationReason,
                    oldTotal: recalcResult.oldTotalAmount,
                    newTotal: recalcResult.newTotalAmount,
                    action: recalcResult.action,
                    refundAmount: recalcResult.refundAmount,
                    adjustmentAmount: recalcResult.adjustmentAmount,
                    hasWalletBalance: recalcResult.hasWalletBalance,
                    walletBalance: recalcResult.walletBalance
                },
                activeItemsRemaining: recalcResult.activeItemsCount
            }
        });

    } catch (error) {
        console.error('Cancel order item with coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to cancel item'
        });
    }
};

/**
 * Approve return request with coupon recalculation
 * Admin-only function
 */
const approveReturnWithCoupon = async (req, res) => {
    try {
        const { orderId, itemId, adminNotes } = req.body;

        const order = await Order.findById(orderId)
            .populate('items.productId')
            .populate('items.variantId');

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: ORDER_MESSAGES.ORDER_NOT_FOUND
            });
        }

        // Find the item
        const itemIndex = order.items.findIndex(item => item._id.toString() === itemId);

        if (itemIndex === -1) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Item not found'
            });
        }

        const item = order.items[itemIndex];

        // Verify return is requested or approved
        if (!['requested', 'approved'].includes(item.returnStatus)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'No return request found for this item'
            });
        }

        // Approve return
        order.items[itemIndex].returnStatus = 'approved';
        order.items[itemIndex].returnApprovedDate = new Date();
        order.items[itemIndex].adminReturnNotes = adminNotes;

        // Mark item as returned
        order.items[itemIndex].status = 'returned';
        order.items[itemIndex].returnCompletedDate = new Date();
        
        // Mark refund as approved
        order.items[itemIndex].refundApproved = true;
        order.items[itemIndex].refundApprovedDate = new Date();

        // If order has coupon, recalculate
        if (order.couponCode) {
            const recalcResult = await couponRecalculationService.recalculateOrder(order, 'return');

            if (recalcResult.success) {
                // Apply recalculation manually
                if (!order.originalSubtotal) {
                    order.originalSubtotal = order.subtotal;
                    order.originalCouponDiscount = order.couponDiscount;
                    order.originalTotalAmount = order.totalAmount;
                }

                order.subtotal = recalcResult.newSubtotal;
                order.couponDiscount = recalcResult.newCouponDiscount;
                order.totalAmount = recalcResult.newTotalAmount;
                order.couponValid = recalcResult.couponValid;

                if (!recalcResult.couponValid) {
                    order.couponInvalidatedAt = new Date();
                    order.couponInvalidationReason = recalcResult.couponInvalidationReason;
                }

                // Handle refund
                if (recalcResult.action === 'refund' && recalcResult.refundAmount > 0) {
                    const User = (await import('../../models/userModal.js')).default;
                    const WalletTransaction = (await import('../../models/WalletTransaction.js')).default;
                    
                    const user = await User.findById(order.userId);
                    if (user) {
                        user.Wallet += recalcResult.refundAmount;
                        await user.save();

                        await WalletTransaction.create({
                            userId: order.userId,
                            amount: recalcResult.refundAmount,
                            type: 'credit',
                            balance: user.Wallet,
                            paymentMethod: 'refund',
                            status: 'success',
                            description: `Refund for return - Order #${order.orderNumber}`,
                            orderId: order._id
                        });

                        order.paymentLedger.push({
                            type: 'refund',
                            amount: recalcResult.refundAmount,
                            method: 'wallet',
                            timestamp: new Date(),
                            description: 'Refund due to return',
                            transactionId: `REF-${Date.now()}`
                        });

                        order.refundAmount = (order.refundAmount || 0) + recalcResult.refundAmount;
                        order.refundStatus = 'processed';
                    }
                }
            }
        } else {
            // Regular return without coupon - simple refund
            const refundAmount = item.totalPrice;
            const User = (await import('../../models/userModal.js')).default;
            const WalletTransaction = (await import('../../models/WalletTransaction.js')).default;
            
            const user = await User.findById(order.userId);
            if (user) {
                user.Wallet += refundAmount;
                await user.save();

                await WalletTransaction.create({
                    userId: order.userId,
                    amount: refundAmount,
                    type: 'credit',
                    balance: user.Wallet,
                    paymentMethod: 'refund',
                    status: 'success',
                    description: `Refund for return - Order #${order.orderNumber}`,
                    orderId: order._id
                });

                order.refundAmount = (order.refundAmount || 0) + refundAmount;
                order.refundStatus = 'processed';
            }
        }

        // Restore stock
        const Variant = (await import('../../models/variantModel.js')).default;
        await Variant.findByIdAndUpdate(
            item.variantId._id,
            { $inc: { quantity: item.quantity } }
        );

        await order.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Return approved and processed successfully'
        });

    } catch (error) {
        console.error('Approve return with coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to approve return'
        });
    }
};

/**
 * Get order recalculation preview (before actual cancellation)
 * Helps user understand financial impact
 */
const getRecalculationPreview = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { orderId, itemId } = req.params;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('items.productId');

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: ORDER_MESSAGES.ORDER_NOT_FOUND
            });
        }

        if (!order.couponCode) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Order does not have a coupon'
            });
        }

        // Find item
        const item = order.items.find(i => i._id.toString() === itemId);

        if (!item) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Create temporary order copy for preview
        const orderCopy = JSON.parse(JSON.stringify(order));
        const itemIndexCopy = orderCopy.items.findIndex(i => i._id.toString() === itemId);
        orderCopy.items[itemIndexCopy].status = 'cancelled';

        // Convert back to mongoose document for recalculation
        const tempOrder = new Order(orderCopy);

        // Get recalculation preview
        const recalcResult = await couponRecalculationService.recalculateOrder(tempOrder, 'cancellation');

        res.status(StatusCodes.OK).json({
            success: true,
            preview: {
                itemToCancel: {
                    productName: item.productId.productName,
                    quantity: item.quantity,
                    price: item.totalPrice
                },
                currentTotal: order.totalAmount,
                newTotal: recalcResult.newTotalAmount,
                couponWillRemain: recalcResult.couponValid,
                couponRemovalReason: recalcResult.couponInvalidationReason,
                financialImpact: {
                    action: recalcResult.action,
                    refundAmount: recalcResult.refundAmount || 0,
                    adjustmentAmount: recalcResult.adjustmentAmount || 0
                }
            }
        });

    } catch (error) {
        console.error('Get recalculation preview error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to generate preview'
        });
    }
};

/**
 * Confirm wallet deduction for payment adjustment
 * Called after user confirms in popup
 */
const confirmWalletDeduction = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { orderId } = req.body;

        const order = await Order.findOne({ _id: orderId, userId });

        if (!order) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: ORDER_MESSAGES.ORDER_NOT_FOUND
            });
        }

        if (!order.pendingAdjustment || order.pendingAdjustment <= 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'No pending adjustment found'
            });
        }

        const User = (await import('../../models/userModal.js')).default;
        const WalletTransaction = (await import('../../models/WalletTransaction.js')).default;
        
        const user = await User.findById(userId);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.Wallet < order.pendingAdjustment) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // Deduct from wallet
        user.Wallet -= order.pendingAdjustment;
        await user.save();

        // Create wallet transaction
        await WalletTransaction.create({
            userId,
            amount: order.pendingAdjustment,
            type: 'debit',
            balance: user.Wallet,
            paymentMethod: 'wallet',
            status: 'success',
            description: `Payment adjustment for Order #${order.orderNumber}`,
            orderId: order._id
        });

        // Add to payment ledger
        order.paymentLedger.push({
            type: 'wallet_adjustment',
            amount: order.pendingAdjustment,
            method: 'wallet',
            timestamp: new Date(),
            description: 'Deducted from wallet after user confirmation',
            transactionId: `WADJ-${Date.now()}`
        });

        const adjustedAmount = order.pendingAdjustment;

        // Clear pending adjustment
        order.pendingAdjustment = 0;
        order.adjustmentReason = null;
        order.updatedAt = new Date();

        await order.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: `₹${adjustedAmount} deducted from wallet successfully`,
            newWalletBalance: user.Wallet
        });

    } catch (error) {
        console.error('Confirm wallet deduction error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to process wallet deduction'
        });
    }
};

export default {
    cancelOrderItemWithCoupon,
    approveReturnWithCoupon,
    getRecalculationPreview,
    confirmWalletDeduction
};
