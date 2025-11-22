# Cloudinary Setup Guide

## ✅ What Has Been Done

### 1. Created Cloudinary Configuration
- **File:** `config/cloudinary.js`
- Configured Cloudinary with environment variables
- Set up Multer with Cloudinary storage
- Images will be stored in folder: `geargrid/products`
- Image size limit: 5MB
- Auto-resize to max 1000x1000px

### 2. Updated Product Controller
- **File:** `controllers/admin/productController.js`
- Changed `file.filename` to `file.path` (Cloudinary URLs)
- Added validation for required images
- Updated both `addProduct` and `updateProduct` functions

### 3. Updated Admin Routes
- **File:** `routes/adminRoutes.js`
- Changed import from `config/multer.js` to `config/cloudinary.js`
- Routes now use Cloudinary upload middleware

### 4. Updated Views
- **Files:** `views/admin/products.ejs`, `views/admin/EditProduct.ejs`
- Changed image src from `/uploads/products/filename` to direct Cloudinary URL
- Added error handling with placeholder image

### 5. Updated Environment Variables
- **File:** `.env`
- Added placeholders for Cloudinary credentials

---

## 📝 What You Need To Do

### Step 1: Install Required Packages
Run this command in your terminal:
```bash
npm install cloudinary multer-storage-cloudinary
```

### Step 2: Add Your Cloudinary Credentials
Open `.env` file and replace these values:
```env
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

### Step 3: Restart Your Server
```bash
npm start
```

---

## 🎯 How It Works

1. **Upload:** When admin uploads product images, they go directly to Cloudinary
2. **Storage:** Cloudinary returns URLs like: `https://res.cloudinary.com/your-cloud/image/upload/v123/geargrid/products/abc123.jpg`
3. **Database:** These URLs are stored in MongoDB
4. **Display:** Views use these URLs directly to show images

---

## ✨ Benefits

- ✅ No local storage needed
- ✅ Automatic image optimization
- ✅ CDN delivery (fast loading)
- ✅ Automatic resizing
- ✅ Free tier: 25GB storage, 25GB bandwidth/month

---

## 🔧 Troubleshooting

**If images don't upload:**
1. Check if packages are installed: `npm list cloudinary multer-storage-cloudinary`
2. Verify .env credentials are correct
3. Check console for error messages
4. Ensure Cloudinary account is active

**If images don't display:**
1. Check browser console for 404 errors
2. Verify URLs in database are complete Cloudinary URLs
3. Check Cloudinary dashboard to see if images were uploaded

---

## 📂 File Structure
```
config/
  └── cloudinary.js          ✅ Created
controllers/admin/
  └── productController.js   ✅ Updated
routes/
  └── adminRoutes.js         ✅ Updated
views/admin/
  ├── products.ejs           ✅ Updated
  └── EditProduct.ejs        ✅ Updated
.env                         ✅ Updated
```

---

## 🚀 Ready to Test!

Once you've completed Steps 1-3 above, try:
1. Go to `/admin/products/add`
2. Fill in product details
3. Upload 1-5 images
4. Submit form
5. Check if product appears with images in products list
