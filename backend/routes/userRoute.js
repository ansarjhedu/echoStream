import { Router } from "express";
import { registerUser,loginUser,logoutUser, refreshToken} from "../controllers/userController.js";
import { updateUserCredentials } from "../controllers/userController.js";
import { authUser } from "../middlewares/authUser.js";
import { upload } from "../utils/cloudinary.js";

const userRouter=Router();

userRouter.post("/register",registerUser);
userRouter.post("/login",loginUser);
userRouter.post("/logout",logoutUser);
userRouter.post("/refresh",refreshToken);
userRouter.put("/update",authUser,upload.single("profilePic"),updateUserCredentials);

export default userRouter;