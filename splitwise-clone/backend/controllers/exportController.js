const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /api/export/csv/:groupId — Download group expenses as CSV.
 */
exports.downloadGroupCSV = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const currentUser = await User.findById(req.user.id);
  if (!currentUser || !group.members.includes(currentUser.email)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const expenses = await Expense.find({ group: groupId })
    .populate('paidBy', 'name email')
    .populate('splitWith', 'name email')
    .sort({ createdAt: -1 });

  const headers = [
    'Date',
    'Description',
    'Amount',
    'Currency',
    'Category',
    'Paid By',
    'Split Type',
    'Split With',
    'Notes',
  ];
  const rows = expenses.map((exp) => {
    const splitNames = (exp.splitWith || []).map((u) => u.name).join('; ');
    const date = new Date(exp.createdAt).toLocaleDateString();
    return [
      date,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount,
      exp.currency || 'INR',
      exp.category || 'other',
      exp.paidBy?.name || 'Unknown',
      exp.splitType || 'equal',
      `"${splitNames}"`,
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${group.name}_expenses.csv"`);
  res.send(csv);
});

/**
 * GET /api/export/csv/user/all — Download all user expenses as CSV.
 */
exports.downloadAllCSV = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const expenses = await Expense.find({
    $or: [{ paidBy: userId }, { splitWith: userId }],
  })
    .populate('paidBy', 'name email')
    .populate('splitWith', 'name email')
    .populate('group', 'name')
    .sort({ createdAt: -1 });

  const headers = [
    'Date',
    'Description',
    'Amount',
    'Currency',
    'Category',
    'Group',
    'Paid By',
    'Split Type',
    'Notes',
  ];
  const rows = expenses.map((exp) => {
    const date = new Date(exp.createdAt).toLocaleDateString();
    return [
      date,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.amount,
      exp.currency || 'INR',
      exp.category || 'other',
      exp.group?.name || 'Unknown',
      exp.paidBy?.name || 'Unknown',
      exp.splitType || 'equal',
      `"${(exp.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="all_expenses.csv"');
  res.send(csv);
});

/**
 * GET /api/export/pdf/user/all — Download all user expenses as PDF.
 */
exports.downloadAllPDF = asyncHandler(async (req, res) => {
  const PDFDocument = require('pdfkit');
  const userId = req.user.id;
  const user = await User.findById(userId);

  const expenses = await Expense.find({
    $or: [{ paidBy: userId }, { splitWith: userId }],
  })
    .populate('paidBy', 'name email')
    .sort({ createdAt: -1 });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="splitwise_statement.pdf"');
  doc.pipe(res);

  doc.fontSize(22).fillColor('#667eea').text('Splitwise Official Statement', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).fillColor('#000000').text(`Generated for: ${user.name} (${user.email})`);
  doc.text(`Date of Generation: ${new Date().toLocaleDateString()}`);
  doc.moveDown(2);

  // Header
  const tableTop = doc.y;
  doc.font('Helvetica-Bold');
  doc.text('Date', 50, tableTop);
  doc.text('Description', 150, tableTop);
  doc.text('Amount', 400, tableTop, { width: 90, align: 'right' });

  doc
    .moveTo(50, doc.y + 10)
    .lineTo(500, doc.y + 10)
    .stroke();
  doc.moveDown();

  doc.font('Helvetica');
  let y = doc.y + 10;

  expenses.forEach((exp) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    const date = new Date(exp.createdAt).toLocaleDateString();
    const sign = exp.paidBy._id.toString() === userId ? '+' : '-';
    const color = sign === '+' ? 'green' : 'red';

    doc.fillColor('black').text(date, 50, y);
    doc.text(exp.description, 150, y, { width: 240, height: 15, ellipsis: true });
    doc.fillColor(color).text(`${sign} ₹${exp.amount}`, 400, y, { width: 90, align: 'right' });
    y += 25;
  });

  doc.end();
});
