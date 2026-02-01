const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    note: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'completed'
    },
    settledAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Settlement", SettlementSchema);