const Group = require("../models/Group");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

exports.getGroups = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
        $or: [
            { members: user.email },
            { createdBy: req.user.id }
        ]
    };

    const [groups, total] = await Promise.all([
        Group.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit)),
        Group.countDocuments(query)
    ]);

    res.json({
        data: groups,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
});

exports.createGroup = asyncHandler(async (req, res) => {
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
});

exports.addMember = asyncHandler(async (req, res) => {
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
});

exports.deleteGroup = asyncHandler(async (req, res) => {
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
});
