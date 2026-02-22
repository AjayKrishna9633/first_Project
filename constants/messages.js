/**
 * Centralized Response Messages
 * All user-facing messages for consistency and maintainability
 */

// ============================================
// AUTHENTICATION MESSAGES
// ============================================
export const AUTH_MESSAGES = {
    // Login
    LOGIN_SUCCESS: 'Login successful',
    LOGIN_FAILED: 'Login failed. Please try again later.',
    LOGIN_SESSION_ERROR: 'Login successful but session error occurred. Please try again.',
    EMAIL_PASSWORD_REQUIRED: 'Email and password are required.',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_BLOCKED: 'Your account has been blocked. Please contact support.',
    USE_GOOGLE_LOGIN: 'Please sign in with Google',
    
    // Signup
    SIGNUP_SUCCESS: 'Account created successfully',
    ALL_FIELDS_REQUIRED: 'All fields are required.',
    NAME_TOO_SHORT: 'Name must be at least 3 characters long.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long.',
    PASSWORDS_NOT_MATCH: 'Passwords do not match.',
    EMAIL_EXISTS: 'An account with this email already exists.',
    INVALID_REFERRAL_CODE: 'Invalid Referral Code.',
    VERIFICATION_EMAIL_FAILED: 'Failed to send verification email. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    
    // OTP
    OTP_REQUIRED: 'Please enter OTP.',
    OTP_SESSION_EXPIRED: 'OTP session expired. Please sign up again.',
    INVALID_OTP: 'Invalid OTP. Please try again.',
    OTP_EXPIRED: 'OTP has expired. Please request a new one.',
    SESSION_EXPIRED: 'Session expired. Please sign up again.',
    OTP_SENT: 'OTP sent successfully',
    OTP_VERIFIED: 'OTP verified successfully',
    
    // Password Reset
    RESET_LINK_SENT: 'Password reset link sent to your email',
    RESET_LINK_FAILED: 'Failed to send reset link',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
    PASSWORD_RESET_FAILED: 'Failed to reset password',
    INVALID_RESET_TOKEN: 'Invalid or expired reset token',
    
    // Logout
    LOGOUT_SUCCESS: 'Logged out successfully',
};

// ============================================
// USER MESSAGES
// ============================================
export const USER_MESSAGES = {
    USER_NOT_FOUND: 'User not found',
    PROFILE_UPDATED: 'Profile updated successfully',
    PROFILE_UPDATE_FAILED: 'Failed to update profile',
    EMAIL_UPDATED: 'Email updated successfully',
    EMAIL_UPDATE_FAILED: 'Failed to update email',
    PASSWORD_CHANGED: 'Password changed successfully',
    PASSWORD_CHANGE_FAILED: 'Failed to change password',
    CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
    NEW_PASSWORD_SAME: 'New password must be different from current password',
};

// ============================================
// PRODUCT MESSAGES
// ============================================
export const PRODUCT_MESSAGES = {
    PRODUCT_NOT_FOUND: 'Product not found',
    PRODUCT_UNAVAILABLE: 'Product is not available',
    PRODUCT_BLOCKED: 'Product is no longer available for purchase. Please remove it from your cart and try again.',
    VARIANT_NOT_FOUND: 'Variant not found',
    OUT_OF_STOCK: 'Product is out of stock',
    INSUFFICIENT_STOCK: 'Insufficient stock for {productName}. Available: {available}, Requested: {requested}',
    MAX_QUANTITY_EXCEEDED: 'Maximum 3 units allowed per product',
    ONLY_ITEMS_AVAILABLE: 'Only {quantity} items available',
};

// ============================================
// CART MESSAGES
// ============================================
export const CART_MESSAGES = {
    CART_EMPTY: 'Cart is empty',
    CART_NOT_FOUND: 'Cart not found',
    ADDED_TO_CART: 'Added to cart successfully',
    REMOVED_FROM_CART: 'Removed from cart successfully',
    CART_UPDATED: 'Cart updated successfully',
    CART_UPDATE_FAILED: 'Failed to update cart',
    CART_CLEARED: 'Cart cleared successfully',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
};

