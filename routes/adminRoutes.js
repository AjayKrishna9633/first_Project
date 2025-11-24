import { Router } from "express";
import productCntrl from "../controllers/admin/productController.js";
import categoryCtrl from "../controllers/admin/categoryController.js";
import { isAdminAuthenticated ,isAdminNotAuthenticated } from "../middlewares/authMiddleware.js";
import adminCtrl from '../controllers/admin/adminController.js'
import { upload } from "../config/cloudinary.js";
const router = Router();

//login routes
router.get('/login',isAdminNotAuthenticated,adminCtrl.getLogin)
router.post('/login',isAdminNotAuthenticated,adminCtrl.adminLogin)

//dashboard routes
router.get('/dashboard',isAdminAuthenticated,adminCtrl.getDashboard);


//customer page
router.get('/customers',isAdminAuthenticated,adminCtrl.getCustomerPage)

//toggle block of customer
router.post('/customers/toggle-block/:id', isAdminAuthenticated, adminCtrl.toggleBlockUser);



//product routes 

//product page
router.get('/products',isAdminAuthenticated,productCntrl.getProduct)

//product adding
router.get('/product/add',isAdminAuthenticated,productCntrl.getAddProduct)
router.post('/products/add',isAdminAuthenticated,upload.any(),productCntrl.addProduct);

//product editing
router.get('/product/edit/:id',isAdminAuthenticated,productCntrl.getEditProductPage);
router.post('/products/edit/:id',isAdminAuthenticated,upload.any(),productCntrl.updateProduct)

//toggle button for product 
router.post('/product/toggleBlock/:id',isAdminAuthenticated,productCntrl.toggleBlockProduct);

//deleting product
router.post('/products/delete/:id',isAdminAuthenticated,productCntrl.deleteProduct);

//category routes
router.get('/categories', isAdminAuthenticated, categoryCtrl.getCategories);
router.get('/category/add', isAdminAuthenticated, categoryCtrl.getAddCategory);
router.post('/category/add', isAdminAuthenticated, categoryCtrl.addCategory);
router.get('/category/edit/:id', isAdminAuthenticated, categoryCtrl.getEditCategory);
router.post('/category/edit/:id', isAdminAuthenticated, categoryCtrl.updateCategory);
router.post('/category/toggle/:id', isAdminAuthenticated, categoryCtrl.toggleListCategory);
router.post('/category/delete/:id', isAdminAuthenticated, categoryCtrl.deleteCategory);

//logout route
router.get('/logout', isAdminAuthenticated, adminCtrl.logout)

export default router;






