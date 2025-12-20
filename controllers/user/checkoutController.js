import Cart from '../../models/cartSchema.js';
import Order from '../../models/orderModel.js';
import Address from '../../models/AddressModal.js';
import Product from '../../models/porductsModal.js';


const getCheckOut = async(req,res)=>{
    try{
        const userId= req.session.user.id;

        const cart = await Cart.findOne({userId})
        .populate({
            path :'items.productId',
            populate:{
                path:'variants category',
                select:'name color salePrice regularPrice quantity images'
            }
        }).populate('items.variantId');

        if(!cart || cart.items.length===0){
                     return res.redirect('/cart');
        }

        // Get user's addresses - your model stores addresses in an array
        const addressDoc = await Address.findOne({ userId });
        const addresses = addressDoc ? addressDoc.address : [];

        console.log('Found addresses:', addresses); // Debug log

        res.render('user/checkout', {
            cart,
            addresses,
            user: req.session.user
        });

    }catch(error){
        console.error('Get checkout error:', error);
        res.redirect('/cart');
    }
}

const placeOrder=async(req,res)=>{
    try{
let cart;
let isBuyNow = false;

    const userId = req.session.user.id;
        const { 
            addressId, 
            newAddress, 
            paymentMethod, 
            orderNotes 
        } = req.body;

if (req.session.buyNowData) {
    // Buy Now flow - use session data
    isBuyNow = true;
    cart = {
        items: req.session.buyNowData.items.map(item => ({
            productId: { _id: item.productId },
            variantId: { _id: item.variantId },
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }))
    };
} else {
  
    cart = await Cart.findOne({userId})
        .populate('items.productId')
        .populate('items.variantId');
}

if(!cart || cart.items.length === 0){
    return res.json({
        message: isBuyNow ? 'Buy now data not found' : 'Cart is empty',
        success: false
    });
}
// Validate all cart items for blocked products
for (const item of cart.items) {
    let product;
    
    if (isBuyNow) {
        // For buy now, we need to fetch the product
        product = await Product.findById(item.productId._id).populate('variants');
    } else {
        // For regular cart, product is already populated
        product = item.productId;
    }
    
    if (!product || product.IsBlocked) {
        return res.json({
            success: false,
            message: `Product "${product ? product.productName : 'Unknown'}" is no longer available for purchase. Please remove it from your cart and try again.`
        });
    }
}

     for (let item of cart.items) {
    // Use the populated variantId directly
    const variant = item.variantId;
    
    console.log('Stock check:', {
        productName: item.productId.productName,
        variantColor: variant.color,
        availableStock: variant.quantity,
        requestedQuantity: item.quantity
    });
    
    if (!variant || variant.quantity < item.quantity) {
        return res.json({
            success: false,
            message: `Insufficient stock for ${item.productId.productName}. Available: ${variant ? variant.quantity : 0}, Requested: ${item.quantity}`
        });
    }
}

        let shippingAddress;
        if (addressId) {
            // Find the address document and the specific address in the array
            const addressDoc = await Address.findOne({ userId });
            if (!addressDoc) {
                return res.json({
                    success: false,
                    message: 'No addresses found'
                });
            }
            
            const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
            if (!address) {
                return res.json({
                    success: false,
                    message: 'Invalid address selected'
                });
            }

            shippingAddress = {
                fullName: address.name,
                phone: address.phone.toString(),
                streetAddress: address.streetAddress,
                city: address.city,
                state: address.state,
                pinCode: address.pinCode.toString(),
                country: 'India',
                addressType: address.addressType
            };
        } else if (newAddress) {
            shippingAddress = newAddress;
        } else {
            return res.json({
                success: false,
                message: 'Shipping address is required'
            });
        }

           // Calculate totals
        const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        const shippingCost = 0; // Free shipping
        const tax = 0; // No tax for now
        const totalAmount = subtotal + shippingCost + tax;

        // Generate order number
        const orderNumber = 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Create order
        const order = new Order({
            userId,
            orderNumber,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                variantId: item.variantId._id,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice
            })),
            shippingAddress,
            paymentMethod,
            subtotal,
            shippingCost,
            tax,
            totalAmount,
            orderNotes: orderNotes || ''
        });

        await order.save();

      
        // Update product stock - Direct variant collection update
        const Variant = (await import('../../models/variantModel.js')).default;
        
        for (let item of cart.items) {
            try {
                const variantId = item.variantId._id;
                console.log(`Updating stock for variant ${variantId}, quantity: -${item.quantity}`);
                
                const updateResult = await Variant.findByIdAndUpdate(
                    variantId,
                    { $inc: { quantity: -item.quantity } },
                    { new: true }
                );
                
                if (updateResult) {
                    console.log(`Stock updated successfully: ${updateResult.quantity} remaining`);
                } else {
                    console.error(`Failed to update stock for variant ${variantId}`);
                }
            } catch (error) {
                console.error(`Error updating stock for variant:`, error);
            }
        }


