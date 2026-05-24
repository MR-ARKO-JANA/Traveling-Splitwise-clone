const asyncHandler = require('../utils/asyncHandler');
const activityService = require('../services/activityService');

/**
 * GET /api/activity — Recent activity feed for the logged-in user.
 */
exports.getUserFeed = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await activityService.getUserFeed(req.user.id, page, limit);
  res.json(result);
});

/**
 * GET /api/activity/group/:groupId — Activity within a specific group.
 */
exports.getGroupFeed = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await activityService.getGroupFeed(req.params.groupId, page, limit);
  res.json(result);
});
