import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    targetType: {
        type: String,
        enum: ['product', 'category', 'referral'],
        required: true
    },
    selectedProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product', 
        required: function() { return this.targetType === 'product'; }
    },
    selectedCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'category',
        required: function() { return this.targetType === 'category'; }
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });


offerSchema.index({ startDate: 1, endDate: 1, isActive: 1 });

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
