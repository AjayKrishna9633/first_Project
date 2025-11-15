import mongoose from "mongoose";

const mongoPort = process.env.MONGODB_URI;
console.log(process.env.MONGODB_URI);

const connectDB = async ()=>{
    try{
      await mongoose.connect('mongodb://localhost:27017/nodewebapp')  
      console.log("db connected")
    }catch(error){
        console.log("DataBase connection error:",error.message)
        process.exit(1)
    }
}
export default connectDB