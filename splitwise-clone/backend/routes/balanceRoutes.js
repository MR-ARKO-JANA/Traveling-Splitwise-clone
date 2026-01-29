const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Expense = require("../models/Expense");

router.get("/summary", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const expenses = await Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        }).populate('paidBy splitWith');

        let totalPaidByUser = 0; 
        let totalUserOwes = 0;
        
        expenses.forEach(exp => {
            const splitAmount = exp.amount / exp.splitWith.length;
            
            // If user paid this expense
            if (exp.paidBy._id.toString() === userId.toString()) {
                totalPaidByUser += exp.amount;
                totalUserOwes += splitAmount; // User still owes their share
            } 
            // If user is part of split but didn't pay
            else if (exp.splitWith.some(member => member._id.toString() === userId.toString())) {
                totalUserOwes += splitAmount;
            }
        });

        const netBalance = totalPaidByUser - totalUserOwes;
        
        res.json({
            get: Math.max(netBalance, 0).toFixed(2),  // Amount others owe you
            pay: Math.max(-netBalance, 0).toFixed(2), // Amount you owe others
            total: netBalance.toFixed(2)
        });
    } catch (err) { 
        console.error(err);
        res.status(500).send("Server Error"); 
    }
});

// Get detailed balance breakdown
router.get("/details", auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const expenses = await Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        }).populate('paidBy splitWith');

        const balanceMap = {};
        
        expenses.forEach(exp => {
            const splitAmount = exp.amount / exp.splitWith.length;
            
            // If user paid this expense
            if (exp.paidBy._id.toString() === userId.toString()) {
                // User gets credit for what others owe
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
            // If someone else paid and user owes
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

        // Filter out zero balances
        const filteredBalances = {};
        Object.keys(balanceMap).forEach(key => {
            if (Math.abs(balanceMap[key].balance) > 0.01) { // Ignore tiny amounts due to rounding
                filteredBalances[key] = balanceMap[key];
            }
        });
        
        res.json(filteredBalances);
    } catch (err) { 
        console.error(err);
        res.status(500).send("Server Error"); 
    }
});


module.exports = router;