import { Router } from "express";
import { registerUser,loginUser,logoutUser, refreshToken, updateUserCredentials, generateTicket, getTickets} from "../controllers/userController.js";
import { authUser } from "../middlewares/authUser.js";
import { upload } from "../utils/cloudinary.js";

const userRouter=Router();

userRouter.post("/register",registerUser);
userRouter.post("/login",loginUser);
userRouter.post("/logout",logoutUser);
userRouter.post("/refresh",refreshToken);

userRouter.put("/update",authUser,upload.single("profilePic"),updateUserCredentials);

userRouter.post("/support/create",authUser,upload.array("images", 3),generateTicket); // NEW route for creating support tickets with image uploads
userRouter.get("/support/list",authUser,getTickets); // NEW route for fetching user's support tickets

export default userRouter;