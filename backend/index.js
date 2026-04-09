import dotenv from "dotenv";
dotenv.config();
import dns from "dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from "express";
import cors from "cors";
import connectDB from "./config/mongoDB.js";
import userRouter from "./routes/userRoute.js";
import cookieParser from "cookie-parser";
import adminRouter from "./routes/adminRoutes.js";
import publicRouter from "./routes/publicRoutes.js";
import storeRouter from "./routes/storeRoutes.js";
// import { fileURLToPath } from "url";
// import path from "path";
import cleanupCron from "./services/cronjobs.js";


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


const app=express();
const port= process.env.PORT || 5000;


connectDB();
cleanupCron.start(); // Start the cron job scheduler


// 1. Update CORS (We will add your live frontend URL later, use an array for now)
const allowedOrigins =[
  "http://localhost:5173", 
  "https://echo-stream-5nch.vercel.app/" // You will change this later!
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// // 2. HOST THE WIDGET (Local CDN)
// // This serves any file placed inside the "widget-dist" folder
// app.use("/widget", express.static(path.join(__dirname, "widget-dist")));

app.use("/api/users",userRouter);
app.use("/api/admin",adminRouter);
app.use("/api/public",publicRouter);
app.use("/api/store",storeRouter);

app.get("/",(req,res)=>{
    res.send("Hello World");
}
);




if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port http://localhost:${port}`);
    });
}