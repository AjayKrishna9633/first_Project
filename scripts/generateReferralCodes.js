import mongoose from 'mongoose';
import User from '../models/userModal.js';
import dotenv from 'dotenv';

dotenv.config();

// Generate unique 6-character referral code
const generateReferralCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
};

const generateReferralCodesForUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find users without referral codes
        const usersWithoutCodes = await User.find({ 
            $or: [
                { referralCode: { $exists: false } },
                { referralCode: null },
                { referralCode: '' }
            ]
        });

        console.log(`Found ${usersWithoutCodes.length} users without referral codes`);

        let updated = 0;
        for (const user of usersWithoutCodes) {
            let referralCode;
            let isUnique = false;
            
            // Generate unique code
            while (!isUnique) {
                referralCode = generateReferralCode();
                const existingUser = await User.findOne({ referralCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }
            
            user.referralCode = referralCode;
            
            // Initialize hasUsedReferral if not set
            if (user.hasUsedReferral === undefined) {
                user.hasUsedReferral = false;
            }
            
            await user.save();
            updated++;
            console.log(`Generated code ${referralCode} for user ${user.email}`);
        }

        console.log(`\nSuccessfully generated referral codes for ${updated} users`);
        
        await mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

generateReferralCodesForUsers();
