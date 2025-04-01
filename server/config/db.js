const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect((err) => {
  if (err) console.error('DB connection error:', err);
  else console.log('Connected to Neon Postgres');
});

module.exports = pool;