// ============================================
// WISHLIST MESSAGES
// ============================================
export const WISHLIST_MESSAGES = {
    ADDED_TO_WISHLIST: 'Added to wishlist',
    REMOVED_FROM_WISHLIST: 'Removed from wishlist',
    WISHLIST_UPDATE_FAILED: 'Failed to update wishlist',
    WISHLIST_REMOVE_FAILED: 'Failed to remove',
    MOVED_TO_CART: 'Moved to cart successfully',
    MOVE_TO_CART_FAILED: 'Failed to move to cart',
};

// ============================================
// ORDER MESSAGES
// ============================================
export const ORDER_MESSAGES = {
    ORDER_NOT_FOUND: 'Order not found',
    ORDER_CREATED: 'Order created',
    ORDER_PLACED: 'Order placed successfully',
    ORDER_FAILED: 'Failed to place order',
    ORDER_CANCELLED: 'Order cancelled successfully',
    ORDER_CANCEL_FAILED: 'Failed to cancel order',
    ORDER_CANNOT_CANCEL: 'Order cannot be cancelled at this stage',
    ORDER_UPDATED: 'Order updated successfully',
    ORDER_UPDATE_FAILED: 'Failed to update order',
    CANNOT_UPDATE_CANCELLED: 'Cannot update status of a cancelled order',
    CANNOT_CANCEL_FROM_ADMIN: 'Orders can only be cancelled by customers',
    ITEMS_CANNOT_CANCEL: 'Items cannot be cancelled at this stage',
    ITEM_NOT_FOUND: 'Item not found in order',
    ITEM_ALREADY_CANCELLED: 'Item is already cancelled',
    COUPON_ORDER_NO_ITEM_CANCEL: 'Individual items cannot be cancelled for orders placed with a coupon. Please cancel the entire order instead.',
    NO_PERMISSION: 'Order not found or you do not have permission to view this order',
    
    // Return
    RETURN_REQUESTED: 'Return request submitted successfully',
    RETURN_REQUEST_FAILED: 'Failed to submit return request',
    RETURN_ALREADY_REQUESTED: 'Return already requested for this order',
    RETURN_NOT_ELIGIBLE: 'This order is not eligible for return',
    RETURN_STATUS_UPDATED: 'Return status updated successfully',
    RETURN_UPDATE_FAILED: 'Failed to update return status',
    ITEM_RETURN_REQUESTED: 'Item return request submitted successfully',
    ITEM_RETURN_REQUEST_FAILED: 'Failed to submit item return request',
    ITEM_ALREADY_RETURNED: 'This item has already been returned or has a pending return request',
    ITEM_NOT_DELIVERED: 'Only delivered items can be returned',
    COUPON_ORDER_NO_ITEM_RETURN: 'Individual items cannot be returned for orders placed with a coupon. Please return the entire order instead.',
    RETURN_WINDOW_EXPIRED: 'Return window has expired. Returns are only allowed within 7 days of delivery.',
    
    // Invoice
    INVOICE_NOT_AVAILABLE: 'Invoice is not available for this order status',
    INVOICE_GENERATED: 'Invoice generated successfully',
    INVOICE_FAILED: 'Failed to generate invoice',
};

// ============================================
// PAYMENT MESSAGES
// ============================================
export const PAYMENT_MESSAGES = {
    PAYMENT_SUCCESS: 'Payment verified successfully',
    PAYMENT_FAILED: 'Payment verification failed',
    PAYMENT_CANCELLED: 'Payment cancelled',
    PAYMENT_CANCEL_FAILED: 'Failed to cancel payment',
    PAYMENT_INITIATE_FAILED: 'Failed to initiate payment gateway. Please check configuration or try again.',
    PAYMENT_VERIFICATION_FAILED: 'Verification failed internally',
    CANNOT_CHANGE_PAYMENT_STATUS: 'Cannot change payment status for online/wallet payments that are already paid',
    
    // COD Restrictions
    COD_LIMIT_EXCEEDED: 'Cash on Delivery is not available for orders above ₹1000. Please choose online payment or wallet.',
    
    // Wallet
    MONEY_ADDED: 'Money added successfully',
    WALLET_LOAD_FAILED: 'Failed to load wallet page',
    
    // Razorpay
    RAZORPAY_ORDER_FAILED: 'Failed to create Razorpay order',
};

