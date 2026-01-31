const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production";

const nodemailer = require("nodemailer");

// Professional OTP email sending function
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
                                We received a request to reset your password for your Splitwise Clone account. Use the verification code below to reset your password:
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
                            
                            <!-- Action Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                    🔐 Reset My Password
                                </a>
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
        console.log('📧 Sending email...');
        const info = await transporter.sendMail(mailOptions);
        
        console.log(`✅ OTP email sent successfully!`);
        console.log(`📧 To: ${email}`);
        console.log(`📧 Message ID: ${info.messageId}`);
        console.log(`📧 Response: ${info.response}`);
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            command: error.command
        });
        
        // Enhanced backup logging
        console.log(`\n🚨 ===== EMAIL SENDING FAILED - BACKUP LOG =====`);
        console.log(`📧 Recipient: ${email}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`⏰ Generated at: ${new Date().toLocaleString()}`);
        console.log(`⏰ Expires in: 5 minutes`);
        console.log(`❌ Error: ${error.message}`);
        console.log(`🔧 Suggestion: Check Gmail App Password and 2FA settings`);
        console.log(`===============================================\n`);
        
        return { success: false, error: error.message };
    }
}

// Test route
router.get("/test", (req, res) => {
    console.log("✅ Test route hit!");
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
    try {
        console.log("🔐 Forgot password request:", req.body);
        
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User with this email does not exist" });
        }

        console.log("✅ User found:", user.name);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const resetToken = crypto.randomBytes(32).toString('hex');
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        // Save OTP to user
        user.resetOTP = otp;
        user.resetOTPExpires = otpExpires;
        user.resetToken = resetToken;

        await user.save();
        console.log("✅ OTP saved to user");

        // Send email with user's name
        const emailResult = await sendOTPEmail(email, otp, user.name);

        if (emailResult.success) {
            res.json({ 
                message: "OTP sent successfully to your email",
                token: resetToken,
                emailSent: true
            });
        } else {
            // Even if email fails, still allow the process to continue
            // The OTP is logged to console as backup
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

        // Find user with matching email and token
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

        console.log("✅ OTP verified successfully");
        
        res.json({ message: "OTP verified successfully" });

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
        
        // Update password and clear reset fields
        user.password = hashedPassword;
        user.resetOTP = null;
        user.resetOTPExpires = null;
        user.resetToken = null;

        await user.save();
        console.log("✅ Password reset successfully");

        res.json({ message: "Password reset successfully" });

    } catch (err) {
        console.error("❌ Reset password error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;