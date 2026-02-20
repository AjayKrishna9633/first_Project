import Category from "../../models/categoryModel.js";
import product from "../../models/porductsModal.js";
import StatusCodes from '../../utils/statusCodes.js';

const getCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const search = req.query.search || "";

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
      

        const categories = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('admin/categories', {
            categories,
            currentPage: page,
            totalPages,
            search,
            admin: req.session.admin,
            message: null,
            isError: false
        });

    } catch (error) {
        console.log('Error in getCategories:', error);
        res.redirect('/admin/dashboard');
    }
};

const getAddCategory = async (req, res) => {
    try {
        res.render('admin/addCategory', {
            admin: req.session.admin,
            message: null,
            isError: false
        });
    } catch (error) {
        console.log('Error in getAddCategory:', error);
        res.redirect('/admin/categories');
    }
};

const addCategory = async (req, res) => {
    try {
        const { name, description, offerType, offerValue } = req.body;

        if (!name || !description) {
            return res.render('admin/addCategory', {
                admin: req.session.admin,
                message: AUTH_MESSAGES.ALL_FIELDS_REQUIRED,
                isError: true
            });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingCategory) {
            return res.render('admin/addCategory', {
                admin: req.session.admin,
                message: 'Category already exists',
                isError: true
            });
        }

        // Validate description length
        if (description.trim().length < 10 || description.trim().length > 500) {
            return res.render('admin/addCategory', {
                admin: req.session.admin,
                message: CATEGORY_MESSAGES.CATEGORY_DESCRIPTION_LENGTH,
                isError: true
            });
        }

        const category = new Category({
            name: name.trim(),
            description: description.trim(),
            offerType: offerType || 'none',
            offerValue: parseFloat(offerValue) || 0
        });

        await category.save();
        res.redirect('/admin/categories');

    } catch (error) {
        console.log('Error in addCategory:', error);
        res.render('admin/addCategory', {
            admin: req.session.admin,
            message: 'Failed to add category',
            isError: true
        });
    }
};

const getEditCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.redirect('/admin/categories');
        }

        res.render('admin/editCategory', {
            category,
            admin: req.session.admin,
            message: null,
            isError: false
        });

    } catch (error) {
        console.log('Error in getEditCategory:', error);
        res.redirect('/admin/categories');
    }
};

const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description, offerType, offerValue } = req.body;

        if (!name || !description) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: AUTH_MESSAGES.ALL_FIELDS_REQUIRED
            });
        }

        // Validate description length
        if (description.trim().length < 10 || description.trim().length > 500) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: CATEGORY_MESSAGES.CATEGORY_DESCRIPTION_LENGTH
            });
        }

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            _id: { $ne: categoryId }
        });

        if (existingCategory) {
            return res.json({
                success: false,
                message: 'Category name already exists'
            });
        }

        await Category.findByIdAndUpdate(categoryId, {
            name: name.trim(),
            description: description.trim(),
            offerType: offerType || 'none',
            offerValue: parseFloat(offerValue) || 0
        });

        res.json({
            success:true,
            message:"The Category is updated"
        })

    } catch (error) {
        console.log('Error in updateCategory:', error);
        res.json({
            success: false,
            message: CATEGORY_MESSAGES.CATEGORY_UPDATE_FAILED
        });
    }
};

const toggleListCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.json({
                success: false,
                message: CATEGORY_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        category.isListed = !category.isListed;
        await category.save();

        res.json({
            success: true,
            isListed: category.isListed,
            message: category.isListed ? 'Category listed' : 'Category unlisted'
        });

    } catch (error) {
        console.log('Error in toggleListCategory:', error);
        res.json({
            success: false,
            message: 'Server error'
        });
    }
};

export default {
    getCategories,
    getAddCategory,
    addCategory,
    getEditCategory,
    updateCategory,
    toggleListCategory
};



