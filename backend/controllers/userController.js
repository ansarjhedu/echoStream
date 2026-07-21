import User from "../models/User.js";
import generateToken from "../utils/tokenManager.js";
import Token from "../models/Token.js";
import Support from "../models/Support.js";
import jwt from "jsonwebtoken";

import sendEmail from "../utils/sendEmail.js"; // <-- Import the email utility!

const registerUser = async (req, res) => {
  try {
    const { email, password, userName } = req.body;
    if (!email || !password || !userName) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    let user = await User.findOne({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (user) {
      if (user.isVerified) {
        // 🚨 Standard block: User is already fully registered and verified
        return res.status(400).json({ message: "User already exists with this email" });
      } else {
        // 🚨 THE UPSERT FIX: They abandoned the OTP screen earlier. Overwrite their ghost account!
        user.userName = userName;
        user.password = password; // This will trigger the pre('save') hash automatically
        user.otp = otp;
        user.otpExpire = otpExpire;
        await user.save();
      }
    } else {
      // 🚨 Standard creation for a brand new user
      user = await User.create({
        email,
        password,
        userName,
        otp,
        otpExpire,
        isVerified: false 
      });
    }

    // 📧 The Email HTML
    const messageHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 10px; background-color: #0A0F1A; color: #fff;">
          <h2 style="color: #06b6d4; text-align: center;">Welcome to EchoStream</h2>
          <p style="color: #ccc;">Hi ${userName},</p>
          <p style="color: #ccc;">Please verify your email address to complete your registration. Your One-Time Password (OTP) is:</p>
          <div style="text-align: center; margin: 30px 0;">
              <h1 style="font-size: 36px; letter-spacing: 8px; color: #a855f7; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px;">${otp}</h1>
          </div>
          <p style="color: #ccc;">This code is valid for 10 minutes.</p>
      </div>
    `;

    // 🚨 THE ROLLBACK FIX: If the email fails, we destroy the ghost account!
    try {
        await sendEmail({ 
            email: user.email, 
            subject: "EchoStream - Verify Your Email", 
            html: messageHtml 
        });
    } catch (error) {
        console.error("❌ Email failed to send, triggering database rollback:", error);
        
        // Wipe the user from the DB so they aren't permanently stuck!
        await User.findByIdAndDelete(user._id);
        
        return res.status(500).json({ message: "Network error while sending email. Please try again." });
    }

    res.status(201).json({
      message: "Verification code sent successfully.",
      email: user.email 
    });
    
  } catch (error) {
    console.error("Error in registerUser", error);
    res.status(500).json({ message: "Server error" });
  }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

        // Select the hidden OTP fields
        const user = await User.findOne({ email }).select("+otp +otpExpire");

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "User is already verified. Please log in." });
        if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP code" });
        if (user.otpExpire < Date.now()) return res.status(400).json({ message: "OTP has expired. Please request a new one." });

        // Mark as verified and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        // Generate Tokens and Log them in!
        const accessToken = await generateToken(user, res);

        res.status(200).json({
            message: "Email verified successfully!",
            user: {
                _id: user._id,
                email: user.email,
                userName: user.userName,
                role: user.role,
                profilePic: user.profilePic,
                accessToken: { token: accessToken }
            }
        });
    } catch (error) {
        console.error("Error in verifyOTP", error);
        res.status(500).json({ message: "Server error" });
    }
};

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "User is already verified" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const messageHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #06b6d4;">EchoStream Security</h2>
                <p>Your new One-Time Password (OTP) is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #8b5cf6;">${otp}</h1>
            </div>
        `;

        await sendEmail({ email: user.email, subject: "EchoStream - New OTP Code", html: messageHtml });
        res.status(200).json({ message: "A new OTP has been sent to your email." });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Please provide email and password" });

        const user = await User.findOne({ email }).select("+password");
        if (!user) return res.status(400).json({ message: "Invalid email or password" });

        const isMatch = await user.matchPassword(password);

        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

        // 🚨 NEW SECURITY RULE: Block unverified users!
        
        if (!user.isVerified) {
            return res.status(403).json({ 
                message: "Please verify your email address to access your account.", 
                unverifiedEmail: user.email 
            });
        }

        const accessToken = await generateToken(user, res);
        res.status(200).json({
            message: user.role === "admin" ? "Admin logged in successfully" : "User logged in successfully",
            user: {
                _id: user._id, email: user.email, userName: user.userName,
                role: user.role, profilePic: user.profilePic,
                accessToken: { token: accessToken }
            }
        });
    } catch (error) {
        console.error("Error in loginUser", error);
        res.status(500).json({ message: "Server error" });
    }
};


const logoutUser = async (req, res) => {
    try {

  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    // 1. Delete from Database (Crucial for Revocation)
    await Token.findOneAndDelete({ refreshToken: refreshToken });
  }

  // 2. Clear Cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development"?"Strict":"Lax" ,
    secure: process.env.NODE_ENV !== "development",
  });

  res.status(200).json({ message: "User logged out successfully" });
} catch (error) {
    console.error("Error in logoutUser", error);
    res.status(500).json({ message: "Server error" });
}
}

    const refreshToken = async (req, res) => {
    try {
   
        //get token from cookie
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token provided" });
        }
        //check if token exists in database
        const dbToken = await Token.findOne({ refreshToken: refreshToken });
        if (!dbToken) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

       
        
        
        //verify token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
        if (!decoded) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        //generate new access token
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        //delete the old refresh token from database (optional but good for security)
        await Token.findOneAndDelete({ _id: dbToken._id });


        const accessToken = await generateToken(user, res);
        res.status(200).json({
            accessToken,
             user: {
                _id: user._id,
                email: user.email,
                userName: user.userName, // <-- ADD THIS
                role: user.role,         // <-- ADD THIS (Fixes the Admin bug!)
                profilePic: user.profilePic // <-- ADD THIS
            }
        });
    } catch (error) {
        // If JWT is expired or invalid, cleanup cookie
        res.clearCookie("refreshToken");
        res.status(403).json({ message: "Session expired" });
    }
}



  const updateUserCredentials=async(req,res)=>{
    try {
        const userId=req.user._id; // from auth middleware user is already attached to req
        
        user.email=req.body.email || user.email;
        user.userName=req.body.userName || user.userName;
        if(req.file){
          user.profilePic=req.file.path;
        }


        if(req.body.password){
            user.password=req.body.password;
          }
        await user.save();

        return res.status(200).json({
            data:user,
            message:"User details updated successfully"
        })
      }
    catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}

  const generateTicket=async(req, res)=>{
   try {
     const {subject,message}=req.body;
    if( !subject || !message){
        return res.status(400).json({message:"Please provide all required fields"})
    }

    const images=req.files ? req.files.map(file=>file.path) : [];

    const ticket=await Support.create({
        owner:req.user._id,
        ownerName:req.user.userName,
        ownerEmail:req.user.email,
        subject,
        conversation:[{
          sender:"owner",
          images:images,
          content:message,
          timestamp:Date.now()
        }]
    });

    if(!ticket){
        return res.status(500).json({message:"Failed to create support ticket"})
    }

    return res.status(201).json({
        data:ticket,
        message:"Support ticket created successfully"
    });
   } catch (error) {
    console.log(error)
    return res.status(500).json("Internal Server Error ")
   }

  }

  const getTickets=async(req,res)=>{
    try {
        const userId=req.user._id;
        const tickets=await Support.find({owner:userId}).sort({createdAt:-1});

        if(!tickets || tickets.length===0){
            return res.status(200).json({
                data:[],
                message:"No support tickets found for this user"
            })
        }
        return res.status(200).json({
            data:tickets,
            message:"Support tickets retrieved successfully"
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
  }

  const replyToAdmin=async (req,res)=>{
    try {
    
    const {content}=req.body;
    const ticketId=req.params.id;
      if(!content){
        return res.status(400).json({message:"content is required!"})
        
      }
      const images=req.files ? req.files.map(file=>file.path): [];


      const ticket=await Support.findOne({_id:ticketId, owner:req.user._id});
      if(!ticket || ticket.owner.toString() !== req.user._id.toString() || ticket.status==="resolved"){
        return res.status(404).json({message:ticket.status==="resolved"?"Ticket has been resolved by admin generate a new one":"Unauthorized or Ticket does not exist"})
      }

      ticket.conversation.push({
        content:content,
        sender:"owner",
        images:images?images:[],
        timestamp:Date.now()
      })

      await ticket.save();
      return res.status(200).json({
       data: ticket,
        message:"successfully replied to admin"
      })
    } catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
  }
export { registerUser, loginUser, logoutUser, refreshToken,updateUserCredentials, generateTicket,getTickets,replyToAdmin, verifyOTP,resendOTP };
