import Offer from '../../models/OfferModel.js';
import Product from '../../models/porductsModal.js';
import Category from '../../models/categoryModel.js';
import { StatusCodes } from 'http-status-codes';

// Get all offers
const getOffers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const offers = await Offer.find()
            .populate('selectedProduct', 'productName')
            .populate('selectedCategory', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / limit);

        // Fetch products and categories for the modal dropdowns
        const products = await Product.find({ IsBlocked: false }).select('productName _id');
        const categories = await Category.find({ isListed: true }).select('name _id');

        res.render('admin/offers', {
            offers,
            products,
            categories,
            currentPage: page,
            totalPages,
            totalOffers
        });
    } catch (error) {
        console.error('Get offers error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Failed to fetch offers');
    }
};

// Create new offer
const createOffer = async (req, res) => {
    try {
        const { 
            name, 
            type, 
            value, 
            targetType, 
            selectedProduct, 
            selectedCategory, 
            startDate, 
            endDate 
        } = req.body;

        const newOffer = new Offer({
            name,
            type,
            value,
            targetType,
            selectedProduct: targetType === 'product' ? selectedProduct : undefined,
            selectedCategory: targetType === 'category' ? selectedCategory : undefined,
            startDate,
            endDate,
            isActive: true
        });

        await newOffer.save();

        res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Offer created successfully'
        });
    } catch (error) {
        console.error('Create offer error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to create offer'
        });
    }
};

// Toggle offer status
const toggleOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id);

        if (!offer) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Offer not found'
            });
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        res.status(StatusCodes.OK).json({
            success: true,
            message: `Offer ${offer.isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Toggle offer status error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to update offer status'
        });
    }
};

// Delete offer
const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Offer.findByIdAndDelete(id);

        if (!result) {
            return res.status(StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Offer not found'
            });
        }

        res.status(StatusCodes.OK).json({
            success: true,
            message: 'Offer deleted successfully'
        });
    } catch (error) {
        console.error('Delete offer error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to delete offer'
        });
    }
};

export default {
    getOffers,
    createOffer,
    toggleOfferStatus,
    deleteOffer
};
