import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const Schema=mongoose.Schema;

const userSchema=new Schema({
    userName:{
        type:String,
        required:true,
    },
    isActive:{
        type:Boolean,
        default:true
    },
    role:{
        type:String,
        enum:['owner','admin','staff'],
        default: "owner"
    },
    storeRole: {
        type: String,
        enum: ['administrator', 'editor', 'support', 'custom'],
        default: 'support'
    },
    parentAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    permissions: [{
        type: String,
        enum: [
            // Store staff
            'moderation', 'products', 'integrations', 'settings', 'disputes', 'tickets',
            // Platform staff
            'stores_read', 'users_read', 'disputes_resolve', 'support_queue', 'analytics_platform'
        ]
    }],
    tokenVersion: {
        type: Number,
        default: 0
    },
    email:{
        type:String,
        match:/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required: function () {
            return this.authProvider !== 'google';
        },
        select:false,
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    googleId: {
        type: String,
        default: null,
        sparse: true,
        unique: true,
    },
    profilePic:{
        type:String,
    },
    isDeleted:{
        type:Boolean,
        default:false
     },
    deletedAt:{
        type:Date,
        default:null
        },
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String, // We store this as a string to preserve leading zeros (e.g. "049213")
        select: false // Hide from normal queries for security
    },
    otpExpire: {
        type: Date,
        select: false
    },
    otpPurpose: {
        type: String,
        enum: ['signup', 'login', 'reset'],
        select: false,
    },
    inviteToken: {
        type: String,
        select: false
    },
    inviteTokenExpire: {
        type: Date,
        select: false
    },
},{timestamps:true});

userSchema.pre("save",async function(next){
    if(!this.isModified("password") || !this.password){
        return next();
    }
    const salt=await bcrypt.genSalt(10);
    this.password=await bcrypt.hash(this.password,salt);
    next();
});

// userSchema.pre(/^find/, function(next){  // <-- Notice NO QUOTES around /^find/
//     this.find({isDeleted: {$ne: true}});
//    // next();
// });

userSchema.methods.matchPassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
};

const User=mongoose.model("User",userSchema);
export default User;