if (isBuyNow) {
   
    delete req.session.buyNowData;
} else {
 
    await Cart.findOneAndDelete({ userId });
}


        res.json({
            success: true,
            message: 'Order placed successfully',
            orderNumber: order.orderNumber,
            orderId: order._id
        });

    } catch (error) {
        console.error('Place order error:', error);
        res.json({
            success: false,
            message: 'Failed to place order'
        });
    }
};


const buyNow = async(req,res)=>{
try{
       const userId = req.session.user.id;
    const {productId, variantId, quantity } = req.body;
    
    console.log('Buy now request:', { userId, productId, variantId, quantity });

    if(!productId||!variantId||!quantity){
        return res.json({
            success:false,
            message:"Missing required fields"
        })
    }

    // Validate quantity limit
    if (quantity > 3) {
        return res.json({
            success: false,
            message: 'Maximum 3 units allowed per product'
        });
    }


        const product = await Product.findById(productId).populate('variants');
        
        if(!product||product.IsBlocked){
            return res.json({
                success:false,
                message:"Product is not available"
            })
        }

        const variant = await product.variants.find(v=>v._id.toString()===variantId);
        if(!variant){
            return res.json({
                success:false,
                message:"variant not found"
            })
        }
                if (variant.quantity < quantity) {
            return res.json({
                success: false,
                message: `Only ${variant.quantity} items available`
            });
        }

        const orderData = {
              items: [{
                productId: product._id,
                variantId: variant._id,
                quantity: parseInt(quantity),
                price: variant.salePrice,
                totalPrice: variant.salePrice * parseInt(quantity),
                productName: product.productName,
                variantColor: variant.color,
                image: variant.images[0]
            }],
                  subtotal: variant.salePrice * parseInt(quantity),
            total: variant.salePrice * parseInt(quantity)
      
        }
        req.session.buyNowData = orderData;
     res.json({
            success: true,
            message: 'Redirecting to checkout',
            redirectUrl: '/checkout/buy-now'
        });

}catch (error) {
        console.error('Buy now error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            productId: req.body.productId,
            variantId: req.body.variantId,
            quantity: req.body.quantity
        });
        res.json({
            success: false,
            message: 'Failed to process buy now: ' + error.message
        });
    }
}
const getBuyNowCheckout = async(req, res) => {
    try {
        const userId = req.session.user.id;
        
        // Check if buy now data exists in session
        if (!req.session.buyNowData) {
            return res.redirect('/shop');
        }

        // Get productId from session data
        const productId = req.session.buyNowData.items[0].productId;
        const product = await Product.findById(productId).populate('variants');
        if(!product||product.IsBlocked){
            return res.json({
                success:false,
                message:"Product is not available"
            })
        }

        // Get user's addresses
        const addressDoc = await Address.findOne({ userId });
        const addresses = addressDoc ? addressDoc.address : [];

        // Create a cart-like object for the checkout page
        const buyNowCart = {
            items: req.session.buyNowData.items.map(item => ({
                productId: {
                    _id: item.productId,
                    productName: item.productName,
                    variants: [{
                        images: [item.image]
                    }]
                },
                quantity: item.quantity,
                totalPrice: item.totalPrice
            }))
        };

        res.render('user/checkout', {
            cart: buyNowCart,
            addresses,
            user: req.session.user,
            isBuyNow: true  // Flag to indicate this is buy now flow
        });

    } catch (error) {
        console.error('Get buy now checkout error:', error);
        res.redirect('/shop');
    }
}





export default {
    getCheckOut,
    placeOrder,
    buyNow,
    getBuyNowCheckout
};