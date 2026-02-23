import User from "../../models/userModal.js";
import { comparePassword, hashPassword } from "../../utils/hashUtils.js";
import nodemailer from 'nodemailer';
import env from "dotenv";
import user from "../../models/userModal.js";
import StatusCodes from '../../utils/statusCodes.js';
import { AUTH_MESSAGES, USER_MESSAGES } from '../../constants/messages.js';
import { generateReferralCode, REFERRAL_REWARDS } from '../../utils/referralUtils.js';




env.config();



// Email transporter configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    });
};

// Send email function
async function sendEmailVerification(email, otp) {
    try {
        const transporter = createTransporter();
        
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your GEARGRID account",
            text: `Your OTP is ${otp}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
                        .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: #000; color: #fff; text-align: center; padding: 20px; }
                        .content { padding: 30px; }
                        .otp { font-size: 32px; font-weight: bold; color: #000; text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 20px 0; }
                        .footer { font-size: 12px; color: #6b7280; text-align: center; padding: 15px; border-top: 1px solid #e5e7eb; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>GEARGRID</h1></div>
                        <div class="content">
                            <h2>Verify Your Account</h2>
                            <p>Your OTP for account verification is:</p>
                            <div class="otp">${otp}</div>
                            <p><strong>Note:</strong> This OTP will expire in 5 minutes.</p>
                        </div>
                        <div class="footer">© ${new Date().getFullYear()} GEARGRID. All rights reserved.</div>
                    </div>
                </body>
                </html>
            `
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email:", error.message);
        return false;
    }
}

// Generate 6-digit OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

//  LOGIN FUNCTIONS 

export const getLogin = async (req, res) => {
    try {
        
        res.render("user/login", {
            message: null,
            isError: false,
            oldInput: {}
        });
    } catch (error) {
        console.error("Error in getLogin:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/pageNotFound');
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render('user/login', {
                message: AUTH_MESSAGES.EMAIL_PASSWORD_REQUIRED,
                isError: true,
                oldInput: { email }
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const findUser = await User.findOne({ 
            email: normalizedEmail,
            isAdmin: false 
        });

        if (!findUser) {
            return res.render("user/login", {
                message: AUTH_MESSAGES.INVALID_CREDENTIALS,
                isError: true,
                oldInput: { email }
            });
        }

        if (findUser.isBlocked) {
            return res.render('user/login', {
                message: AUTH_MESSAGES.ACCOUNT_BLOCKED,
                isError: true,
                oldInput: { email }
            });
        }

        if (findUser.googleId && !findUser.password) {
            return res.render('user/login', {
                message: AUTH_MESSAGES.USE_GOOGLE_LOGIN,
                isError: true,
                oldInput: { email }
            });
        }

        const passwordMatch = await comparePassword(password, findUser.password);
        
        if (!passwordMatch) {
            return res.render('user/login', {
                message: AUTH_MESSAGES.INVALID_CREDENTIALS,
                isError: true,
                oldInput: { email }
            });
        }

        req.session.user = {
            id: findUser._id,
            fullName: findUser.fullName,
            email: findUser.email,
            role: 'user'
        };

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('user/login', {
                    message: AUTH_MESSAGES.LOGIN_SESSION_ERROR,
                    isError: true,
                    oldInput: { email }
                });
            }
            res.redirect('/');
        });

    } catch (error) {
        console.error("Error in loginUser:", error);
        res.render('user/login', {
            message: AUTH_MESSAGES.LOGIN_FAILED,
            isError: true,
            oldInput: { email: req.body.email || '' }
        });
    }
};

//  SIGNUP FUNCTIONS 

export const getSignup = (req, res) => {
   
    res.render('user/signup', {
        message: null,
        isError: false,
        oldInput: {}
    });
};

