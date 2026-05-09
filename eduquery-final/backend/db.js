// ============================================================
//  db.js — MySQL Connection Pool
//  Update host/user/password to match your MySQL setup
// ============================================================
const mysql = require('mysql2');

const pool = mysql.createPool({
  host:             'localhost',
  user:             'root',
  password:         '',   // ← your password
  database: 'studentdb',  // ← change from 'studentdb' to this
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0
}).promise();

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Connected — studentdb ready');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL Connection Failed:', err.message);
  });

module.exports = pool;
