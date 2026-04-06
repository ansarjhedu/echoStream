import mongoose from "mongoose";
const schema=mongoose.Schema;
const productSchema=new schema({
    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        required:true,
    },
    productHandle:{
        type:String,
        required:true,  
    },
    productTitle:{
        type:String,
        required:true,
    },
    stats:{
        type:Object,
        default:{
            avgRating:0,
            totalReviews:0,
        },
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

productSchema.pre(/^find/, function(next){  // <-- Notice NO QUOTES around /^find/
    this.find({isDeleted: {$ne: true}});
    //next();
});
productSchema.index({store:1,productHandle:1},{unique:true});

const Product=mongoose.model("Product",productSchema);
export default Product;