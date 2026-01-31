const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../models/User");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production";
const nodemailer = require("nodemailer");

// Let's send some emails! This function tries different ways to make sure your OTP gets delivered
async function sendOTPEmail(email, otp, userName = "User") {
    try {
        console.log(`📧 Alright, sending OTP to: ${email}`);
        console.log(`🔐 The magic code is: ${otp}`);
        console.log(`📧 Using our email: ${process.env.MAIL_USER}`);
        
        // We'll try a few different email setups, just in case one doesn't work
        const emailOptions = [
            // First try Gmail - usually works great
            {
                name: 'Gmail',
                service: 'gmail',
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            },
            // If Gmail acts up, let's try Outlook
            {
                name: 'Outlook',
                host: 'smtp-mail.outlook.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS
                }
            }
        ];

        let lastError = null;
        
        // Let's try each option until one works
        for (const config of emailOptions) {
            try {
                console.log(`🔄 Trying ${config.name}...`);
                
                const transporter = nodemailer.createTransport(config);

                // Quick connection test
                await transporter.verify();
                console.log(`✅ ${config.name} is ready to go!`);

                // Now for the fancy email template
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
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">🔐 Password Reset</h1>
                                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Splitwise Clone Security</p>
                                </div>
                                
                                <div style="padding: 40px 30px;">
                                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Hey ${userName}!</h2>
                                    
                                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                        Someone (hopefully you!) requested a password reset for your Splitwise Clone account. Here's your verification code:
                                    </p>
                                    
                                    <div style="background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%); border: 2px solid #667eea; border-radius: 15px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);">
                                        <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Secret Code</p>
                                        <div style="color: #667eea; font-size: 48px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace; margin: 15px 0; text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);">
                                            ${otp}
                                        </div>
                                        <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">⏰ This code expires in 5 minutes</p>
                                    </div>
                                    
                                    <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                        <h3 style="color: #f57c00; margin: 0 0 15px 0; font-size: 16px;">⚠️ Quick heads up</h3>
                                        <ul style="color: #666666; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                                            <li>Pop this code into the password reset page</li>
                                            <li>You've got <strong>5 minutes</strong> before it expires</li>
                                            <li>Keep this code to yourself</li>
                                            <li>If you didn't ask for this, just ignore this email</li>
                                        </ul>
                                    </div>
                                    
                                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                                        Having trouble? Drop us a line or try requesting a new code.
                                    </p>
                                </div>
                                
                                <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                    <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                                        This is an automated message from Splitwise Clone
                                    </p>
                                    <p style="color: #999999; font-size: 12px; margin: 0;">
                                        📧 ${email} | 🕒 ${new Date().toLocaleString()}
                                    </p>
                                    <p style="color: #999999; font-size: 11px; margin: 10px 0 0 0;">
                                        Please don't reply to this email
                                    </p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                };

                // Send it off!
                console.log(`📧 Sending via ${config.name}...`);
                const info = await transporter.sendMail(mailOptions);
                
                console.log(`🎉 Success! Email sent via ${config.name}`);
                console.log(`📧 Delivered to: ${email}`);
                console.log(`📧 Message ID: ${info.messageId}`);
                console.log(`📧 Server response: ${info.response}`);
                
                return { success: true, messageId: info.messageId, service: config.name };
                
            } catch (configError) {
                console.log(`😅 ${config.name} didn't work: ${configError.message}`);
                lastError = configError;
                continue;
            }
        }
        
        // If we get here, nothing worked
        throw lastError || new Error('All email services failed');
        
    } catch (error) {
        console.error('😞 Uh oh, email sending failed:', error.message);
        
        // Don't worry, we'll log it as backup
        console.log(`\n🚨 ===== EMAIL FAILED - BUT WE GOT YOU COVERED =====`);
        console.log(`📧 Recipient: ${email}`);
        console.log(`🔐 OTP Code: ${otp}`);
        console.log(`👤 User Name: ${userName}`);
        console.log(`⏰ Generated at: ${new Date().toLocaleString()}`);
        console.log(`⏰ Expires in: 5 minutes`);
        console.log(`❌ What went wrong: ${error.message}`);
        console.log(`===============================================\n`);
        
        return { success: false, error: error.message, otp: otp };
    }
}

