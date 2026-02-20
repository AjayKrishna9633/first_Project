import { Router } from "express";
import userCtrl from "../controllers/user/userController.js";
import passport from "passport";
import { isNotAuthenticated, protectUser } from "../middlewares/authMiddleware.js";
import productCtrl from '../controllers/user/productController.js';
import addressCtrl from '../controllers/user/addressController.js'
import profileUpload from '../config/profileUpload.js';
import wishlistCtrl from "../controllers/user/whislistcontroller.js";
import cartCtrl from "../controllers/user/cartController.js";
import checkoutCtrl from "../controllers/user/checkoutController.js";
import orderCtrl from "../controllers/user/orderController.js";
import walletCtrl from "../controllers/user/walletController.js";
const router = Router();

//  HOME ROUTE 
router.get('/', (req, res) => {
    if (req.session?.admin) {
        return res.redirect('/admin/dashboard');
    }
    if (req.session?.user) {
        return res.redirect('/home');
    } else {
        return userCtrl.loadhomePage(req, res);
    }
});

// SIGNUP ROUTES
router.get('/signup', isNotAuthenticated, userCtrl.getSignup);
router.post('/signup', isNotAuthenticated, userCtrl.registerUser);

// LOGIN ROUTES
router.get('/login', isNotAuthenticated, userCtrl.getLogin);
router.post('/login', isNotAuthenticated, userCtrl.loginUser);

// OTP ROUTES
router.get('/otp', isNotAuthenticated, userCtrl.getOtp);
router.post('/verify-otp', isNotAuthenticated, userCtrl.verifyOtp);
router.post('/resend-otp', isNotAuthenticated, userCtrl.resendOtp);

// FORGOT/RESET PASSWORD ROUTES 
router.get('/forgot-password', isNotAuthenticated, userCtrl.getForgotPassword);
router.post('/send-reset-otp', isNotAuthenticated, userCtrl.sendPasswordResetOTP);
router.post('/verify-reset-otp', isNotAuthenticated, userCtrl.verifyResetOTP);
router.patch('/reset-password', isNotAuthenticated, userCtrl.resetPassword);

// GOOGLE OAUTH ROUTES
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/signup' }),
    (req, res) => {
        
        req.session.user = {
            id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            role: 'user'
        };
        res.redirect('/');
    }
);

//  PROTECTED ROUTES 
router.get('/home', protectUser, userCtrl.loadhomePage);

//  PROFILE ROUTES 
router.get('/profile', protectUser, userCtrl.getProfile);
router.patch('/profile', protectUser, userCtrl.updateProfile);
//profile reset  password

router.get('/changePassword', protectUser, userCtrl.getChangePassword)
router.patch('/changePassword', protectUser, userCtrl.changePassword)

//profile reset Email

router.get('/changeEmail', protectUser, userCtrl.getChangeEmail);

 router.post('/profile/EmailReset',protectUser,userCtrl.requestEmailChange)
 router.post('/profile/verifyEmailReset', protectUser, userCtrl.verifyEmailChange);

//proflie photo
router.post('/profile/uploadImage', protectUser, profileUpload.single('profileImage'), userCtrl.updateProfileImage);


//  LOGOUT ROUTE 
router.get('/logout', userCtrl.logout);

//  ERROR ROUTES 
router.get('/pageNotFound', userCtrl.pageNotFound);

//  ABOUT US ROUTE
router.get('/about', (req, res) => {
    res.render('user/about', { user: req.session?.user || null });
});

//shop page
router.get('/shop', productCtrl.getShopPage)

//product detail page
router.get('/product/:id', productCtrl.getProductDetail)


//

// address
router.get('/address',protectUser,addressCtrl.AddressPage)
router.post('/address/add',protectUser,addressCtrl.addAddress)
router.get('/address/edit/:id', protectUser, addressCtrl.getEditAddress);
router.delete('/address/delete/:id', protectUser, addressCtrl.deleteAddress);
router.patch('/address/update/:id', protectUser, addressCtrl.updateAddress);
router.patch('/address/set-default/:id', protectUser, addressCtrl.setDefaultAddress);

//whishlist
router.post('/wishlist/add', protectUser, wishlistCtrl.addToWishlist);
router.get('/wishlist', protectUser, wishlistCtrl.getWishlist);
router.post('/wishlist/remove', protectUser, wishlistCtrl.removeFromWishlist);
router.post('/wishlist/moveToCart', protectUser, wishlistCtrl.moveToCart);

//cart
router.get('/cart',protectUser,cartCtrl.getCart);
router.put('/cart/add',protectUser,cartCtrl.addToCart);
router.patch('/cart/update',protectUser,cartCtrl.updateCartItem);
router.delete('/cart/remove',protectUser,cartCtrl.removeFromCart)


//checkout
router.get('/checkout', protectUser, checkoutCtrl.getCheckOut);
router.post('/checkout/place-order', protectUser, checkoutCtrl.placeOrder);
router.post('/checkout/apply-coupon', protectUser, checkoutCtrl.applyCoupon);
router.get('/checkout/available-coupons', protectUser, checkoutCtrl.getAvailableCoupons);
router.post('/checkout/verify-payment', protectUser, checkoutCtrl.verifyPayment);
router.post('/checkout/cancel-payment', protectUser, checkoutCtrl.cancelPayment);

router.get('/orders/success', protectUser, checkoutCtrl.getOrderSuccess);
router.get('/orders/failed', protectUser, checkoutCtrl.getOrderFailure);


router.post('/buy-now', protectUser, checkoutCtrl.buyNow);
router.get('/checkout/buy-now', protectUser, checkoutCtrl.getBuyNowCheckout);

//order management routes
router.get('/orders', protectUser, orderCtrl.getUserOrders);
router.get('/orders/:id', protectUser, orderCtrl.getOrderDetails);
router.patch('/orders/:id/cancel', protectUser, orderCtrl.cancelOrder);
router.patch('/orders/:orderId/items/:itemId/cancel', protectUser, orderCtrl.cancelOrderItem);
router.get('/orders/:id/invoice', protectUser, orderCtrl.downloadInvoice);
router.post('/orders/return/request', protectUser, orderCtrl.requestReturn);
router.post('/orders/:id/pay-cod', protectUser, orderCtrl.payCODOrder);
router.post('/orders/:id/verify-cod-payment', protectUser, orderCtrl.verifyCODPayment);

//wallet routes
router.get('/wallet', protectUser, walletCtrl.getWallet);
router.post('/wallet/add-money', protectUser, walletCtrl.addMoney);
router.post('/wallet/verify-payment', protectUser, walletCtrl.verifyPayment);
router.post('/wallet/apply-referral', protectUser, walletCtrl.applyReferral);


export default router;