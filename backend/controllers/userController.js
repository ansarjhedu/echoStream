import User from "../models/User.js";
import generateToken from "../utils/tokenManager.js";
import Token from "../models/Token.js";
import Support from "../models/Support.js";
import Review from "../models/Review.js";
import Store from "../models/Store.js";
import Notification from "../models/Notification.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

import sendEmail from "../utils/sendEmail.js"; // <-- Import the email utility!

const googleClient = () => {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    const err = new Error('GOOGLE_CLIENT_ID is not configured');
    err.code = 'MISSING_GOOGLE_CLIENT';
    throw err;
  }
  return new OAuth2Client(clientId);
};

const ALLOWED_STAFF_PERMISSIONS = ['moderation', 'products', 'integrations', 'settings', 'disputes', 'tickets'];
const ALLOWED_STORE_ROLES = ['administrator', 'editor', 'support', 'custom'];
const ROLE_PRESETS = {
  administrator: ['moderation', 'products', 'integrations', 'settings', 'disputes', 'tickets'],
  editor: ['moderation', 'products'],
  support: ['tickets'],
};

const resolveStaffPermissions = (storeRole, permissions) => {
  if (storeRole !== 'custom') {
    if (!ROLE_PRESETS[storeRole]) {
      throw new Error('Invalid storeRole');
    }
    return [...ROLE_PRESETS[storeRole]];
  }
  const safe = Array.isArray(permissions)
    ? [...new Set(permissions.filter((p) => ALLOWED_STAFF_PERMISSIONS.includes(p)))]
    : [];
  if (safe.length === 0) {
    throw new Error('Custom role requires at least one valid permission');
  }
  return safe;
};

const buildInviteEmailHtml = ({ userName, ownerName, inviteUrl, storeRole }) => `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 10px; background-color: #0A0F1A; color: #fff;">
      <h2 style="color: #06b6d4; text-align: center;">You're Invited to EchoStream</h2>
      <p style="color: #ccc;">Hi ${userName},</p>
      <p style="color: #ccc;">You've been invited to join <strong style="color:#fff;">${ownerName}</strong>'s team as <strong style="color:#a855f7;">${storeRole}</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display:inline-block; background: linear-gradient(90deg,#06b6d4,#a855f7); color:#fff; text-decoration:none; font-weight:bold; padding:14px 28px; border-radius:12px;">Accept Invitation &amp; Set Password</a>
      </div>
      <p style="color: #888; font-size: 12px;">This link expires in 24 hours. If the button doesn't work, copy this URL:<br/><span style="color:#a855f7; word-break:break-all;">${inviteUrl}</span></p>
  </div>
`;

const buildUserPayload = (user, accessToken, extras = {}) => ({
  _id: user._id,
  email: user.email,
  userName: user.userName,
  role: user.role,
  storeRole: user.storeRole,
  permissions: user.permissions || [],
  parentAccount: user.parentAccount || null,
  profilePic: user.profilePic,
  staffScope: extras.staffScope || null,
  parentRole: extras.parentRole || null,
  ...(accessToken ? { accessToken: { token: accessToken } } : {}),
});

