import user from "../../models/userModal.js";
import Order from "../../models/orderModel.js";
import Category from "../../models/categoryModel.js";
import Product from "../../models/porductsModal.js";
import { comparePassword } from "../../utils/hashUtils.js";
import StatusCodes from '../../utils/statusCodes.js';
import { ADMIN_MESSAGES } from '../../constants/messages.js';

const getLogin =(req,res)=>{
    res.render('admin/login',{
        message:null,
        isError:false,
        oldInput :{}
    })
}


const adminLogin=async(req,res)=>{
    try{
        const {email,password}=req.body;

        const admin = await user.findOne({
            email:email.toLowerCase().trim(),
            isAdmin:true
        });

        if(!admin){
            return res.render('admin/login',{
                message:'Invalid Credentials',
                isError:true,
                oldInput:{email}
            })
        }


const passwordMatch = await comparePassword(password,admin.password)


        if(!passwordMatch){
            return res.render('admin/login',{
                message:'Invalid Credentials',
                isError:true,
                oldInput:{email}
            });
        }
        req.session.admin={
            id:admin._id,
            fullName:admin.fullName,
            email:admin.email,
            role:'admin'
        }

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('admin/login', {
                    message: 'Login error. Please try again.',
                    isError: true,
                    oldInput: { email }
                });
            }
            res.redirect('/admin/dashboard');
        });

       




    }catch(error){

                console.error("Error in loginAdmin:", error);
        res.render('admin/login', {
            message: "Server error. Please try again.",
            isError: true,
            oldInput: { email: req.body.email || '' }
        });
    }
 }

