import User from '../models/userModal.js';

// Middleware to check if user is authenticated and not blocked
export const protectUser = async (req, res, next) => {
    if (!req.session?.user) {
        return res.redirect('/login');
    }

    try {
        // Check if user is blocked
        const user = await User.findById(req.session.user.id);
        
        if (!user) {
            // User not found - destroy session
            req.session.destroy();
            return res.redirect('/login');
        }

        if (user.isBlocked) {
            // User is blocked - destroy session and redirect with message
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                return res.render('user/login', {
                    message: 'Your account has been blocked. Please contact support.',
                    isError: true,
                    oldInput: { email: user.email }
                });
            });
            return;
        }

        // User is authenticated and not blocked
        return next();
    } catch (error) {
        console.error('Error in isAuthenticated middleware:', error);
        return res.redirect('/login');
    }
};

// Middleware to check if user IS authenticated
export const isNotAuthenticated = (req, res, next) => {
    if (req.session?.user) {
        return res.redirect('/');
    }
    next();
};

// Middleware to check if admin is authenticated
export const isAdminAuthenticated = (req, res, next) => {
    if (!req.session?.admin) {
        return res.redirect('/admin/login');
    }
    next();
};

export const isAdminNotAuthenticated = (req, res, next) => {
    if (req.session?.admin) {
        return res.redirect('/admin/dashboard');
    }
    next();
};