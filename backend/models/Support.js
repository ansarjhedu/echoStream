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
            required:true
        },
    conversation:[{
        sender:{
            type:String,
            enum:["owner","admin"],
            default:"owner",
            required:true
        },
        images:[{
            type:String
        }],
        createdAt:{
            type:Date,
            default:Date.now()
        }
    }],
    status:{
        type:String,
        enum:["open","in_progress","resolved"],
        default:"open",
    }
    
  
   
}, { timestamps: true });

export default mongoose.model("Support", supportSchema);