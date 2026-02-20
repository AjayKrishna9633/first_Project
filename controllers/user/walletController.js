import User from '../../models/userModal.js';
import WalletTransaction from '../../models/WalletTransaction.js';
import Orders from '../../models/orderModel.js';
import StatusCodes from '../../utils/statusCodes.js';
import razorpayInstance from '../../config/razorpay.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { generateReferralCode, isValidReferralCodeFormat, REFERRAL_REWARDS, WALLET_LIMITS } from '../../utils/referralUtils.js';
import { USER_MESSAGES, PAYMENT_MESSAGES, REFERRAL_MESSAGES, formatMessage } from '../../constants/messages.js';
dotenv.config();

// Get Wallet Page
const getWallet = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        
        // Get filter and search params
        const filterType = req.query.filter || 'all'; // all, credit, debit
        const filterMethod = req.query.method || 'all'; // all, razorpay, referral, wallet, refund
        const searchQuery = req.query.search || '';
        
        // Get user with wallet balance
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).redirect('/login');
        }

        // Generate referral code if user doesn't have one
        if (!user.referralCode) {
            let referralCode;
            let isUnique = false;
            
            while (!isUnique) {
                referralCode = generateReferralCode();
                const existingUser = await User.findOne({ referralCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }
            
            user.referralCode = referralCode;
            await user.save();
        }

        // Build query for transactions
        let query = { userId };
        
        // Apply type filter
        if (filterType !== 'all') {
            query.type = filterType;
        }
        
        // Apply payment method filter
        if (filterMethod !== 'all') {
            query.paymentMethod = filterMethod;
        }
        
        // Apply search filter
        if (searchQuery) {
            query.description = { $regex: searchQuery, $options: 'i' };
        }

        // Get total count for pagination
        const totalTransactions = await WalletTransaction.countDocuments(query);
        const totalPages = Math.ceil(totalTransactions / limit);

        // Get wallet transactions with pagination
        const transactions = await WalletTransaction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('orderId', 'orderNumber');

        // Calculate statistics
        const stats = await WalletTransaction.aggregate([
            { $match: { userId: user._id } },
            {
                $group: {
                    _id: null,
                    totalAdded: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$type', 'credit'] }, { $eq: ['$paymentMethod', 'razorpay'] }] },
                                '$amount',
                                0
                            ]
                        }
                    },
                    totalReferral: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ['$type', 'credit'] }, { $eq: ['$paymentMethod', 'referral'] }] },
                                '$amount',
                                0
                            ]
                        }
                    },
                    totalUsed: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
                        }
                    }
                }
            }
        ]);

        const statistics = stats.length > 0 ? stats[0] : {
            totalAdded: 0,
            totalReferral: 0,
            totalUsed: 0
        };

        res.render('user/wallet', {
            user: req.session.user,
            walletBalance: user.Wallet,
            referralCode: user.referralCode,
            hasUsedReferral: user.hasUsedReferral,
            referredBy: user.referredBy,
            referralEarnings: user.referralEarnings,
            transactions,
            currentPageNumber: page,
            totalPages,
            totalTransactions,
            filterType,
            filterMethod,
            searchQuery,
            statistics,
            currentPage: 'wallet'
        });

    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).render('user/error', {
            message: PAYMENT_MESSAGES.WALLET_LOAD_FAILED
        });
    }
};

