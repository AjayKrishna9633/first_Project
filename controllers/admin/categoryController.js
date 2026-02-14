import Category from "../../models/categoryModel.js";
import product from "../../models/porductsModal.js";

// Get all categories
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

// Get add category page
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

// Add new category
const addCategory = async (req, res) => {
    try {
        const { name, description, offerType, offerValue } = req.body;

        // Validation
        if (!name || !description) {
            return res.render('admin/addCategory', {
                admin: req.session.admin,
                message: 'All fields are required',
                isError: true
            });
        }

        // Check if category already exists
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

        // Create new category
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

// Get edit category page
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

// Update category
const updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, description, offerType, offerValue } = req.body;

        // Validation
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if another category with same name exists
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

        // Update category
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
            message: 'Failed to update category'
        });
    }
};

// Toggle category listing status
const toggleListCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.json({
                success: false,
                message: 'Category not found'
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
