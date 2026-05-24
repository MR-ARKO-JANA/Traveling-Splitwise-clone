const mongoose = require('mongoose');

const SplitDetailSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    shares: { type: Number, default: 1 },
    isPaid: { type: Boolean, default: false },
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: 'INR' },

  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },

  // Split configuration
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage', 'shares'],
    default: 'equal',
  },
  splitDetails: [SplitDetailSchema],

  // Categorization
  category: {
    type: String,
    enum: [
      'food',
      'transport',
      'accommodation',
      'entertainment',
      'utilities',
      'shopping',
      'health',
      'education',
      'other',
    ],
    default: 'other',
  },

  // Extras
  notes: { type: String, default: '', trim: true },
  receipt: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ─── Indexes for common query patterns ────────────────────────────────────────
ExpenseSchema.index({ paidBy: 1, createdAt: -1 });
ExpenseSchema.index({ splitWith: 1, createdAt: -1 });
ExpenseSchema.index({ group: 1, createdAt: -1 });

// Auto-update updatedAt on save
ExpenseSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Expense', ExpenseSchema);
