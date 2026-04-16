'use strict';

/**
 * Seed script — promotes maulikmakwana00@gmail.com to admin role.
 * Run with: node src/scripts/seedAdmin.js
 */

require('../config/env'); // load + validate env vars
const connectDB = require('../config/db');
const User = require('../models/User');

const ADMIN_EMAIL = 'maulikmakwana00@gmail.com';

const seed = async () => {
  await connectDB();

  const user = await User.findOne({ email: ADMIN_EMAIL });

  if (!user) {
    console.error(`❌ No user found with email: ${ADMIN_EMAIL}`);
    console.error('   Make sure the account is registered before running this script.');
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`ℹ️  User "${user.username}" (${ADMIN_EMAIL}) is already an admin.`);
    process.exit(0);
  }

  user.role = 'admin';
  await user.save();

  console.log(`✅ User "${user.username}" (${ADMIN_EMAIL}) has been promoted to admin.`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed script failed:', err.message);
  process.exit(1);
});
