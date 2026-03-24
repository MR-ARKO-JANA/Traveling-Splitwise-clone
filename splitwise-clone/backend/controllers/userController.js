const User = require("../models/User");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");

exports.getPassport = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const [groupCount, expenseCount] = await Promise.all([
        Group.countDocuments({ members: user.email }).maxTimeMS(5000),
        Expense.countDocuments({ paidBy: req.user.id }).maxTimeMS(5000)
    ]);

    let netBalance = 0;
    try {
        const [expenses, settlements] = await Promise.all([
            Expense.find({ 
                $or: [{ paidBy: req.user.id }, { splitWith: req.user.id }] 
            })
            .select('amount paidBy splitWith')
            .maxTimeMS(5000)
            .lean(),
            Settlement.find({
                $or: [{ from: req.user.id }, { to: req.user.id }]
            })
            .maxTimeMS(5000)
            .lean()
        ]);

        expenses.forEach(exp => {
            const splitAmount = exp.amount / (exp.splitWith?.length || 1);
            if (exp.paidBy.toString() === req.user.id.toString()) {
                netBalance += exp.amount - splitAmount;
            } else if (exp.splitWith?.some(member => member.toString() === req.user.id.toString())) {
                netBalance -= splitAmount;
            }
        });

        settlements.forEach(s => {
            if (s.from.toString() === req.user.id.toString()) {
                netBalance += s.amount;
            } else {
                netBalance -= s.amount;
            }
        });
    } catch (balanceError) {
        console.error("Balance calculation error:", balanceError);
    }

    res.json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
            createdAt: user.createdAt
        },
        stats: {
            groups: groupCount || 0,
            expenses: expenseCount || 0,
            settlements: 0 
        },
        netBalance: netBalance.toFixed(2)
    });
});

exports.uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { profileImage: imageUrl });

    res.json({ message: "Profile image updated successfully", imageUrl: imageUrl });
});

exports.updateProfile = asyncHandler(async (req, res) => {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (newPassword || (email && email !== user.email)) {
        if (!currentPassword) {
            return res.status(400).json({ message: "Current password required" });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
            user.email = email;
        }
    }

    if (name) user.name = name;

    await user.save();
    res.json({ 
        message: "Profile updated successfully",
        user: { id: user._id, name: user.name, email: user.email, profileImage: user.profileImage }
    });
});

exports.getActivity = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const recentExpenses = await Expense.find({ 
        $or: [{ paidBy: userId }, { splitWith: userId }] 
    })
    .populate('paidBy', 'name email')
    .populate('splitWith', 'name email')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({ recentExpenses });
});
