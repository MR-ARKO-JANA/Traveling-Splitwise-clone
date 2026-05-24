const asyncHandler = require('../utils/asyncHandler');
const groupService = require('../services/groupService');

exports.getGroups = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await groupService.getUserGroups(req.user.id, page, limit);
  res.json(result);
});

exports.createGroup = asyncHandler(async (req, res) => {
  const { name, description, emails } = req.body;
  const group = await groupService.createGroup(req.user.id, name, description, emails);
  res.status(201).json(group);
});

exports.addMember = asyncHandler(async (req, res) => {
  const { groupId, email } = req.body;
  const result = await groupService.addMember(groupId, email);
  res.json(result);
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const result = await groupService.deleteGroup(req.user.id, req.params.id);
  res.json(result);
});
