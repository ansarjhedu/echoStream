import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Store from "../models/Store.js";

const authUser=async (req,res,next)=>{
    const authHeader=req.headers.authorization;
   
    if(!authHeader){
        return res.status(401).json({message:"No token provided, authorization denied"});
    }
    const token=authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    try {
        const decoded=jwt.verify(token,process.env.JWT_ACCESS_SECRET);

        if(!decoded || !decoded.userId){
            return res.status(401).json({message:"Invalid token, authorization denied"});
        }

        const user=await User.findById(decoded.userId);
        if(!user){
            return res.status(401).json({message:"Invalid token, user not found, authorization denied"});
        }
        
        req.user={_id:user._id};
        next();
    }
    catch (error) {
        console.error("Token verification failed",error);
        return res.status(401).json({message:"Invalid token, authorization denied"});
    }

}

const authStore=async (req,res,next)=>{
    try{
        const userId=req.user._id;
        const storeId=req.params.id;
      
        const store=await Store.findById(storeId);
        if(!store){
            return res.status(401).json({message:"Store not found, authorization denied"});
        }

        if(store.owner.toString() !== userId.toString()){
            return res.status(403).json({message:"Unauthorized: You do not have access to this store"});
        }
        req.store=store;
        next();


    }
    catch (error) {
        console.error("Store verification failed",error);
        return res.status(401).json({message:"Store verification failed, authorization denied"});
    }
}

const authAdmin=async (req,res,next)=>{
        const authHeader=req.headers.authorization;
        if(!authHeader){
            return res.status(401).json({message:"No token provided, authorization denied"});
        }
        const token=authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        try {   
            const decoded=jwt.verify(token,process.env.JWT_ACCESS_SECRET)
            if(!decoded || !decoded.userId){
                return res.status(401).json({message:"Invalid token, authorization denied"});
            }

            const user=await User.findById(decoded.userId);
           
            if(!user || user.role !== "admin"){
                return res.status(401).json({message:"Invalid token or insufficient permissions, authorization denied"});
            }
            req.user={_id:user._id, role:user.role};
            next();
        }
        catch (error) {
            console.error("Token verification failed",error);
            return res.status(401).json({message:"Invalid token, authorization denied"});
        }
    }
export { authUser, authStore, authAdmin };