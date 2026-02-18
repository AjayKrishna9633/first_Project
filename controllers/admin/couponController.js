import Coupon from '../../models/couponModel.js';
import { StatusCodes } from 'http-status-codes';

// Get all coupons with pagination, search, filter, and sort
const getCoupons = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        // Get query parameters
        const search = req.query.search || '';
        const status = req.query.status || 'all'; // all, active, inactive, expired
        const discountType = req.query.discountType || 'all'; // all, percentage, fixed
        const sortBy = req.query.sortBy || 'newest'; // newest, oldest, name, discount

        // Build query
        let query = {};
        
        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Status filter
        const currentDate = new Date();
        if (status === 'active') {
            query.isListed = true;
            query.startDate = { $lte: currentDate };
            query.endDate = { $gte: currentDate };
        } else if (status === 'inactive') {
            query.isListed = false;
        } else if (status === 'expired') {
            query.endDate = { $lt: currentDate };
        }
        
        // Discount type filter
        if (discountType !== 'all') {
            query.discountType = discountType;
        }
        
        // Sort options
        let sortOptions = {};
        switch (sortBy) {
            case 'oldest':
                sortOptions = { createdon: 1 };
                break;
            case 'name':
                sortOptions = { name: 1 };
                break;
            case 'discount':
                sortOptions = { offerPrice: -1 };
                break;
            case 'newest':
            default:
                sortOptions = { createdon: -1 };
                break;
        }

        const coupons = await Coupon.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        const totalCoupons = await Coupon.countDocuments(query);
        const totalPages = Math.ceil(totalCoupons / limit);

        res.render('admin/coupons', {
            coupons,
            currentPage: page,
            totalPages,
            totalCoupons,
            search,
            status,
            discountType,
            sortBy,
            admin: req.session.admin
        });
    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Failed to fetch coupons');
    }
};

// Create new coupon
const createCoupon = async (req, res) => {
    try {
        const { 
            name, 
            description,
            startDate, 
            endDate, 
            offerPrice, 
            minimumPrice, 
            discountType, 
            maxDiscountAmount, 
            usageLimit, 
            usagePerUser 
        } = req.body;

        // Validate description length
        if (description.trim().length < 10 || description.trim().length > 200) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Description must be between 10 and 200 characters'
            });
        }

        const parsedOfferPrice = parseFloat(offerPrice);
        const parsedMinimumPrice = parseFloat(minimumPrice);
        const parsedMaxDiscount = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null;

        if (discountType === 'percentage') {
            if (parsedOfferPrice <= 0 || parsedOfferPrice > 100) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Percentage discount must be between 1 and 100'
                });
            }

            if (parsedOfferPrice >= 100) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Percentage discount cannot be 100% or more. Maximum allowed is 99%'
                });
            }

            if (!parsedMaxDiscount) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Maximum discount amount is required for percentage-based coupons to prevent zero-value orders'
                });
            }

            if (parsedMaxDiscount >= parsedMinimumPrice) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Maximum discount must be less than minimum purchase amount to ensure order value remains positive'
                });
            }
        } else {
            if (parsedOfferPrice >= parsedMinimumPrice) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Fixed discount amount must be less than minimum purchase amount to ensure order value remains positive'
                });
            }
        }

        const existingCoupon = await Coupon.findOne({ name: name.toUpperCase() });
        if (existingCoupon) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        const newCoupon = new Coupon({
            name: name.toUpperCase(),
            code: name.toUpperCase(), 
            description,
            startDate,
            endDate,
            offerPrice,
            minimumPrice,
            discountType,
            maxDiscountAmount: maxDiscountAmount || null,
            usageLimit: usageLimit || null,
            usagePerUser: usagePerUser || 1,
            isListed: true,
            createdOn: Date.now()
        });

        await newCoupon.save();

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Coupon created successfully'
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to create coupon'
        });
    }
};

// Toggle coupon status (List/Unlist)
const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        coupon.isListed = !coupon.isListed;
        await coupon.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: `Coupon ${coupon.isListed ? 'listed' : 'unlisted'} successfully`
        });
    } catch (error) {
        console.error('Toggle coupon status error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update coupon status'
        });
    }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Coupon.findByIdAndDelete(id);

        if (!result) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to delete coupon'
        });
    }
};

// Get coupon by ID for editing
const getCouponById = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);

        if (!coupon) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            coupon
        });
    } catch (error) {
        console.error('Get coupon by ID error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to fetch coupon'
        });
    }
};

// Update coupon
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description,
            startDate, 
            endDate, 
            offerPrice, 
            minimumPrice, 
            discountType, 
            maxDiscountAmount, 
            usageLimit, 
            usagePerUser 
        } = req.body;

        const coupon = await Coupon.findById(id);
        
        if (!coupon) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Validate description length
        if (description.trim().length < 10 || description.trim().length > 200) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Description must be between 10 and 200 characters'
            });
        }

        const parsedOfferPrice = parseFloat(offerPrice);
        const parsedMinimumPrice = parseFloat(minimumPrice);
        const parsedMaxDiscount = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null;

        if (discountType === 'percentage') {
            if (parsedOfferPrice <= 0 || parsedOfferPrice > 100) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Percentage discount must be between 1 and 100'
                });
            }

            if (parsedOfferPrice >= 100) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Percentage discount cannot be 100% or more. Maximum allowed is 99%'
                });
            }

            if (!parsedMaxDiscount) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Maximum discount amount is required for percentage-based coupons to prevent zero-value orders'
                });
            }

            if (parsedMaxDiscount >= parsedMinimumPrice) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Maximum discount must be less than minimum purchase amount to ensure order value remains positive'
                });
            }
        } else {
            if (parsedOfferPrice >= parsedMinimumPrice) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Fixed discount amount must be less than minimum purchase amount to ensure order value remains positive'
                });
            }
        }

        if (name.toUpperCase() !== coupon.name) {
            const existingCoupon = await Coupon.findOne({ 
                name: name.toUpperCase(),
                _id: { $ne: id }
            });
            
            if (existingCoupon) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'Coupon code already exists'
                });
            }
        }

        // Update coupon fields
        coupon.name = name.toUpperCase();
        coupon.code = name.toUpperCase();
        coupon.description = description;
        coupon.startDate = startDate;
        coupon.endDate = endDate;
        coupon.offerPrice = offerPrice;
        coupon.minimumPrice = minimumPrice;
        coupon.discountType = discountType;
        coupon.maxDiscountAmount = maxDiscountAmount || null;
        coupon.usageLimit = usageLimit || null;
        coupon.usagePerUser = usagePerUser || 1;

        await coupon.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Coupon updated successfully'
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update coupon'
        });
    }
};


export default {
    getCoupons,
    createCoupon,
    toggleCouponStatus,
    deleteCoupon,
    getCouponById,
    updateCoupon
};
