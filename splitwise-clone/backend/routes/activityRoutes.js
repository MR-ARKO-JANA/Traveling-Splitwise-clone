const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Activity = require("../models/Activity");
const Group = require("../models/Group");
const User = require("../models/User");

// ─── GET /  — Recent activity feed for the logged-in user ─────────────────────
router.get("/", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 30 } = req.query;

        // Find all groups the user belongs to
        const currentUser = await User.findById(userId);
        if (!currentUser) return res.status(404).json({ message: "User not found" });

        const userGroups = await Group.find({ members: currentUser.email });
        const groupIds = userGroups.map(g => g._id);

        // Get activity from user's groups or directly about the user
        const activities = await Activity.find({
            $or: [
                { user: userId },
                { group: { $in: groupIds } }
            ]
        })
        .populate("user", "name email profileImage")
        .populate("group", "name")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await Activity.countDocuments({
            $or: [
                { user: userId },
                { group: { $in: groupIds } }
            ]
        });

        res.json({
            activities,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error("Get activity feed error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /group/:groupId  — Activity within a specific group ──────────────────
router.get("/group/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { page = 1, limit = 30 } = req.query;

        const activities = await Activity.find({ group: groupId })
            .populate("user", "name email profileImage")
            .populate("group", "name")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Activity.countDocuments({ group: groupId });

        res.json({
            activities,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error("Get group activity error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
