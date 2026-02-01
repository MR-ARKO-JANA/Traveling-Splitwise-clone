const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");

router.get("/summary", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("Calculating balance for user:", userId);
        
        const expenses = await Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        }).populate('paidBy splitWith');

        console.log("Found expenses:", expenses.length);
        
        // Calculate what others owe the user
        const othersOweUser = expenses.filter(exp => 
            exp.paidBy._id.toString() === userId.toString()
        ).reduce((sum, exp) => {
            const userShare = exp.amount / exp.splitWith.length;
            const othersOwe = exp.amount - userShare;
            console.log(`Expense: ${exp.description}, Amount: ${exp.amount}, User share: ${userShare}, Others owe: ${othersOwe}`);
            return sum + othersOwe;
        }, 0);

        // Calculate what user owes others
        const userOwesOthers = expenses.filter(exp => 
            exp.paidBy._id.toString() !== userId.toString() && 
            exp.splitWith.some(member => member._id.toString() === userId.toString())
        ).reduce((sum, exp) => {
            const userOwes = exp.amount / exp.splitWith.length;
            console.log(`User owes for ${exp.description}: ${userOwes}`);
            return sum + userOwes;
        }, 0);

        const netBalance = othersOweUser - userOwesOthers;
        
        console.log("Others owe user:", othersOweUser);
        console.log("User owes others:", userOwesOthers);
        console.log("Net balance:", netBalance);
        
        res.json({
            get: Math.max(othersOweUser, 0).toFixed(2),
            pay: Math.max(userOwesOthers, 0).toFixed(2),
            total: netBalance.toFixed(2)
        });
    } catch (err) { 
        console.error("Balance calculation error:", err);
        res.status(500).send("Server Error"); 
    }
});

router.get("/details", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const expenses = await Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        }).populate('paidBy splitWith');

        const balanceMap = {};
        
        expenses.forEach(exp => {
            const splitAmount = exp.amount / exp.splitWith.length;
            
            if (exp.paidBy._id.toString() === userId.toString()) {
                exp.splitWith.forEach(member => {
                    if (member._id.toString() !== userId.toString()) {
                        const memberId = member._id.toString();
                        if (!balanceMap[memberId]) {
                            balanceMap[memberId] = {
                                name: member.name,
                                email: member.email,
                                balance: 0,
                                expenses: []
                            };
                        }
                        balanceMap[memberId].balance += splitAmount;
                        balanceMap[memberId].expenses.push({
                            description: exp.description,
                            amount: splitAmount,
                            date: exp.createdAt
                        });
                    }
                });
            } 
            else if (exp.splitWith.some(member => member._id.toString() === userId.toString())) {
                const payerId = exp.paidBy._id.toString();
                if (!balanceMap[payerId]) {
                    balanceMap[payerId] = {
                        name: exp.paidBy.name,
                        email: exp.paidBy.email,
                        balance: 0,
                        expenses: []
                    };
                }
                balanceMap[payerId].balance -= splitAmount;
                balanceMap[payerId].expenses.push({
                    description: exp.description,
                    amount: -splitAmount,
                    date: exp.createdAt
                });
            }
        });

        const filteredBalances = {};
        Object.keys(balanceMap).forEach(key => {
            if (Math.abs(balanceMap[key].balance) > 0.01) {
                filteredBalances[key] = balanceMap[key];
            }
        });
        
        res.json(filteredBalances);
    } catch (err) { 
        console.error(err);
        res.status(500).send("Server Error"); 
    }
});

router.post("/settle", auth, async (req, res) => {
    try {
        const { withUserId, amount, note } = req.body;
        const userId = req.user.id;

        if (!withUserId || !amount) {
            return res.status(400).json({ message: "User ID and amount are required" });
        }

        const User = require("../models/User");
        const Settlement = require("../models/Settlement");

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
            status: 'completed',
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

router.get("/settlements", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const Settlement = require("../models/Settlement");

        const settlements = await Settlement.find({
            $or: [{ from: userId }, { to: userId }]
        })
        .populate('from', 'name email')
        .populate('to', 'name email')
        .sort({ settledAt: -1 })
        .limit(50);

        res.json(settlements);
    } catch (err) {
        console.error("Get settlements error:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;