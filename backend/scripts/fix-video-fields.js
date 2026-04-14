'use strict';

/**
 * One-time migration: add missing array fields to old Video documents.
 * Run: node backend/scripts/fix-video-fields.js
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;
  const videos = db.collection('videos');

  // Fix documents missing skipSegments
  const r1 = await videos.updateMany(
    { skipSegments: { $exists: false } },
    { $set: { skipSegments: [] } }
  );
  console.log(`✅ Fixed skipSegments on ${r1.modifiedCount} documents`);

  // Fix documents missing engagementBuckets
  const r2 = await videos.updateMany(
    { engagementBuckets: { $exists: false } },
    { $set: { engagementBuckets: [] } }
  );
  console.log(`✅ Fixed engagementBuckets on ${r2.modifiedCount} documents`);

  // Fix documents missing keywords
  const r3 = await videos.updateMany(
    { keywords: { $exists: false } },
    { $set: { keywords: [] } }
  );
  console.log(`✅ Fixed keywords on ${r3.modifiedCount} documents`);

  // Fix documents missing randomSortKey
  const r4 = await videos.updateMany(
    { randomSortKey: { $exists: false } },
    [{ $set: { randomSortKey: { $rand: {} } } }]
  );
  console.log(`✅ Fixed randomSortKey on ${r4.modifiedCount} documents`);

  console.log('\nMigration complete.');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
