import mongoose, { Schema } from "mongoose";
const userschema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  avatar: {
    type: Object,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  phone: {
    type: String,
    required: false,
    unique: false,
    sparse: true,
    default: null,
  },
  isAdmin:{
    type:Boolean,
    default:false
  },
  cart:[{
    type:Schema.Types.ObjectId,
    ref:"cart"
  }],
  Wallet:{
    type:Number,
    default:0,

  },
  whislist:[{
    type: Schema.Types.ObjectId,
    ref:"whislist"
  }],
  orderHistory:[{
    type:Schema.Types.ObjectId,
    ref:"orderCollection"
  }],
  referalCode:{
    type:String
  },
  redeemed:{
    type:Boolean
  },
  redeemedUsers:[{
    type:Schema.Types.ObjectId,
    ref:"user"
  }],
  searchHistory:[{
    category:{
    type:Schema.Types.ObjectId,
    ref:"category"
    },
    searchOn :{
      type:Date,
      default:Date.now
    }

  }],




});
const user = mongoose.model('user',userschema);
export default user;
