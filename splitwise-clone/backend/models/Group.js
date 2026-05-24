const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,

    // Members as string names/emails
    members: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes for common query patterns ────────────────────────────────────────
GroupSchema.index({ members: 1 });
GroupSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Group', GroupSchema);
