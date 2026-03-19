const Joi = require("joi");

// ─── Validation Schemas ───────────────────────────────────────────────────────

const schemas = {
    // Auth
    signup: Joi.object({
        name: Joi.string().trim().min(2).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(100).required()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    forgotPassword: Joi.object({
        email: Joi.string().email().required()
    }),

    resetPassword: Joi.object({
        email: Joi.string().email().required(),
        newPassword: Joi.string().min(6).max(100).required(),
        token: Joi.string().required()
    }),

    verifyOtp: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(6).required(),
        token: Joi.string().required()
    }),

    // Groups
    createGroup: Joi.object({
        name: Joi.string().trim().min(2).max(50).required(),
        description: Joi.string().trim().max(200).allow("", null),
        emails: Joi.array().items(Joi.string().email()).default([])
    }),

    addMember: Joi.object({
        groupId: Joi.string().required(),
        email: Joi.string().email().required()
    }),

    // Expenses
    createExpense: Joi.object({
        description: Joi.string().trim().min(1).max(200).required(),
        amount: Joi.number().positive().max(10000000).required(),
        groupId: Joi.string().required(),
        category: Joi.string().valid(
            "food", "transport", "accommodation", "entertainment",
            "utilities", "shopping", "health", "education", "other"
        ).default("other"),
        splitType: Joi.string().valid("equal", "exact", "percentage", "shares").default("equal"),
        splitDetails: Joi.array().items(Joi.object({
            user: Joi.string().required(),
            amount: Joi.number().min(0),
            percentage: Joi.number().min(0).max(100),
            shares: Joi.number().integer().min(1)
        })).default([]),
        notes: Joi.string().trim().max(500).allow("", null),
        currency: Joi.string().max(5).default("INR")
    }),

    // Settlements
    settle: Joi.object({
        withUserId: Joi.string().required(),
        amount: Joi.number().positive().required(),
        note: Joi.string().trim().max(200).allow("", null)
    })
};

// ─── Validation Middleware Factory ─────────────────────────────────────────────
function validate(schemaName) {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) return next();

        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const messages = error.details.map(d => d.message).join(", ");
            return res.status(400).json({
                message: "Validation failed",
                errors: messages
            });
        }

        req.body = value; // Use sanitized values
        next();
    };
}

module.exports = { validate, schemas };
