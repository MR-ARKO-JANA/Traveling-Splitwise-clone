// Email Test Utility - Test your email credentials
require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailCredentials() {
    console.log('🧪 Email Credentials Test Utility');
    console.log('==================================');
    console.log(`📧 Email: ${process.env.MAIL_USER}`);
    console.log(`🔑 Password Length: ${process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 'Not set'}`);
    console.log('');

    const configurations = [
        {
            name: 'Gmail (Service)',
            config: {
                service: 'gmail',
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            }
        },
        {
            name: 'Gmail (SMTP)',
            config: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            }
        },
        {
            name: 'Gmail (SSL)',
            config: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            }
        }
    ];

    for (const { name, config } of configurations) {
        console.log(`🔄 Testing ${name}...`);
        
        try {
            const transporter = nodemailer.createTransport(config);
            
            // Test connection
            await transporter.verify();
            console.log(`✅ ${name}: Connection successful!`);
            
            // Send test email
            const testEmail = {
                from: process.env.MAIL_USER,
                to: process.env.MAIL_USER, // Send to yourself
                subject: '🧪 Test Email - Splitwise Clone',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #667eea;">✅ Email Test Successful!</h2>
                        <p>This is a test email from your Splitwise Clone application.</p>
                        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <strong>Configuration:</strong> ${name}<br>
                            <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                            <strong>Status:</strong> Email sending is working correctly!
                        </div>
                        <p style="color: #666;">If you received this email, your OTP system will work perfectly!</p>
                    </div>
                `
            };
            
            const info = await transporter.sendMail(testEmail);
            console.log(`📧 Test email sent successfully!`);
            console.log(`📧 Message ID: ${info.messageId}`);
            console.log(`📧 Check your inbox: ${process.env.MAIL_USER}`);
            console.log('');
            
            // If we get here, this configuration works!
            console.log(`🎉 SUCCESS! Use this configuration for your OTP system.`);
            console.log(`Configuration: ${name}`);
            break;
            
        } catch (error) {
            console.log(`❌ ${name}: Failed`);
            console.log(`   Error: ${error.message}`);
            console.log('');
        }
    }
    
    console.log('==================================');
    console.log('📋 Next Steps:');
    console.log('1. If any test succeeded, your OTP emails will work!');
    console.log('2. If all tests failed, check your Gmail App Password:');
    console.log('   - Enable 2-Factor Authentication');
    console.log('   - Generate new App Password');
    console.log('   - Update MAIL_PASS in .env file');
    console.log('3. Restart your server after updating credentials');
}

// Run the test
testEmailCredentials().catch(console.error);