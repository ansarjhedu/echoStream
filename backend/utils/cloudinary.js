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

/**
 * Extract Cloudinary public_id from a full delivery URL.
 * Handles optional transformations and version segments.
 */
export const extractCloudinaryPublicId = (url) => {
    if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
    try {
        const afterUpload = url.split('/upload/')[1];
        if (!afterUpload) return null;
        // Strip transforms (e.g. c_limit,w_800/) and version (v123456/)
        const withoutVersion = afterUpload.replace(/^(?:[^/]+\/)*v\d+\//, '');
        return withoutVersion.replace(/\.[a-zA-Z0-9]+(\?.*)?$/, '');
    } catch {
        return null;
    }
};

/**
 * Destroy one or many Cloudinary assets by delivery URL.
 */
export const deleteCloudinaryImages = async (urls = []) => {
    const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    const publicIds = [...new Set(list.map(extractCloudinaryPublicId).filter(Boolean))];
    if (publicIds.length === 0) return;

    await Promise.allSettled(
        publicIds.map((publicId) =>
            cloudinary.uploader.destroy(publicId).catch((err) => {
                console.error(`Cloudinary destroy failed for ${publicId}:`, err?.message || err);
            })
        )
    );
};

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'echostream_reviews',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [{ width: 800, crop: "limit" }] // Optimization
    },
});

export const upload = multer({ storage: storage });
export { cloudinary };