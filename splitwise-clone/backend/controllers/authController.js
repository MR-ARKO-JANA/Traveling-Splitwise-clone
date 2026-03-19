const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production";

const sendOTPEmail = async (email, otp, userName = "User") => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Password Reset Code',
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                    <div style="background: #667eea; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Password Reset</h1>
                    </div>
                    <div style="padding: 20px; background: white;">
                        <h2>Hi ${userName}!</h2>
                        <p>Your verification code is:</p>
                        <div style="background: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 15px; text-align: center; margin: 15px 0;">
                            <div style="font-size: 24px; font-weight: bold; color: #667eea;">${otp}</div>
                            <p style="margin: 5px 0 0 0; color: #666;">Expires in 5 minutes</p>
                        </div>
                        <p>If you didn't request this, ignore this email.</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email error:', error.message);
        return { success: false, error: error.message };
    }
};

exports.test = (req, res) => {
    res.json({ message: "Auth routes working", timestamp: new Date() });
};

exports.signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        user = new User({ 
            name, 
            email, 
            password: hashedPassword 
        });
        
        await user.save();

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const resetToken = crypto.randomBytes(32).toString('hex');
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        let userName = "User";
        let user = await User.findOne({ email });
        
        if (user) {
            userName = user.name;
            user.resetOTP = otp;
            user.resetOTPExpires = otpExpires;
            user.resetToken = resetToken;
            await user.save();
        } else {
            const tempUser = new User({
                name: "New User",
                email: email,
                password: "temp_password_" + Date.now(),
                resetOTP: otp,
                resetOTPExpires: otpExpires,
                resetToken: resetToken,
                isTemporary: true
            });
            
            try {
                await tempUser.save();
            } catch (err) {
                console.log("Could not create temp user");
            }
        }

        const emailResult = await sendOTPEmail(email, otp, userName);

        res.json({ 
            message: "OTP sent to your email",
            token: resetToken,
            emailSent: emailResult.success
        });

    } catch (err) {
        console.error("Forgot password error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, token } = req.body;
        
        if (!email || !otp || !token) {
            return res.status(400).json({ message: "Email, OTP, and token required" });
        }

        const user = await User.findOne({ 
            email,
            resetToken: token,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: "Incorrect OTP" });
        }
        
        res.json({ 
            message: "OTP verified successfully",
            isTemporary: user.isTemporary || false
        });

    } catch (err) {
        console.error("OTP verification error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, token } = req.body;
        
        if (!email || !newPassword || !token) {
            return res.status(400).json({ message: "All fields required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ 
            email,
            resetToken: token,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        if (user.isTemporary) {
            user.name = "New User";
            user.password = hashedPassword;
            user.isTemporary = false;
        } else {
            user.password = hashedPassword;
        }
        
        user.resetOTP = null;
        user.resetOTPExpires = null;
        user.resetToken = null;

        await user.save();

        res.json({ 
            message: "Password reset successfully"
        });

    } catch (err) {
        console.error("Password reset error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
