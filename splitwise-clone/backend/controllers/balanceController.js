const asyncHandler = require('../utils/asyncHandler');
const balanceService = require('../services/balanceService');

exports.getSummary = asyncHandler(async (req, res) => {
  const result = await balanceService.getBalanceSummary(req.user.id);
  res.json(result);
});

exports.getDetails = asyncHandler(async (req, res) => {
  const result = await balanceService.getBalanceDetails(req.user.id);
  res.json(result);
});

exports.settle = asyncHandler(async (req, res) => {
  const { withUserId, amount, note } = req.body;
  const result = await balanceService.recordSettlement(req.user.id, withUserId, amount, note);

  if (req.app.get('io')) req.app.get('io').emit('updateData');
  res.json(result);
});

exports.getSettlements = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await balanceService.getSettlements(req.user.id, page, limit);
  res.json(result);
});
