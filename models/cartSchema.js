import mongoose from "mongoose";
import { stringify } from "uuid";
const {Schema}= mongoose;
const cartSchema = new Schema({

    userId:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'product',
            required:true
        },
        variantId:{  
        type:Schema.Types.ObjectId,
        ref:'variant'
    },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:"placed"

        },

       

    }]

})
const cart = mongoose.model('cart',cartSchema);
export default cart;