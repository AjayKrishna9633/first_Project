import User from "../../models/userModal.js";
import { comparePassword, hashPassword } from "../../utils/hashUtils.js";
import nodemailer from 'nodemailer';
import env from "dotenv";

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
        if (req.session.user) {
            return res.redirect('/');
        }
        res.render("user/login", {
            message: null,
            isError: false,
            oldInput: {}
        });
    } catch (error) {
        console.error("Error in getLogin:", error);
        res.redirect('/pageNotFound');
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.render('user/login', {
                message: 'Email and password are required.',
                isError: true,
                oldInput: { email }
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user
        const findUser = await User.findOne({ 
            email: normalizedEmail,
            isAdmin: false 
        });

        if (!findUser) {
            return res.render("user/login", {
                message: "Invalid email or password",
                isError: true,
                oldInput: { email }
            });
        }

        // Check if blocked
        if (findUser.isBlocked) {
            return res.render('user/login', {
                message: 'Your account has been blocked. Please contact support.',
                isError: true,
                oldInput: { email }
            });
        }

        // Check if Google OAuth user
        if (findUser.googleId && !findUser.password) {
            return res.render('user/login', {
                message: 'Please sign in with Google',
                isError: true,
                oldInput: { email }
            });
        }

        // Verify password
        const passwordMatch = await comparePassword(password, findUser.password);
        
        if (!passwordMatch) {
            return res.render('user/login', {
                message: 'Invalid email or password',
                isError: true,
                oldInput: { email }
            });
        }

        // Set session
        req.session.user = {
            id: findUser._id,
            fullName: findUser.fullName,
            email: findUser.email,
            role: 'user'
        };

        // Save session and redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('user/login', {
                    message: 'Login successful but session error occurred. Please try again.',
                    isError: true,
                    oldInput: { email }
                });
            }
            res.redirect('/');
        });

    } catch (error) {
        console.error("Error in loginUser:", error);
        res.render('user/login', {
            message: "Login failed. Please try again later.",
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
        const { name, password, confirmPassword, email } = req.body;

        // Enhanced validation
        if (!name || !email || !password || !confirmPassword) {
            return res.render('user/signup', {
                message: 'All fields are required.',
                isError: true,
                oldInput: { name, email }
            });
        }

        if (name.trim().length < 3) {
            return res.render('user/signup', {
                message: 'Name must be at least 3 characters long.',
                isError: true,
                oldInput: { name, email }
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('user/signup', {
                message: 'Please enter a valid email address.',
                isError: true,
                oldInput: { name, email }
            });
        }

        if (password.length < 8) {
            return res.render('user/signup', {
                message: 'Password must be at least 8 characters long.',
                isError: true,
                oldInput: { name, email }
            });
        }
        

        if (password !== confirmPassword) {
            return res.render('user/signup', {
                message: 'Passwords do not match.',
                isError: true,
                oldInput: { name, email }
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        
        if (existingUser) {
            return res.render("user/signup", {
                message: "An account with this email already exists.",
                isError: true,
                oldInput: { name, email }
            });
        }

        // Generate OTP
        const otp = generateOtp();
        const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Send OTP email
        const emailSent = await sendEmailVerification(normalizedEmail, otp);
        
        if (!emailSent) {
            return res.render("user/signup", {
                message: "Failed to send verification email. Please try again.",
                isError: true,
                oldInput: { name, email }
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Store in session
        req.session.userOtp = {
            code: otp,
            email: normalizedEmail,
            expires: otpExpires
        };
        
        req.session.userData = {
            fullName: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        };

        // Save session and redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('user/signup', {
                    message: 'Server error. Please try again.',
                    isError: true,
                    oldInput: { name, email }
                });
            }
            res.redirect('/otp');
        });

    } catch (error) {
        console.error("Error in registerUser:", error);
        res.status(500).render("user/signup", {
            message: "Server error. Please try again later.",
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

export const verifyOtp = async (req, res) => {
    try {
        let { otp } = req.body;

        // Handle array inputs
        otp = Array.isArray(otp) ? otp.join('') : otp;

        // Validate inputs
        if (!otp) {
            return res.json({
                success: false,
                message: 'Please enter OTP.'
            });
        }

        // Validate OTP session data
        if (!req.session.userOtp) {
            return res.json({
                success: false,
                message: 'OTP session expired. Please sign up again.'
            });
        }

        if (req.session.userOtp.code !== otp) {
            return res.json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        if (req.session.userOtp.expires < Date.now()) {
            return res.json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Validate signup data exists
        if (!req.session.userData) {
            return res.json({
                success: false,
                message: 'Session expired. Please sign up again.'
            });
        }

        const { fullName, email, password } = req.session.userData;

       
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            delete req.session.userOtp;
            delete req.session.userData;
            return res.json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

      
        const userData = {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            isBlocked: false
        };

        const user = new User(userData);
        const savedUser = await user.save();

        
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
                return res.json({
                    success: false,
                    message: 'Account created but login failed. Please try logging in manually.'
                });
            }
            res.json({
                success: true,
                redirectUrl: '/'
            });
        });

    } catch (error) {
        console.error("Error in verifyOtp:", error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred. Please try again.'
        });
    }
};

export const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({
                success: false,
                message: 'Email is required.'
            });
        }

        if (!req.session.userData) {
            return res.json({
                success: false,
                message: 'Session expired. Please sign up again.'
            });
        }

        if (req.session.userData.email !== email) {
            return res.json({
                success: false,
                message: 'Invalid session. Please sign up again.'
            });
        }

        
        const otp = generateOtp();
        const otpExpires = Date.now() + 5 * 60 * 1000;

        
        const emailSent = await sendEmailVerification(email, otp);

        if (!emailSent) {
            return res.json({
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
                return res.json({
                    success: false,
                    message: 'Failed to resend OTP. Please try again.'
                });
            }

            res.json({
                success: true,
                message: 'OTP resent successfully!',
                otpExpires: otpExpires
            });
        });

    } catch (error) {
        console.error('Error in resendOtp:', error);
        res.json({
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
            return res.json({
                success: false,
                message: 'Email is required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();


        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.json({
                success: false,
                message: "Email not found"
            });
        }

        if (user.googleId && !user.password) {
            return res.json({
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
                    return res.json({
                        success: false,
                        message: 'Failed to send OTP. Please try again.'
                    });
                }

                res.json({
                    success: true,
                    message: "OTP sent to your email"
                });
            });
        } else {
            res.json({
                success: false,
                message: "Failed to send OTP"
            });
        }
    } catch (error) {
        console.error("Error sending reset OTP:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
};

export const verifyResetOTP = async (req, res) => {
    try {
        let { otp } = req.body;

        // Handle array inputs
        otp = Array.isArray(otp) ? otp.join('') : otp;

        if (!otp) {
            return res.json({
                success: false,
                message: 'Please enter OTP.'
            });
        }

        if (!req.session.resetOtp) {
            return res.json({
                success: false,
                message: 'OTP session expired. Please try again.'
            });
        }

        if (req.session.resetOtp.code !== otp) {
            return res.json({
                success: false,
                message: "Invalid OTP"
            });
        }

        if (req.session.resetOtp.expires < Date.now()) {
            return res.json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        res.json({
            success: true,
            message: "OTP verified"
        });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred"
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || !confirmPassword) {
            return res.json({
                success: false,
                message: 'All fields are required.'
            });
        }

        if (newPassword.length < 8) {
            return res.json({
                success: false,
                message: 'Password must be at least 8 characters long.'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.json({
                success: false,
                message: "Passwords do not match"
            });
        }

        if (!req.session.resetOtp || !req.session.resetOtp.email) {
            return res.json({
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
                return res.json({
                    success: false,
                    message: 'Password updated but session error occurred.'
                });
            }

            res.json({
                success: true,
                message: "Password reset successful",
                redirectUrl: "/login"
            });
        });

    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({
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
            return res.redirect('/login');
        }

        res.render('user/profile', {
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone || ''
            },
            message: null,
            isError: false
        });
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.redirect('/');
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
        return res.render("user/home", { user });
    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
};

export const pageNotFound = async (req, res) => {
    try {
        res.render("error/error.ejs");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

//  EXPORTS 

export default {
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
    pageNotFound
};
