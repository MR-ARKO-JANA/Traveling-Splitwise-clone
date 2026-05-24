const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const { logActivity } = require('./activityService');

/**
 * Get balance summary (total to get, total to pay, net) using MongoDB aggregation.
 * This replaces the old in-memory forEach approach, which loaded ALL expenses into RAM.
 */
async function getBalanceSummary(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // ── Step 1: Expense-based balances via aggregation ──────────────────────────
  const expenseBalances = await Expense.aggregate([
    // Match expenses where user is payer or participant
    { $match: { $or: [{ paidBy: userObjectId }, { splitWith: userObjectId }] } },

    // Compute per-person split amount
    {
      $project: {
        paidBy: 1,
        splitWith: 1,
        amount: 1,
        splitCount: { $size: '$splitWith' },
        perPersonAmount: {
          $cond: {
            if: { $gt: [{ $size: '$splitWith' }, 0] },
            then: { $divide: ['$amount', { $size: '$splitWith' }] },
            else: '$amount',
          },
        },
      },
    },

    // Unwind to get one row per split member
    { $unwind: '$splitWith' },

    // Only keep rows involving the current user (as payer or as debtor)
    {
      $match: {
        $or: [
          { paidBy: userObjectId, splitWith: { $ne: userObjectId } },
          { paidBy: { $ne: userObjectId }, splitWith: userObjectId },
        ],
      },
    },

    // Calculate direction: positive = someone owes us, negative = we owe someone
    {
      $project: {
        otherUser: {
          $cond: {
            if: { $eq: ['$paidBy', userObjectId] },
            then: '$splitWith',
            else: '$paidBy',
          },
        },
        balanceChange: {
          $cond: {
            if: { $eq: ['$paidBy', userObjectId] },
            then: '$perPersonAmount', // they owe us
            else: { $multiply: ['$perPersonAmount', -1] }, // we owe them
          },
        },
      },
    },

    // Group by the other user to get net balance per person
    {
      $group: {
        _id: '$otherUser',
        balance: { $sum: '$balanceChange' },
      },
    },
  ]);

  // ── Step 2: Settlement adjustments via aggregation ───────────────────────────
  const settlementBalances = await Settlement.aggregate([
    { $match: { $or: [{ from: userObjectId }, { to: userObjectId }] } },
    {
      $project: {
        otherUser: {
          $cond: {
            if: { $eq: ['$from', userObjectId] },
            then: '$to',
            else: '$from',
          },
        },
        balanceChange: {
          $cond: {
            if: { $eq: ['$from', userObjectId] },
            then: '$amount', // we paid them, net moves positive
            else: { $multiply: ['$amount', -1] }, // they paid us
          },
        },
      },
    },
    {
      $group: {
        _id: '$otherUser',
        balance: { $sum: '$balanceChange' },
      },
    },
  ]);

  // ── Step 3: Merge expense + settlement balances ─────────────────────────────
  const mergedMap = {};
  for (const entry of expenseBalances) {
    mergedMap[entry._id.toString()] = (mergedMap[entry._id.toString()] || 0) + entry.balance;
  }
  for (const entry of settlementBalances) {
    mergedMap[entry._id.toString()] = (mergedMap[entry._id.toString()] || 0) + entry.balance;
  }

  let totalToGet = 0;
  let totalToPay = 0;
  for (const bal of Object.values(mergedMap)) {
    if (bal > 0) totalToGet += bal;
    else if (bal < 0) totalToPay += Math.abs(bal);
  }

  return {
    get: totalToGet.toFixed(2),
    pay: totalToPay.toFixed(2),
    total: (totalToGet - totalToPay).toFixed(2),
  };
}

/**
 * Get detailed per-person balance breakdown.
 * Uses populate for name/email display but still leverages lean queries.
 */
