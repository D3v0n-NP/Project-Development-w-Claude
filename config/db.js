/* =============================================================================
   config/db.js — MSSQL connection pool, shared across every model file.

   WHY A SINGLE POOL
   ------------------
   Opening a new connection per request is slow and wastes DB resources.
   mssql's ConnectionPool manages a set of reusable connections internally, so
   every model just calls getPool() and gets a ready-to-query connection.
============================================================================= */

const sql = require("mssql");

// --- Connection config — pull from environment variables in production. ---
const dbConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "YourPassword",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "hawkerhub",
  options: {
    encrypt: false,          // set true if connecting to Azure SQL
    trustServerCertificate: true, // fine for local dev; not for prod
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Cache the pool as a module-level promise so concurrent requests during
// startup all await the SAME connection attempt instead of racing to open
// multiple pools.
let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig).catch((err) => {
      poolPromise = null; // allow retry on next call if connection failed
      throw err;
    });
  }
  return poolPromise;
}
async function testConnection() {
  try { 
    const pool = await getPool(); 
    await pool.request(). query("SELECT 1 AS ok");
    console.log(`Database connected - ${dbConfig.database}@${dbConfig.server}`);
  } catch (err) {
    console.error("Database connection failed - server will not start.");
    console.error(`Reason: ${err.message}`);
    console.error("Check your .env file and ensure the database is running");
    process.exit(1); // stop the process 
  }
}


module.exports = { getPool, testConnection, sql };