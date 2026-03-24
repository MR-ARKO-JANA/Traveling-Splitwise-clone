const Joi = require('joi');

const createGroup = Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().allow('', null).max(500),
    emails: Joi.array().items(Joi.string().email()).optional()
});

const addMember = Joi.object({
    groupId: Joi.string().hex().length(24).required(),
    email: Joi.string().email().required()
});

module.exports = {
    createGroup,
    addMember
};
