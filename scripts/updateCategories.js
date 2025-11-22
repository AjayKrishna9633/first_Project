import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const categorySchema = new mongoose.Schema({
    name: String,
    description: String,
    isListed: Boolean,
    offerId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);

async function updateCategories() {
    try {
        // Find all categories without description
        const categories = await Category.find({ 
            $or: [
                { description: { $exists: false } },
                { description: null },
                { description: '' }
            ]
        });

        console.log(`Found ${categories.length} categories without description`);

        // Update each category
        for (const category of categories) {
            category.description = `${category.name} products and accessories`;
            await category.save();
            console.log(`Updated: ${category.name}`);
        }

        console.log('All categories updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating categories:', error);
        process.exit(1);
    }
}

updateCategories();
