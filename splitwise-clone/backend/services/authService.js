const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generate a signed JWT for the given user ID.
 */
function generateJWT(userId) {
  return jwt.sign({ user: { id: userId } }, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Build the standard cookie options object.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  };
}

/**
 * Register a new user.
 * @returns {{ user: Object, token: string }}
 */
async function registerUser(name, email, password) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('User already exists');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();

  const token = generateJWT(user.id);
  return {
    user: { id: user.id, name: user.name, email: user.email, profileImage: user.profileImage },
    token,
  };
}

/**
 * Authenticate an existing user.
 * @returns {{ user: Object, token: string }}
 */
async function loginUser(email, password) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid credentials');
    err.statusCode = 400;
    throw err;
  }

  const token = generateJWT(user.id);
  return { user, token };
}

/**
 * Send a password-reset OTP to the given email.
 */
async function sendPasswordResetOTP(email) {
  if (!email) {
    const err = new Error('Email is required');
    err.statusCode = 400;
    throw err;
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const resetToken = crypto.randomBytes(32).toString('hex');
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  let userName = 'User';
  let user = await User.findOne({ email });

  if (user) {
    userName = user.name;
    user.resetOTP = otp;
    user.resetOTPExpires = otpExpires;
    user.resetToken = resetToken;
    await user.save();
  } else {
    const tempUser = new User({
      name: 'New User',
      email,
      password: 'temp_password_' + Date.now(),
      resetOTP: otp,
      resetOTPExpires: otpExpires,
      resetToken: resetToken,
      isTemporary: true,
    });
    try {
      await tempUser.save();
    } catch (err) {
      logger.error('Could not create temp user', err);
    }
  }

  const emailResult = await _sendOTPEmail(email, otp, userName);

  return { resetToken, emailSent: emailResult.success };
}

/**
 * Verify an OTP for password reset.
 */
async function verifyOTP(email, otp, token) {
  if (!email || !otp || !token) {
    const err = new Error('Email, OTP, and token required');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    email,
    resetToken: token,
    resetOTPExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error('Invalid or expired OTP');
    err.statusCode = 400;
    throw err;
  }

  if (user.resetOTP !== otp) {
    const err = new Error('Incorrect OTP');
    err.statusCode = 400;
    throw err;
  }

  return { isTemporary: user.isTemporary || false };
}

/**
 * Reset a user's password after OTP verification.
 */
async function resetPassword(email, newPassword, token) {
  if (!email || !newPassword || !token) {
    const err = new Error('All fields required');
    err.statusCode = 400;
    throw err;
  }

  if (newPassword.length < 6) {
    const err = new Error('Password must be at least 6 characters');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({
    email,
    resetToken: token,
    resetOTPExpires: { $gt: Date.now() },
  });

  if (!user) {
    const err = new Error('Invalid or expired token');
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (user.isTemporary) {
    user.name = 'New User';
    user.password = hashedPassword;
    user.isTemporary = false;
  } else {
    user.password = hashedPassword;
  }

  user.resetOTP = null;
  user.resetOTPExpires = null;
  user.resetToken = null;

  await user.save();
}

// ── Private helper ─────────────────────────────────────────────────────────────

async function _sendOTPEmail(email, otp, userName = 'User') {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
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
            `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    logger.error('Email error', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  generateJWT,
  cookieOptions,
  registerUser,
  loginUser,
  sendPasswordResetOTP,
  verifyOTP,
  resetPassword,
};
