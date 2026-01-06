import user from "../../models/userModal.js";
import { comparePassword } from "../../utils/hashUtils.js";
import { StatusCodes } from 'http-status-codes';

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
        const admin =req.session.admin;
        
        res.render('admin/dashboard',{
            admin
        })
    
    }catch(error){
        console.log(error)
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