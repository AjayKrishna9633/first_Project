import Product from "../../models/porductsModal.js";
import Category from "../../models/categoryModel.js";


// Shop Page
const getShopPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12; // Products per page
        const skip = (page - 1) * limit;

        const search = req.query.search || "";
        const categoryFilter = req.query.category || "";
        const colorFilter = req.query.color || "";
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = parseInt(req.query.maxPrice) || 0;
        const sortBy = req.query.sort || "featured";

        let query = {
            IsBlocked: false,
            status: 'Available'
        };

        // Search filter
        if (search) {
            query.productName = { $regex: search, $options: 'i' };
        }

        // Category filter
        if (categoryFilter && categoryFilter !== 'all') {
            query.category = categoryFilter;
        }

        // Sort options
        let sortOption = {};
        switch (sortBy) {
            case 'price-low':
                sortOption = { 'variants.salePrice': 1 };
                break;
            case 'price-high':
                sortOption = { 'variants.salePrice': -1 };
                break;
            case 'newest':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const products = await Product.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variants'
                }
            },
            {
                $addFields: {
                    category: { $arrayElemAt: ['$category', 0] },
                    totalStock: { $sum: '$variants.quantity' },
                    hasStock: { $gt: [{ $sum: '$variants.quantity' }, 0] }
                }
            },
            {
                $sort: {
                    hasStock: -1, 
                    ...sortOption
                }
            },
            { $skip: skip },
            { $limit: limit }
        ]);


      
        if (colorFilter) {
            products = products.filter(product => {
                if (product.variants && product.variants.length > 0) {
                    return product.variants.some(variant => 
                        variant.color.toLowerCase() === colorFilter.toLowerCase()
                    );
                }
                return false;
            });
        }

        // Filter by price range if specified
        if (minPrice > 0 || maxPrice > 0) {
            products = products.filter(product => {
                if (product.variants && product.variants.length > 0) {
                    return product.variants.some(variant => {
                        const price = variant.salePrice;
                        if (minPrice > 0 && maxPrice > 0) {
                            return price >= minPrice && price <= maxPrice;
                        } else if (minPrice > 0) {
                            return price >= minPrice;
                        } else if (maxPrice > 0) {
                            return price <= maxPrice;
                        }
                        return true;
                    });
                }
                return false;
            });
        }

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch all categories for filter
        const categories = await Category.find({ isListed: true });

        // Get all unique colors from variants
        const allProducts = await Product.find({ IsBlocked: false }).populate('variants');
        const availableColors = new Set();
        allProducts.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    if (variant.color) {
                        availableColors.add(variant.color);
                    }
                });
            }
        });

        // Check wishlist items for logged-in users
        let wishlistProductIds = [];
        if (req.session.user) {
            try {
                const Wishlist = (await import('../../models/wishlist.js')).default;
                const wishlist = await Wishlist.findOne({ userId: req.session.user.id });
                if (wishlist && wishlist.products) {
                    wishlistProductIds = wishlist.products.map(item => item.productId.toString());
                }
            } catch (error) {
                console.log('Error fetching wishlist:', error);
            }
        }

        res.render('user/shop', {
            products,
            categories,
            availableColors: Array.from(availableColors).sort(),
            wishlistProductIds,
            currentPage: page,
            totalPages,
            search,
            selectedCategory: categoryFilter,
            selectedColor: colorFilter,
            minPrice,
            maxPrice,
            sortBy,
            user: req.session.user || null,
            hideHeaderSearch: true
        });

    } catch (error) {
        console.log('Error in getShopPage:', error);
        res.redirect('/');
    }
};

// Product Detail Page
const getProductDetail = async (req, res) => {
    try {
        const productId = req.params.id;

        // Fetch product with variants and category
        const product = await Product.findById(productId)
            .populate('category', 'name')
            .populate('variants');

        if (!product || product.IsBlocked) {
            return res.redirect('/shop');
        }

        // Fetch related products (same category, exclude current)
        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId },
            IsBlocked: false,
            status: 'Available'
        })
            .populate('variants')
            .limit(4);

        // Check if product is in wishlist
        let isInWishlist = false;
        if (req.session.user) {
            const Wishlist = (await import('../../models/wishlist.js')).default;
            const wishlist = await Wishlist.findOne({ userId: req.session.user.id });
            if (wishlist) {
                isInWishlist = wishlist.products.some(
                    item => item.productId.toString() === productId
                );
            }
        }
let totalStock = 0;
let hasStock = false;

if (product.variants && product.variants.length > 0) {
    totalStock = product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
    hasStock = totalStock > 0;
}

console.log('Product stock info:', {
    productName: product.productName,
    totalStock,
    hasStock,
    variants: product.variants.map(v => ({ color: v.color, quantity: v.quantity }))
});

res.render('user/productDetail', {
    product,
    relatedProducts,
    isInWishlist,
    hasStock,
    totalStock,
    user: req.session.user || null,
    hideHeaderSearch: false
});

    } catch (error) {
        console.log('Error in getProductDetail:', error);
        res.redirect('/shop');
    }
};







export default {
    getShopPage,
    getProductDetail
}