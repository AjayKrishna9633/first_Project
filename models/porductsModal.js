import mongoose from "mongoose";
const {Schema} = mongoose

const ProductSchema = new Schema ({
    productName:{
        type:String,
        required: true
    },
    description :{
        type:String,
        required:true
    },
    status:{
        type:Boolean,
        default:false
    },
    category:{
        type: Schema.Types.ObjectId,
        ref:"category",
    },
    offerId:{
        type:Schema.Types.ObjectId,
        ref:"offer"
    },
    variantId:{
        type:Schema.Types.ObjectId,
        ref:"variant"
    }
},{timestamps:true});
const product = mongoose.model("product",ProductSchema);
export default product;