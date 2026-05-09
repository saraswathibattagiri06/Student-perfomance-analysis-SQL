// ============================================================
//  server.js — EduQuery AI Backend
//  Express + MySQL2 | Port 5000
// ============================================================
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend statically (open index.html directly OR use this)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
app.use('/api/students',  require('./routes/students'));
app.use('/api',           require('./routes/analytics'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Catch-all → frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════╗');
  console.log('║   EduQuery AI Backend  v2.0        ║');
  console.log(`║   http://localhost:${PORT}            ║`);
  console.log('╚════════════════════════════════════╝');
  console.log('');
});
