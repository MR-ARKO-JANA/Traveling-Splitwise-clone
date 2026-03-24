const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const asyncHandler = require("../utils/asyncHandler");

exports.getSummary = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    const [expenses, settlements] = await Promise.all([
        Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        }).populate('paidBy splitWith'),
        Settlement.find({
            $or: [{ from: userId }, { to: userId }]
        })
    ]);

    const userBalances = {};
    
    expenses.forEach(exp => {
        const splitAmount = exp.amount / (exp.splitWith.length || 1);
        if (exp.paidBy._id.toString() === userId.toString()) {
            exp.splitWith.forEach(member => {
                const mId = member._id.toString();
                if (mId !== userId.toString()) {
                    userBalances[mId] = (userBalances[mId] || 0) + splitAmount;
                }
            });
        } else {
            userBalances[exp.paidBy._id.toString()] = (userBalances[exp.paidBy._id.toString()] || 0) - splitAmount;
        }
    });

    settlements.forEach(s => {
        const fromId = s.from.toString();
        const toId = s.to.toString();
        if (fromId === userId.toString()) {
            userBalances[toId] = (userBalances[toId] || 0) + s.amount;
        } else {
            userBalances[fromId] = (userBalances[fromId] || 0) - s.amount;
        }
    });

    let totalToGet = 0;
    let totalToPay = 0;
    
    Object.values(userBalances).forEach(bal => {
        if (bal > 0) totalToGet += bal;
        else if (bal < 0) totalToPay += Math.abs(bal);
    });

    const netBalance = totalToGet - totalToPay;
    
    res.json({
        get: totalToGet.toFixed(2),
        pay: totalToPay.toFixed(2),
        total: netBalance.toFixed(2)
    });
});

exports.getDetails = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const [expenses, settlements] = await Promise.all([
        Expense.find({ 
            $or: [{ paidBy: userId }, { splitWith: userId }] 
        }).populate('paidBy splitWith'),
        Settlement.find({
            $or: [{ from: userId }, { to: userId }]
        }).populate('from to')
    ]);

    const balanceMap = {};
    
    expenses.forEach(exp => {
        const splitAmount = exp.amount / (exp.splitWith.length || 1);
        
        if (exp.paidBy._id.toString() === userId.toString()) {
            exp.splitWith.forEach(member => {
                if (member._id.toString() !== userId.toString()) {
                    const memberId = member._id.toString();
                    if (!balanceMap[memberId]) {
                        balanceMap[memberId] = {
                            name: member.name,
                            email: member.email,
                            balance: 0,
                            expenses: [],
                            settlements: []
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
                    expenses: [],
                    settlements: []
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

    settlements.forEach(s => {
        const otherUser = s.from._id.toString() === userId.toString() ? s.to : s.from;
        const otherUserId = otherUser._id.toString();
        
        if (!balanceMap[otherUserId]) {
            balanceMap[otherUserId] = {
                name: otherUser.name,
                email: otherUser.email,
                balance: 0,
                expenses: [],
                settlements: []
            };
        }
        
        if (s.from._id.toString() === userId.toString()) {
            balanceMap[otherUserId].balance += s.amount;
            balanceMap[otherUserId].settlements.push({
                note: s.note,
                amount: s.amount,
                type: 'sent',
                date: s.settledAt
            });
        } else {
            balanceMap[otherUserId].balance -= s.amount;
            balanceMap[otherUserId].settlements.push({
                note: s.note,
                amount: s.amount,
                type: 'received',
                date: s.settledAt
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
});

exports.settle = asyncHandler(async (req, res) => {
    const { withUserId, amount, note } = req.body;
    const userId = req.user.id;

    if (!withUserId || !amount) {
        return res.status(400).json({ message: "User ID and amount are required" });
    }

    const User = require("../models/User");
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
    if (req.app.get("io")) req.app.get("io").emit("updateData");

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
});

exports.getSettlements = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const settlements = await Settlement.find({
        $or: [{ from: userId }, { to: userId }]
    })
    .populate('from', 'name email')
    .populate('to', 'name email')
    .sort({ settledAt: -1 })
    .limit(50);

    res.json(settlements);
});
