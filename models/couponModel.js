import mongoose from "mongoose";
const { Schema } = mongoose;
const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    description: {
        type: String,
        required: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    usageLimit: {
        type: Number, 
        default: null
    },
    usagePerUser: {
        type: Number,
        default: 1
    },
    createdon: {
        type: Date,
        default: Date.now,
        requried: true,
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    offerPrice: {
        type: Number,
        required: true,
    },
    minimumPrice: {
        type:Number,
        required:true
    },
     maxDiscountAmount: {
        type: Number,
        default: null
    },
    isListed:{
        type:Boolean,
        default:false
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"user"
    }
});

const coupon= mongoose.model('coupon',couponSchema)
export default coupon;