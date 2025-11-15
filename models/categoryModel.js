import mongoose from "mongoose";
const {Schema}= mongoose;
const categorySchema = new Schema({
   name:{
        type:String,
        required:true,
        unique:true

    },
    isActive:{
        type:Boolean,
        default:false
    },
    offerId:{
        type: Schema.Types.ObjectId,
        ref:"offer"
    }

},{timestamps:true})