// Just a quick test to see if everything's working
router.get("/test", (req, res) => {
    console.log("👋 Hey there! Test route is working");
    console.log("📧 Email setup:", process.env.MAIL_USER);
    console.log("🔑 Password length:", process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 'Oops, no password set');
    res.json({ message: "All good! Auth routes are up and running", timestamp: new Date() });
});

// Welcome new users! Let's get them signed up
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Let's see if this email is already taken
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "Looks like someone already has that email!" });
        }

        // Time to hash that password for security
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create the new user
        user = new User({ 
            name, 
            email, 
            password: hashedPassword 
        });
        
        await user.save();

        // Give them a shiny new token
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token });
    } catch (err) {
        console.error("Oops, signup hit a snag:", err);
        res.status(500).json({ message: "Something went wrong on our end" });
    }
});

// Time to log in! Let's check those credentials
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Do we know this person?
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Hmm, we don't recognize those credentials" });
        }

        // Let's check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Hmm, we don't recognize those credentials" });
        }

        // All good! Here's your access token
        const payload = { user: { id: user.id } };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
        
        res.json({ token });
    } catch (err) {
        console.error("Login trouble:", err);
        res.status(500).json({ message: "Something went wrong on our end" });
    }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
    console.log("=== Someone wants to reset their password ===");
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "We need an email address!" });
        }

        // Generate OTP for ANY email
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const resetToken = crypto.randomBytes(32).toString('hex');
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        console.log("🔐 Generated OTP:", otp);

        // Check if user exists to get their name
        let userName = "User";
        let user = await User.findOne({ email });
        
        if (user) {
            console.log("✅ Found existing user:", user.name);
            userName = user.name;
            user.resetOTP = otp;
            user.resetOTPExpires = otpExpires;
            user.resetToken = resetToken;
            await user.save();
        } else {
            console.log("ℹ️ New email, creating temp user");
            const tempUser = new User({
                name: "Temporary User",
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
                console.log("⚠️ Couldn't create temp user, continuing anyway");
            }
        }

        // Send email
        const emailResult = await sendOTPEmail(email, otp, userName);

        if (emailResult.success) {
            res.json({ 
                message: "OTP sent successfully to your email",
                token: resetToken,
                emailSent: true
            });
        } else {
            res.json({ 
                message: "OTP generated successfully. Check server console for backup code.",
                token: resetToken,
                emailSent: false,
                emailError: emailResult.error
            });
        }

    } catch (err) {
        console.error("❌ Forgot password hit a snag:", err);
        res.status(500).json({ message: "Something went wrong on our end" });
    }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp, token } = req.body;
        
        if (!email || !otp || !token) {
            return res.status(400).json({ message: "We need email, OTP, and token!" });
        }

        const user = await User.findOne({ 
            email,
            resetToken: token,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "That OTP has expired or isn't valid" });
        }

        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: "That OTP doesn't match what we sent" });
        }

        console.log("✅ OTP verified successfully for:", email);
        
        res.json({ 
            message: "OTP verified successfully",
            isTemporary: user.isTemporary || false
        });

    } catch (err) {
        console.error("❌ OTP verification trouble:", err);
        res.status(500).json({ message: "Something went wrong on our end" });
    }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
    try {
        const { email, newPassword, token } = req.body;
        
        if (!email || !newPassword || !token) {
            return res.status(400).json({ message: "We need email, new password, and token!" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password needs to be at least 6 characters" });
        }

        const user = await User.findOne({ 
            email,
            resetToken: token,
            resetOTPExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "That reset token has expired or isn't valid" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        if (user.isTemporary) {
            user.name = "New User";
            user.password = hashedPassword;
            user.isTemporary = false;
        } else {
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
        console.error("❌ Password reset trouble:", err);
        res.status(500).json({ message: "Something went wrong on our end" });
    }
});

module.exports = router;