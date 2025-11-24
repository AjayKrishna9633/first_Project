import multer from "multer";
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);  

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/products')
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);  

    if (extname && mimetype) {  
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'))
    }
}
const upload = multer({
    storage:storage,
    limits:{fileSize:5*1024*1024},
    fileFilter:fileFilter
})

export default upload;