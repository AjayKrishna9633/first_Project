import user from "../../models/userModal.js";
import Order from "../../models/orderModel.js";
import Category from "../../models/categoryModel.js";
import { comparePassword } from "../../utils/hashUtils.js";
import StatusCodes from '../../utils/statusCodes.js';

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

const getDashboard = async (req,res)=>{
    try{
        const admin = req.session.admin;
        
        // Get current month start and end dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        // 1. Total Sales This Month (from active items only)
        const salesData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
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
        
        // Get daily sales for chart (last 30 days) - from active items only
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        
        const dailySales = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: last30Days },
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
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    sales: { $sum: '$items.totalPrice' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 2. Customers Count This Month
        const customersThisMonth = await user.countDocuments({
            isAdmin: false,
            createdOn: { $gte: currentMonthStart, $lte: currentMonthEnd }
        });
        
        const totalCustomers = await user.countDocuments({ isAdmin: false });
        
        // Get daily customer registrations for chart (last 30 days)
        const dailyCustomers = await user.aggregate([
            {
                $match: {
                    isAdmin: false,
                    createdOn: { $gte: last30Days }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdOn" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // 3. Orders Count This Month
        const ordersThisMonth = await Order.countDocuments({
            createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
            orderStatus: { $nin: ['cancelled', 'failed'] }
        });
        
        const monthlyGoal = 100;
        const ordersLeft = Math.max(0, monthlyGoal - ordersThisMonth);
        const progressPercentage = Math.min(100, (ordersThisMonth / monthlyGoal) * 100);
        
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
                    createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
                    orderStatus: { $nin: ['cancelled', 'failed'] }
                }
            },
            { $unwind: '$items' },
            // Filter out cancelled items
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
        
        res.render('admin/dashboard', {
            admin,
            stats: {
                totalSales: Math.round(totalSales),
                customersThisMonth,
                totalCustomers,
                ordersThisMonth,
                monthlyGoal,
                ordersLeft,
                progressPercentage: progressPercentage.toFixed(1)
            },
            dailySales,
            dailyCustomers,
            recentOrders,
            bestSellingCategories,
            totalCategorySales: Math.round(totalCategorySales)
        });
    
    }catch(error){
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