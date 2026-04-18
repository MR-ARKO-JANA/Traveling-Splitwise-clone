const Expense = require("../models/Expense");
const Group = require("../models/Group");
const asyncHandler = require("../utils/asyncHandler");

exports.createExpense = asyncHandler(async (req, res) => {
    const { description, amount, groupId, category } = req.body;
    const userId = req.user.id;

    if (!description || !amount || !groupId) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
        return res.status(404).json({ message: "Group not found" });
    }

    const User = require("../models/User");
    const users = await User.find({ email: { $in: group.members } });
    const splitWith = users.map(u => u._id);
    
    // Always include the payer in the split
    if (!splitWith.some(id => id.toString() === userId.toString())) {
        splitWith.push(userId);
    }

    const expense = new Expense({
        description,
        amount: parseFloat(amount),
        paidBy: userId,
        splitWith,
        group: groupId,
        category: category || "other"
    });

    await expense.save();
    if (req.app.get("io")) req.app.get("io").emit("updateData");
    res.status(201).json(expense);
});

exports.getGroupExpenses = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { group: req.params.groupId };

    const [expenses, total] = await Promise.all([
        Expense.find(query)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Expense.countDocuments(query)
    ]);

    res.json({
        data: expenses,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
});

exports.deleteExpense = asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
    }

    if (expense.paidBy.toString() !== req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    await expense.deleteOne();
    if (req.app.get("io")) req.app.get("io").emit("updateData");
    res.json({ message: "Expense removed" });
});

exports.updateExpense = asyncHandler(async (req, res) => {
    const { description, amount, category } = req.body;
    let expense = await Expense.findById(req.params.id);

    if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
    }

    if (expense.paidBy.toString() !== req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    expense.description = description || expense.description;
    expense.amount = amount ? parseFloat(amount) : expense.amount;
    expense.category = category || expense.category;

    await expense.save();
    if (req.app.get("io")) req.app.get("io").emit("updateData");
    res.json(expense);
});

exports.getUserExpenseHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
        $or: [{ paidBy: userId }, { splitWith: userId }]
    };

    if (startDate && endDate) {
        query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const [expenses, total] = await Promise.all([
        Expense.find(query)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .populate("group", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Expense.countDocuments(query)
    ]);

    res.json({
        data: expenses,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
});
