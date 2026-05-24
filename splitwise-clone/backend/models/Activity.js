const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'expense_added',
      'expense_edited',
      'expense_deleted',
      'group_created',
      'group_deleted',
      'member_added',
      'member_removed',
      'settlement_made',
    ],
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  expense: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient querying
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);
