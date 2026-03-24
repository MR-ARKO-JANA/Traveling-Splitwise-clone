const Joi = require('joi');

const createExpense = Joi.object({
    description: Joi.string().required().min(2).max(200),
    amount: Joi.number().required().min(0.01),
    groupId: Joi.string().hex().length(24).required(),
    category: Joi.string().valid(
        "food", "transport", "accommodation", "entertainment",
        "utilities", "shopping", "health", "education", "other"
    ).optional(),
    splitType: Joi.string().valid("equal", "exact", "percentage", "shares").optional(),
    splitDetails: Joi.array().items(Joi.object({
        user: Joi.string().hex().length(24).required(),
        amount: Joi.number().min(0).optional(),
        percentage: Joi.number().min(0).max(100).optional(),
        shares: Joi.number().min(0).optional()
    })).optional(),
    notes: Joi.string().allow('', null).max(500).optional(),
    currency: Joi.string().max(3).optional()
});

const updateExpense = Joi.object({
    description: Joi.string().min(2).max(200).optional(),
    amount: Joi.number().min(0.01).optional(),
    category: Joi.string().valid(
        "food", "transport", "accommodation", "entertainment",
        "utilities", "shopping", "health", "education", "other"
    ).optional()
});

module.exports = {
    createExpense,
    updateExpense
};
