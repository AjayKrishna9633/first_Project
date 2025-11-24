import mongoose from "mongoose";
const {Schema} = mongoose

const ProductSchema = new Schema ({
    productName:{
        type:String,
        required: true,
        trim:true
    },
    description :{
        type:String,
        required:true
    },
    category:{
        type: Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    
    status:{
        type:String,
        enum:['Available','Out of Stock'],
        default:'Available'
    },
    IsBlocked:{
        type: Boolean,
        default:false,
    },
    offerId:{
        type:Schema.Types.ObjectId,
        ref:"offer"
    },
    variants:[{
        type:Schema.Types.ObjectId,
        ref:"variant"
    }]
},{timestamps:true});
const product = mongoose.model("product",ProductSchema);
export default product;