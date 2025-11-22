import mongoose from "mongoose";
const {Schema}= mongoose;
const variantSchema = new Schema({
    productId:{
        type:Schema.Types.ObjectId,
        ref:"product",
        required:true
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
        required:true
        

    },
    regularPrice:{
        type:Number,
        required:true
    }


}, {timestamps:true});

const variant = mongoose.model("variant",variantSchema);
export default variant;