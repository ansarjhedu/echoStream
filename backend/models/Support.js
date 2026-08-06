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
            enum:["owner","admin","agent"],
            default:"owner",
            required:true
        },
        submittedBy:{
            type:String,
            default:null
        },
        images:[{
            type:String
        }],
        content:{
            type:String,
            required:true
        },
        timestamp:{
            type:Date,
            default:Date.now
        }
    }],
    status:{
        type:String,
        enum:["open","in_progress","resolved"],
        default:"open",
    },
    source: {
        type: String,
        enum: ['manual', 'chatbot'],
        default: 'manual',
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    claimedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

export default mongoose.model("Support", supportSchema);
