import mongoose from 'mongoose'
import { Schema } from 'mongoose'
import crypto from 'crypto'

const storeSchema=new Schema({
    storeName:{
        type:String,
        required: true
    },
    storeType:{
        type:String,
        required:true,

    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    apiKey:{
        type:String,    
    },
    status:{
        type:String,
        enum:["suspended","live","disabled"],
        default:"live"
    },
    isActive:{
        type:Boolean,
        default:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    deletedAt:{
        type:Date,
        default:null
    }

},{timestamps:true})

storeSchema.pre('save',async function(next){
            if(this.isNew && !this.apiKey){
        this.apiKey=crypto.randomBytes(16).toString("hex");
    }
})

storeSchema.pre(/^find/, function(next){  // <-- Notice NO QUOTES around /^find/
    this.find({isDeleted: {$ne: true}});
    // next();
});

const Store=mongoose.model("Store",storeSchema);
export default Store;