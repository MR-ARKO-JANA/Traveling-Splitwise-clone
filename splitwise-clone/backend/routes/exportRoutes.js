const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Group = require("../models/Group");
const User = require("../models/User");

// ─── GET /csv/:groupId  — Download group expenses as CSV ──────────────────────
router.get("/csv/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const currentUser = await User.findById(req.user.id);
        if (!currentUser || !group.members.includes(currentUser.email)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const expenses = await Expense.find({ group: groupId })
            .populate("paidBy", "name email")
            .populate("splitWith", "name email")
            .sort({ createdAt: -1 });

        // Build CSV
        const headers = ["Date", "Description", "Amount", "Currency", "Category", "Paid By", "Split Type", "Split With", "Notes"];
        const rows = expenses.map(exp => {
            const splitNames = (exp.splitWith || []).map(u => u.name).join("; ");
            const date = new Date(exp.createdAt).toLocaleDateString();
            return [
                date,
                `"${(exp.description || "").replace(/"/g, '""')}"`,
                exp.amount,
                exp.currency || "INR",
                exp.category || "other",
                exp.paidBy?.name || "Unknown",
                exp.splitType || "equal",
                `"${splitNames}"`,
                `"${(exp.notes || "").replace(/"/g, '""')}"`
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${group.name}_expenses.csv"`);
        res.send(csv);
    } catch (err) {
        console.error("CSV export error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /csv/user/all  — Download all user expenses as CSV ───────────────────
router.get("/csv/user/all", auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const expenses = await Expense.find({
            $or: [{ paidBy: userId }, { splitWith: userId }]
        })
        .populate("paidBy", "name email")
        .populate("splitWith", "name email")
        .populate("group", "name")
        .sort({ createdAt: -1 });

        const headers = ["Date", "Description", "Amount", "Currency", "Category", "Group", "Paid By", "Split Type", "Notes"];
        const rows = expenses.map(exp => {
            const date = new Date(exp.createdAt).toLocaleDateString();
            return [
                date,
                `"${(exp.description || "").replace(/"/g, '""')}"`,
                exp.amount,
                exp.currency || "INR",
                exp.category || "other",
                exp.group?.name || "Unknown",
                exp.paidBy?.name || "Unknown",
                exp.splitType || "equal",
                `"${(exp.notes || "").replace(/"/g, '""')}"`
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="all_expenses.csv"');
        res.send(csv);
    } catch (err) {
        console.error("CSV export error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
