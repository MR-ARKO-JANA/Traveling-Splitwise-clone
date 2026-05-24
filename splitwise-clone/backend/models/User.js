const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImage: { type: String, default: null },

    // OTP fields for password reset
    resetOTP: { type: String, default: null },
    resetOTPExpires: { type: Date, default: null },
    resetToken: { type: String, default: null },

    // Flag for temporary users (for OTP to any email)
    isTemporary: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// NO PRE-SAVE MIDDLEWARE - Handle password hashing manually in routes

module.exports = mongoose.model('User', UserSchema);
