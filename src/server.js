import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './config/prisma.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` UniMart Server is running on port ${PORT}`);
  console.log(`===============================================`);
  prisma.$connect().catch((err) => {
    console.warn('Initial database warmup warning:', err.message);
  });
});

// Keep TiDB Serverless connection pool warm so requests don't hit 30s cold starts
const keepAliveTimer = setInterval(() => {
  prisma.$queryRaw`SELECT 1`.catch(() => {});
}, 4 * 60 * 1000);
keepAliveTimer.unref();

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
    console.error(`Please terminate the existing process or choose another port.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
