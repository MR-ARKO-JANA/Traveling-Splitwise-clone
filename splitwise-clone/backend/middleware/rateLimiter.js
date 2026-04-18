const rateLimit = require("express-rate-limit");

// General API limiter — 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests, please try again after 15 minutes"
    }
});

// Strict limiter for auth routes — 20 requests per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts, please try again after 15 minutes"
    }
});

// Password reset limiter — 5 requests per 15 minutes
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many password reset attempts, please try again later"
    }
});

module.exports = { apiLimiter, authLimiter, passwordResetLimiter };
