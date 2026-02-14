import dotenv from 'dotenv';
dotenv.config({ override: true, quiet: true });
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { preventCrossAccess } from './middlewares/authMiddleware.js';
import { noCache, notFoundHandler, globalErrorHandler } from './middlewares/commonMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT);

// Import passport AFTER env vars are loaded
const passportModule = await import('./config/passport.js');
const passport = passportModule.default;

// Connect to database
db();

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


app.use(noCache);

// View engine configuration
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use('/public', express.static(path.join(__dirname, 'public')));


app.use(preventCrossAccess);

// Routes
app.use('/', userRoutes);
app.use('/admin', adminRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
    console.log(`Server has started: http://localhost:${PORT}`);
});
