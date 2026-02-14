import { Router } from "express";
import productCntrl from "../controllers/admin/productController.js";
import categoryCtrl from "../controllers/admin/categoryController.js";
import { isAdminAuthenticated ,isAdminNotAuthenticated } from "../middlewares/authMiddleware.js";
import adminCtrl from '../controllers/admin/adminController.js'
import { upload } from "../config/cloudinary.js";
import orderCtrl from '../controllers/admin/orderController.js';
import salesReportCtrl from "../controllers/admin/salesReportController.js";
import couponCtrl from "../controllers/admin/couponController.js";

const router = Router();

//login routes
router.get('/login',isAdminNotAuthenticated,adminCtrl.getLogin)
router.post('/login',isAdminNotAuthenticated,adminCtrl.adminLogin)

//dashboard routes
router.get('/dashboard',isAdminAuthenticated,adminCtrl.getDashboard);


//customer page
router.get('/customers',isAdminAuthenticated,adminCtrl.getCustomerPage)

//toggle block of customer
router.patch('/customers/toggle-block/:id', isAdminAuthenticated, adminCtrl.toggleBlockUser);



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
router.patch('/product/toggleBlock/:id',isAdminAuthenticated,productCntrl.toggleBlockProduct);

// //deleting product
// router.post('/products/delete/:id',isAdminAuthenticated,productCntrl.deleteProduct);

//category routes
router.get('/categories', isAdminAuthenticated, categoryCtrl.getCategories);
router.get('/category/add', isAdminAuthenticated, categoryCtrl.getAddCategory);
router.post('/category/add', isAdminAuthenticated, categoryCtrl.addCategory);
router.get('/category/edit/:id', isAdminAuthenticated, categoryCtrl.getEditCategory);
router.put('/category/edit/:id', isAdminAuthenticated, categoryCtrl.updateCategory);
router.patch('/category/toggle/:id', isAdminAuthenticated, categoryCtrl.toggleListCategory);
// router.post('/category/delete/:id', isAdminAuthenticated, categoryCtrl.deleteCategory);

//order management routes
router.get('/orders', isAdminAuthenticated, orderCtrl.getOrders);
router.get('/orders/:id', isAdminAuthenticated, orderCtrl.getOrderDetails);
router.get('/orders/:id/invoice', isAdminAuthenticated, orderCtrl.downloadInvoice);
router.patch('/orders/:id/update', isAdminAuthenticated, orderCtrl.updateOrderStatus);
router.get('/orders/export', isAdminAuthenticated, orderCtrl.exportOrders);
router.patch('/returns/update', isAdminAuthenticated, orderCtrl.updateReturnStatus);

//logout route
router.get('/logout', isAdminAuthenticated, adminCtrl.logout)

// Coupon Management Routes

router.get('/coupons', isAdminAuthenticated, couponCtrl.getCoupons);
router.post('/coupons/add', isAdminAuthenticated, couponCtrl.createCoupon);
router.get('/coupons/:id', isAdminAuthenticated, couponCtrl.getCouponById);
router.put('/coupons/update/:id', isAdminAuthenticated, couponCtrl.updateCoupon);
router.patch('/coupons/toggle-status/:id', isAdminAuthenticated, couponCtrl.toggleCouponStatus);
router.delete('/coupons/delete/:id', isAdminAuthenticated, couponCtrl.deleteCoupon);

// Sales Report Routes

router.get('/sales-report', isAdminAuthenticated, salesReportCtrl.getSalesReport);
router.get('/sales-report/pdf', isAdminAuthenticated, salesReportCtrl.downloadPDF);
router.get('/sales-report/excel', isAdminAuthenticated, salesReportCtrl.downloadExcel);

export default router;






