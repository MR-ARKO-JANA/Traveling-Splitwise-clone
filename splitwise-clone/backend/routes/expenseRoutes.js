const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Group = require("../models/Group");


router.post("/", auth, async (req, res) => {
    try {
        const { description, amount, groupId, category } = req.body;

        // Find the group and check membership
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Get current user to check membership
        const User = require("../models/User");
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user is a member (groups store email addresses)
        if (!group.members.includes(currentUser.email)) {
            return res.status(403).json({ message: "You are not a member of this group" });
        }

        // Get all group member user IDs for splitWith
        const groupMemberUsers = await User.find({ email: { $in: group.members } });
        const memberIds = groupMemberUsers.map(user => user._id);

        const newExpense = new Expense({
            description,
            amount: parseFloat(amount),
            group: groupId,
            paidBy: req.user.id,
            splitWith: memberIds,
            category: category || 'other',
            createdAt: new Date()
        });

        const expense = await newExpense.save();
        
        // Populate the response
        const populatedExpense = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email");
            
        res.status(201).json(populatedExpense);
    } catch (err) {
        console.error("Add expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});


router.get("/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        
        // Check if user has access to this group
        const Group = require("../models/Group");
        const User = require("../models/User");
        
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const currentUser = await User.findById(req.user.id);
        if (!currentUser || !group.members.includes(currentUser.email)) {
            return res.status(403).json({ message: "Access denied to this group" });
        }

        const expenses = await Expense.find({ group: groupId })
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .sort({ createdAt: -1 });
            
        res.json(expenses);
    } catch (err) {
        console.error("Get expenses error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});


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
        res.status(500).send("Server Error");
    }
});

// Get expense history for a user
router.get("/history/user", auth, async (req, res) => {
    try {
        const { page = 1, limit = 20, category, startDate, endDate } = req.query;
        
        let query = {
            $or: [{ paidBy: req.user.id }, { splitWith: req.user.id }]
        };

        // Add category filter if provided
        if (category && category !== 'all') {
            query.category = category;
        }

        // Add date range filter if provided
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

// Update expense (edit functionality)
router.put("/:id", auth, async (req, res) => {
    try {
        const { description, amount, category } = req.body;
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        // Only the person who paid can edit
        if (expense.paidBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized to edit this expense" });
        }

        // Update fields
        if (description) expense.description = description;
        if (amount) expense.amount = parseFloat(amount);
        if (category) expense.category = category;

        await expense.save();

        const updatedExpense = await Expense.findById(expense._id)
            .populate("paidBy", "name email")
            .populate("splitWith", "name email");

        res.json(updatedExpense);
    } catch (err) {
        console.error("Update expense error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;