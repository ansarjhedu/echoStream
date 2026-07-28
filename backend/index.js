import dotenv from "dotenv";
dotenv.config();
import dns from "dns";
dns.setServers(['8.8.8.8', '8.8.4.4']);

// (Note: dns.setServers is usually not needed for Vercel and can sometimes cause issues. 
// If MongoDB Atlas times out, it's better to rely on standard DNS resolution in the cloud.)

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/mongoDB.js";
import userRouter from "./routes/userRoute.js";
import adminRouter from "./routes/adminRoutes.js";
import publicRouter from "./routes/publicRoutes.js";
import storeRouter from "./routes/storeRoutes.js";
import startCronJobs from "./services/cronjobs.js"; // Renamed for clarity!

const app = express();
const port = process.env.PORT || 5000;

// ==========================================
// 1. MIDDLEWARE & CORS (MUST BE AT THE TOP)
// ==========================================
const allowedAdminOrigins = [
    "http://localhost:5173",          
    "http://127.0.0.1:5173",          
    "http://127.0.0.1:5500",          
    "https://echo-stream-5nch.vercel.app" // Your Live Dashboard
];

const corsOptionsDelegate = (req, callback) => {
    let corsOptions;
    if (req.originalUrl.startsWith('/api/public')) {
        corsOptions = { origin: true, credentials: false }; 
    } else {
        const origin = req.header('Origin');
        if (allowedAdminOrigins.includes(origin) || !origin) {
            corsOptions = { origin: true, credentials: true };
        } else {
            corsOptions = { origin: false };
        }
    }
    callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));
app.use(express.json());
app.use(cookieParser());

// ==========================================
// 2. REGISTER ROUTES
// ==========================================
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/public", publicRouter);
app.use("/api/store", storeRouter);

app.get("/", (req, res) => {
    res.send("EchoStream API is live.");
});

// ==========================================
// 3. DATABASE & SERVER INITIALIZATION
// ==========================================
// We connect to the DB. Since Vercel keeps the function "warm" between requests,
// connectDB() should be smart enough not to reconnect if it's already connected!
connectDB().then(() => {
    // Start background workers
    startCronJobs();

    // Start local server ONLY if we are not on Vercel
    if (process.env.NODE_ENV !== 'production') {
        app.listen(port, () => {
            console.log(`🚀 Local Server running on http://localhost:${port}`);
        });
    }
}).catch(err => {
    console.error("DB Connection Failed:", err);
});

// 🚨 MANDATORY FOR VERCEL: Export the fully configured app!
export default app;
