import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true

    },
    amount:{
        type:Number,
        required:true
    },
     type:{
        type:String,
        enum:['credit','debit'],
        required:true
     },
     balance:{
        type:Number,
        required:true
     },
     orderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'order'
     },
     transactionId: {
        type: String
    },
     paymentId:{
        type:String
     },
     paymentMethod:{
        type:String,
        enum:['razorpay','wallet','referral','refund','admin',''],
        required:true
     },
     description: {
        type: String,
        default: ''
     },
     status:{
        type:String,
        enum:['success','failed','pending'],
        required:true
     },
     createdAt:{
        type:Date,
        default:Date.now
     }
})

export default mongoose.model("WalletTransaction",walletTransactionSchema);