export const registerUser = async (req, res) => {
    try {
        const { name, password, confirmPassword, email, referralCode } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.render('user/signup', {
                message: AUTH_MESSAGES.ALL_FIELDS_REQUIRED,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        if (name.trim().length < 3) {
            return res.render('user/signup', {
                message: AUTH_MESSAGES.NAME_TOO_SHORT,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('user/signup', {
                message: AUTH_MESSAGES.INVALID_EMAIL,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        if (password.length < 8) {
            return res.render('user/signup', {
                message: AUTH_MESSAGES.PASSWORD_TOO_SHORT,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        if (password !== confirmPassword) {
            return res.render('user/signup', {
                message: AUTH_MESSAGES.PASSWORDS_NOT_MATCH,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email: normalizedEmail });
        
        if (existingUser) {
            return res.render("user/signup", {
                message: AUTH_MESSAGES.EMAIL_EXISTS,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        if (referralCode) {
            const validReferrer = await User.findOne({ referralCode: referralCode });
            if (!validReferrer) {
                return res.render("user/signup", {
                    message: AUTH_MESSAGES.INVALID_REFERRAL_CODE,
                    isError: true,
                    oldInput: { name, email, referralCode }
                });
            }
        }

        const otp = generateOtp();
        const otpExpires = Date.now() + 5 * 60 * 1000; 

        const emailSent = await sendEmailVerification(normalizedEmail, otp);
        
        if (!emailSent) {
            return res.render("user/signup", {
                message: AUTH_MESSAGES.VERIFICATION_EMAIL_FAILED,
                isError: true,
                oldInput: { name, email, referralCode }
            });
        }

        const hashedPassword = await hashPassword(password);

        req.session.userOtp = {
            code: otp,
            email: normalizedEmail,
            expires: otpExpires
        };
        
        req.session.userData = {
            fullName: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            referralCode: referralCode || null
        };

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('user/signup', {
                    message: AUTH_MESSAGES.SERVER_ERROR,
                    isError: true,
                    oldInput: { name, email }
                });
            }
            res.redirect('/otp');
        });

    } catch (error) {
        console.error("Error in registerUser:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render("user/signup", {
            message: AUTH_MESSAGES.SERVER_ERROR,
            isError: true,
            oldInput: { 
                name: req.body.name || '', 
                email: req.body.email || '' 
            }
        });
    }
};

//  OTP VERIFICATION 

export const getOtp = (req, res) => {
    if (!req.session.userOtp || !req.session.userData) {
        return res.redirect('/signup');
    }

    res.render('user/emailConfirmation', {
        email: req.session.userData.email,
        message: null,
        isError: false,
        otpExpires: req.session.userOtp.expires
    });
};


import WalletTransaction from "../../models/WalletTransaction.js";

export const verifyOtp = async (req, res) => {
    try {
        let { otp } = req.body;

        otp = Array.isArray(otp) ? otp.join('') : otp;

        if (!otp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter OTP.'
            });
        }

        if (!req.session.userOtp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'OTP session expired. Please sign up again.'
            });
        }

        if (req.session.userOtp.code !== otp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        if (req.session.userOtp.expires < Date.now()) {
            return res.status(StatusCodes.GONE).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        if (!req.session.userData) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Session expired. Please sign up again.'
            });
        }

        const { fullName, email, password, referralCode } = req.session.userData;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            delete req.session.userOtp;
            delete req.session.userData;
            return res.status(StatusCodes.CONFLICT).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Generate unique 6-character referral code
        let newReferralCode;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = generateReferralCode();
            const existingCode = await User.findOne({ referralCode: newReferralCode });
            if (!existingCode) {
                isUnique = true;
            }
        }

        const userData = {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            isBlocked: false,
            referralCode: newReferralCode
        };

        let referrer = null;

        if (referralCode) {
            referrer = await User.findOne({ referralCode: referralCode });
            if (referrer) {
                userData.referredBy = referralCode;
                userData.hasUsedReferral = true; // Mark as used so they can't use another code
                
                // Credit ₹500 to referrer
                referrer.Wallet += REFERRAL_REWARDS.REFERRER;
                referrer.referralEarnings += REFERRAL_REWARDS.REFERRER;
                await referrer.save();

                await WalletTransaction.create({
                    userId: referrer._id,
                    amount: REFERRAL_REWARDS.REFERRER,
                    type: 'credit',
                    balance: referrer.Wallet,
                    paymentMethod: 'referral',
                    status: 'success',
                    description: `Referral reward - ${userData.fullName} used your code during signup`
                });
            }
        }

        // Credit ₹100 to new user if they used a referral code
        if (referrer) {
            userData.Wallet = REFERRAL_REWARDS.REFEREE;
        }

        const user = new User(userData);
        const savedUser = await user.save();

        // Create transaction for new user if they used referral code
        if (referrer) {
             await WalletTransaction.create({
                userId: savedUser._id,
                amount: REFERRAL_REWARDS.REFEREE,
                type: 'credit',
                balance: savedUser.Wallet,
                paymentMethod: 'referral',
                status: 'success',
                description: `Signup bonus using referral code ${referralCode}`
            });
        }

        req.session.user = {
            id: savedUser._id,
            fullName: savedUser.fullName,
            email: savedUser.email,
            role: 'user'
        };

        delete req.session.userOtp;
        delete req.session.userData;

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: 'Account created but login failed. Please try logging in manually.'
                });
            }
            res.status(StatusCodes.CREATED).json({
                success: true,
                redirectUrl: '/'
            });
        });

    } catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Server error occurred. Please try again.'
        });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Email is required.'
            });
        }

        if (!req.session.userData) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Session expired. Please sign up again.'
            });
        }

        if (req.session.userData.email !== email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Invalid session. Please sign up again.'
            });
        }

        const otp = generateOtp();
        const otpExpires = Date.now() + 5 * 60 * 1000;

        const emailSent = await sendEmailVerification(email, otp);

        if (!emailSent) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to resend OTP. Please try again.'
            });
        }

        req.session.userOtp = {
            code: otp,
            email,
            expires: otpExpires
        };

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: 'Failed to resend OTP. Please try again.'
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'OTP resent successfully!',
                otpExpires: otpExpires
            });
        });

    } catch (error) {
        console.error('Error in resendOtp:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to resend OTP. Please try again.'
        });
    }
};



