import { Router } from "express";
import userCtrl from "../controllers/user/userController.js";
import passport from "passport";
import { isNotAuthenticated, protectUser } from "../middlewares/authMiddleware.js";
import productCtrl from '../controllers/user/productController.js';
import addressCtrl from '../controllers/user/addressController.js'
import profileUpload from '../config/profileUpload.js';

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
router.post('/reset-password', isNotAuthenticated, userCtrl.resetPassword);

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
router.post('/profile', protectUser, userCtrl.updateProfile);
//profile reset  password

router.get('/changePassword', protectUser, userCtrl.getChangePassword)
router.post('/changePassword', protectUser, userCtrl.changePassword)

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
export default router;