import Coupon from '../models/couponModel.js';

/**
 * Dynamic Refund Projection Service
 * Calculates projected refunds for partial returns with coupon invalidation
 * Prevents negative refund scenarios by blocking problematic single-item returns
 */

class ReturnProjectionService {
    /**
     * Calculate projected refund for a single item return
     * @param {Object} order - Mongoose order document
     * @param {String} itemId - ID of item to return
     * @returns {Object} - Projection result with return eligibility
     */
    async calculateItemReturnProjection(order, itemId) {
        try {
            // Find the item to return
            const item = order.items.find(i => i._id.toString() === itemId);
            
            if (!item) {
                return {
                    success: false,
                    message: 'Item not found in order'
                };
            }

            // Check if item is eligible for return
            if (item.status !== 'active') {
                return {
                    success: false,
                    message: 'Item is not eligible for return',
                    isReturnAllowed: false
                };
            }

            // If no coupon, simple refund calculation
            if (!order.couponCode) {
                return this.calculateSimpleRefund(order, item);
            }

            // Coupon-based projection
            return await this.calculateCouponAwareProjection(order, item);

        } catch (error) {
            console.error('Calculate item return projection error:', error);
            return {
                success: false,
                message: 'Failed to calculate return projection: ' + error.message
            };
        }
    }

    /**
     * Calculate simple refund (no coupon)
     */
    calculateSimpleRefund(order, item) {
        const amountPaid = this.calculateAmountPaid(order);
        const refundAmount = item.totalPrice;

        return {
            success: true,
            isReturnAllowed: true,
            projectedRefundAmount: refundAmount,
            explanationCode: 'SIMPLE_REFUND',
            details: {
                itemPrice: item.totalPrice,
                amountPaid,
                refundAmount
            }
        };
    }

    /**
     * Calculate coupon-aware projection
     */
    async calculateCouponAwareProjection(order, itemToReturn) {
        // Step 1: Fetch order data
        const amountPaid = this.calculateAmountPaid(order);
        const originalSubtotal = order.subtotal;
        const originalCouponDiscount = order.couponDiscount;

        // Step 2: Simulate the return - calculate remaining items
        const remainingItems = order.items.filter(i => 
            i.status === 'active' && i._id.toString() !== itemToReturn._id.toString()
        );

        if (remainingItems.length === 0) {
            // Full order return - always allowed
            return {
                success: true,
                isReturnAllowed: true,
                projectedRefundAmount: amountPaid,
                explanationCode: 'FULL_ORDER_RETURN',
                details: {
                    itemPrice: itemToReturn.totalPrice,
                    amountPaid,
                    refundAmount: amountPaid,
                    message: 'Returning all items - full refund'
                }
            };
        }

        // Step 3: Calculate new subtotal after return
        const newSubtotal = this.calculatePostOfferSubtotal(remainingItems);

        // Step 4: Check coupon validity
        const coupon = await Coupon.findOne({ code: order.couponCode });
        
        if (!coupon) {
            // Coupon not found - treat as simple refund
            return this.calculateSimpleRefund(order, itemToReturn);
        }

        const couponStillValid = newSubtotal >= (coupon.minimumPrice || 0);

        let newCouponDiscount = 0;
        let newTotalCost = 0;

        if (couponStillValid) {
            // Coupon remains valid - recalculate discount
            newCouponDiscount = this.calculateCouponDiscount(coupon, newSubtotal);
            newTotalCost = newSubtotal - newCouponDiscount + (order.shippingCost || 0) + (order.tax || 0);
        } else {
            // Coupon invalidated - full price for remaining items
            newTotalCost = newSubtotal + (order.shippingCost || 0) + (order.tax || 0);
        }

        // Step 5: Calculate projected refund
        const projectedRefund = amountPaid - newTotalCost;

        // Step 6: Determine if return is allowed
        const isReturnAllowed = projectedRefund >= 0;

        // Step 7: Build response
        const result = {
            success: true,
            isReturnAllowed,
            projectedRefundAmount: Math.max(0, projectedRefund),
            explanationCode: this.getExplanationCode(couponStillValid, projectedRefund),
            details: {
                itemToReturn: {
                    name: itemToReturn.productId?.productName || 'Item',
                    price: itemToReturn.totalPrice,
                    quantity: itemToReturn.quantity
                },
                coupon: {
                    code: order.couponCode,
                    minimumSpend: coupon.minimumPrice,
                    stillValid: couponStillValid,
                    originalDiscount: originalCouponDiscount,
                    newDiscount: newCouponDiscount
                },
                financial: {
                    amountPaid,
                    originalSubtotal,
                    newSubtotal,
                    newTotalCost,
                    projectedRefund
                },
                remainingItemsCount: remainingItems.length
            }
        };

        // Add user-friendly messages
        if (isReturnAllowed) {
            if (couponStillValid) {
                result.message = `Return allowed. Coupon remains valid. Refund: ₹${projectedRefund.toFixed(2)}`;
            } else {
                result.message = `Return allowed. Coupon will be invalidated. Refund: ₹${projectedRefund.toFixed(2)}`;
                result.warningMessage = `Your coupon "${order.couponCode}" will be removed because the remaining order value (₹${newSubtotal}) is below the minimum spend (₹${coupon.minimumPrice}).`;
            }
        } else {
            result.message = 'Cannot return this item alone';
            result.blockMessage = `Returning this item would invalidate your coupon "${order.couponCode}". The remaining items would cost ₹${newTotalCost.toFixed(2)} at full price, which exceeds the ₹${amountPaid.toFixed(2)} you originally paid.`;
            result.alternativeAction = 'RETURN_ENTIRE_ORDER';
            result.alternativeMessage = `You can return the entire order for a full refund of ₹${amountPaid.toFixed(2)}.`;
        }

        return result;
    }