const resolveUserStaffMeta = async (user) => {
  if (user.role !== 'staff' || !user.parentAccount) {
    return { staffScope: null, parentRole: null };
  }
  const parent = await User.findById(user.parentAccount).select('role');
  if (!parent) return { staffScope: null, parentRole: null };
  return {
    parentRole: parent.role,
    staffScope: parent.role === 'admin' ? 'platform' : parent.role === 'owner' ? 'store' : null,
  };
};
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
        user.otpPurpose = 'signup';
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
        otpPurpose: 'signup',
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
        const user = await User.findOne({ email }).select("+otp +otpExpire +otpPurpose");

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "User is already verified. Please log in." });
        if (user.otpPurpose && user.otpPurpose !== 'signup') {
            return res.status(400).json({ message: "Invalid OTP for signup verification. Request a new code." });
        }
        if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP code" });
        if (user.otpExpire < Date.now()) return res.status(400).json({ message: "OTP has expired. Please request a new one." });

        // Mark as verified and clear OTP
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        user.otpPurpose = undefined;
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
        user.otpPurpose = 'signup';
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

        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({
                message: "This account uses Google Sign-In. Please continue with Google.",
            });
        }

        const isMatch = user.password ? await user.matchPassword(password) : false;

        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

        // 🚨 NEW SECURITY RULE: Block unverified users!
        
        if (!user.isVerified) {
            return res.status(403).json({ 
                message: "Please verify your email address to access your account.", 
                unverifiedEmail: user.email 
            });
        }

        if (user.isDeleted || user.isActive === false) {
            return res.status(401).json({ message: "Account deactivated" });
        }

        if (user.role === 'staff') {
            if (!user.parentAccount) {
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
            const parent = await User.findById(user.parentAccount).select('isDeleted isActive role');
            if (!parent || parent.isDeleted || parent.isActive === false) {
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
        }

        const accessToken = await generateToken(user, res);
        const staffMeta = await resolveUserStaffMeta(user);
        res.status(200).json({
            message: user.role === "admin" ? "Admin logged in successfully" : "User logged in successfully",
            user: buildUserPayload(user, accessToken, staffMeta)
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
      
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        //generate new access token
        const user = await User.findById(decoded.userId);
        if (!user || user.isDeleted || user.isActive === false) {
            await Token.findOneAndDelete({ _id: dbToken._id });
            res.clearCookie("refreshToken");
            return res.status(401).json({ message: "Account deactivated" });
        }

        if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
            await Token.findOneAndDelete({ _id: dbToken._id });
            res.clearCookie("refreshToken");
            return res.status(401).json({ message: "Session invalidated" });
        }

        if (user.role === 'staff') {
            if (!user.parentAccount) {
                await Token.findOneAndDelete({ _id: dbToken._id });
                res.clearCookie("refreshToken");
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
            const parent = await User.findById(user.parentAccount).select('isDeleted isActive');
            if (!parent || parent.isDeleted || parent.isActive === false) {
                await Token.findOneAndDelete({ _id: dbToken._id });
                res.clearCookie("refreshToken");
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
        }

        //delete the old refresh token from database (optional but good for security)
        await Token.findOneAndDelete({ _id: dbToken._id });


        const accessToken = await generateToken(user, res);
        const staffMeta = await resolveUserStaffMeta(user);
        res.status(200).json({
            accessToken,
             user: buildUserPayload(user, null, staffMeta)
        });
    } catch (error) {
        // If JWT is expired or invalid, cleanup cookie
        res.clearCookie("refreshToken");
        res.status(403).json({ message: "Session expired" });
    }
}



  const updateUserCredentials=async(req,res)=>{
    try {
        // Profile updates mutate ONLY the authenticated user's own document
        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

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
            data:{
              _id: user._id,
              email: user.email,
              userName: user.userName,
              role: user.role,
              storeRole: user.storeRole,
              permissions: user.permissions,
              parentAccount: user.parentAccount,
              profilePic: user.profilePic,
            },
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
    const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;

    const ticket=await Support.create({
        owner: targetOwnerId,
        ownerName:req.user.userName,
        ownerEmail:req.user.email,
        subject,
        conversation:[{
          sender:"owner",
          submittedBy: req.user.userName,
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
        const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
        const filterParam = (req.query.filter || 'all').toLowerCase();
        const allowed = ['all', 'open', 'in_progress', 'resolved', 'pending'];
        if (!allowed.includes(filterParam)) {
            return res.status(400).json({ message: "Invalid filter. Use all|open|in_progress|resolved." });
        }

        const allTickets = await Support.find({ owner: targetOwnerId }).sort({ updatedAt: -1, createdAt: -1 });
        const summary = {
            total: allTickets.length,
            open: allTickets.filter((t) => t.status === 'open').length,
            in_progress: allTickets.filter((t) => t.status === 'in_progress').length,
            resolved: allTickets.filter((t) => t.status === 'resolved').length,
        };
        // pending alias → open (matches disputes overview wording)
        const statusFilter = filterParam === 'pending' ? 'open' : filterParam;
        const data = statusFilter === 'all'
            ? allTickets
            : allTickets.filter((t) => t.status === statusFilter);

        return res.status(200).json({
            data,
            summary,
            message: "Support tickets retrieved successfully"
        });
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
      const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;

      const ticket=await Support.findOne({_id:ticketId, owner: targetOwnerId});
      if(!ticket || ticket.owner.toString() !== String(targetOwnerId) || ticket.status==="resolved"){
        return res.status(404).json({message:ticket?.status==="resolved"?"Ticket has been resolved by admin generate a new one":"Unauthorized or Ticket does not exist"})
      }

      ticket.conversation.push({
        content:content,
        sender:"owner",
        submittedBy: req.user.userName,
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
const inviteStaff = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: "Only store owners can invite staff members" });
    }

    const { email, userName, storeRole, permissions } = req.body;
    if (!email || !userName) {
      return res.status(400).json({ message: "Email and userName are required" });
    }

    const safeStoreRole = ALLOWED_STORE_ROLES.includes(storeRole) ? storeRole : 'support';
    let resolvedPermissions;
    try {
      resolvedPermissions = resolveStaffPermissions(safeStoreRole, permissions);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tempPassword = crypto.randomBytes(32).toString('hex');

    let user = await User.findOne({ email });

    if (user) {
      if (user.isVerified && !user.isDeleted) {
        return res.status(400).json({ message: "User already registered" });
      }
      if (user.role !== 'staff' && user.isVerified) {
        return res.status(400).json({ message: "This email is already registered under a different role" });
      }
      if (user.parentAccount && user.parentAccount.toString() !== req.user._id.toString()) {
        return res.status(400).json({ message: "This email is already invited by another account" });
      }

      user.userName = userName;
      user.role = 'staff';
      user.permissions = resolvedPermissions;
      user.storeRole = safeStoreRole;
      user.parentAccount = req.user._id;
      user.password = tempPassword;
      user.inviteToken = inviteToken;
      user.inviteTokenExpire = inviteTokenExpire;
      user.isVerified = false;
      user.isDeleted = false;
      user.deletedAt = null;
      user.isActive = true;
      user.tokenVersion = 0;
      await user.save();
    } else {
      user = await User.create({
        email,
        userName,
        password: tempPassword,
        role: 'staff',
        storeRole: safeStoreRole,
        isVerified: false,
        parentAccount: req.user._id,
        permissions: resolvedPermissions,
        inviteToken,
        inviteTokenExpire,
        tokenVersion: 0,
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/accept-invite?email=${encodeURIComponent(email)}&token=${inviteToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: `You've been invited to join ${req.user.userName}'s team`,
        html: buildInviteEmailHtml({
          userName,
          ownerName: req.user.userName,
          inviteUrl,
          storeRole: safeStoreRole,
        }),
      });
    } catch (error) {
      console.error("❌ Staff invite email failed:", error);
      if (!user.isVerified && user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 60000) {
        await User.findByIdAndDelete(user._id);
      }
      return res.status(500).json({ message: "Network error while sending invitation email. Please try again." });
    }

    return res.status(201).json({
      message: "Staff invitation sent successfully.",
      email: user.email,
      storeRole: user.storeRole,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("Error in inviteStaff", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const resendInvite = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: "Only store owners can resend invitations" });
    }

    const staff = await User.findOne({
      _id: req.params.id,
      parentAccount: req.user._id,
      role: 'staff',
      isVerified: false,
      isDeleted: false,
    }).select('+inviteToken +inviteTokenExpire');

    if (!staff) {
      return res.status(404).json({ message: "Pending staff invitation not found" });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
    staff.inviteToken = inviteToken;
    staff.inviteTokenExpire = inviteTokenExpire;
    await staff.save();

    const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/accept-invite?email=${encodeURIComponent(staff.email)}&token=${inviteToken}`;

    await sendEmail({
      email: staff.email,
      subject: `You've been invited to join ${req.user.userName}'s team`,
      html: buildInviteEmailHtml({
        userName: staff.userName,
        ownerName: req.user.userName,
        inviteUrl,
        storeRole: staff.storeRole,
      }),
    });

    return res.status(200).json({ message: "Invitation resent successfully." });
  } catch (error) {
    console.error("Error in resendInvite", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const acceptInvite = async (req, res) => {
  try {
    const { email, token, password, confirmPassword, userName } = req.body;

    if (!email || !token || !password || !confirmPassword) {
      return res.status(400).json({ message: "Email, token, password, and confirmPassword are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({ email }).select('+inviteToken +inviteTokenExpire');

    if (!user || user.role !== 'staff') {
      return res.status(404).json({ message: "Invitation not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "User already registered. Please log in." });
    }
    if (!user.inviteToken || user.inviteToken !== token) {
      return res.status(400).json({ message: "Invalid invitation token" });
    }
    if (!user.inviteTokenExpire || user.inviteTokenExpire < Date.now()) {
      return res.status(400).json({ message: "Invitation has expired. Please ask the owner to resend." });
    }

    if (userName) user.userName = userName;
    user.password = password;
    user.isVerified = true;
    user.isActive = true;
    user.isDeleted = false;
    user.inviteToken = undefined;
    user.inviteTokenExpire = undefined;
    await user.save();

    const accessToken = await generateToken(user, res);
    const staffMeta = await resolveUserStaffMeta(user);

    return res.status(200).json({
      message: "Invitation accepted successfully!",
      accessToken,
      user: buildUserPayload(user, accessToken, staffMeta),
    });
  } catch (error) {
    console.error("Error in acceptInvite", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getStaffMembers = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: "Only store owners can view staff members" });
    }

    const status = (req.query.status || 'all').toLowerCase();
    const base = { parentAccount: req.user._id, role: 'staff' };
    let filter = { ...base };

    if (status === 'pending') {
      filter = { ...base, isVerified: false, isDeleted: false };
    } else if (status === 'accepted') {
      filter = { ...base, isVerified: true, isDeleted: false };
    } else if (status === 'revoked') {
      filter = { ...base, isDeleted: true };
    }

    const staff = await User.find(filter)
      .select('-password -otp -otpExpire -inviteToken')
      .sort({ createdAt: -1 });

    return res.status(200).json({ data: staff });
  } catch (error) {
    console.error("Error in getStaffMembers", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateStaffPermissions = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: "Only store owners can update staff permissions" });
    }

    const { storeRole, permissions } = req.body;
    const safeStoreRole = ALLOWED_STORE_ROLES.includes(storeRole) ? storeRole : null;
    if (!safeStoreRole) {
      return res.status(400).json({ message: "Invalid storeRole" });
    }

    let resolvedPermissions;
    try {
      resolvedPermissions = resolveStaffPermissions(safeStoreRole, permissions);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const staff = await User.findOne({
      _id: req.params.id,
      parentAccount: req.user._id,
      role: 'staff',
      isDeleted: false,
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found or unauthorized" });
    }

    staff.storeRole = safeStoreRole;
    staff.permissions = resolvedPermissions;
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();

    await Token.deleteMany({ user: staff._id });

    return res.status(200).json({
      message: "Staff permissions updated. They must sign in again.",
      data: {
        _id: staff._id,
        email: staff.email,
        userName: staff.userName,
        storeRole: staff.storeRole,
        permissions: staff.permissions,
        isVerified: staff.isVerified,
        isDeleted: staff.isDeleted,
      },
    });
  } catch (error) {
    console.error("Error in updateStaffPermissions", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const revokeStaffAccess = async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: "Only store owners can revoke staff access" });
    }

    const staff = await User.findOne({
      _id: req.params.id,
      parentAccount: req.user._id,
      role: 'staff',
      isDeleted: false,
    });

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found or unauthorized" });
    }

    staff.isDeleted = true;
    staff.deletedAt = Date.now();
    staff.isActive = false;
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();

    await Token.deleteMany({ user: staff._id });

    return res.status(200).json({
      message: "Staff access revoked successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Error in revokeStaffAccess", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getOwnerNavBadges = async (req, res) => {
  try {
    const targetOwnerId = req.user.role === 'staff' ? req.user.parentAccount : req.user._id;
    if (!targetOwnerId) {
      return res.status(200).json({ data: { openTickets: 0, openDisputes: 0, unreadNotifications: 0 } });
    }

    const storeIds = await Store.find({ owner: targetOwnerId, isDeleted: false }).distinct('_id');

    const [openTickets, openDisputes, unreadNotifications] = await Promise.all([
      Support.countDocuments({ owner: targetOwnerId, status: 'open' }),
      Review.countDocuments({ store: { $in: storeIds }, status: "disputed", isDeleted: false }),
      Notification.countDocuments({ user: targetOwnerId, isRead: false }),
    ]);

    return res.status(200).json({ data: { openTickets, openDisputes, unreadNotifications } });
  } catch (error) {
    console.error("Error in getOwnerNavBadges", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const requestLoginOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (!user || !user.isVerified) {
            // Avoid account enumeration — same message either way
            return res.status(200).json({ message: "If that email is registered, a login code was sent." });
        }
        if (user.isDeleted || user.isActive === false) {
            return res.status(401).json({ message: "Account deactivated" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
        user.otpPurpose = 'login';
        await user.save();

        await sendEmail({
            email: user.email,
            subject: "EchoStream - Login code",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #06b6d4;">Login without password</h2>
                <p>Your one-time login code is:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #8b5cf6;">${otp}</h1>
                <p style="color:#666;">Expires in 10 minutes.</p>
              </div>
            `,
        });

        return res.status(200).json({ message: "If that email is registered, a login code was sent." });
    } catch (error) {
        console.error("Error in requestLoginOtp", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const verifyLoginOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

        const user = await User.findOne({ email }).select("+otp +otpExpire +otpPurpose");
        if (!user || !user.isVerified) return res.status(400).json({ message: "Invalid or expired login code." });
        if (user.isDeleted || user.isActive === false) {
            return res.status(401).json({ message: "Account deactivated" });
        }
        if (user.otpPurpose !== 'login' || user.otp !== otp || user.otpExpire < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired login code." });
        }

        if (user.role === 'staff') {
            if (!user.parentAccount) {
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
            const parent = await User.findById(user.parentAccount).select('isDeleted isActive role');
            if (!parent || parent.isDeleted || parent.isActive === false) {
                return res.status(403).json({ message: "Parent organization account is suspended or deleted" });
            }
        }

        user.otp = undefined;
        user.otpExpire = undefined;
        user.otpPurpose = undefined;
        await user.save();

        const accessToken = await generateToken(user, res);
        const staffMeta = await resolveUserStaffMeta(user);
        return res.status(200).json({
            message: "Logged in successfully",
            user: buildUserPayload(user, accessToken, staffMeta),
        });
    } catch (error) {
        console.error("Error in verifyLoginOtp", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (user && user.isVerified && !user.isDeleted && user.isActive !== false) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            user.otp = otp;
            user.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
            user.otpPurpose = 'reset';
            await user.save();

            await sendEmail({
                email: user.email,
                subject: "EchoStream - Reset your password",
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #06b6d4;">Password reset</h2>
                    <p>Use this code to set a new password:</p>
                    <h1 style="font-size: 32px; letter-spacing: 5px; color: #8b5cf6;">${otp}</h1>
                    <p style="color:#666;">Expires in 10 minutes. If you did not request this, ignore this email.</p>
                  </div>
                `,
            });
        }

        return res.status(200).json({
            message: "If that email is registered, a reset code was sent.",
        });
    } catch (error) {
        console.error("Error in requestPasswordReset", error);
        return res.status(500).json({ message: "Server error" });
    }
};

const resetPasswordWithOtp = async (req, res) => {
    try {
        const { email, otp, password, confirmPassword } = req.body;
        if (!email || !otp || !password || !confirmPassword) {
            return res.status(400).json({ message: "Email, OTP, password, and confirm password are required." });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        const user = await User.findOne({ email }).select("+otp +otpExpire +otpPurpose +password");
        if (!user || !user.isVerified) {
            return res.status(400).json({ message: "Invalid or expired reset code." });
        }
        if (user.otpPurpose !== 'reset' || user.otp !== otp || user.otpExpire < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired reset code." });
        }

        user.password = password;
        user.otp = undefined;
        user.otpExpire = undefined;
        user.otpPurpose = undefined;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        return res.status(200).json({
            message: "Password updated. You can sign in with your new password.",
        });
    } catch (error) {
        console.error("Error in resetPasswordWithOtp", error);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * Continue with Google — verify GIS ID token, upsert profile, issue session.
 */
const googleAuthLogin = async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) {
      return res.status(503).json({ message: 'Google Sign-In is not configured (missing GOOGLE_CLIENT_ID).' });
    }

    const ticket = await googleClient().verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      return res.status(400).json({ message: 'Invalid Google token payload.' });
    }
    if (payload.email_verified === false) {
      return res.status(400).json({ message: 'Google email is not verified.' });
    }

    const email = String(payload.email).toLowerCase().trim();
    const googleId = payload.sub;
    const userName = (payload.name || payload.given_name || email.split('@')[0] || 'User').slice(0, 80);
    const profilePic = payload.picture || null;

    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });
    let isNewUser = false;

    if (user) {
      if (user.isDeleted || user.isActive === false) {
        return res.status(401).json({ message: 'Account deactivated' });
      }
      if (user.role === 'staff') {
        if (!user.parentAccount) {
          return res.status(403).json({ message: 'Parent organization account is suspended or deleted' });
        }
        const parent = await User.findById(user.parentAccount).select('isDeleted isActive role');
        if (!parent || parent.isDeleted || parent.isActive === false) {
          return res.status(403).json({ message: 'Parent organization account is suspended or deleted' });
        }
      }

      // Link Google identity to existing email account
      user.googleId = user.googleId || googleId;
      if (user.authProvider === 'local') {
        // Keep local password auth; also allow Google on the same email
      } else {
        user.authProvider = 'google';
      }
      user.isVerified = true;
      if (profilePic && !user.profilePic) user.profilePic = profilePic;
      if ((!user.userName || user.userName === email.split('@')[0]) && userName) {
        user.userName = userName;
      }
      await user.save();
    } else {
      isNewUser = true;
      user = await User.create({
        userName,
        email,
        googleId,
        authProvider: 'google',
        profilePic,
        isVerified: true,
        role: 'owner',
        // Random secret — Google users sign in via Google
        password: crypto.randomBytes(32).toString('hex'),
      });
    }

    const accessToken = await generateToken(user, res);
    const staffMeta = await resolveUserStaffMeta(user);
    return res.status(200).json({
      message: 'Signed in with Google',
      user: buildUserPayload(user, accessToken, staffMeta),
      isNewUser,
    });
  } catch (error) {
    console.error('googleAuthLogin', error);
    if (error.code === 'MISSING_GOOGLE_CLIENT') {
      return res.status(503).json({ message: 'Google Sign-In is not configured.' });
    }
    return res.status(401).json({ message: 'Google authentication failed. Please try again.' });
  }
};

export { registerUser, loginUser, logoutUser, refreshToken,updateUserCredentials, generateTicket,getTickets,replyToAdmin, verifyOTP,resendOTP, inviteStaff, resendInvite, acceptInvite, getStaffMembers, updateStaffPermissions, revokeStaffAccess, getOwnerNavBadges, requestLoginOtp, verifyLoginOtp, requestPasswordReset, resetPasswordWithOtp, googleAuthLogin };
