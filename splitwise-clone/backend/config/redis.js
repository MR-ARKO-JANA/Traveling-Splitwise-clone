const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';

if (process.env.NODE_ENV !== 'test') {
  redisClient = createClient({ url: redisURL });

  redisClient.on('error', (err) => {
    logger.warn('Redis error, caching disabled', { message: err.message });
    isConnected = false;
  });

  redisClient.on('connect', () => {
    logger.info('Connecting to Redis...');
  });

  redisClient.on('ready', () => {
    logger.info('Redis Connected & Ready');
    isConnected = true;
  });

  redisClient.connect().catch((err) => {
    logger.warn('Redis connection failed, continuing in fallback mode', { message: err.message });
    isConnected = false;
  });
}

const cache = {
  async get(key) {
    if (!isConnected || !redisClient) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.warn('Redis GET failed', { key, error: err.message });
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    if (!isConnected || !redisClient) return false;
    try {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return true;
    } catch (err) {
      logger.warn('Redis SET failed', { key, error: err.message });
      return false;
    }
  },

  async del(key) {
    if (!isConnected || !redisClient) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (err) {
      logger.warn('Redis DEL failed', { key, error: err.message });
      return false;
    }
  },

  async delPattern(pattern) {
    if (!isConnected || !redisClient) return false;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (err) {
      logger.warn('Redis delPattern failed', { pattern, error: err.message });
      return false;
    }
  },
};

module.exports = cache;
