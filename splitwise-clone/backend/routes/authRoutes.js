const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middleware/validate");
const schemas = require("../validations/authValidation");

router.get("/test", authController.test);
router.post("/signup", validate(schemas.signup), authController.signup);
router.post("/login", validate(schemas.login), authController.login);
router.post("/forgot-password", validate(schemas.forgotPassword), authController.forgotPassword);
router.post("/verify-otp", validate(schemas.verifyOTP), authController.verifyOTP);
router.post("/reset-password", validate(schemas.resetPassword), authController.resetPassword);

module.exports = router;