const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    splitWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
