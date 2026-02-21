/**
 * Test Email Configuration
 * 
 * This script tests if your Gmail credentials are working correctly.
 * 
 * Usage:
 *   node scripts/testEmailConfig.js
 */

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'nodemailer';
const { createTransport } = pkg;

async function testEmailConfig() {
    console.log('🔍 Testing Email Configuration...\n');
    
    // Check environment variables
    console.log('📧 Email:', process.env.NODEMAILER_EMAIL);
    console.log('🔑 Password:', process.env.NODEMAILER_PASSWORD ? '****' + process.env.NODEMAILER_PASSWORD.slice(-4) : 'NOT SET');
    console.log('👤 Admin Email:', process.env.ADMIN_EMAIL || 'krishnaaja802@gmail.com');
    console.log('');
    
    if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD) {
        console.error('❌ Error: NODEMAILER_EMAIL or NODEMAILER_PASSWORD not set in .env file');
        process.exit(1);
    }
    
    try {
        console.log('🔌 Creating transporter...');
        const transporter = createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });
        
        console.log('✅ Transporter created');
        console.log('');
        
        console.log('🔐 Verifying credentials...');
        await transporter.verify();
        console.log('✅ Email credentials are valid!');
        console.log('');
        
        console.log('📨 Sending test email...');
        const info = await transporter.sendMail({
            from: `"GEARGRID Test" <${process.env.NODEMAILER_EMAIL}>`,
            to: process.env.ADMIN_EMAIL || 'krishnaaja802@gmail.com',
            subject: 'Test Email - GEARGRID Configuration',
            text: 'This is a test email to verify your email configuration is working correctly.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
                        <h1 style="color: #06b6d4;">✅ Email Configuration Test</h1>
                        <p>This is a test email to verify your GEARGRID email configuration is working correctly.</p>
                        <p><strong>Sent from:</strong> ${process.env.NODEMAILER_EMAIL}</p>
                        <p><strong>Sent to:</strong> ${process.env.ADMIN_EMAIL || 'krishnaaja802@gmail.com'}</p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 12px;">If you received this email, your configuration is working perfectly!</p>
                    </div>
                </div>
            `
        });
        
        console.log('✅ Test email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        console.log('');
        console.log('🎉 All tests passed! Your email configuration is working correctly.');
        console.log('');
        
    } catch (error) {
        console.error('❌ Error testing email configuration:');
        console.error('');
        
        if (error.code === 'EAUTH') {
            console.error('🔐 Authentication Error:');
            console.error('   Your Gmail credentials are incorrect or invalid.');
            console.error('');
            console.error('📝 To fix this:');
            console.error('   1. Go to: https://myaccount.google.com/apppasswords');
            console.error('   2. Sign in with:', process.env.NODEMAILER_EMAIL);
            console.error('   3. Enable 2-Step Verification if not already enabled');
            console.error('   4. Create a new App Password for "Mail"');
            console.error('   5. Copy the 16-character password');
            console.error('   6. Update NODEMAILER_PASSWORD in your .env file');
            console.error('');
        } else if (error.code === 'ECONNECTION') {
            console.error('🌐 Connection Error:');
            console.error('   Could not connect to Gmail servers.');
            console.error('   Check your internet connection.');
            console.error('');
        } else {
            console.error('Error details:', error.message);
            console.error('');
        }
        
        process.exit(1);
    }
}

// Run the test
testEmailConfig();
