import Coupon from '../models/couponModel.js';
import User from '../models/userModal.js';
import WalletTransaction from '../models/WalletTransaction.js';

/**
 * Coupon-Safe Recalculation Service
 * Handles order recalculation when items are cancelled or returned from coupon orders
 */

class CouponRecalculationService {
    /**
     * Main recalculation function for coupon orders
     * @param {Object} order - Mongoose order document
     * @param {String} triggeredBy - 'cancellation' or 'return'
     * @returns {Object} - Recalculation result with financial adjustments
     */
    async recalculateOrder(order, triggeredBy = 'cancellation') {
        try {
            // Only process if order has a coupon
            if (!order.couponCode) {
                return {
                    success: false,
                    message: 'Order does not have a coupon applied',
                    requiresRecalculation: false
                };
            }

            // Get active items (not cancelled or returned)
            const activeItems = order.items.filter(item => item.status === 'active');

            if (activeItems.length === 0) {
                // All items cancelled/returned - full refund scenario
                return this.handleFullCancellation(order);
            }

            // Step 1: Calculate remaining post-offer subtotal
            const remainingSubtotal = this.calculatePostOfferSubtotal(activeItems);

            // Step 2: Fetch and revalidate coupon
            const coupon = await Coupon.findOne({ code: order.couponCode });
            
            if (!coupon) {
                return {
                    success: false,
                    message: 'Coupon not found',
                    requiresRecalculation: false
                };
            }

            // Step 3: Check coupon eligibility
            const couponEligible = remainingSubtotal >= (coupon.minimumPrice || 0);

            let newCouponDiscount = 0;
            let couponValid = true;
            let couponInvalidationReason = null;

            if (couponEligible) {
                // Coupon remains valid - redistribute discount
                newCouponDiscount = this.calculateCouponDiscount(coupon, remainingSubtotal);
                
                // Redistribute coupon share across remaining items
                this.redistributeCouponShare(activeItems, newCouponDiscount);
            } else {
                // Coupon invalid - remove discount from remaining items
                couponValid = false;
                couponInvalidationReason = `Subtotal ₹${remainingSubtotal} below minimum ₹${coupon.minimumPrice}`;
                
                // Reset coupon share for all active items
                activeItems.forEach(item => {
                    item.couponShare = 0;
                    item.finalPrice = item.priceAfterOffer;
                });
            }

            // Step 4: Calculate new payable amount
            const newSubtotal = remainingSubtotal;
            const newTotalAmount = newSubtotal - newCouponDiscount + (order.shippingCost || 0) + (order.tax || 0);

            // Step 5: Calculate financial balance
            const amountPaid = this.calculateAmountPaid(order);
            const balance = amountPaid - newTotalAmount;

            // Step 6: Prepare recalculation result
            const result = {
                success: true,
                requiresRecalculation: true,
                couponValid,
                couponInvalidationReason,
                oldSubtotal: order.subtotal,
                newSubtotal,
                oldCouponDiscount: order.couponDiscount,
                newCouponDiscount,
                oldTotalAmount: order.totalAmount,
                newTotalAmount,
                amountPaid,
                balance,
                activeItemsCount: activeItems.length,
                triggeredBy
            };

            // Step 7: Determine financial action
            if (balance > 0) {
                // Refund scenario: user paid more than they should for remaining items
                result.action = 'refund';
                result.refundAmount = balance;
            } else if (balance < 0) {
                // Payment adjustment scenario: user needs to pay more
                result.action = 'adjustment';
                result.adjustmentAmount = Math.abs(balance);
            } else {
                // No financial action needed
                result.action = 'none';
            }

            return result;
        } catch (error) {
            console.error('Recalculate order error:', error);
            return {
                success: false,
                message: 'Failed to recalculate order: ' + error.message,
                requiresRecalculation: false
            };
        }
    }

    /**
     * Calculate post-offer subtotal from active items
     */
    calculatePostOfferSubtotal(items) {
        return items.reduce((sum, item) => {
            const priceAfterOffer = item.priceAfterOffer || item.price;
            return sum + (priceAfterOffer * item.quantity);
        }, 0);
    }

