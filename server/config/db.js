const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/contenthub_db';

const isProduction = process.env.NODE_ENV === 'production';
const isRemoteDb = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
const enableSsl = process.env.DB_SSL === 'true' || (isProduction && isRemoteDb) || (connectionString && connectionString.includes('amazonaws.com'));

const pool = new Pool({
  connectionString,
  ssl: enableSsl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000, // Fail fast after 5s if pool cannot acquire a client
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
