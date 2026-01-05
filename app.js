import dotenv from 'dotenv';
dotenv.config({ override: true, quiet: true });
import express from 'express';
import session from 'express-session';
import path from 'path';
import {fileURLToPath}  from 'url';
import db from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js'
const __filename  = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT);

// Import passport AFTER env vars are loaded
const passportModule = await import('./config/passport.js');
const passport = passportModule.default;
db();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret:process.env.SESSION_SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
  }
}))

app.use(passport.initialize());
app.use(passport.session());

// Prevent caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');
app.use('/public', express.static(path.join(__dirname, 'public')))




app.use('/',userRoutes);
app.use('/admin',adminRoutes)


app.use((req, res, next) => {
    res.status(404).render('error/error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.',
        user: req.session.user || null,
        errorCode: 404,
        errorType: 'Page Not Found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).render('error/error', {
        title: '500 - Internal Server Error',
        message: 'Something went wrong on our end. Please try again later.',
        user: req.session.user || null,
        errorCode: 500,
        errorType: 'Server Error'
    });
});

app.listen(PORT, () => {
  console.log(`Server has started: http://localhost:${PORT}`);
})
