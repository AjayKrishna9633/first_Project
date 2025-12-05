import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage for Profile Images
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'geargrid/profiles',  // Different folder from products
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ 
            width: 500, 
            height: 500, 
            crop: 'fill',  // Crop to square
            gravity: 'face'  // Focus on face if detected
        }]
    }
});

// Create multer upload instance for profiles
const profileUpload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

export default profileUpload;
