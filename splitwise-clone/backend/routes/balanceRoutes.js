const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const User = require("../models/User");
const Settlement = require("../models/Settlement");

// ─── Helper: Get per-user split amount from an expense ────────────────────────
function getUserSplitAmount(expense, userId) {
    // If splitDetails exist, use them (supports all split types)
    if (expense.splitDetails && expense.splitDetails.length > 0) {
        const detail = expense.splitDetails.find(
            d => d.user && d.user._id
                ? d.user._id.toString() === userId.toString()
                : d.user.toString() === userId.toString()
        );
        return detail ? detail.amount : 0;
    }
    // Fallback: equal split (for old expenses without splitDetails)
    return expense.amount / (expense.splitWith?.length || 1);
}

// ─── GET /summary  — Balance summary ──────────────────────────────────────────
router.get("/summary", auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const expenses = await Expense.find({
            $or: [{ paidBy: userId }, { splitWith: userId }]
        }).populate("paidBy splitWith splitDetails.user");

        // What others owe the current user
        let othersOweUser = 0;
        expenses.filter(exp =>
            exp.paidBy._id.toString() === userId.toString()
        ).forEach(exp => {
            // Sum up what each OTHER person owes
            if (exp.splitDetails && exp.splitDetails.length > 0) {
                exp.splitDetails.forEach(d => {
                    const dUserId = d.user?._id ? d.user._id.toString() : d.user.toString();
                    if (dUserId !== userId.toString()) {
                        othersOweUser += d.amount;
                    }
                });
            } else {
                const perPerson = exp.amount / exp.splitWith.length;
                const othersCount = exp.splitWith.filter(m => m._id.toString() !== userId.toString()).length;
                othersOweUser += perPerson * othersCount;
            }
        });

        // What the current user owes others
        let userOwesOthers = 0;
        expenses.filter(exp =>
            exp.paidBy._id.toString() !== userId.toString() &&
            exp.splitWith.some(m => m._id.toString() === userId.toString())
        ).forEach(exp => {
            userOwesOthers += getUserSplitAmount(exp, userId);
        });

        const netBalance = othersOweUser - userOwesOthers;

        res.json({
            get: Math.max(othersOweUser, 0).toFixed(2),
            pay: Math.max(userOwesOthers, 0).toFixed(2),
            total: netBalance.toFixed(2)
        });
    } catch (err) {
        console.error("Balance calculation error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /details  — Detailed per-person balances ──────────────────────────────
router.get("/details", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const expenses = await Expense.find({
            $or: [{ paidBy: userId }, { splitWith: userId }]
        }).populate("paidBy splitWith splitDetails.user");

        const balanceMap = {};

        expenses.forEach(exp => {
            if (exp.paidBy._id.toString() === userId.toString()) {
                // Current user paid — others owe their share
                if (exp.splitDetails && exp.splitDetails.length > 0) {
                    exp.splitDetails.forEach(d => {
                        const memberId = d.user?._id ? d.user._id.toString() : d.user.toString();
                        const memberName = d.user?.name || "Unknown";
                        const memberEmail = d.user?.email || "";
                        if (memberId !== userId.toString()) {
                            if (!balanceMap[memberId]) {
                                balanceMap[memberId] = { name: memberName, email: memberEmail, balance: 0, expenses: [] };
                            }
                            balanceMap[memberId].balance += d.amount;
                            balanceMap[memberId].expenses.push({
                                description: exp.description, amount: d.amount, date: exp.createdAt
                            });
                        }
                    });
                } else {
                    const splitAmount = exp.amount / exp.splitWith.length;
                    exp.splitWith.forEach(member => {
                        if (member._id.toString() !== userId.toString()) {
                            const memberId = member._id.toString();
                            if (!balanceMap[memberId]) {
                                balanceMap[memberId] = { name: member.name, email: member.email, balance: 0, expenses: [] };
                            }
                            balanceMap[memberId].balance += splitAmount;
                            balanceMap[memberId].expenses.push({
                                description: exp.description, amount: splitAmount, date: exp.createdAt
                            });
                        }
                    });
                }
            } else if (exp.splitWith.some(m => m._id.toString() === userId.toString())) {
                // Someone else paid — current user owes their share
                const payerId = exp.paidBy._id.toString();
                const owedAmount = getUserSplitAmount(exp, userId);

                if (!balanceMap[payerId]) {
                    balanceMap[payerId] = { name: exp.paidBy.name, email: exp.paidBy.email, balance: 0, expenses: [] };
                }
                balanceMap[payerId].balance -= owedAmount;
                balanceMap[payerId].expenses.push({
                    description: exp.description, amount: -owedAmount, date: exp.createdAt
                });
            }
        });

        // Filter out near-zero balances
        const filtered = {};
        Object.keys(balanceMap).forEach(key => {
            if (Math.abs(balanceMap[key].balance) > 0.01) {
                filtered[key] = balanceMap[key];
            }
        });

        res.json(filtered);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /simplify/:groupId  — Simplify Debts (minimize transactions) ─────────
router.get("/simplify/:groupId", auth, async (req, res) => {
    try {
        const { groupId } = req.params;
        const Group = require("../models/Group");

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const expenses = await Expense.find({ group: groupId })
            .populate("paidBy splitWith splitDetails.user");

        // Calculate net balance for each person in the group
        const netBalance = {};
        const memberUsers = await User.find({ email: { $in: group.members } });

        memberUsers.forEach(u => {
            netBalance[u._id.toString()] = { name: u.name, email: u.email, net: 0 };
        });

        expenses.forEach(exp => {
            const payerId = exp.paidBy._id.toString();
            if (netBalance[payerId]) {
                netBalance[payerId].net += exp.amount;
            }

            if (exp.splitDetails && exp.splitDetails.length > 0) {
                exp.splitDetails.forEach(d => {
                    const uid = d.user?._id ? d.user._id.toString() : d.user.toString();
                    if (netBalance[uid]) {
                        netBalance[uid].net -= d.amount;
                    }
                });
            } else {
                const perPerson = exp.amount / (exp.splitWith?.length || 1);
                (exp.splitWith || []).forEach(m => {
                    const mid = m._id.toString();
                    if (netBalance[mid]) {
                        netBalance[mid].net -= perPerson;
                    }
                });
            }
        });

        // Greedy algorithm to minimize number of transactions
        const creditors = []; // people who are owed money (positive net)
        const debtors = [];   // people who owe money (negative net)

        Object.entries(netBalance).forEach(([id, data]) => {
            if (data.net > 0.01) {
                creditors.push({ id, name: data.name, amount: Math.round(data.net * 100) / 100 });
            } else if (data.net < -0.01) {
                debtors.push({ id, name: data.name, amount: Math.round(Math.abs(data.net) * 100) / 100 });
            }
        });

        // Sort descending by amount
        creditors.sort((a, b) => b.amount - a.amount);
        debtors.sort((a, b) => b.amount - a.amount);

        const transactions = [];
        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            const payAmount = Math.min(debtors[i].amount, creditors[j].amount);
            transactions.push({
                from: { id: debtors[i].id, name: debtors[i].name },
                to: { id: creditors[j].id, name: creditors[j].name },
                amount: Math.round(payAmount * 100) / 100
            });

            debtors[i].amount -= payAmount;
            creditors[j].amount -= payAmount;

            if (debtors[i].amount < 0.01) i++;
            if (creditors[j].amount < 0.01) j++;
        }

        res.json({
            groupName: group.name,
            totalMembers: memberUsers.length,
            simplifiedTransactions: transactions,
            transactionCount: transactions.length
        });
    } catch (err) {
        console.error("Simplify debts error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── POST /settle  — Record a settlement ──────────────────────────────────────
router.post("/settle", auth, async (req, res) => {
    try {
        const { withUserId, amount, note } = req.body;
        const userId = req.user.id;

        if (!withUserId || !amount) {
            return res.status(400).json({ message: "User ID and amount are required" });
        }

        const [currentUser, otherUser] = await Promise.all([
            User.findById(userId),
            User.findById(withUserId)
        ]);

        if (!currentUser || !otherUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const settlement = new Settlement({
            from: userId,
            to: withUserId,
            amount: parseFloat(amount),
            note: note || `Settlement between ${currentUser.name} and ${otherUser.name}`,
            status: "completed",
            settledAt: new Date()
        });

        await settlement.save();

        res.json({
            message: "Settlement recorded successfully",
            settlement: {
                id: settlement._id,
                amount: settlement.amount,
                from: currentUser.name,
                to: otherUser.name,
                date: settlement.settledAt
            }
        });
    } catch (err) {
        console.error("Settlement error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ─── GET /settlements  — Settlement history ───────────────────────────────────
router.get("/settlements", auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const settlements = await Settlement.find({
            $or: [{ from: userId }, { to: userId }]
        })
        .populate("from", "name email")
        .populate("to", "name email")
        .sort({ settledAt: -1 })
        .limit(50);

        res.json(settlements);
    } catch (err) {
        console.error("Get settlements error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;