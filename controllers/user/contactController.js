import ContactMessage from '../../models/contactMessageModel.js';
import { sendContactNotificationEmail, sendAutoReplyEmail } from '../../utils/contactEmailService.js';
import StatusCodes from '../../utils/statusCodes.js';
import { CONTACT_MESSAGES, formatMessage } from '../../constants/messages.js';


const submitContactForm = async (req, res) => {
    try {
        const { fullName, email, phone, subject, message } = req.body;
        
        // Validate required fields
        if (!fullName || !email || !subject || !message) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: CONTACT_MESSAGES.ALL_FIELDS_REQUIRED
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: CONTACT_MESSAGES.INVALID_EMAIL
            });
        }
        
        // Validate message length
        if (message.length < 10) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: CONTACT_MESSAGES.MESSAGE_TOO_SHORT
            });
        }
        
        if (message.length > 2000) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: CONTACT_MESSAGES.MESSAGE_TOO_LONG
            });
        }
        
     
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
        
       
        sendAutoReplyEmail(contactData)
            .catch(error => {
                console.error('Failed to send auto-reply:', error);
            });
        
       
        return res.status(StatusCodes.OK).json({
            success: true,
            message: CONTACT_MESSAGES.SUBMIT_SUCCESS,
            data: {
                id: savedMessage._id,
                createdAt: savedMessage.createdAt
            }
        });
        
    } catch (error) {
        console.error('Error in submitContactForm:', error);
        
       
        if (error.code === 11000) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: CONTACT_MESSAGES.DUPLICATE_SUBMISSION
            });
        }
        
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: CONTACT_MESSAGES.SUBMIT_FAILED
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
            message: formatMessage(CONTACT_MESSAGES.CLEANUP_SUCCESS, { count: result.deletedCount }),
            data: {
                deletedCount: result.deletedCount,
                cutoffDate: cutoffDate
            }
        });
        
    } catch (error) {
        console.error('Error in cleanupOldMessages:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: CONTACT_MESSAGES.CLEANUP_FAILED
        });
    }
};

export default {
    submitContactForm,

    cleanupOldMessages
};
