const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((detail) => detail.message);
    const errorMessages = errors.join(', ');
    return res.status(400).json({ success: false, message: errorMessages, errors });
  }
  next();
};

module.exports = validate;