async function getBalanceDetails(userId) {
  const [expenses, settlements] = await Promise.all([
    Expense.find({
      $or: [{ paidBy: userId }, { splitWith: userId }],
    })
      .populate('paidBy splitWith')
      .lean(),
    Settlement.find({
      $or: [{ from: userId }, { to: userId }],
    })
      .populate('from to')
      .lean(),
  ]);

  const balanceMap = {};

  for (const exp of expenses) {
    const splitAmount = exp.amount / (exp.splitWith.length || 1);

    if (exp.paidBy._id.toString() === userId.toString()) {
      for (const member of exp.splitWith) {
        if (member._id.toString() !== userId.toString()) {
          const memberId = member._id.toString();
          if (!balanceMap[memberId]) {
            balanceMap[memberId] = {
              name: member.name,
              email: member.email,
              balance: 0,
              expenses: [],
              settlements: [],
            };
          }
          balanceMap[memberId].balance += splitAmount;
          balanceMap[memberId].expenses.push({
            description: exp.description,
            amount: splitAmount,
            date: exp.createdAt,
          });
        }
      }
    } else if (exp.splitWith.some((m) => m._id.toString() === userId.toString())) {
      const payerId = exp.paidBy._id.toString();
      if (!balanceMap[payerId]) {
        balanceMap[payerId] = {
          name: exp.paidBy.name,
          email: exp.paidBy.email,
          balance: 0,
          expenses: [],
          settlements: [],
        };
      }
      balanceMap[payerId].balance -= splitAmount;
      balanceMap[payerId].expenses.push({
        description: exp.description,
        amount: -splitAmount,
        date: exp.createdAt,
      });
    }
  }

  for (const s of settlements) {
    const otherUser = s.from._id.toString() === userId.toString() ? s.to : s.from;
    const otherUserId = otherUser._id.toString();

    if (!balanceMap[otherUserId]) {
      balanceMap[otherUserId] = {
        name: otherUser.name,
        email: otherUser.email,
        balance: 0,
        expenses: [],
        settlements: [],
      };
    }

    if (s.from._id.toString() === userId.toString()) {
      balanceMap[otherUserId].balance += s.amount;
      balanceMap[otherUserId].settlements.push({
        note: s.note,
        amount: s.amount,
        type: 'sent',
        date: s.settledAt,
      });
    } else {
      balanceMap[otherUserId].balance -= s.amount;
      balanceMap[otherUserId].settlements.push({
        note: s.note,
        amount: s.amount,
        type: 'received',
        date: s.settledAt,
      });
    }
  }

  // Filter out zero-balance entries
  const result = {};
  for (const [key, val] of Object.entries(balanceMap)) {
    if (Math.abs(val.balance) > 0.01) {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Record a settlement between two users.
 */
async function recordSettlement(userId, withUserId, amount, note) {
  if (!withUserId || !amount) {
    const err = new Error('User ID and amount are required');
    err.statusCode = 400;
    throw err;
  }

  const [currentUser, otherUser] = await Promise.all([
    User.findById(userId),
    User.findById(withUserId),
  ]);

  if (!currentUser || !otherUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const settlement = new Settlement({
    from: userId,
    to: withUserId,
    amount: parseFloat(amount),
    note: note || `Settlement between ${currentUser.name} and ${otherUser.name}`,
    status: 'completed',
    settledAt: new Date(),
  });

  await settlement.save();

  await logActivity('settlement_made', userId, {
    description: `Settled ₹${amount} with ${otherUser.name}`,
  });

  return {
    message: 'Settlement recorded successfully',
    settlement: {
      id: settlement._id,
      amount: settlement.amount,
      from: currentUser.name,
      to: otherUser.name,
      date: settlement.settledAt,
    },
  };
}

/**
 * Get paginated settlements for a user.
 */
async function getSettlements(userId, page = 1, limit = 20) {
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = {
    $or: [{ from: userId }, { to: userId }],
  };

  const [settlements, total] = await Promise.all([
    Settlement.find(query)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .sort({ settledAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    Settlement.countDocuments(query),
  ]);

  return {
    data: settlements,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

module.exports = {
  getBalanceSummary,
  getBalanceDetails,
  recordSettlement,
  getSettlements,
};
