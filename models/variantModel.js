import mongoose from "mongoose";
import product from "./porductsModal";
const {Schema}= mongoose;
const variant = new Schema({
    productId:{
        type:Schema.Types.ObjectId,
        ref:"product"
    },
    color:{
        type:String,
        required:true
    },
    quantity:{
        type:Number,
        required:true
    },
    images:[{
        type:String,
        required:true
    }],
    salePrice:{
        type:Number,
        

    },
    regularPrice:{
        type:Number,
        required:true
    }


})