// ============================================
// COUPON MESSAGES
// ============================================
export const COUPON_MESSAGES = {
    COUPON_CODE_REQUIRED: 'Coupon code is required',
    INVALID_COUPON: 'Invalid coupon code',
    COUPON_EXPIRED: 'Coupon has expired',
    COUPON_NOT_ACTIVE: 'Coupon is not yet active',
    MINIMUM_PURCHASE_REQUIRED: 'Minimum purchase amount of ₹{amount} required',
    COUPON_APPLIED: 'Coupon applied successfully',
    COUPON_REMOVED: 'Coupon removed',
    COUPON_APPLY_FAILED: 'Failed to apply coupon',
    COUPON_FETCH_FAILED: 'Failed to fetch coupons',
    COUPON_CREATED: 'Coupon created successfully',
    COUPON_CREATE_FAILED: 'Failed to create coupon',
    COUPON_UPDATED: 'Coupon updated successfully',
    COUPON_UPDATE_FAILED: 'Failed to update coupon',
    COUPON_DELETED: 'Coupon deleted successfully',
    COUPON_DELETE_FAILED: 'Failed to delete coupon',
    COUPON_CODE_EXISTS: 'Coupon code already exists',
    COUPON_ZERO_ORDER: 'This coupon cannot be applied as it would make the order total zero or negative. Please contact support.',
    COUPON_MIN_ONE_RUPEE: 'Order total must be at least ₹1 after discount',
    
    // Validation
    DESCRIPTION_LENGTH: 'Description must be between 10 and 200 characters',
    PERCENTAGE_RANGE: 'Percentage discount must be between 1 and 99',
    MAX_DISCOUNT_REQUIRED: 'Maximum discount amount is required for percentage-based coupons to prevent zero-value orders',
    MAX_DISCOUNT_LIMIT: 'Maximum discount must be less than minimum purchase amount to prevent zero-value orders',
    FIXED_DISCOUNT_LIMIT: 'Fixed discount must be less than minimum purchase amount to prevent zero-value orders',
    INVALID_DATE_RANGE: 'End date must be after start date',
    USAGE_LIMIT_REQUIRED: 'Usage limit per user must be at least 1',
};

// ============================================
// ADDRESS MESSAGES
// ============================================
export const ADDRESS_MESSAGES = {
    ADDRESS_NOT_FOUND: 'Address not found',
    NO_ADDRESSES_FOUND: 'No addresses found',
    INVALID_ADDRESS_SELECTED: 'Invalid address selected',
    ADDRESS_ADDED: 'Address added successfully',
    ADDRESS_ADD_FAILED: 'Failed to add address',
    ADDRESS_UPDATED: 'Address updated successfully',
    ADDRESS_UPDATE_FAILED: 'Failed to update address',
    ADDRESS_DELETED: 'Address deleted successfully',
    ADDRESS_DELETE_FAILED: 'Failed to delete address',
    ADDRESS_REQUIRED: 'Shipping address is required',
    ADDRESS_LOAD_FAILED: 'Failed to load addresses',
};

// ============================================
// CATEGORY MESSAGES
// ============================================
export const CATEGORY_MESSAGES = {
    CATEGORY_NOT_FOUND: 'Category not found',
    CATEGORY_CREATED: 'Category created successfully',
    CATEGORY_CREATE_FAILED: 'Failed to create category',
    CATEGORY_UPDATED: 'Category updated successfully',
    CATEGORY_UPDATE_FAILED: 'Failed to update category',
    CATEGORY_DELETED: 'Category deleted successfully',
    CATEGORY_DELETE_FAILED: 'Failed to delete category',
    CATEGORY_EXISTS: 'Category with this name already exists',
    CATEGORY_LOAD_FAILED: 'Failed to load categories',
    CATEGORY_HAS_PRODUCTS: 'Cannot delete category with existing products',
    CATEGORY_DESCRIPTION_LENGTH: 'Description must be between 10 and 500 characters',
};

// ============================================
// ADMIN MESSAGES
// ============================================
export const ADMIN_MESSAGES = {
    INVALID_ADMIN_CREDENTIALS: 'Invalid admin credentials',
    ADMIN_LOGIN_FAILED: 'Admin login failed',
    CUSTOMER_BLOCKED: 'Customer blocked successfully',
    CUSTOMER_UNBLOCKED: 'Customer unblocked successfully',
    CUSTOMER_STATUS_FAILED: 'Failed to update customer status',
    ORDERS_LOAD_FAILED: 'Failed to load orders',
    ORDER_DETAILS_FAILED: 'Failed to load order details',
    PRODUCTS_LOAD_FAILED: 'Failed to load products',
    CUSTOMERS_LOAD_FAILED: 'Failed to load customers',
    DASHBOARD_LOAD_FAILED: 'Dashboard load failed',
};

