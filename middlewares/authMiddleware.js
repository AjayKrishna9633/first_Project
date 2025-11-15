// Middleware to check if user is NOT authenticated
export const isNotAuthenticated = (req, res, next) => {
    if (req.session?.user) {
        return res.redirect('/');
    }
    next();
};

// Middleware to check if user IS authenticated
export const isAuthenticated = (req, res, next) => {
    if (!req.session?.user) {
        return res.redirect('/login');
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
