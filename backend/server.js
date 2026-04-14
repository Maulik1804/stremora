'use strict';

// ── Fix: force Google DNS so MongoDB Atlas SRV records resolve correctly
// on networks where the local DNS server doesn't support SRV lookups.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const { PORT } = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./src/app');

const startServer = async () => {
  await connectDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Streamora API running at http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   CORS origin : ${process.env.CORS_ORIGIN}\n`);
  });
};

startServer();
