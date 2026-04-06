import mongoose from "mongoose";
const schema=mongoose.Schema;

const tokenSchema=new schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    refreshToken:{
        type:String,
        required:true,
    },
    expiresAt:{
        type:Date,
        required:true,
    },
},{timestamps:true});

const Token=mongoose.model("Token",tokenSchema);
export default Token;