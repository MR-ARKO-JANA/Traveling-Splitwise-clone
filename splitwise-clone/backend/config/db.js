const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/splitwise-clone';
        await mongoose.connect(dbURI); 
        console.log('MongoDB Connected');
    } catch (err) {
        console.error("Database connection error:", err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