export const getForgotPassword = (req, res) => {
    res.render('user/forgotPassword', {
        message: null,
        isError: false,
        oldInput: {}
    });
};

export const sendPasswordResetOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Email is required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "Email not found"
            });
        }

        if (user.googleId && !user.password) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "This account uses Google sign-in. Please use Google to login."
            });
        }

        const otp = generateOtp();
        const otpExpires = Date.now() + 5 * 60 * 1000;

        const emailSent = await sendEmailVerification(normalizedEmail, otp);

        if (emailSent) {
            req.session.resetOtp = {
                code: otp,
                email: normalizedEmail,
                expires: otpExpires
            };

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                        success: false,
                        message: 'Failed to send OTP. Please try again.'
                    });
                }

                res.status(StatusCodes.OK).json({
                    success: true,
                    message: "OTP sent to your email"
                });
            });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to send OTP"
            });
        }
    } catch (error) {
        console.error("Error sending reset OTP:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An error occurred"
        });
    }
};

export const verifyResetOTP = async (req, res) => {
    try {
        let { otp } = req.body;

        otp = Array.isArray(otp) ? otp.join('') : otp;

        if (!otp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please enter OTP.'
            });
        }

        if (!req.session.resetOtp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'OTP session expired. Please try again.'
            });
        }

        if (req.session.resetOtp.code !== otp) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if (req.session.resetOtp.expires < Date.now()) {
            return res.status(StatusCodes.GONE).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: "OTP verified"
        });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An error occurred"
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'All fields are required.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        if (!req.session.resetOtp || !req.session.resetOtp.email) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Session expired. Please try again"
            });
        }

        const hashedPassword = await hashPassword(newPassword);

        await User.findOneAndUpdate(
            { email: req.session.resetOtp.email },
            { password: hashedPassword }
        );

        delete req.session.resetOtp;

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: 'Password updated but session error occurred.'
                });
            }

            res.status(StatusCodes.OK).json({
                success: true,
                message: "Password reset successful",
                redirectUrl: "/login"
            });
        });

    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "An error occurred"
        });
    }
};



export const getProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).redirect('/login');
        }

        res.render('user/profile', {
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || '',
                 profileImage: user.avatar?.url || null  
            },
            message: null,
            isError: false
        });
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/');
    }
};



export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/');
        }
        res.redirect('/login');
    });
};



