
import mongoose from "mongoose";
const Schema = mongoose.Schema;

const addressSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required :true
    },
    address:[{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required: true,
        },
        city:{
            type:String,
            required:true,
        },
        streetAddress:{
            type:String,
            required:true,
        },
        state:{
            type:String,
            required:true
        },
        pinCode:{
            type:Number,
            required:true
        },
        phone:{
            type:Number,
            required:true
        },
        altPhone:{
            type:Number,
            required:false
        },
        isDefault: {
        type: Boolean,
        default: false
    }
        
    }]




})
const addressModal =mongoose.model("Address",addressSchema);
export default addressModal;