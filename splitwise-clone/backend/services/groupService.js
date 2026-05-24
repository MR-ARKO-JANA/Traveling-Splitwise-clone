const Group = require('../models/Group');
const User = require('../models/User');
const Expense = require('../models/Expense');
const { logActivity } = require('./activityService');

/**
 * Get paginated groups for a user.
 */
async function getUserGroups(userId, page = 1, limit = 20) {
  const user = await User.findById(userId);
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {
    $or: [{ members: user.email }, { createdBy: userId }],
  };

  const [groups, total] = await Promise.all([
    Group.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    Group.countDocuments(query),
  ]);

  return {
    data: groups,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

/**
 * Create a new group, ensuring the creator is included in the members list.
 */
async function createGroup(userId, name, description, emails = []) {
  if (!name) {
    const err = new Error('Group name is required');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  const members = [...emails];
  if (!members.includes(user.email)) {
    members.push(user.email);
  }

  const group = new Group({ name, description, members, createdBy: userId });
  await group.save();

  await logActivity('group_created', userId, {
    groupId: group._id,
    description: `Created group "${name}"`,
  });

  return group;
}

/**
 * Add a member (by email) to a group.
 */
async function addMember(groupId, email) {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.statusCode = 404;
    throw err;
  }

  if (group.members.includes(email)) {
    const err = new Error('User already in group');
    err.statusCode = 400;
    throw err;
  }

  group.members.push(email);
  await group.save();

  // Try to resolve the user ID for activity logging
  const addedUser = await User.findOne({ email });
  await logActivity('member_added', addedUser ? addedUser._id : group.createdBy, {
    groupId: group._id,
    description: `${email} was added to "${group.name}"`,
  });

  return { message: 'Member added successfully', members: group.members };
}

/**
 * Delete a group and cascade-delete its expenses.
 * Only the creator may delete.
 */
async function deleteGroup(userId, groupId) {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.statusCode = 404;
    throw err;
  }

  if (group.createdBy.toString() !== userId) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  const groupName = group.name;
  await group.deleteOne();
  await Expense.deleteMany({ group: groupId });

  await logActivity('group_deleted', userId, {
    description: `Deleted group "${groupName}"`,
  });

  return { message: 'Group and its expenses removed' };
}

module.exports = { getUserGroups, createGroup, addMember, deleteGroup };