    /**
     * Calculate coupon discount based on coupon type
     */
    calculateCouponDiscount(coupon, subtotal) {
        let discount = 0;

        if (coupon.discountType === 'percentage') {
            discount = (subtotal * coupon.offerPrice) / 100;
            
            // Apply maximum discount cap if exists
            if (coupon.maximumPrice && discount > coupon.maximumPrice) {
                discount = coupon.maximumPrice;
            }
        } else if (coupon.discountType === 'fixed') {
            discount = coupon.offerPrice;
            
            // Discount cannot exceed subtotal
            if (discount > subtotal) {
                discount = subtotal;
            }
        }

        return Math.round(discount * 100) / 100; // Round to 2 decimals
    }

    /**
     * Redistribute coupon share proportionally across active items
     */
    redistributeCouponShare(items, totalCouponDiscount) {
        const totalPostOfferAmount = this.calculatePostOfferSubtotal(items);

        items.forEach(item => {
            const itemPostOfferTotal = (item.priceAfterOffer || item.price) * item.quantity;
            const proportion = itemPostOfferTotal / totalPostOfferAmount;
            
            item.couponShare = Math.round(totalCouponDiscount * proportion * 100) / 100;
            item.finalPrice = (item.priceAfterOffer || item.price) - (item.couponShare / item.quantity);
        });
    }

    /**
     * Calculate total amount paid (initial + adjustments - refunds)
     */
    calculateAmountPaid(order) {
        if (!order.paymentLedger || order.paymentLedger.length === 0) {
            // For COD orders that haven't been paid yet
            if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
                return 0;
            }
            
            // Fallback: use original total amount (before any recalculations) minus refunds
            const originalAmount = order.originalTotalAmount || order.totalAmount;
            return originalAmount - (order.refundAmount || 0);
        }

        // Sum all payments (initial + adjustments) and subtract refunds
        const totalPaid = order.paymentLedger
            .filter(entry => ['initial', 'adjustment', 'wallet_adjustment'].includes(entry.type))
            .reduce((sum, entry) => sum + entry.amount, 0);
        
        const totalRefunded = order.paymentLedger
            .filter(entry => entry.type === 'refund')
            .reduce((sum, entry) => sum + entry.amount, 0);
        
