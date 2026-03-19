const Expense = require("../models/Expense");
const Group = require("../models/Group");

exports.createExpense = async (req, res) => {
    try {
        const { description, amount, groupId, category } = req.body;
        const userId = req.user.id;

        if (!description || !amount || !groupId) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Members in the group model are strings (names/emails), 
        // but the expense model expects ObjectIds of registered Users.
        // For simplicity in this clone, we split among all registered users 
        // who are "members" of the group.
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
        res.status(201).json(expense);
    } catch (err) {
        console.error("Create expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getGroupExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ group: req.params.groupId })
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .sort({ createdAt: -1 });
        res.json(expenses);
    } catch (err) {
        console.error("Get expenses error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        if (expense.paidBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        await expense.deleteOne();
        res.json({ message: "Expense removed" });
    } catch (err) {
        console.error("Delete expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.updateExpense = async (req, res) => {
    try {
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
        res.json(expense);
    } catch (err) {
        console.error("Update expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};
