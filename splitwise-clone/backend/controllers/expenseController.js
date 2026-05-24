const asyncHandler = require('../utils/asyncHandler');
const expenseService = require('../services/expenseService');

exports.createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.user.id, req.body);

  if (req.app.get('io')) req.app.get('io').emit('updateData');
  res.status(201).json(expense);
});

exports.getGroupExpenses = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await expenseService.getGroupExpenses(req.params.groupId, page, limit);
  res.json(result);
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const result = await expenseService.deleteExpense(req.user.id, req.params.id);

  if (req.app.get('io')) req.app.get('io').emit('updateData');
  res.json(result);
});

exports.updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.user.id, req.params.id, req.body);

  if (req.app.get('io')) req.app.get('io').emit('updateData');
  res.json(expense);
});

exports.getUserExpenseHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate, page, limit } = req.query;
  const result = await expenseService.getUserExpenseHistory(req.user.id, {
    startDate,
    endDate,
    page,
    limit,
  });
  res.json(result);
});
