import User from '../models/userModal.js';
import StatusCodes from '../utils/statusCodes.js';

export const protectUser = async (req, res, next) => {
    if (!req.session?.user) {
        // Check if it's an AJAX request
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Please login to continue',
                requiresLogin: true
            });
        }
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.user.id);
        
        if (!user) {
            req.session.destroy();
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Please login to continue',
                    requiresLogin: true
                });
            }
            return res.redirect('/login');
        }

        if (user.isBlocked) {
            req.session.destroy((err) => {
                if (err) console.error('Session destroy error:', err);
                if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                    return res.status(StatusCodes.FORBIDDEN).json({
                        success: false,
                        message: 'Your account has been blocked. Please contact support.'
                    });
                }
                return res.render('user/login', {
                    message: 'Your account has been blocked. Please contact support.',
                    isError: true,
                    oldInput: { email: user.email }
                });
            });
            return;
        }

        return next();
    } catch (error) {
        console.error('Error in isAuthenticated middleware:', error);
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'An error occurred. Please try again.'
            });
        }
        return res.redirect('/login');
    }
};


export const isNotAuthenticated = (req, res, next) => {
    if (req.session?.user) {
        return res.redirect('/');
    }
    next();
};


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

export const preventCrossAccess = (req, res, next) => {
    const isAdminRoute = req.path.startsWith('/admin');
    const hasUserSession = req.session?.user;
    const hasAdminSession = req.session?.admin;

    if (isAdminRoute && hasUserSession && !hasAdminSession) {
        return res.status(StatusCodes.FORBIDDEN).render('error/error', {
            title: '403 - Access Denied',
            message: 'You need admin privileges to access this area.',
            user: req.session.user,
            errorCode: 403,
            errorType: 'Access Denied'
        });
    }

    // Allow all other cases:
    // - No session at all (will be handled by individual route middleware)
    // - Admin accessing admin routes
    // - User accessing user routes
    // - Admin accessing user routes (allow this)
    next();
};