const getDashboard = async (req, res) => {
    try {
        const admin = req.session.admin;
        
        // Get filter parameters
        const period = req.query.period || 'daily'; // daily, weekly, monthly, yearly
        const specificDate = req.query.date; // For daily: specific date (YYYY-MM-DD)
        const specificMonth = req.query.month; // For monthly: specific month (YYYY-MM)
        const specificYear = req.query.year; // For yearly: specific year (YYYY)
        
        const now = new Date();
        let startDate, endDate, chartDateFormat, chartGrouping, periodLabel;
        
        // Calculate date range based on period
        switch (period) {
            case 'daily':
                if (specificDate) {
                    // Specific date selected
                    const selectedDate = new Date(specificDate);
                    startDate = new Date(selectedDate.setHours(0, 0, 0, 0));
                    endDate = new Date(selectedDate.setHours(23, 59, 59, 999));
                    periodLabel = startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                } else {
                    // Today
                    startDate = new Date(now.setHours(0, 0, 0, 0));
                    endDate = new Date(now.setHours(23, 59, 59, 999));
                    periodLabel = 'Today';
                }
                chartDateFormat = "%H:00";
                chartGrouping = { $dateToString: { format: "%H", date: "$createdAt" } };
                break;
                
            case 'weekly':
                // Current week (Monday to Sunday)
                const currentDay = now.getDay();
                const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
                startDate = new Date(now);
                startDate.setDate(now.getDate() + mondayOffset);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                periodLabel = `Week: ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                chartDateFormat = "%Y-%m-%d";
                chartGrouping = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
                break;
                
            case 'monthly':
                if (specificMonth) {
                    // Specific month selected (format: YYYY-MM)
                    const [year, month] = specificMonth.split('-').map(Number);
                    startDate = new Date(year, month - 1, 1);
                    endDate = new Date(year, month, 0, 23, 59, 59, 999);
                    periodLabel = startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                } else {
                    // Current month
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                    periodLabel = startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                }
                chartDateFormat = "%Y-%m-%d";
                chartGrouping = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
                break;
                
            case 'yearly':
                if (specificYear) {
                    // Specific year selected
                    const year = parseInt(specificYear);
                    startDate = new Date(year, 0, 1);
                    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
                    periodLabel = year.toString();
                } else {
                    // Current year
                    startDate = new Date(now.getFullYear(), 0, 1);
                    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                    periodLabel = now.getFullYear().toString();
                }
                chartDateFormat = "%Y-%m";
                chartGrouping = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
                break;
                
            default:
                // Default to today
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                periodLabel = 'Today';
                chartDateFormat = "%H:00";
                chartGrouping = { $dateToString: { format: "%H", date: "$createdAt" } };
        }
        
        // 1. Total Sales for selected period (from active items only)
        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
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
                    _id: null,
                    totalSales: { $sum: '$items.totalPrice' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const totalSales = salesData.length > 0 ? salesData[0].totalSales : 0;
        
        // Get sales data for chart based on period
        const chartSales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
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
                    _id: chartGrouping,
                    sales: { $sum: '$items.totalPrice' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 2. Customers Count for selected period
        const customersInPeriod = await user.countDocuments({
            isAdmin: false,
            createdOn: { $gte: startDate, $lte: endDate }
        });
        
        const totalCustomers = await user.countDocuments({ isAdmin: false });
        
        // Get customer registrations for chart
        const chartCustomers = await user.aggregate([
            {
                $match: {
                    isAdmin: false,
                    createdOn: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: chartGrouping,
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 3. Orders Count for selected period
        const ordersInPeriod = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            orderStatus: { $nin: ['cancelled', 'failed'] }
        });
        
        const monthlyGoal = 100;
        const ordersLeft = Math.max(0, monthlyGoal - ordersInPeriod);
        const progressPercentage = Math.min(100, (ordersInPeriod / monthlyGoal) * 100);
        
        // 4. Recent Orders (last 8)
        const recentOrders = await Order.find()
            .populate('userId', 'fullName')
            .populate('items.productId', 'productName')
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();
        
        // 5. Best Selling Categories
        const bestSellingCategories = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
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
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
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
                $group: {
                    _id: '$category._id',
                    categoryName: { $first: '$category.name' },
                    totalSales: { $sum: '$items.totalPrice' },
                    itemCount: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 5 }
        ]);
        
        const totalCategorySales = bestSellingCategories.reduce((sum, cat) => sum + cat.totalSales, 0);
        
        // 6. Best Selling Products
        const bestSellingProductsRaw = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
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
                    totalRevenue: { $sum: '$items.totalPrice' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);
        
        // Fetch full product details for each best-selling product
        const formattedBestSelling = await Promise.all(
            bestSellingProductsRaw.map(async (item) => {
                const product = await Product.findById(item._id)
                    .populate('category', 'name')
                    .lean();
                
                return {
                    productName: product?.productName || 'Unknown Product',
                    categoryName: product?.category?.name || 'Unknown Category',
                    totalQuantity: item.totalQuantity,
                    totalRevenue: item.totalRevenue,
                    orderCount: item.orderCount
                };
            })
        );
        
        // Generate year options for filter (last 5 years + next year)
        const thisYear = new Date().getFullYear();
        const yearOptions = Array.from({ length: 6 }, (_, i) => thisYear - i);
        
        // Format current values for inputs
        const currentDate = specificDate || now.toISOString().split('T')[0];
        const currentMonth = specificMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const currentYear = specificYear || now.getFullYear().toString();
        
        res.render('admin/dashboard', {
            admin,
            stats: {
                totalSales: Math.round(totalSales),
                customersInPeriod,
                totalCustomers,
                ordersInPeriod,
                monthlyGoal,
                ordersLeft,
                progressPercentage: progressPercentage.toFixed(1)
            },
            chartSales,
            chartCustomers,
            recentOrders,
            bestSellingCategories,
            totalCategorySales: Math.round(totalCategorySales),
            bestSellingProducts: formattedBestSelling,
            filters: {
                period,
                periodLabel,
                currentDate,
                currentMonth,
                currentYear,
                yearOptions
            }
        });
    
    } catch (error) {
        console.log('Dashboard error:', error);
        res.redirect('/admin/login');
    }
}


 const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/admin/login');
    });
};
 


const getCustomerPage= async(req,res)=>{
    try{

        const page = parseInt(req.query.page)||1;
        const limitForUser = 10;
        const skip =(page-1)*limitForUser;

const search = req.query.search||"";
const status = req.query.status||'all';

let query ={isAdmin:false};

if(search){
    query.$or=[
        {fullName:{$regex:search , $options:"i"}},
        { email :{$regex:search,$options:"i"}}
    ]
}


if(status==='blocked'){
    query.isBlocked= true;
}else if (status==='active'){
    query.isBlocked=false
}

const customers = await user.find(query)
.select('fullName email phone isBlocked createdOn')
.sort({createdOn :-1})
.skip(skip)
.limit(limitForUser);

const totalCustomers = await user.countDocuments(query);
const  totalPages = Math.ceil(totalCustomers / limitForUser)



        res.render('admin/customers',{
 customers,           
    admin: req.session.admin,       
    search: search,                 
    status: status,                 
    currentPage: page,              
    totalPages: totalPages
        })


    }catch(error){
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).redirect('/admin/dashboard')
        console.log(error);
    }
}

const toggleBlockUser = async(req,res)=>{
    try{
        console.log('Toggle block request received for user:', req.params.id);
        const userId = req.params.id;
        const customer = await user.findById(userId);
    
        if(!customer){
            console.log('User not found:', userId);
            return res.status(StatusCodes.NOT_FOUND).json({
                success:false,
                message:'User not found'
            });
        }

        console.log('Current blocked status:', customer.isBlocked);
        customer.isBlocked = !customer.isBlocked;
        await customer.save();
        console.log('New blocked status:', customer.isBlocked);

        return res.status(StatusCodes.OK).json({ 
            success: true, 
            isBlocked: customer.isBlocked,
            message: customer.isBlocked ? 'User blocked successfully' : 'User unblocked successfully'
        });

    }catch(error){
        console.log('Error in toggleBlockUser:', error);
        console.log('Error message:', error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
            success: false, 
            message: 'Server error: ' + error.message
        });
    }
}






export default{
    getLogin,
    logout,
    getDashboard,
    adminLogin,
    getCustomerPage,
    toggleBlockUser
}
