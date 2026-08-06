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
        enum:["pending","approved","rejected","disputed"],
        default:"approved",
    },
    isVerifiedBuyer: {
        type: Boolean,
        default: false,
    },
    source: {
        type: String,
        enum: ['native', 'google'],
        default: 'native',
    },
    externalId: {
        type: String,
        default: null,
    },
    disputeCount: {
        type: Number,
        default: 0,
        max: 3,
    },
    disputedReason: {
       reason: {
        type: String,
       },
       proofImages: [{
        type: String // Cloudinary URLs
       }],
       count:{
        type:Number,
        default:1,
        max:3
       },
       createdAt: Date
    },
    /** Outcome shown to the store owner after AI or admin resolution */
    disputeResolution: {
        decision: {
            type: String,
            enum: ['approve_dispute', 'reject_dispute'],
            default: undefined,
        },
        reason: { type: String, default: null },
        resolvedBy: {
            type: String,
            enum: ['ai', 'admin'],
            default: undefined,
        },
        confidence: { type: Number, default: null },
        resolvedAt: { type: Date, default: null },
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


reviewSchema.pre(/^find/, function () {
    if (!this.getOptions()?.includeDeleted) {
        this.where({ isDeleted: { $ne: true } });
    }
});
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ store: 1, createdAt: -1 });
reviewSchema.index({ store: 1, source: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: 'string' } } });

const Review=mongoose.model("Review",reviewSchema);
export default Review;