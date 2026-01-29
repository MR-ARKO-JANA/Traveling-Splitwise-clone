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


module.exports = router;