import ContactMessage from '../../models/contactMessageModel.js';
import { sendContactNotificationEmail, sendAutoReplyEmail } from '../../services/contactEmailService.js';
import StatusCodes from '../../utils/statusCodes.js';


const submitContactForm = async (req, res) => {
    try {
        const { fullName, email, phone, subject, message } = req.body;
        
        // Validate required fields
        if (!fullName || !email || !subject || !message) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please fill in all required fields (name, email, subject, and message)'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        
        // Validate message length
        if (message.length < 10) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Message must be at least 10 characters long'
            });
        }
        
        if (message.length > 2000) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Message must not exceed 2000 characters'
            });
        }
        
        // Step 1: Save to database first (most critical step)
        const contactData = {
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            subject: subject.trim(),
            message: message.trim()
        };
        
        const newContactMessage = new ContactMessage(contactData);
        const savedMessage = await newContactMessage.save();
        
        console.log('Contact message saved to database:', savedMessage._id);
        
      
        sendContactNotificationEmail(contactData)
            .then(result => {
                if (result.success) {
                    // Update the emailSent flag
                    ContactMessage.findByIdAndUpdate(
                        savedMessage._id,
                        { emailSent: true },
                        { new: true }
                    ).catch(err => console.error('Error updating emailSent flag:', err));
                }
            })
            .catch(error => {
                console.error('Failed to send admin notification:', error);
            });
        
        // Step 3: Send auto-reply to user (non-blocking)
        sendAutoReplyEmail(contactData)
            .catch(error => {
                console.error('Failed to send auto-reply:', error);
            });
        
        // Step 4: Return success response immediately
        return res.status(StatusCodes.OK).json({
            success: true,
            message: 'Thank you for contacting us! We\'ll get back to you soon.',
            data: {
                id: savedMessage._id,
                createdAt: savedMessage.createdAt
            }
        });
        
    } catch (error) {
        console.error('Error in submitContactForm:', error);
        
        // Check for duplicate submission (if email was sent very recently)
        if (error.code === 11000) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'You have already submitted a message recently. Please wait before submitting again.'
            });
        }
        
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to send message. Please try again later.'
        });
    }
};




const cleanupOldMessages = async (req, res) => {
    try {
        const daysOld = parseInt(req.query.days) || 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const result = await ContactMessage.deleteMany({
            createdAt: { $lt: cutoffDate }
        });
        
        console.log(`Cleaned up ${result.deletedCount} messages older than ${daysOld} days`);
        
        return res.status(StatusCodes.OK).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} old messages`,
            data: {
                deletedCount: result.deletedCount,
                cutoffDate: cutoffDate
            }
        });
        
    } catch (error) {
        console.error('Error in cleanupOldMessages:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to cleanup old messages'
        });
    }
};

export default {
    submitContactForm,

    cleanupOldMessages
};
