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


connectDB().then(() => {
    // Only start the background workers AFTER the DB is connected
    cleanupCron();

    // Only start the Express server AFTER the DB is connected
    if (process.env.NODE_ENV !== 'production') {
        app.listen(port, () => {
            console.log(`🚀 Server is running on port http://localhost:${port}`);
        });
    }
}).catch(err => {
    console.error("Failed to start server due to DB connection issue:", err);
});


// app.use(cors({
//     origin: [
//         "http://localhost:5173",
//         "https://echo-stream-5nch.vercel.app",
//     ],
//          credentials: true
// }));


// 1. Update CORS (We will add your live frontend URL later, use an array for now)
const allowedOrigins =[
  "http://localhost:5173", 
  "https://echo-stream-5nch.vercel.app/",
  "http://127.0.0.1:5500"// You will change this later!
];
// Replace your old CORS config with this dynamic one:
app.use(cors({
    origin: function (origin, callback) {
        // By passing the 'origin' directly back, we dynamically allow ANY website 
        // to use the public widget, while still satisfying the browser's strict 
        // requirement for credentials (cookies) in the Admin Dashboard!
        callback(null, origin || '*');
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

