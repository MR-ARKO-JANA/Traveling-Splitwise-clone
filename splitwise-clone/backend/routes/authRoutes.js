const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production";

const nodemailer = require("nodemailer");

// Real email sending function
async function sendOTPEmail(email, otp) {
    try {
        // Create transporter
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        // Email options
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: '🔐 Password Reset OTP - Splitwise Clone',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 10px; text-align: center; color: white;">
                        <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px;">Splitwise Clone</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-top: 0;">Your OTP Code</h2>
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            You requested a password reset for your Splitwise Clone account. Use the OTP code below to reset your password:
                        </p>
                        
                        <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                            <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                                ${otp}
                            </h1>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            <strong>⏰ This OTP will expire in 5 minutes.</strong><br>
                            If you didn't request this password reset, please ignore this email.
                        </p>
                        
                        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                This is an automated email from Splitwise Clone. Please do not reply to this email.
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        // Send email
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

        // Send email
        await sendOTPEmail(email, otp);

        res.json({ 
            message: "OTP sent successfully to your email",
            token: resetToken
        });

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