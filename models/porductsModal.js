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
    regularPrice:{
        type:Number,
        required:false
    },
    salePrice:{
        type:Number,
        required:false
    },
    quantity:{
        type:Number,
        required:false,
        default:0
    },
    color:{
        type:String,
        required:false
    },
    productImage:[{
        type:String,
        required:false
    }],
    // Variants stored directly in product
    productVariants:[{
        color: String,
        size: String,
        regularPrice: Number,
        salePrice: Number,
        quantity: Number,
        images: [String]
    }],
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