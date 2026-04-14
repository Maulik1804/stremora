'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI, MONGODB_POOL_MIN, MONGODB_POOL_MAX } = require('./env');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (attempt = 1) => {
  try {
    const connection = await mongoose.connect(MONGODB_URI, {
      minPoolSize: MONGODB_POOL_MIN,
      maxPoolSize: MONGODB_POOL_MAX,
      serverSelectionTimeoutMS: 10000, // 10s timeout per attempt
      connectTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);

    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error(
        '\n⚠️  Cannot reach MongoDB Atlas. Please check:\n' +
        '   1. Your IP is whitelisted in Atlas → Network Access\n' +
        '      (Add 0.0.0.0/0 for development, or your specific IP)\n' +
        '   2. The MONGODB_URI in your .env file is correct\n' +
        '   3. Your internet connection is active\n'
      );
    }

    if (attempt < MAX_RETRIES) {
      console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }

    console.error('💀 Max retries reached. Exiting.');
    process.exit(1);
  }
};

module.exports = connectDB;