// ============================================
// REFERRAL MESSAGES
// ============================================
export const REFERRAL_MESSAGES = {
    INVALID_FORMAT: 'Invalid referral code format',
    INVALID_LENGTH: 'Referral code must be 6 alphanumeric characters',
    ALREADY_USED: 'You have already used a referral code. Only one referral code can be used per account.',
    CANNOT_USE_OWN: 'You cannot use your own referral code',
    INVALID_CODE: 'Invalid referral code',
    APPLIED_SUCCESS: 'Referral code applied successfully! ₹{amount} has been added to your wallet.',
    APPLY_FAILED: 'Failed to apply referral code',
};

// ============================================
// SALES REPORT MESSAGES
// ============================================
export const SALES_REPORT_MESSAGES = {
    REPORT_GENERATED: 'Sales report generated successfully',
    REPORT_FAILED: 'Failed to generate sales report',
    INVALID_DATE_RANGE: 'Invalid date range',
    NO_DATA: 'No sales data found for the selected period',
};

// ============================================
// GENERAL MESSAGES
// ============================================
export const GENERAL_MESSAGES = {
    SUCCESS: 'Operation completed successfully',
    FAILED: 'Operation failed',
    SERVER_ERROR: 'Server error',
    INVALID_REQUEST: 'Invalid request',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    BAD_REQUEST: 'Bad request',
    PAGE_NOT_FOUND: 'Page not found',
};

// ============================================
// CHECKOUT MESSAGES
// ============================================
export const CHECKOUT_MESSAGES = {
    BUY_NOW_DATA_NOT_FOUND: 'Buy now data not found',
    REDIRECTING_TO_CHECKOUT: 'Redirecting to checkout',
    CHECKOUT_FAILED: 'Failed to process buy now: {error}',
    CHECKOUT_LOAD_FAILED: 'Failed to load checkout',
};

// ============================================
// CONTACT MESSAGES
// ============================================
export const CONTACT_MESSAGES = {
    // Success
    SUBMIT_SUCCESS: 'Thank you for contacting us! We\'ll get back to you soon.',
    CLEANUP_SUCCESS: 'Successfully deleted {count} old messages',
    
    // Validation
    ALL_FIELDS_REQUIRED: 'Please fill in all required fields (name, email, subject, and message)',
    INVALID_EMAIL: 'Please provide a valid email address',
    MESSAGE_TOO_SHORT: 'Message must be at least 10 characters long',
    MESSAGE_TOO_LONG: 'Message must not exceed 2000 characters',
    DUPLICATE_SUBMISSION: 'You have already submitted a message recently. Please wait before submitting again.',
    
    // Errors
    SUBMIT_FAILED: 'Failed to send message. Please try again later.',
    CLEANUP_FAILED: 'Failed to cleanup old messages',
};

// Helper function to replace placeholders in messages
export const formatMessage = (message, replacements = {}) => {
    let formatted = message;
    Object.keys(replacements).forEach(key => {
        formatted = formatted.replace(`{${key}}`, replacements[key]);
    });
    return formatted;
};

// Export all messages as a single object for convenience
export default {
    AUTH: AUTH_MESSAGES,
    USER: USER_MESSAGES,
    PRODUCT: PRODUCT_MESSAGES,
    CART: CART_MESSAGES,
    WISHLIST: WISHLIST_MESSAGES,
    ORDER: ORDER_MESSAGES,
    PAYMENT: PAYMENT_MESSAGES,
    COUPON: COUPON_MESSAGES,
    ADDRESS: ADDRESS_MESSAGES,
    CATEGORY: CATEGORY_MESSAGES,
    ADMIN: ADMIN_MESSAGES,
    REFERRAL: REFERRAL_MESSAGES,
    SALES_REPORT: SALES_REPORT_MESSAGES,
    GENERAL: GENERAL_MESSAGES,
    CHECKOUT: CHECKOUT_MESSAGES,
    formatMessage
};
