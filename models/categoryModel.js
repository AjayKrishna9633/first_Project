import mongoose from "mongoose";
const {Schema}= mongoose;
const categorySchema = new Schema({
   name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:false,
        default: ''
    },
    isListed:{
        type:Boolean,
        default:true
    },
    offerType:{
        type: String,
        enum: ['percentage', 'flat', 'none'],
        default: 'none'
    },
    offerValue:{
        type: Number,
        default: 0,
        min: 0
    }

},{timestamps:true})

const Category = mongoose.model('Category',categorySchema);
export default Category;