export const loadhomePage = async (req, res) => {
    try {
        const user = req.session?.user || null;
        
        // Import models and mongoose
        const mongoose = (await import('mongoose')).default;
        const Product = (await import('../../models/porductsModal.js')).default;
        const Category = (await import('../../models/categoryModel.js')).default;
        const Order = (await import('../../models/orderModel.js')).default;
        const { applyBestDiscountToProduct, calculateBestDiscount } = await import('../../utils/discountCalculator.js');
        
        // 1. Get latest keyboard (most recently added)
        const keyboardCategory = await Category.findOne({ name: /keyboard/i });
        let latestKeyboard = await Product.findOne({
            category: keyboardCategory?._id,
            IsBlocked: false
        })
        .sort({ createdOn: -1 })
        .populate('category')
        .populate('variants')
        .lean();
        
        // Apply discount calculation to keyboard
        if (latestKeyboard) {
            latestKeyboard = applyBestDiscountToProduct(latestKeyboard);
        }
        
        // 2. Get top 3 best-selling products
        const bestSellers = await Order.aggregate([
            {
                $match: {
                    orderStatus: { $nin: ['cancelled', 'failed'] }
                }
            },
            { $unwind: '$items' },
            {
                $match: {
                    'items.status': { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.totalPrice' }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 3 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'product.variants',
                    foreignField: '_id',
                    as: 'variants'
                }
            },
            {
                $match: {
                    'product.IsBlocked': false
                }
            },
            {
                $project: {
                    _id: '$product._id',
                    productName: '$product.productName',
                    category: '$category',
                    variants: '$variants',
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);
        
        // Apply discount calculation to each bestseller
        bestSellers.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants = product.variants.map(variant => {
                    const discountInfo = calculateBestDiscount(
                        variant.regularPrice,
                        variant.salePrice,
                        product.category
                    );
                    return {
                        ...variant,
                        ...discountInfo
                    };
                });
            }
        });
        
        // 3. Get latest mouse product
        const mouseCategory = await Category.findOne({ name: /mouse/i });
        let latestMouse = await Product.findOne({
            category: mouseCategory?._id,
            IsBlocked: false
        })
        .sort({ createdOn: -1 })
        .populate('category')
        .populate('variants')
        .lean();
        
        // Apply discount calculation to mouse
        if (latestMouse) {
            latestMouse = applyBestDiscountToProduct(latestMouse);
        }
        
        return res.render("user/home", { 
            user,
            latestKeyboard,
            bestSellers,
            latestMouse
        });
    } catch (err) {
        console.log('Error loading home page:', err);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Server error");
    }
};

export const pageNotFound = async (req, res) => {
    try {
        res.render("error/error.ejs");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};


const updateProfile = async(req,res)=>{
    try{
        const userId = req.session.user.id;
        const {fullName , phone} = req.body;

        await User.findByIdAndUpdate(userId,{
            fullName:fullName,
            phone:phone
        });

        const updatedUser = await User.findById(userId);

        req.session.user.fullName = updatedUser.fullName;

        return res.render('user/profile', {
            user: {
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                phone: updatedUser.phone || ''
            },
            message: 'Profile updated successfully!',
            isError: false
        });

    }catch(error){
        console.log(error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('user/profile',{
            user:{
                fullName:req.body.fullName || '',
                email:req.session.user.email || '',
                phone: req.body.phone||'',
            },
            message : "Error while updating the profile",
            isError : true ,
        });
    }
}


const getChangePassword = async (req,res)=>{
    try{
        res.render('user/changePassword',{
            hideHeadSearch:true,
            user :req.session.user
        })
    }catch(error){
        res.redirect('/profile')
        console.log(error,'error from the getchangePassword')
    }
}

const changePassword = async(req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.password) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Cannot change password for Google authenticated accounts"
            });
        }

        const isMatch = await comparePassword(currentPassword, user.password);
        
        if (!isMatch) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const isSamePassword = await comparePassword(newPassword, user.password);
        
        if (isSamePassword) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "New password must be different from current password"
            });
        }

        const hashedPassword = await hashPassword(newPassword);

        user.password = hashedPassword;
        await user.save();

        res.status(StatusCodes.OK).json({ 
            success: true, 
            message: "Password updated successfully"
        });

    } catch(error) {
        console.log(error, "error changing password");
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: "Failed to update password" 
        });
    }
};

