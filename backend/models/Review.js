import mongoose from "mongoose";
const schema=mongoose.Schema;

const reviewSchema=new schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        required:true,
    },
    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        required:true,
    },
    customerName:{
        type:String,
        required:true,
    },
    customerEmail:{ 
        type:String,
    },
    productTitle:{
        type:String,
        required:true,
    },

    rating:{
        type:Number,
        required:true,
        min:1,
        max:5,
    },
    comment:{
        type:String,
        required:true,
    },
     images: [{
        type: String // Cloudinary URLs
    }],
    merchantReply: {
        content: String,
        createdAt: Date
    },
    status:{
        type:String,
        enum:["approved","rejected","disputed"],
        default:"approved",
    },
     disputeCount: {
        type: Number,
        default: 0,
        max: 3
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isDeleted:{
        type:Boolean,
        default:false
        },
    deletedAt:{
        type:Date,
        default:null
         }
},{timestamps:true});


reviewSchema.pre(/^find/, function(next){  // <-- Notice NO QUOTES around /^find/
    this.find({isDeleted: {$ne: true}});
    // next();
});
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ store: 1, createdAt: -1 });

const Review=mongoose.model("Review",reviewSchema);
export default Review;