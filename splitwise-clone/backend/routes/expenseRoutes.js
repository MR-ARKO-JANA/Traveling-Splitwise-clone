const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Group = require("../models/Group");
const User = require("../models/User");

// ─── Helper: Calculate split amounts ──────────────────────────────────────────
function calculateSplitAmounts(amount, splitType, splitDetails, memberIds) {
    const results = [];

    switch (splitType) {
        case "equal": {
            const perPerson = Math.round((amount / memberIds.length) * 100) / 100;
            memberIds.forEach(id => {
                results.push({ user: id, amount: perPerson, percentage: 0, shares: 1 });
            });
            break;
        }
        case "exact": {
            // splitDetails should contain { user, amount } for each person
            const totalExact = splitDetails.reduce((s, d) => s + (d.amount || 0), 0);
            if (Math.abs(totalExact - amount) > 0.01) {
                throw new Error(`Exact amounts must sum to ${amount}. Current sum: ${totalExact}`);
            }
            splitDetails.forEach(d => {
                results.push({ user: d.user, amount: d.amount, percentage: 0, shares: 0 });
            });
            break;
        }
        case "percentage": {
            const totalPercent = splitDetails.reduce((s, d) => s + (d.percentage || 0), 0);
            if (Math.abs(totalPercent - 100) > 0.01) {
                throw new Error(`Percentages must sum to 100%. Current sum: ${totalPercent}%`);
            }
            splitDetails.forEach(d => {
                const calcAmount = Math.round((amount * d.percentage / 100) * 100) / 100;
                results.push({ user: d.user, amount: calcAmount, percentage: d.percentage, shares: 0 });
            });
            break;
        }
        case "shares": {
            const totalShares = splitDetails.reduce((s, d) => s + (d.shares || 1), 0);
            if (totalShares <= 0) throw new Error("Total shares must be greater than 0");
            splitDetails.forEach(d => {
                const calcAmount = Math.round((amount * (d.shares || 1) / totalShares) * 100) / 100;
                results.push({ user: d.user, amount: calcAmount, percentage: 0, shares: d.shares || 1 });
            });
            break;
        }
        default:
            throw new Error("Invalid split type");
    }

    return results;
}

// ─── POST /  — Add an expense ─────────────────────────────────────────────────
router.post("/", auth, async (req, res) => {
    try {
        const { description, amount, groupId, category, splitType, splitDetails, notes, currency } = req.body;

        if (!description || !amount || !groupId) {
            return res.status(400).json({ message: "Description, amount, and groupId are required" });
        }
        if (amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ message: "User not found" });
        if (!group.members.includes(currentUser.email)) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        // Get all group member user IDs
        const groupMemberUsers = await User.find({ email: { $in: group.members } });
        const memberIds = groupMemberUsers.map(u => u._id);

        // Calculate splits
        const type = splitType || "equal";
        let calculatedSplit;
        try {
            calculatedSplit = calculateSplitAmounts(
                parseFloat(amount),
                type,
                splitDetails || [],
                memberIds
            );
        } catch (splitErr) {
            return res.status(400).json({ message: splitErr.message });
        }

        const newExpense = new Expense({
            description,
            amount: parseFloat(amount),
            currency: currency || "INR",
            group: groupId,
            paidBy: req.user.id,
            splitWith: memberIds,
            splitType: type,
            splitDetails: calculatedSplit,
            category: category || "other",
            notes: notes || ""
        });

        const expense = await newExpense.save();

        const populatedExpense = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .populate("splitDetails.user", "name email");

        res.status(201).json(populatedExpense);
    } catch (err) {
        console.error("Add expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /:groupId  — Get expenses for a group ─────────────────────────────────
router.get("/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser || !group.members.includes(currentUser.email)) {
            return res.status(403).json({ message: "Access denied to this group" });
        }

        const expenses = await Expense.find({ group: groupId })
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .populate("splitDetails.user", "name email")
            .sort({ createdAt: -1 });

        res.json(expenses);
    } catch (err) {
        console.error("Get expenses error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── DELETE /:id  — Delete/settle an expense ────────────────────────────────────
router.delete("/:id", auth, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        if (expense.paidBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized to settle this expense" });
        }

        await expense.deleteOne();
        res.json({ message: "Expense settled and removed" });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── PUT /:id  — Edit an expense ────────────────────────────────────────────────
router.put("/:id", auth, async (req, res) => {
    try {
        const { description, amount, category, splitType, splitDetails, notes } = req.body;
        const expense = await Expense.findById(req.params.id);

        if (!expense) return res.status(404).json({ message: "Expense not found" });
        if (expense.paidBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to edit this expense" });
        }

        if (description) expense.description = description;
        if (category) expense.category = category;
        if (notes !== undefined) expense.notes = notes;

        // If amount or split type changed, recalculate
        if (amount || splitType || splitDetails) {
            const newAmount = amount ? parseFloat(amount) : expense.amount;
            const newType = splitType || expense.splitType;

            if (amount) expense.amount = newAmount;
            if (splitType) expense.splitType = newType;

            try {
                const memberIds = expense.splitWith;
                expense.splitDetails = calculateSplitAmounts(
                    newAmount, newType, splitDetails || expense.splitDetails, memberIds
                );
            } catch (splitErr) {
                return res.status(400).json({ message: splitErr.message });
            }
        }

        await expense.save();

        const updatedExpense = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .populate("splitDetails.user", "name email");

        res.json(updatedExpense);
    } catch (err) {
        console.error("Update expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /history/user  — Expense history with pagination + filters ─────────────
router.get("/history/user", auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, category, startDate, endDate } = req.query;

        let query = {
            $or: [{ paidBy: req.user.id }, { splitWith: req.user.id }]
        };

        if (category && category !== "all") query.category = category;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const expenses = await Expense.find(query)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .populate("group", "name")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Expense.countDocuments(query);

        res.json({
            expenses,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error("Get expense history error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /stats/:groupId  — Per-group spending stats ────────────────────────────
router.get("/stats/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;

        const expenses = await Expense.find({ group: groupId })
            .populate("paidBy", "name email");

        // Stats by category
        const byCategory = {};
        expenses.forEach(exp => {
            const cat = exp.category || "other";
            if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
            byCategory[cat].count++;
            byCategory[cat].total += exp.amount;
        });

        // Stats by member (who paid how much)
        const byMember = {};
        expenses.forEach(exp => {
            const name = exp.paidBy?.name || "Unknown";
            if (!byMember[name]) byMember[name] = { count: 0, total: 0 };
            byMember[name].count++;
            byMember[name].total += exp.amount;
        });

        // Monthly trend
        const byMonth = {};
        expenses.forEach(exp => {
            const month = new Date(exp.createdAt).toISOString().slice(0, 7); // YYYY-MM
            if (!byMonth[month]) byMonth[month] = 0;
            byMonth[month] += exp.amount;
        });

        const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

        res.json({
            totalExpenses: expenses.length,
            totalAmount,
            byCategory,
            byMember,
            byMonth
        });
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;