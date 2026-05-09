// ============================================================
//  routes/analytics.js — All analysis SQL endpoints
//  Every endpoint reflects LIVE data — new students auto-included
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// KPI SUMMARY CARDS
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [[students]] = await db.query('SELECT COUNT(*) AS total FROM students');
    const [[gpa]]      = await db.query('SELECT ROUND(AVG(gpa),2) AS avg_gpa FROM students');
    const [[attend]]   = await db.query('SELECT ROUND(AVG(attendance),2) AS avg_att FROM students');
    const [[depts]]    = await db.query('SELECT COUNT(DISTINCT department) AS depts FROM students');
    const [[atrisk]]   = await db.query(
      "SELECT COUNT(*) AS cnt FROM students WHERE gpa < 2.5 AND attendance < 65"
    );
    res.json({
      total_students:       students.total,
      average_gpa:          gpa.avg_gpa,
      average_attendance:   attend.avg_att,
      departments:          depts.depts,
      at_risk:              atrisk.cnt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LIVE SCHEMA ROW COUNTS
router.get('/schema-counts', async (req, res) => {
  try {
    const [[s]] = await db.query('SELECT COUNT(*) AS c FROM students');
    const [[g]] = await db.query('SELECT COUNT(*) AS c FROM grades');
    const [[a]] = await db.query('SELECT COUNT(*) AS c FROM attendance');
    const [[co]]= await db.query('SELECT COUNT(*) AS c FROM courses');
    res.json({ students: s.c, grades: g.c, attendance: a.c, courses: co.c });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GPA DISTRIBUTION (for bar chart)
router.get('/gpa-distribution', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        CASE
          WHEN gpa >= 3.5 THEN '3.5-4.0 (A)'
          WHEN gpa >= 3.0 THEN '3.0-3.5 (B+)'
          WHEN gpa >= 2.5 THEN '2.5-3.0 (B)'
          WHEN gpa >= 2.0 THEN '2.0-2.5 (C)'
          ELSE 'Below 2.0 (D/F)'
        END AS band,
        COUNT(*) AS total
      FROM students
      GROUP BY band
      ORDER BY MIN(gpa) DESC
    `);
    res.json({ labels: rows.map(r => r.band), values: rows.map(r => r.total) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ATTENDANCE VS GPA SCATTER
router.get('/attendance-gpa', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT name, attendance AS x, gpa AS y, department
      FROM students
      ORDER BY gpa DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DEPARTMENT PERFORMANCE
router.get('/department-stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        department,
        COUNT(*)                    AS student_count,
        ROUND(AVG(gpa), 2)         AS avg_gpa,
        ROUND(AVG(attendance), 2)  AS avg_attendance,
        ROUND(MIN(gpa), 2)         AS min_gpa,
        ROUND(MAX(gpa), 2)         AS max_gpa
      FROM students
      GROUP BY department
      ORDER BY avg_gpa DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GENDER PERFORMANCE COMPARISON
router.get('/gender-stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        gender,
        COUNT(*)                    AS count,
        ROUND(AVG(gpa), 2)         AS avg_gpa,
        ROUND(AVG(attendance), 2)  AS avg_attendance
      FROM students
      GROUP BY gender
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AT-RISK STUDENTS
router.get('/at-risk', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        student_id, name, department, year_level,
        gpa, attendance,
        CASE
          WHEN gpa < 2.0 AND attendance < 60 THEN 'Critical'
          WHEN gpa < 2.5 OR attendance < 65  THEN 'At Risk'
          ELSE 'Stable'
        END AS risk_level
      FROM students
      WHERE gpa < 2.5 OR attendance < 65
      ORDER BY gpa ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOP PERFORMERS
router.get('/top-performers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [rows] = await db.query(`
      SELECT student_id, name, department, year_level, gpa, attendance
      FROM students
      ORDER BY gpa DESC
      LIMIT ?
    `, [limit]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// YEAR-WISE PERFORMANCE
router.get('/year-stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        year_level,
        COUNT(*) AS students,
        ROUND(AVG(gpa),2) AS avg_gpa,
        ROUND(AVG(attendance),2) AS avg_attendance
      FROM students
      GROUP BY year_level
      ORDER BY year_level
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI NATURAL LANGUAGE QUERY ENGINE
router.post('/query', async (req, res) => {
  const q = (req.body.query || '').toLowerCase();
  let sql, label;

  if (q.includes('top') || q.includes('best') || q.includes('highest gpa')) {
    sql   = `SELECT name, department, year_level, gpa, attendance FROM students ORDER BY gpa DESC LIMIT 10`;
    label = 'Top Performers by GPA';
  } else if (q.includes('at risk') || q.includes('failing') || q.includes('risk')) {
    sql   = `SELECT name, department, gpa, attendance,
               CASE WHEN gpa < 2.0 AND attendance < 60 THEN 'Critical'
                    ELSE 'At Risk' END AS risk_level
             FROM students WHERE gpa < 2.5 OR attendance < 65 ORDER BY gpa ASC`;
    label = 'At-Risk Students';
  } else if (q.includes('gender') || q.includes('male') || q.includes('female')) {
    sql   = `SELECT gender, COUNT(*) AS count, ROUND(AVG(gpa),2) AS avg_gpa,
               ROUND(AVG(attendance),2) AS avg_attendance
             FROM students GROUP BY gender`;
    label = 'Gender Performance Analysis';
  } else if (q.includes('department') || q.includes('dept')) {
    sql   = `SELECT department, COUNT(*) AS students, ROUND(AVG(gpa),2) AS avg_gpa,
               ROUND(AVG(attendance),2) AS avg_attendance
             FROM students GROUP BY department ORDER BY avg_gpa DESC`;
    label = 'Department-wise Analysis';
  } else if (q.includes('attendance') || q.includes('correlation')) {
    sql   = `SELECT name, attendance, gpa, department FROM students ORDER BY attendance DESC`;
    label = 'Attendance vs GPA';
  } else if (q.includes('year') || q.includes('semester')) {
    sql   = `SELECT year_level, COUNT(*) AS students, ROUND(AVG(gpa),2) AS avg_gpa,
               ROUND(AVG(attendance),2) AS avg_attendance
             FROM students GROUP BY year_level ORDER BY year_level`;
    label = 'Year-wise Performance';
  } else if (q.includes('all') || q.includes('list') || q.includes('show')) {
    sql   = `SELECT * FROM students ORDER BY gpa DESC`;
    label = 'All Students';
  } else {
    sql   = `SELECT name, department, gpa, attendance FROM students ORDER BY gpa DESC`;
    label = 'Student Overview';
  }

  try {
    const [results] = await db.query(sql);
    const columns   = results.length > 0 ? Object.keys(results[0]) : [];
    const rows      = results.map(obj => Object.values(obj));
    res.json({ sql, label, columns, rows, total: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
