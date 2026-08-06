import rateLimit from "express-rate-limit";

export const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 reviews per hour
    message: { message: "Too many reviews submitted from this IP, please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 5 attempts per IP per window
    message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});   