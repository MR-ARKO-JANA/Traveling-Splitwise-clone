// Test email using exact server configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendOTPEmail(email, otp, userName = "User") {
    try {
        console.log(`📧 Attempting to send OTP email to: ${email}`);
        console.log(`🔐 Generated OTP: ${otp}`);
        console.log(`📧 Using email config: ${process.env.MAIL_USER}`);
        
        // Create transporter with Gmail
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        // Test the connection
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');

        // Professional email template
        const mailOptions = {
            from: `"Splitwise Clone Security" <${process.env.MAIL_USER}>`,
            to: email,
            subject: '🔐 Your Password Reset Code - Splitwise Clone',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">Password Reset OTP</h2>
                    <p>Hi ${userName}!</p>
                    <p>Your OTP code is: <strong style="font-size: 24px; color: #667eea;">${otp}</strong></p>
                    <p>This code expires in 5 minutes.</p>
                </div>
            `
        };

        // Send email
        console.log('📧 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`✅ OTP email sent successfully!`);
        console.log(`📧 To: ${email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log(`📧 Response: ${info.response}`);
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Email sending failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Test the function
sendOTPEmail('arkojana45@gmail.com', '123456', 'Test User');