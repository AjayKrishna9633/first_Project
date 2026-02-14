/**
 * Common Middleware
 * Contains middleware extracted from app.js
 */

/**
 * No Cache Middleware
 * Prevents browser caching of responses
 */
export const noCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
export const notFoundHandler = (req, res) => {
    res.status(404).render('error/error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.',
        user: req.session.user || null,
        errorCode: 404,
        errorType: 'Page Not Found'
    });
};

/**
 * Global Error Handler
 * Catches and handles all unhandled errors in the application
 */
export const globalErrorHandler = (err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).render('error/error', {
        title: '500 - Internal Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        user: req.session.user || null,
        errorCode: 500,
        errorType: 'Server Error'
    });
};

