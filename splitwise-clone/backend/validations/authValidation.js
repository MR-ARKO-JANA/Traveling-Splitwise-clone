const Joi = require('joi');

const signup = Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6)
});

const login = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const forgotPassword = Joi.object({
    email: Joi.string().email().required()
});

const verifyOTP = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().required().length(6),
    token: Joi.string().required() // Reset token
});

const resetPassword = Joi.object({
    email: Joi.string().email().required(),
    newPassword: Joi.string().required().min(6),
    token: Joi.string().required()
});

module.exports = {
    signup,
    login,
    forgotPassword,
    verifyOTP,
    resetPassword
};
