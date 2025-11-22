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
    offerId:{
        type: Schema.Types.ObjectId,
        ref:"offer"
    }

},{timestamps:true})

const Category = mongoose.model('Category',categorySchema);
export default Category;