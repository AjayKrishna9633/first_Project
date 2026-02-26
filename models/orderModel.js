import mongoose from "mongoose";
const { Schema } = mongoose;

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        variantId: {
            type: Schema.Types.ObjectId,
            ref: 'variant',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        // Pricing snapshot for coupon recalculation
        basePrice: {
            type: Number,
            default: 0
        },
        offerDiscount: {
            type: Number,
            default: 0
        },
        priceAfterOffer: {
            type: Number,
            default: 0
        },
        couponShare: {
            type: Number,
            default: 0
        },
        finalPrice: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['active', 'cancelled', 'returned'],
            default: 'active'
        },
        cancellationReason: String,
        cancelledAt: Date,
        cancelledBy: {
            type: String,
            enum: ['user', 'admin']
        },
        returnStatus: {
            type: String,
            enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
            default: 'none'
        },
        returnReason: {
            type: String,
            enum: [
                'DEFECTIVE',
                'DAMAGED_SHIPPING',
                'WRONG_ITEM',
                'NO_LONGER_NEEDED',
                'BETTER_PRICE',
                'ORDERED_MISTAKE',
                'LATE_ARRIVAL',
                'OTHER'
            ],
            default: null
        },
        returnRequestDate: Date,
        returnApprovedDate: Date,
        returnCompletedDate: Date,
        returnNotes: String,
        adminReturnNotes: String,
        refundAmount: {
            type: Number,
            default: 0
        },
        refundApproved: {
            type: Boolean,
            default: false
        },
        refundApprovedDate: Date,
        refundApproved: {
            type: Boolean,
            default: false
        },
        refundApprovedDate: Date
    }],
    shippingAddress: {
        fullName: String,
        phone: String,
        streetAddress: String,
        city: String,
        state: String,
        pinCode: String,
        country: String,
        addressType: String
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'online', 'wallet'],
        required: true
    },
    razorpayOrderId: {
        type: String
    },
    razorpayPaymentId: {
        type: String
    },
    couponCode: {
        type: String
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    walletAmountUsed: {
        type: Number,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
        default: 'pending'
    },
    subtotal: {
        type: Number,
        required: true
    },
    shippingCost: {
        type: Number,
        default: 0
    },
    tax: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    orderNotes: String,
    adminNotes: String,
    cancellationReason: String,
    cancelledAt: Date,
    trackingNumber: String,
    estimatedDelivery: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    returnStatus: {
        type: String,
        enum: ['none', 'requested', 'approved', 'rejected', 'completed'],
        default: 'none'
    },
    returnReason: {
        type:String,
        enum:[
    'DEFECTIVE',
    'DAMAGED_SHIPPING', 
    'WRONG_ITEM',
    'NO_LONGER_NEEDED',
    'BETTER_PRICE', 
    'ORDERED_MISTAKE',
    'LATE_ARRIVAL',
    'OTHER'
],
default: null
    },
    returnRequestDate: Date,
    returnApprovedDate: Date,
    returnCompletedDate: Date,
    returnNotes: String,
    adminReturnNotes: String,
    refundAmount: {
        type: Number,
        default: 0
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'processed'],
        default: 'none'
    },
    // Payment ledger for tracking all financial transactions
    paymentLedger: [{
        type: {
            type: String,
            enum: ['initial', 'adjustment', 'wallet_adjustment', 'refund'],
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        method: {
            type: String,
            enum: ['cod', 'online', 'wallet']
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        description: String,
        transactionId: String
    }],
    // Payment adjustment tracking
    pendingAdjustment: {
        type: Number,
        default: 0
    },
    adjustmentReason: String,
    adjustmentCreatedAt: Date,
    // Original amounts for recalculation reference
    originalSubtotal: {
        type: Number,
        default: 0
    },
    originalCouponDiscount: {
        type: Number,
        default: 0
    },
    originalTotalAmount: {
        type: Number,
        default: 0
    },
    // Snapshot of amounts at order creation (before any modifications)
    snapshotSubtotalBeforeCoupon: {
        type: Number,
        default: 0
    },
    snapshotSubtotalAfterCoupon: {
        type: Number,
        default: 0
    },
    snapshotCouponDiscount: {
        type: Number,
        default: 0
    },
    snapshotFinalTotal: {
        type: Number,
        default: 0
    },
    // Coupon validity tracking
    couponValid: {
        type: Boolean,
        default: true
    },
    couponInvalidatedAt: Date,
    couponInvalidationReason: String
});

const Order = mongoose.model('order', orderSchema);
export default Order;
