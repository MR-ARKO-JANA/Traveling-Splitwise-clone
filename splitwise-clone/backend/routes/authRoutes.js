const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production";

const nodemailer = require("nodemailer");

// Professional OTP email sending function with multiple service support
async function sendOTPEmail(email, otp, userName = "User") {
    try {
        console.log(`📧 Attempting to send OTP email to: ${email}`);
        console.log(`🔐 Generated OTP: ${otp}`);
        console.log(`📧 Using email config: ${process.env.MAIL_USER}`);
        
        // Try multiple email service configurations
        const emailConfigs = [
            // Gmail configuration
            {
                name: 'Gmail',
                service: 'gmail',
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            },
            // Outlook configuration (fallback)
            {
                name: 'Outlook',
                host: 'smtp-mail.outlook.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            },
            // Generic SMTP configuration (fallback)
            {
                name: 'Generic SMTP',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            }
        ];

        let lastError = null;
        
        // Try each configuration
        for (const config of emailConfigs) {
            try {
                console.log(`🔄 Trying ${config.name} configuration...`);
                
                // Create transporter
                const transporter = nodemailer.createTransport(config);

                // Test the connection
                await transporter.verify();
                console.log(`✅ ${config.name} SMTP connection verified successfully`);

                // Professional email template
                const mailOptions = {
                    from: `"Splitwise Clone Security" <${process.env.MAIL_USER}>`,
                    to: email,
                    subject: '🔐 Your Password Reset Code - Splitwise Clone',
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Password Reset - Splitwise Clone</title>
                        </head>
                        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                                <!-- Header -->
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🔐 Password Reset</h1>
                                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Splitwise Clone Security</p>
                                </div>
                                
                                <!-- Content -->
                                <div style="padding: 40px 30px;">
                                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hi ${userName}!</h2>
                                    
                                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                        We received a request to reset your password for your Splitwise Clone account. Use the verification code below:
                                    </p>
                                    
                                    <!-- OTP Code Box -->
                                    <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%); border: 2px solid #667eea; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Verification Code</p>
                                        <div style="color: #667eea; font-size: 48px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 15px 0; text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);">
                                            ${otp}
                                        </div>
                                        <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">⏰ This code expires in 5 minutes</p>
                                    </div>
                                    
                                    <!-- Instructions -->
                                    <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                        <h3 style="color: #f57c00; margin: 0 0 15px 0; font-size: 16px;">⚠️ Security Instructions</h3>
                                        <ul style="color: #666666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                                            <li>Enter this code on the password reset page</li>
                                            <li>This code is valid for <strong>5 minutes only</strong></li>
                                            <li>Never share this code with anyone</li>
                                            <li>If you didn't request this, please ignore this email</li>
                                        </ul>
                                    </div>
                                    
                                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                                        Having trouble? Contact our support team or try requesting a new code.
                                    </p>
                                </div>
                                
                                <!-- Footer -->
                                <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                                        This is an automated security message from Splitwise Clone
                                    </p>
                                    <p style="color: #999999; font-size: 12px; margin: 0;">
                                        📧 ${email} | 🕒 ${new Date().toLocaleString()}
                                    </p>
                                    <p style="color: #999999; font-size: 11px; margin: 10px 0 0 0;">
                                        Please do not reply to this email
                                    </p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                };

                // Send email
                console.log(`📧 Sending email via ${config.name}...`);
                const info = await transporter.sendMail(mailOptions);
                
                console.log(`✅ OTP email sent successfully via ${config.name}!`);
                console.log(`📧 To: ${email}`);
                console.log(`📧 Message ID: ${info.messageId}`);
                console.log(`📧 Response: ${info.response}`);
                
                return { success: true, messageId: info.messageId, service: config.name };
                
            } catch (configError) {
                console.log(`❌ ${config.name} failed: ${configError.message}`);
                lastError = configError;
                continue; // Try next configuration
            }
        }
        
        // If all configurations failed
        throw lastError || new Error('All email configurations failed');
        
    } catch (error) {
        console.error('❌ All email services failed:', error.message);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            command: error.command
        });
        
        // Enhanced backup logging - This is the working part!
        console.log(`\n🚨 ===== EMAIL SENDING FAILED - BACKUP LOG =====`);
        console.log(`📧 Recipient: ${email}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`👤 User Name: ${userName}`);
        console.log(`⏰ Generated at: ${new Date().toLocaleString()}`);
        console.log(`⏰ Expires in: 5 minutes`);
        console.log(`❌ Error: ${error.message}`);
        console.log(`🔧 Suggestion: Check Gmail App Password and 2FA settings`);
        console.log(`📋 Next Steps:`);
        console.log(`   1. Enable 2-Factor Authentication on Gmail`);
        console.log(`   2. Generate new App Password`);
        console.log(`   3. Update MAIL_PASS in .env file`);
        console.log(`   4. Restart the server`);
        console.log(`===============================================\n`);
        
        // Return success false but system continues to work
        return { success: false, error: error.message, otp: otp };
    }
}

// Test route
router.get("/test", (req, res) => {
    console.log("✅ Test route hit!");
    console.log("📧 MAIL_USER:", process.env.MAIL_USER);
    console.log("🔑 MAIL_PASS length:", process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 'undefined');
    res.json({ message: "Auth routes working!", timestamp: new Date() });
});

// Signup route
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password manually
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        user = new User({ 
            name, 
            email, 
            password: hashedPassword 
        });
        
        await user.save();

        // Create JWT token
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Create JWT token
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
    console.log("=== FORGOT PASSWORD ROUTE CALLED ===");
    try {
        console.log("🔐 Forgot password request received:", req.body);
        
        const { email } = req.body;
        if (!email) {
            console.log("❌ No email provided");
            return res.status(400).json({ message: "Email is required" });
        }

        console.log("🔍 Processing OTP request for email:", email);

        // Generate OTP for ANY email (don't check if user exists)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const resetToken = crypto.randomBytes(32).toString('hex');
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        console.log("🔐 Generated OTP:", otp);
        console.log("🔑 Generated Token:", resetToken);
        console.log("⏰ OTP expires at:", otpExpires);

        // Check if user exists to get their name, but don't require it
        let userName = "User";
        let user = await User.findOne({ email });
        
        if (user) {
            console.log("✅ Existing user found:", user.name);
            userName = user.name;
            
            // Save OTP to existing user
            user.resetOTP = otp;
            user.resetOTPExpires = otpExpires;
            user.resetToken = resetToken;
            await user.save();
            console.log("✅ OTP saved to existing user");
        } else {
            console.log("ℹ️ No existing user found, but sending OTP anyway");
            
            // Create a temporary user record for OTP tracking
            const tempUser = new User({
                name: "Temporary User",
                email: email,
                password: "temp_password_" + Date.now(), // Temporary password
                resetOTP: otp,
                resetOTPExpires: otpExpires,
                resetToken: resetToken,
                isTemporary: true // Flag to identify temporary users
            });
            
            try {
                await tempUser.save();
                console.log("✅ Temporary user created for OTP tracking");
            } catch (err) {
                console.log("⚠️ Could not create temp user (email might exist), continuing anyway");
            }
        }

        // Send email to ANY email address
        console.log("📧 Attempting to send email to:", email);
        const emailResult = await sendOTPEmail(email, otp, userName);
        console.log("📧 Email result:", emailResult);

        if (emailResult.success) {
            console.log("✅ Email sent successfully!");
            res.json({ 
                message: "OTP sent successfully to your email",
                token: resetToken,
                emailSent: true
            });
        } else {
            console.log("⚠️ Email sending failed, but OTP generated");
            res.json({ 
                message: "OTP generated successfully. Check server console for backup code.",
                token: resetToken,
                emailSent: false,
                emailError: emailResult.error
            });
        }

    } catch (err) {
        console.error("❌ Forgot password error:", err);
        res.status(500).json({ 
            message: "Server error", 
            error: err.message
        });
    }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
    try {
        console.log("🔍 Verify OTP request:", req.body);
        
        const { email, otp, token } = req.body;
        
        if (!email || !otp || !token) {
            return res.status(400).json({ message: "Email, OTP, and token are required" });
        }

        // Find user with matching email and token (works for both regular and temporary users)
        const user = await User.findOne({ 
            email,
            resetToken: token,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Verify OTP
        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        console.log("✅ OTP verified successfully for:", email);
        
        res.json({ 
            message: "OTP verified successfully",
            isTemporary: user.isTemporary || false
        });

    } catch (err) {
        console.error("❌ Verify OTP error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
    try {
        console.log("🔄 Reset password request:", req.body);
        
        const { email, newPassword, token } = req.body;
        
        if (!email || !newPassword || !token) {
            return res.status(400).json({ message: "Email, new password, and token are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Find user with matching email and token
        const user = await User.findOne({ 
            email,
            resetToken: token,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired reset token" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        if (user.isTemporary) {
            // Convert temporary user to real user
            console.log("🔄 Converting temporary user to real user");
            user.name = "New User"; // Default name, user can change later
            user.password = hashedPassword;
            user.isTemporary = false;
        } else {
            // Update existing user's password
            console.log("🔄 Updating existing user's password");
            user.password = hashedPassword;
        }
        
        // Clear reset fields
        user.resetOTP = null;
        user.resetOTPExpires = null;
        user.resetToken = null;

        await user.save();
        console.log("✅ Password reset successfully for:", email);

        res.json({ 
            message: "Password reset successfully",
            isNewUser: user.isTemporary === false && user.name === "New User"
        });

    } catch (err) {
        console.error("❌ Reset password error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;