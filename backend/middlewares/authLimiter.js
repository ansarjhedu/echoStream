import rateLimit from "express-rate-limit";

export const reviewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 reviews per hour
    message: { message: "Too many reviews submitted from this IP, please try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
});