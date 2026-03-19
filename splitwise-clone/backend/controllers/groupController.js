const Group = require("../models/Group");
const User = require("../models/User");

exports.getGroups = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        // Find groups where the user is a member (by email) or the creator
        const groups = await Group.find({
            $or: [
                { members: user.email },
                { createdBy: req.user.id }
            ]
        }).sort({ createdAt: -1 });
        res.json(groups);
    } catch (err) {
        console.error("Get groups error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { name, description, emails } = req.body;
        const user = await User.findById(req.user.id);

        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }

        // Ensure creator's email is in members list if not already
        const members = emails || [];
        if (!members.includes(user.email)) {
            members.push(user.email);
        }

        const group = new Group({
            name,
            description,
            members,
            createdBy: req.user.id
        });

        await group.save();
        res.status(201).json(group);
    } catch (err) {
        console.error("Create group error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.addMember = async (req, res) => {
    try {
        const { groupId, email } = req.body;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.members.includes(email)) {
            return res.status(400).json({ message: "User already in group" });
        }

        group.members.push(email);
        await group.save();

        res.json({ message: "Member added successfully", members: group.members });
    } catch (err) {
        console.error("Add member error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        await group.deleteOne();
        
        // Also delete expenses associated with this group
        const Expense = require("../models/Expense");
        await Expense.deleteMany({ group: req.params.id });

        res.json({ message: "Group and its expenses removed" });
    } catch (err) {
        console.error("Delete group error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};
