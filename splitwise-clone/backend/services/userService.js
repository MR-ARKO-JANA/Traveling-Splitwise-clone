const mongoose = require('mongoose');
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Get the user's "passport" — profile info, stats, and net balance.
 * Uses aggregation pipeline for balance instead of loading all expenses.
 */
async function getPassport(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(userId).select('-password');
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const [groupCount, expenseCount] = await Promise.all([
    Group.countDocuments({ members: user.email }).maxTimeMS(5000),
    Expense.countDocuments({ paidBy: userId }).maxTimeMS(5000),
  ]);

  // ── Net balance via aggregation ─────────────────────────────────────────────
  let netBalance = 0;
  try {
    const expenseAgg = await Expense.aggregate([
      { $match: { $or: [{ paidBy: userObjectId }, { splitWith: userObjectId }] } },
      {
        $project: {
          paidBy: 1,
          splitWith: 1,
          amount: 1,
          splitCount: { $size: '$splitWith' },
          perPerson: {
            $cond: {
              if: { $gt: [{ $size: '$splitWith' }, 0] },
              then: { $divide: ['$amount', { $size: '$splitWith' }] },
              else: '$amount',
            },
          },
        },
      },
      {
        $project: {
          netContribution: {
            $cond: {
              if: { $eq: ['$paidBy', userObjectId] },
              then: { $subtract: ['$amount', '$perPerson'] }, // paid full, owe only my share
              else: { $multiply: ['$perPerson', -1] }, // owe my share
            },
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$netContribution' } } },
    ]).option({ maxTimeMS: 5000 });

    if (expenseAgg.length > 0) netBalance = expenseAgg[0].total;

    const settlementAgg = await Settlement.aggregate([
      { $match: { $or: [{ from: userObjectId }, { to: userObjectId }] } },
      {
        $project: {
          contribution: {
            $cond: {
              if: { $eq: ['$from', userObjectId] },
              then: '$amount',
              else: { $multiply: ['$amount', -1] },
            },
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$contribution' } } },
    ]).option({ maxTimeMS: 5000 });

    if (settlementAgg.length > 0) netBalance += settlementAgg[0].total;
  } catch (balanceError) {
    logger.error('Balance calculation error', balanceError);
  }

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    },
    stats: {
      groups: groupCount || 0,
      expenses: expenseCount || 0,
      settlements: 0,
    },
    netBalance: netBalance.toFixed(2),
  };
}

/**
 * Update user profile (name, email, password).
 */
async function updateProfile(userId, { name, email, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (newPassword || (email && email !== user.email)) {
    if (!currentPassword) {
      const err = new Error('Current password required');
      err.statusCode = 400;
      throw err;
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const err = new Error('Current password is incorrect');
      err.statusCode = 400;
      throw err;
    }

    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        const err = new Error('Email already in use');
        err.statusCode = 400;
        throw err;
      }
      user.email = email;
    }
  }

  if (name) user.name = name;
  await user.save();

  return {
    message: 'Profile updated successfully',
    user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage },
  };
}

/**
 * Get recent activity (expenses) for a user.
 */
async function getRecentActivity(userId) {
  const recentExpenses = await Expense.find({
    $or: [{ paidBy: userId }, { splitWith: userId }],
  })
    .populate('paidBy', 'name email')
    .populate('splitWith', 'name email')
    .sort({ createdAt: -1 })
    .limit(20);

  return { recentExpenses };
}

module.exports = { getPassport, updateProfile, getRecentActivity };