// Add Money to Wallet - Create Razorpay Order
const addMoney = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { amount } = req.body;

        // Validate amount
        if (!amount || amount < WALLET_LIMITS.MIN_ADD) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Minimum amount to add is ₹${WALLET_LIMITS.MIN_ADD}`
            });
        }

        if (amount > WALLET_LIMITS.MAX_ADD) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: `Maximum amount to add is ₹${WALLET_LIMITS.MAX_ADD.toLocaleString()}`
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: USER_MESSAGES.USER_NOT_FOUND
            });
        }

        // Create Razorpay order
        const instance = razorpayInstance;

        // Generate short receipt (max 40 chars for Razorpay)
        const timestamp = Date.now().toString().slice(-8); // Last 8 digits
        const userIdShort = userId.toString().slice(-8); // Last 8 chars of userId
        const receipt = `WLT${userIdShort}${timestamp}`; // Max 19 chars

        const options = {
            amount: Math.round(amount) * 100, // Amount in paise
            currency: "INR",
            receipt: receipt
        };

        const razorpayOrder = await instance.orders.create(options);

        res.status(StatusCodes.OK).json({
            success: true,
            razorpayOrder: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key_id: process.env.RAZORPAY_KEY_ID,
                name: "GearGrid Wallet",
                description: "Add money to wallet",
                contact: user.phone || '',
                email: user.email
            }
        });

    } catch (error) {
        console.error('Add money error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: PAYMENT_MESSAGES.PAYMENT_INITIATE_FAILED
        });
    }
};

// Verify Payment and Credit Wallet
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;
        const userId = req.session.user.id;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: PAYMENT_MESSAGES.PAYMENT_FAILED
            });
        }

        // Payment verified - Credit wallet
        const user = await User.findById(userId);
        const creditAmount = Math.round(amount / 100); // Convert paise to rupees
        
        user.Wallet += creditAmount;
        await user.save();

        // Create transaction record
        await WalletTransaction.create({
            userId,
            amount: creditAmount,
            type: 'credit',
            balance: user.Wallet,
            transactionId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            paymentMethod: 'razorpay',
            status: 'success',
            description: 'Money added to wallet'
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: PAYMENT_MESSAGES.MONEY_ADDED,
            newBalance: user.Wallet
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: PAYMENT_MESSAGES.PAYMENT_FAILED
        });
    }
};

// Apply Referral Code
const applyReferral = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { referralCode } = req.body;

        if (!referralCode || referralCode.trim().length !== 6) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: REFERRAL_MESSAGES.INVALID_FORMAT
            });
        }

        if (!isValidReferralCodeFormat(referralCode)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: REFERRAL_MESSAGES.INVALID_LENGTH
            });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: USER_MESSAGES.USER_NOT_FOUND
            });
        }

        // Check if user has already used a referral code
        if (user.hasUsedReferral) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: REFERRAL_MESSAGES.ALREADY_USED
            });
        }

        // Check if user is trying to use their own referral code
        if (user.referralCode === referralCode.toUpperCase()) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: REFERRAL_MESSAGES.CANNOT_USE_OWN
            });
        }

        // Find the referrer
        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        
        if (!referrer) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: REFERRAL_MESSAGES.INVALID_CODE
            });
        }

        // Credit ₹100 to current user
        user.Wallet += REFERRAL_REWARDS.REFEREE;
        user.referredBy = referralCode.toUpperCase();
        user.hasUsedReferral = true;
        await user.save();

        // Create transaction for current user
        await WalletTransaction.create({
            userId: user._id,
            amount: REFERRAL_REWARDS.REFEREE,
            type: 'credit',
            balance: user.Wallet,
            paymentMethod: 'referral',
            status: 'success',
            description: `Referral bonus from code ${referralCode.toUpperCase()}`
        });

        // Credit ₹500 to referrer
        referrer.Wallet += REFERRAL_REWARDS.REFERRER;
        referrer.referralEarnings += REFERRAL_REWARDS.REFERRER;
        await referrer.save();

        // Create transaction for referrer
        await WalletTransaction.create({
            userId: referrer._id,
            amount: REFERRAL_REWARDS.REFERRER,
            type: 'credit',
            balance: referrer.Wallet,
            paymentMethod: 'referral',
            status: 'success',
            description: `Referral reward - ${user.fullName} used your code`
        });

        res.status(StatusCodes.OK).json({
            success: true,
            message: `₹${REFERRAL_REWARDS.REFEREE} added to your wallet! Your friend will receive ₹${REFERRAL_REWARDS.REFERRER}.`,
            newBalance: user.Wallet
        });

    } catch (error) {
        console.error('Apply referral error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: REFERRAL_MESSAGES.APPLY_FAILED
        });
    }
};

export default {
    getWallet,
    addMoney,
    verifyPayment,
    applyReferral
};

