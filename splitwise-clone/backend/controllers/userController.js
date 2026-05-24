const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');

exports.getPassport = asyncHandler(async (req, res) => {
  const result = await userService.getPassport(req.user.id);
  res.json(result);
});

exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const User = require('../models/User');
  const imageUrl = `/uploads/profiles/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.id, { profileImage: imageUrl });

  res.json({ message: 'Profile image updated successfully', imageUrl });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const result = await userService.updateProfile(req.user.id, req.body);
  res.json(result);
});

exports.getActivity = asyncHandler(async (req, res) => {
  const result = await userService.getRecentActivity(req.user.id);
  res.json(result);
});
