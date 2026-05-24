const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const dbURI = process.env.DB_URI || 'mongodb://localhost:27017/splitwise-clone';
    await mongoose.connect(dbURI);
    logger.info('MongoDB Connected');
  } catch (err) {
    logger.error('Database connection error', err);
    logger.warn('Continuing execution. Mongoose will attempt to reconnect automatically.');
  }
};

module.exports = connectDB;
