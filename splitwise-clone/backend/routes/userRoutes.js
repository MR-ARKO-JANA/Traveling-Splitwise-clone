const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Your auth.js file
const User = require("../models/User");
const Group = require("../models/Group");
const Expense = require("../models/Expense");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "../uploads/profiles");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});


router.get("/passport", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        
        // Fetch stats for the passport card
        const currentUser = await User.findById(req.user.id);
        const groupCount = await Group.countDocuments({ members: currentUser.email });
        const expenseCount = await Expense.countDocuments({ paidBy: req.user.id });
        
        // Calculate actual net balance
        const expenses = await Expense.find({ 
            $or: [{ paidBy: req.user.id }, { splitWith: req.user.id }] 
        }).populate('paidBy splitWith');

        let totalPaidByUser = 0; 
        let totalUserOwes = 0;
        
        expenses.forEach(exp => {
            const splitAmount = exp.amount / exp.splitWith.length;
            
            // If user paid this expense
            if (exp.paidBy._id.toString() === req.user.id.toString()) {
                totalPaidByUser += exp.amount;
                totalUserOwes += splitAmount; // User still owes their share
            } 
            // If user is part of split but didn't pay
            else if (exp.splitWith.some(member => member._id.toString() === req.user.id.toString())) {
                totalUserOwes += splitAmount;
            }
        });

        const netBalance = totalPaidByUser - totalUserOwes;

        res.json({
            user,
            stats: {
                groups: groupCount,
                expenses: expenseCount,
                settlements: 0 
            },
            netBalance: netBalance.toFixed(2)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Upload profile image
router.post("/upload-image", auth, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        
        // Update user's profile image
        await User.findByIdAndUpdate(req.user.id, { 
            profileImage: imageUrl 
        });

        res.json({ 
            message: "Profile image updated successfully",
            imageUrl: imageUrl
        });
    } catch (err) {
        console.error("Image upload error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Update profile
router.put("/update", auth, async (req, res) => {
    try {
        const { name, email, currentPassword, newPassword } = req.body;
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password required" });
            }
            
            const bcrypt = require("bcryptjs");
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            
            // Hash new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // If changing email, verify current password
        if (email && email !== user.email) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Current password required to change email" });
            }
            
            const bcrypt = require("bcryptjs");
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            
            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
            
            user.email = email;
        }

        // Update name if provided
        if (name) {
            user.name = name;
        }

        await user.save();
        
        res.json({ 
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Get user activity for balances page
router.get("/activity", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get recent expenses
        const recentExpenses = await Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        })
        .populate('paidBy', 'name email')
        .populate('splitWith', 'name email')
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({
            recentExpenses
        });
    } catch (err) {
        console.error("Activity fetch error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;