const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Updated to remove deprecated options
        await mongoose.connect('mongodb://localhost:27017/splitwise-clone'); 
        console.log('🚀 MongoDB Connected Successfully');
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1);
    }
}

// Make sure you're exporting correctly
module.exports = connectDB;