import passport from "passport";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from "../models/userModal.js";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        
        // First check if user exists by googleId
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }
        
        // Check if user exists by email (already registered with email/password)
        user = await User.findOne({ email: email });
        
        if (user) {
            // User exists with this email, link Google account
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        user = new User({
            fullName: profile.displayName,
            email: email,
            googleId: profile.id
        });
        
        await user.save();
        return done(null, user);
        
    } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user,done)=>{
    done(null,user.id)
});

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
        done(err,null)
    })
})

export default passport;