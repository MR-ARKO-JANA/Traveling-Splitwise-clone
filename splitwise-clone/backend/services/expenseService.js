const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const { logActivity } = require('./activityService');
const cache = require('../config/redis');

async function invalidateBalanceCache(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  const promises = [];
  for (const id of userIds) {
    const idStr = id.toString();
    promises.push(cache.del(`balances:summary:${idStr}`));
    promises.push(cache.del(`balances:details:${idStr}`));
  }
  await Promise.all(promises);
}

/**
 * Create a new expense, automatically splitting across all group members.
 */
async function createExpense(userId, { description, amount, groupId, category }) {
  if (!description || !amount || !groupId) {
    const err = new Error('All fields are required');
    err.statusCode = 400;
    throw err;
  }

  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.statusCode = 404;
    throw err;
  }

  const users = await User.find({ email: { $in: group.members } });
  const splitWith = users.map((u) => u._id);

  // Always include the payer in the split
  if (!splitWith.some((id) => id.toString() === userId.toString())) {
    splitWith.push(userId);
  }

  const expense = new Expense({
    description,
    amount: parseFloat(amount),
    paidBy: userId,
    splitWith,
    group: groupId,
    category: category || 'other',
  });

  await expense.save();

  await logActivity('expense_added', userId, {
    groupId,
    expenseId: expense._id,
    description: `Added expense "${description}" — ₹${amount}`,
  });

  // Invalidate cache for payer and participants
  await invalidateBalanceCache(splitWith);

  return expense;
}

/**
 * Get paginated expenses for a group.
 */
async function getGroupExpenses(groupId, page = 1, limit = 20) {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const query = { group: groupId };

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .populate('paidBy', 'name email')
      .populate('splitWith', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Expense.countDocuments(query),
  ]);

  return {
    data: expenses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

/**
 * Delete an expense. Only the payer may delete.
 */
async function deleteExpense(userId, expenseId) {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }

  if (expense.paidBy.toString() !== userId) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  const desc = expense.description;
  const groupId = expense.group;
  const splitWith = expense.splitWith || [];

  await expense.deleteOne();

  await logActivity('expense_deleted', userId, {
    groupId,
    description: `Deleted expense "${desc}"`,
  });

  // Invalidate cache for all affected members
  await invalidateBalanceCache(splitWith);

  return { message: 'Expense removed' };
}

/**
 * Update an expense. Only the payer may update.
 */
async function updateExpense(userId, expenseId, { description, amount, category }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }

  if (expense.paidBy.toString() !== userId) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }

  expense.description = description || expense.description;
  expense.amount = amount ? parseFloat(amount) : expense.amount;
  expense.category = category || expense.category;

  await expense.save();

  await logActivity('expense_edited', userId, {
    groupId: expense.group,
    expenseId: expense._id,
    description: `Updated expense "${expense.description}"`,
  });

  // Invalidate cache for all affected members
  await invalidateBalanceCache(expense.splitWith);

  return expense;
}

/**
 * Get paginated expense history for a user, optionally filtered by date range.
 */
async function getUserExpenseHistory(userId, { startDate, endDate, page = 1, limit = 20 } = {}) {
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {
    $or: [{ paidBy: userId }, { splitWith: userId }],
  };

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const [expenses, total] = await Promise.all([
    Expense.find(query)
      .populate('paidBy', 'name email')
      .populate('splitWith', 'name email')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Expense.countDocuments(query),
  ]);

  return {
    data: expenses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

module.exports = {
  createExpense,
  getGroupExpenses,
  deleteExpense,
  updateExpense,
  getUserExpenseHistory,
};
