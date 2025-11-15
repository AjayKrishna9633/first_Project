const mongoose = require("mongoose");
const { Schema } = mongoose;
const couponSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    createdon: {
        type: Date,
        default: Date.now,
        requried: true,
    },
    expireOn: {
        type: Date,
        required: true,
    },
    offerPrice: {
        type: Number,
        required: true,
    },
    minimumPrice: {
        type:Number,
        required:true
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