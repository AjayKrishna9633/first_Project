import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true // Index for efficient cleanup queries
    },
    isRead: {
        type: Boolean,
        default: false
    },
    emailSent: {
        type: Boolean,
        default: false
    }
});

// Index for automatic cleanup of old messages
contactMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days in seconds

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage;
