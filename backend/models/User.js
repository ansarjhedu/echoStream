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
        enum:['owner','admin'],
        default: "owner"
    },
    email:{
        type:String,
        match:/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
        select:false,
        

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
        }
},{timestamps:true});

userSchema.pre("save",async function(next){
    if(!this.isModified("password") ){
        return ;
    }
    const salt=await bcrypt.genSalt(10);
    this.password=await bcrypt.hash(this.password,salt);
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