const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Group = require("../models/Group");
const User = require("../models/User");

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

        
        if (group.members.includes(userToAdd._id)) {
            return res.status(400).json({ message: "User already in group" });
        }

        group.members.push(userToAdd._id);
        await group.save();
        res.json({ message: "Member added successfully", group });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// Delete group
router.delete("/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;
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
        const Expense = require("../models/Expense");
        await Expense.deleteMany({ group: groupId });
        
        // Delete the group
        await Group.findByIdAndDelete(groupId);
        
        res.json({ message: "Group and related expenses deleted successfully" });
    } catch (err) {
        console.error("Delete group error:", err);
        res.status(500).json({ message: "Server Error: " + err.message });
    }
});

module.exports = router;