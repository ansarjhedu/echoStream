import User from "../models/User.js";
import generateToken from "../utils/tokenManager.js";
import Token from "../models/Token.js";
import jwt from "jsonwebtoken";

const registerUser = async (req, res) => {
  try {
    //1. collect user data for registration and validate if any field is missing
    const { email, password ,userName} = req.body;
    if (!email || !password || !userName) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    //2. check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    //3. create new user
    const user = await User.create({
      email,
      password,
      userName
    });

    //4.generate tokens (access and refresh) - can be implemented later when we have auth in place
    const accessToken = await generateToken(user, res);

    //4. return success response with user data (excluding password)
    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        email: user.email,
        userName: user.userName,
        role:user.role,
        accessToken: {
          message:
            "copy this token and use it in the header for authentication in future requests",
          token: accessToken,
        },
      },
    });
  } catch (error) {
    console.error("Error in registerUser", error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
    try {
        
        //1. collect login credentials and validate
        const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide email and password" });
  }

  //2. find user by email
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  //3. compare password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
  }

  //4. generate tokens (access and refresh) 
  const accessToken = await generateToken(user, res);

  //5. return success response with user data (excluding password)
  res.status(200).json({
      message: user.role==="admin"?"Admin logged in successfully":"User logged in successfully",
      user: {
          _id: user._id,
          email: user.email,
          userName: user.userName,
          role:user.role,
          accessToken: {
              message:
              "copy this token and use it in the header for authentication in future requests",
              token: accessToken,
            },
        },
    });
  } catch (error) {
        console.error("Error in loginUser", error);
        res.status(500).json({ message: "Server error" });
};
}

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
        const userId=req.user._id;
        const user=await User.findById(userId);

        if(!user){
            return res.status(404).json("User not found")
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
            data:user,
            message:"User details updated successfully"
        })
      }
    catch (error) {
        console.log(error)
        return res.status(500).json("Internal Server Error ")
    }
}
export { registerUser, loginUser, logoutUser, refreshToken,updateUserCredentials };
