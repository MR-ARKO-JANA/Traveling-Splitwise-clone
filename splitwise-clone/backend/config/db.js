const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/splitwise-clone';
    logger.info(`Connecting to MongoDB: ${dbURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
    });
    logger.info('MongoDB Connected');
  } catch (err) {
    logger.error('Database connection error', err);
    logger.warn('Continuing execution. Mongoose will attempt to reconnect automatically.');
  }
};

module.exports = connectDB;