const getChangeEmail = async (req,res)=>{
    try{
        res.render('user/changeEmail',{
            hideHeadSearch:true,
            user :req.session.user,
            currentPage:"proflie"
        });
    }catch(error){

        console.error('Error loading change')
        res.redirect('/profile')
    }
}
const requestEmailChange = async (req,res)=>{
    try{
        const userId = req.session.user.id;
        const userData = await User.findById(userId)
        const currentEmail = userData.email;
        const newEmail=req.body.newEmail

        if(!newEmail){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"New email is Empty"
            })
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailRegex.test(newEmail)){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"Enter a valid email"
            })
        }
if(newEmail.toLowerCase() === currentEmail.toLowerCase()){
    return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "New email is same as current email"
    })
}




        const isEmailMatch = await User.findOne({email:newEmail,_id: { $ne: userId }})
        if(isEmailMatch){
            return res.status(StatusCodes.CONFLICT).json({
                success:false,
                message:"This Email already exist"
            })
        }

         const otp = generateOtp();
        const otpExpires = Date.now() + 5 * 60 * 1000;

        const emailSent = await sendEmailVerification(newEmail, otp);

        if (emailSent) {
            req.session.emailChangeOtp = {
                code: otp,
                email: newEmail.toLowerCase(),
                expires: otpExpires
            };

            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                        success: false,
                        message: 'Failed to send OTP. Please try again.'
                    });
                }

                res.status(StatusCodes.OK).json({
                    success: true,
                    message: "OTP sent to your email"
                });
            });
        } else {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: "Failed to send OTP"
            });
        }





    }catch(error){
 console.error('Request email change error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to send OTP'
    });
}
}

const verifyEmailChange = async(req,res)=>{
    try{
        const {otp,newEmail}= req.body;
        const userId = req.session.user.id;
        const sessionOtp = req.session.emailChangeOtp.code;

        if(!otp||!newEmail){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"Otp or Email is missing"
            })
        }

        if(!req.session.emailChangeOtp){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"The session expired"
            })
        }

        if(!sessionOtp){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"OTP is missing from session"
            })

        }

        if(otp!==sessionOtp){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"Otp is invalid"
            })
        }
        if(req.session.emailChangeOtp.expires < Date.now()){
            return res.status(StatusCodes.GONE).json({
                success:false,
                message:"The Otp is expired"
            })
        }

        if(req.session.emailChangeOtp.email!==newEmail.toLowerCase()){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:"There a email Mismatch"
            })
        }


        const userData= await User.findById(userId);
        userData.email= newEmail.toLowerCase()

        await userData.save();

// await User.findByIdAndUpdate(userId, {  
//     email: newEmail.toLowerCase()
// });

        req.session.user.email= newEmail.toLowerCase();

     delete req.session.emailChangeOtp;  


         return res.status(StatusCodes.OK).json({
            success:true,
            message:"The Email is success fully changed"
         })


    }catch(error){
        
        console.error('Verify email change error:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Something went wrong"
    })
    

    }
}

const updateProfileImage =async (req,res)=>{
    try{
        const userId = req.session.user.id;

        if(!req.file){
            return res.status(StatusCodes.BAD_REQUEST).json({
                success:false,
                message:'No image file provided'

        });
        }

 const imageUrl = req.file.path;

await User.findByIdAndUpdate(userId,{
avatar:{
    url:imageUrl,
    publicId : req.file.filename
}

})
        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Profile image updated successfully',
            imageUrl: imageUrl
        });

    }catch(error){
 console.error('Upload profile image error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to upload image'
        });
    }
}

//  EXPORTS 

export default {
    requestEmailChange,
    verifyEmailChange,
    getChangeEmail,
    changePassword,
    updateProfile,
    getChangePassword,
    getLogin,
    loginUser,
    getSignup,
    registerUser,
    getOtp,
    verifyOtp,
    resendOtp,
    getForgotPassword,
    sendPasswordResetOTP,
    verifyResetOTP,
    resetPassword,
    getProfile,
    logout,
    loadhomePage,
    pageNotFound,
    updateProfileImage,

};

