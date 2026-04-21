import mongoose from "mongoose";
const Schema = mongoose.Schema;

const supportSchema = new Schema({
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    ownerName:{
        type:String,
        required:true,
    },
    ownerEmail:{ 
        type:String,
        required:true,
    },
    subject:{
        type:String,
        required:true,
    },
    message:{
        type:String,
        required:true,
    },
    images: [{
        type: String // Cloudinary URLs
    }],
    status:{
        type:String,
        enum:["open","in_progress","resolved"],
        default:"open",
    },
    adminReply: {
        content: String,
        createdAt: Date
    },
   
}, { timestamps: true });

export default mongoose.model("Support", supportSchema);