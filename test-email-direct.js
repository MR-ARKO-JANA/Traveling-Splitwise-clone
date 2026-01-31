// Direct email test
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailDirect() {
    console.log('🧪 Testing Email Configuration...');
    console.log('📧 MAIL_USER:', process.env.MAIL_USER);
    console.log('🔑 MAIL_PASS length:', process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 'undefined');
    
    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        console.log('✅ Transporter created');

        // Test connection
        console.log('🔍 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully');

        // Send test email
        const testOTP = '123456';
        const mailOptions = {
            from: `"Splitwise Clone Test" <${process.env.MAIL_USER}>`,
            to: process.env.MAIL_USER,
            subject: '🧪 Test OTP Email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">Test OTP Email</h2>
                    <p>This is a test email to verify the OTP system is working.</p>
                    <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
                        <h3>Test OTP: ${testOTP}</h3>
                    </div>
                    <p>If you received this email, the system is working correctly!</p>
                </div>
            `
        };

        console.log('📧 Sending test email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);
        
    } catch (error) {
        console.error('❌ Email test failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            command: error.command
        });
    }
}

testEmailDirect();