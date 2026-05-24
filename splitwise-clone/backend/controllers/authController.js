const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');

exports.test = (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date() });
};

exports.signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, token } = await authService.registerUser(name, email, password);

  res.cookie('token', token, authService.cookieOptions()).json({ success: true, user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { token } = await authService.loginUser(email, password);

  res.cookie('token', token, authService.cookieOptions()).json({ success: true, token });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { resetToken, emailSent } = await authService.sendPasswordResetOTP(email);

  res.json({ message: 'OTP sent to your email', token: resetToken, emailSent });
});

exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp, token } = req.body;
  const { isTemporary } = await authService.verifyOTP(email, otp, token);

  res.json({ message: 'OTP verified successfully', isTemporary });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword, token } = req.body;
  await authService.resetPassword(email, newPassword, token);

  res.json({ message: 'Password reset successfully' });
});