    /**
     * Calculate post-offer subtotal from items
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
            
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else if (coupon.discountType === 'fixed') {
            discount = coupon.offerPrice;
            
            if (discount > subtotal) {
                discount = subtotal;
            }
        }

        return Math.round(discount * 100) / 100;
    }

    /**
     * Calculate total amount paid
     */
    calculateAmountPaid(order) {
        // Use snapshot if available (most accurate)
        if (order.snapshotFinalTotal) {
            return order.snapshotFinalTotal;
        }

        // Use payment ledger if available
        if (order.paymentLedger && order.paymentLedger.length > 0) {
            const totalPaid = order.paymentLedger
                .filter(entry => ['initial', 'adjustment', 'wallet_adjustment'].includes(entry.type))
                .reduce((sum, entry) => sum + entry.amount, 0);
            
            const totalRefunded = order.paymentLedger
                .filter(entry => entry.type === 'refund')
                .reduce((sum, entry) => sum + entry.amount, 0);
            
            return totalPaid - totalRefunded;
        }

        // Fallback to original total
        const originalAmount = order.originalTotalAmount || order.totalAmount;
        return originalAmount - (order.refundAmount || 0);
    }

    /**
     * Get explanation code for UI rendering
     */
    getExplanationCode(couponValid, projectedRefund) {
        if (projectedRefund >= 0) {
            return couponValid ? 'POSITIVE_REFUND_COUPON_VALID' : 'POSITIVE_REFUND_COUPON_INVALID';
        } else {
            return 'NEGATIVE_REFUND_BLOCKED';
        }
    }

    /**
     * Calculate projections for all items in order
     * @param {Object} order - Mongoose order document
     * @returns {Object} - Map of itemId to projection
     */
    async calculateAllItemProjections(order) {
        const projections = {};

        for (const item of order.items) {
            if (item.status === 'active') {
                projections[item._id.toString()] = await this.calculateItemReturnProjection(order, item._id.toString());
            }
        }

        return {
            success: true,
            projections,
            orderNumber: order.orderNumber,
            hasCoupon: !!order.couponCode
        };
    }
}

export default new ReturnProjectionService();
