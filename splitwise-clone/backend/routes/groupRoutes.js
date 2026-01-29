const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Group = require("../models/Group");
const User = require("../models/User");
const Expense = require("../models/Expense");

router.post("/", auth, async (req, res) => {
    try {
        const { name, description, emails } = req.body; 

        // 1. Validate that req.user.id exists from the middleware
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "User identification failed. Please re-login." });
        }

        
        let memberList = Array.isArray(emails) ? emails : [];
    
        const creator = await User.findById(req.user.id);
        if (!creator) {
            return res.status(404).json({ message: "Creator user not found" });
        }
        
        if (!memberList.includes(creator.email)) {
            memberList.push(creator.email);
        }

        
        const newGroup = new Group({
            name,
            description,
            createdBy: req.user.id,
            members: memberList    // Now contains creator email + invited emails
        });

        const group = await newGroup.save();
        res.status(201).json(group);
    } catch (err) {
        console.error("Group Creation Error:", err);
        res.status(500).json({ message: err.message });
    }
});

router.get("/", auth, async (req, res) => {
    try {
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        const groups = await Group.find({ members: user.email });
        res.json(groups);
    } catch (err) {
        console.error("Error fetching groups:", err);
        res.status(500).send("Server Error");
    }
});
router.post("/add-member", auth, async (req, res) => {
    try {
        const { groupId, email } = req.body;
        const group = await Group.findById(groupId);
        
        if (!group) return res.status(404).json({ message: "Group not found" });

        const userToAdd = await User.findOne({ email });
        if (!userToAdd) return res.status(404).json({ message: "User not found" });

        // Check if user email is already in group (groups store emails, not IDs)
        if (group.members.includes(userToAdd.email)) {
            return res.status(400).json({ message: "User already in group" });
        }

        group.members.push(userToAdd.email);
        await group.save();
        res.json({ message: "Member added successfully", group });
    } catch (err) {
        console.error("Add member error:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

// Test endpoint to check if group exists
router.get("/:groupId/test", auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await Group.findById(groupId);
        const user = await User.findById(req.user.id);
        
        res.json({
            groupExists: !!group,
            userExists: !!user,
            groupId,
            userId: req.user.id,
            group: group ? {
                name: group.name,
                createdBy: group.createdBy,
                members: group.members
            } : null,
            user: user ? {
                name: user.name,
                email: user.email
            } : null
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete group
router.delete("/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        
        // Validate groupId format
        if (!groupId || !groupId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid group ID format" });
        }
        
        const group = await Group.findById(groupId);
        
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if user is the creator or a member
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user has permission (creator or member)
        const isCreator = group.createdBy.toString() === req.user.id;
        const isMember = group.members.includes(user.email);
        
        if (!isCreator && !isMember) {
            return res.status(403).json({ message: "Not authorized to delete this group" });
        }

        // Delete all expenses related to this group first
        const deleteResult = await Expense.deleteMany({ group: groupId });
        
        // Delete the group
        await Group.findByIdAndDelete(groupId);
        
        res.json({ 
            message: "Group and related expenses deleted successfully",
            deletedExpenses: deleteResult.deletedCount
        });
    } catch (err) {
        console.error("Delete group error:", err);
        
        // Handle specific MongoDB errors
        if (err.name === 'CastError') {
            return res.status(400).json({ message: "Invalid group ID" });
        }
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation error: " + err.message });
        }
        
        res.status(500).json({ message: "Failed to delete group. Please try again." });
    }
});

module.exports = router;