import jwt from "jsonwebtoken";
import Token from "../models/Token.js";
const generateToken=async(user,res)=>{
    try {
        
        // Generate access token and refresh token
        const accessToken=jwt.sign({
        userId:user._id,
    },process.env.JWT_ACCESS_SECRET,{ expiresIn:"15m"});

    const refreshToken=jwt.sign({
        userId:user._id,
    },process.env.JWT_REFRESH_SECRET,{ expiresIn:"7d"});

    // Store refresh token in database
    const tokenDoc=await Token.create({
        user:user._id,
        refreshToken:refreshToken,
        expiresAt:new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
   
    
    // Set refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production"?"None":"Strict",
        secure: process.env.NODE_ENV === "production",
         maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    return accessToken;
    } catch (error) {
        console.error("Error in generateToken",error);
        throw new Error("Token generation failed");
    }
};

export default generateToken;