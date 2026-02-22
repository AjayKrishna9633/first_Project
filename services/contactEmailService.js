import pkg from 'nodemailer';
const { createTransport } = pkg;

// Create email transporter
const createTransporter = () => {
    return createTransport({
        service: 'gmail',
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    });
};


export const sendContactNotificationEmail = async (contactData) => {
    try {
        const transporter = createTransporter();
        
        const { fullName, email, phone, subject, message } = contactData;
        
        // Create HTML email body
        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #06b6d4, #3b82f6);
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }
                    .field {
                        margin-bottom: 20px;
                    }
                    .label {
                        font-weight: bold;
                        color: #06b6d4;
                        margin-bottom: 5px;
                    }
                    .value {
                        padding: 10px;
                        background-color: #f5f5f5;
                        border-left: 3px solid #06b6d4;
                        margin-top: 5px;
                    }
                    .message-box {
                        padding: 15px;
                        background-color: #f0f9ff;
                        border: 1px solid #06b6d4;
                        border-radius: 5px;
                        margin-top: 5px;
                        white-space: pre-wrap;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        color: #666;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔔 New Contact Message</h1>
                        <p>GEARGRID Contact Form</p>
                    </div>
                    <div class="content">
                        <div class="field">
                            <div class="label">👤 Full Name:</div>
                            <div class="value">${fullName}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">📧 Email Address:</div>
                            <div class="value"><a href="mailto:${email}">${email}</a></div>
                        </div>
                        
                        ${phone ? `
                        <div class="field">
                            <div class="label">📱 Phone Number:</div>
                            <div class="value"><a href="tel:${phone}">${phone}</a></div>
                        </div>
                        ` : ''}
                        
                        <div class="field">
                            <div class="label">📋 Subject:</div>
                            <div class="value">${subject}</div>
                        </div>
                        
                        <div class="field">
                            <div class="label">💬 Message:</div>
                            <div class="message-box">${message}</div>
                        </div>
                        
                        <div class="footer">
                            <p>This message was sent from the GEARGRID contact form</p>
                            <p>Received at: ${new Date().toLocaleString('en-IN', { 
                                timeZone: 'Asia/Kolkata',
                                dateStyle: 'full',
                                timeStyle: 'long'
                            })}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        
        const textBody = `
New Contact Message Received - GEARGRID

Full Name: ${fullName}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
Subject: ${subject}

Message:
${message}

---
Received at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        `;
        
        const mailOptions = {
            from: `"GEARGRID Contact Form" <${process.env.NODEMAILER_EMAIL}>`,
            to: process.env.ADMIN_EMAIL || 'krishnaaja802@gmail.com',
            subject: `New Contact Message: ${subject}`,
            text: textBody,
            html: htmlBody,
            replyTo: email 
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Contact notification email sent:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
        
    } catch (error) {
        console.error('Error sending contact notification email:', error);
       
        return {
            success: false,
            error: error.message
        };
    }
};


export const sendAutoReplyEmail = async (contactData) => {
    try {
        const transporter = createTransporter();
        
        const { fullName, email, subject } = contactData;
        
        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }
                    .header {
                        background: linear-gradient(135deg, #06b6d4, #3b82f6);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background: white;
                        padding: 30px;
                        border-radius: 0 0 5px 5px;
                    }
                    .logo {
                        font-size: 32px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    .message {
                        margin: 20px 0;
                    }
                    .highlight {
                        background-color: #f0f9ff;
                        padding: 15px;
                        border-left: 4px solid #06b6d4;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                        color: #666;
                        font-size: 12px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: linear-gradient(135deg, #06b6d4, #3b82f6);
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">GEARGRID</div>
                        <p>Thank You for Contacting Us!</p>
                    </div>
                    <div class="content">
                        <div class="message">
                            <p>Hi ${fullName},</p>
                            
                            <p>Thank you for reaching out to GEARGRID! We've received your message and wanted to let you know that we're on it.</p>
                            
                            <div class="highlight">
                                <strong>Your inquiry regarding:</strong><br>
                                ${subject}
                            </div>
                            
                            <p>Our team will review your message and get back to you as soon as possible, typically within 24-48 hours.</p>
                            
                            <p>In the meantime, feel free to:</p>
                            <ul>
                                <li>Browse our latest products</li>
                                <li>Check out our FAQ section</li>
                                <li>Follow us on social media for updates</li>
                            </ul>
                            
                            <center>
                                <a href="${'http://localhost:5000'}/shop" class="button">
                                    Explore Our Products
                                </a>
                            </center>
                        </div>
                        
                        <div class="footer">
                            <p><strong>GEARGRID</strong> - Powering Your Digital Lifestyle</p>
                            <p>This is an automated message. Please do not reply to this email.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const textBody = `
Hi ${fullName},

Thank you for reaching out to GEARGRID! We've received your message regarding "${subject}" and wanted to let you know that we're on it.

Our team will review your message and get back to you as soon as possible, typically within 24-48 hours.

Best regards,
GEARGRID Team

---
This is an automated message. Please do not reply to this email.
        `;
        
        const mailOptions = {
            from: `"GEARGRID Support" <${process.env.NODEMAILER_EMAIL}>`,
            to: email,
            subject: `We've Received Your Message - GEARGRID`,
            text: textBody,
            html: htmlBody
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Auto-reply email sent:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
        
    } catch (error) {
        console.error('Error sending auto-reply email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};
