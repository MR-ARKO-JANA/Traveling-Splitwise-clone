const Activity = require('../models/Activity');
const Group = require('../models/Group');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Log an activity event.
 * Fire-and-forget — errors are caught and logged, never thrown,
 * so a failed log can never break a business operation.
 */
async function logActivity(
  type,
  userId,
  { groupId = null, expenseId = null, description, metadata = {} } = {}
) {
  try {
    await Activity.create({
      type,
      user: userId,
      group: groupId,
      expense: expenseId,
      description,
      metadata,
    });
  } catch (err) {
    logger.error('Activity log error', err);
  }
}

/**
 * Get paginated activity feed for a user (their own actions + actions in their groups).
 */
async function getUserFeed(userId, page = 1, limit = 30) {
  const currentUser = await User.findById(userId);
  if (!currentUser) return { activities: [], totalPages: 0, currentPage: 1, total: 0 };

  const userGroups = await Group.find({ members: currentUser.email });
  const groupIds = userGroups.map((g) => g._id);

  const query = {
    $or: [{ user: userId }, { group: { $in: groupIds } }],
  };

  const [activities, total] = await Promise.all([
    Activity.find(query)
      .populate('user', 'name email profileImage')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Activity.countDocuments(query),
  ]);

  return {
    activities,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total,
  };
}

/**
 * Get paginated activity feed for a specific group.
 */
async function getGroupFeed(groupId, page = 1, limit = 30) {
  const [activities, total] = await Promise.all([
    Activity.find({ group: groupId })
      .populate('user', 'name email profileImage')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Activity.countDocuments({ group: groupId }),
  ]);

  return {
    activities,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    total,
  };
}

module.exports = { logActivity, getUserFeed, getGroupFeed };
