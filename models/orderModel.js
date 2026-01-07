// models/orderModel.js
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
        }
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
        enum: ['cod', 'card', 'upi', 'netbanking'],
        required: true
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
    }
});

const Order = mongoose.model('order', orderSchema);
export default Order;
