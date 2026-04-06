import dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
    api_key: process.env.CLOUDINARY_API_KEY ,
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

console.log(process.env.CLOUDINARY_API_KEY)


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'echostream_reviews',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [{ width: 800, crop: "limit" }] // Optimization
    },
});

export const upload = multer({ storage: storage });