        return totalPaid - totalRefunded;
    }

    /**
     * Handle full cancellation scenario
     */
    async handleFullCancellation(order) {
        // Calculate net amount (paid - already refunded)
        const amountPaid = this.calculateAmountPaid(order);

        return {
            success: true,
            requiresRecalculation: true,
            couponValid: false,
            couponInvalidationReason: 'All items cancelled',
            oldSubtotal: order.subtotal,
            newSubtotal: 0,
            oldCouponDiscount: order.couponDiscount,
            newCouponDiscount: 0,
            oldTotalAmount: order.totalAmount,
            newTotalAmount: 0,
            amountPaid,
            balance: amountPaid,
            activeItemsCount: 0,
            action: 'refund',
            refundAmount: amountPaid,
            triggeredBy: 'full_cancellation'
        };
    }

    /**
     * Apply recalculation result to order document
     */
    async applyRecalculation(order, recalcResult) {
        // Store original values if not already stored
        if (!order.originalSubtotal) {
            order.originalSubtotal = order.subtotal;
            order.originalCouponDiscount = order.couponDiscount;
            order.originalTotalAmount = order.totalAmount;
        }

        // Update order amounts
        order.subtotal = recalcResult.newSubtotal;
        order.couponDiscount = recalcResult.newCouponDiscount;
        order.totalAmount = recalcResult.newTotalAmount;
        order.couponValid = recalcResult.couponValid;

        if (!recalcResult.couponValid) {
            order.couponInvalidatedAt = new Date();
            order.couponInvalidationReason = recalcResult.couponInvalidationReason;
        }

        // Handle financial actions
        if (recalcResult.action === 'refund') {
            await this.processRefund(order, recalcResult.refundAmount, recalcResult.triggeredBy);
        } else if (recalcResult.action === 'adjustment') {
            await this.createPaymentAdjustment(order, recalcResult.adjustmentAmount, recalcResult.triggeredBy);
        }

        order.updatedAt = new Date();
        await order.save();

        return {
            success: true,
            message: this.getRecalculationMessage(recalcResult),
            recalcResult
        };
    }

    /**
     * Process refund to wallet or original payment method
     */
    async processRefund(order, refundAmount, reason) {
        const user = await User.findById(order.userId);
        
        if (!user) {
            throw new Error('User not found');
        }

        // Add refund to wallet
        user.Wallet += refundAmount;
        await user.save();

        // Create wallet transaction
        await WalletTransaction.create({
            userId: order.userId,
            amount: refundAmount,
            type: 'credit',
            balance: user.Wallet,
            paymentMethod: 'refund',
            status: 'success',
            description: `Refund for ${reason} - Order #${order.orderNumber}`,
            orderId: order._id
        });

        // Add to payment ledger
        order.paymentLedger.push({
            type: 'refund',
            amount: refundAmount,
            method: 'wallet',
            timestamp: new Date(),
            description: `Refund due to ${reason}`,
            transactionId: `REF-${Date.now()}`
        });

        order.refundAmount = (order.refundAmount || 0) + refundAmount;
        order.refundStatus = 'processed';
    }

    /**
     * Create payment adjustment record
     */
    async createPaymentAdjustment(order, adjustmentAmount, reason) {
        order.pendingAdjustment = adjustmentAmount;
        order.adjustmentReason = `Payment adjustment due to ${reason}`;
        order.adjustmentCreatedAt = new Date();

        // Try wallet auto-deduction
        const walletDeducted = await this.attemptWalletAutoDeduction(order, adjustmentAmount);

        if (!walletDeducted) {
            // Update order status to indicate pending adjustment
            if (!['cancelled', 'returned'].includes(order.orderStatus)) {
                order.orderStatus = 'payment_adjustment_pending';
            }
        }
    }

    /**
     * Attempt to auto-deduct from wallet
     */
    async attemptWalletAutoDeduction(order, adjustmentAmount) {
        const user = await User.findById(order.userId);
        
        if (!user) {
            return false;
        }

        if (user.Wallet >= adjustmentAmount) {
            // Sufficient wallet balance - deduct
            user.Wallet -= adjustmentAmount;
            await user.save();

            // Create wallet transaction
            await WalletTransaction.create({
                userId: order.userId,
                amount: adjustmentAmount,
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
                amount: adjustmentAmount,
                method: 'wallet',
                timestamp: new Date(),
                description: 'Auto-deducted from wallet',
                transactionId: `WADJ-${Date.now()}`
            });

            // Clear pending adjustment
            order.pendingAdjustment = 0;
            order.adjustmentReason = null;

            return true;
        }

        return false;
    }

    /**
     * Generate user-friendly message
     */
    getRecalculationMessage(recalcResult) {
        if (!recalcResult.couponValid) {
            return `Item ${recalcResult.triggeredBy === 'cancellation' ? 'cancelled' : 'returned'} successfully. Coupon removed as order no longer meets minimum requirements.`;
        }

        if (recalcResult.action === 'refund') {
            return `Item ${recalcResult.triggeredBy === 'cancellation' ? 'cancelled' : 'returned'} successfully. Refund of ₹${recalcResult.refundAmount} processed to wallet.`;
        }

        if (recalcResult.action === 'adjustment') {
            return `Item ${recalcResult.triggeredBy === 'cancellation' ? 'cancelled' : 'returned'} successfully. Payment adjustment of ₹${recalcResult.adjustmentAmount} required.`;
        }

        return `Item ${recalcResult.triggeredBy === 'cancellation' ? 'cancelled' : 'returned'} successfully. Coupon eligibility recalculated.`;
    }
}

export default new CouponRecalculationService();
