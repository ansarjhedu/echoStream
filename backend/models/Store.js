import mongoose from 'mongoose'
import { Schema } from 'mongoose'
import crypto from 'crypto'
import { makePublicSlug } from '../utils/activityLog.js'

const storeSchema=new Schema({
    storeName:{
        type:String,
        required: true
    },
    storeType:{
        type:String,
        required:true,
    },
    /** Shareable public trust page slug */
    publicSlug: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    widgetStats: {
        impressions: { type: Number, default: 0 },
        byLayout: { type: Schema.Types.Mixed, default: {} },
        lastImpressedAt: { type: Date, default: null },
    },
    widgetMeta: {
        publishedLayout: { type: String, default: null },
        publishedAt: { type: Date, default: null },
    },
     widgetConfig: {
        layout: { 
            type: String, 
            enum:['glassmorphism', 'classic', 'minimal', 'grid', 'carousel', 'brutalism'], 
            default: 'glassmorphism' 
        },
        primaryColor: { type: String, default: '#06b6d4' }, // Default Cyan
        backgroundColor: { type: String, default: '#0A0F1A' }, // Default Dark
        textColor: { type: String, default: '#ffffff' }, // Default Light
        fontFamily: { type: String, default: 'system-ui, sans-serif' },
        fontSize: { type: Number, default: 15 },
        fontWeight: { type: Number, default: 400 },
        titleFontSize: { type: Number, default: 22 },
        lineHeight: { type: Number, default: 1.5 },
        carouselAutoplay: { type: Boolean, default: true },
        carouselIntervalMs: { type: Number, default: 3500 },
        carouselShowArrows: { type: Boolean, default: true },
    },
    websiteUrl: {
        type: String,
        default: null,
    },
    siteMeta: {
        title: { type: String, default: null },
        description: { type: String, default: null },
        image: { type: String, default: null },
        favicon: { type: String, default: null },
    },
    googleReviews: {
        placeId: { type: String, default: null },
        businessName: { type: String, default: null },
        minRating: { type: Number, default: 1, min: 1, max: 5 },
        connected: { type: Boolean, default: false },
        lastSyncedAt: { type: Date, default: null },
        importedCount: { type: Number, default: 0 },
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
        enum:["suspended","live","disabled","disputed","deleted"],
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
    },
    isUpdated:{
        type:Boolean,
        default:false
    }

},{timestamps:true})

storeSchema.pre('save', async function () {
  if (this.isNew && !this.apiKey) {
    this.apiKey = crypto.randomBytes(16).toString('hex');
  }
  if (this.isNew && !this.publicSlug) {
    this.publicSlug = makePublicSlug(this.storeName);
  }
});

// storeSchema.pre(/^find/, function(next){  // <-- Notice NO QUOTES around /^find/
//     this.find({isDeleted: {$ne: true}});
//     // next();
// });

const Store=mongoose.model("Store",storeSchema);
export default Store;