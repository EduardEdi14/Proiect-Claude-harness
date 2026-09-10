'use strict';
// db.js — PostgreSQL connection pool for Libra Maker.
//
// Usage:
//   const db = require('./db');
//   const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
//
// The pool is created lazily on first require(). If DATABASE_URL is not set,
// importing this module is safe but calling query() will throw; the server
// checks for DATABASE_URL at startup and falls back to the in-memory store.

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Respect SSL for hosted databases (e.g. Supabase, Railway, Render).
      // Set DATABASE_SSL=false to disable (e.g. local Docker Postgres).
      ssl: process.env.DATABASE_SSL === 'false'
        ? false
        : process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
      max:              10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

/**
 * Run a parameterised query against the pool.
 * @param {string} text  SQL statement with $1, $2, … placeholders.
 * @param {any[]}  params  Bound parameter values.
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  return getPool().query(text, params);
}

/**
 * Check that the pool can reach the database.
 * Used at server startup to decide which store to use.
 */
async function ping() {
  const client = await getPool().connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

module.exports = { query, ping };
