const nodemailer = require("nodemailer");
require("dotenv").config();

const sendOtpMail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Password Reset OTP - Splitwise Clone',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 10px; text-align: center; color: white;">
                        <h1 style="margin: 0;">🔐 Password Reset</h1>
                        <p style="margin: 10px 0 0 0;">Splitwise Clone</p>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 10px; margin-top: 20px;">
                        <h2 style="color: #333;">Your OTP Code</h2>
                        <p style="color: #666; font-size: 16px;">
                            You requested a password reset. Use the OTP code below:
                        </p>
                        
                        <div style="background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 5px;">
                                ${otp}
                            </h1>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            <strong>⏰ This OTP will expire in 5 minutes.</strong><br>
                            If you didn't request this, please ignore this email.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('📧 OTP email sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        // Fallback to console logging
        console.log(`\n📧 ===== OTP EMAIL NOTIFICATION (FALLBACK) =====`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`⏰ Expires in: 5 minutes`);
        console.log(`=====================================\n`);
        return false;
    }
};

module.exports = { sendOtpMail };