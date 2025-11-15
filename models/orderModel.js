import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import product from "./porductsModal";
const {Schema}= mongoose;

const orderSchema = new Schema({
  
        orderedItems:[{
            product:{
                type:Schema.Types.ObjectId,
                ref:"product",
                required:true
                
            },
            quantity:{
                type:Number,
                required: true
            },
            price:{
                type:String,
                default:0
            }
        }],
        orderId:{
            type:String,
            default:()=>uuidv4(),
            unique:true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        discount:{
            type:Number,
            required:true
        },
        finalAmount:{
            type:Number,
            required:true
        },


    
    address:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    invoiceDate:{
        type:Date,

    },
    status:{
        type:String,
        required:true,
        enum:["Pending",'Processing','Shipped','Delivered','Cancelled','Return Request','Returned']
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    coupenApplied:{
        type:Boolean,
        default:false
    }, cancellationReason:{
            type:String,
            default:"none"
        }
})
const order = mongoose.model('order',orderSchema);
export default order