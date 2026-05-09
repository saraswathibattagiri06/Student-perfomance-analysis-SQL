// ============================================================
//  routes/students.js — Full CRUD for students
//  GET / POST / PUT /:id / DELETE /:id
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db');

// GET ALL STUDENTS (with optional dept filter)
router.get('/', async (req, res) => {
  try {
    const { dept, year, gender } = req.query;
    let sql    = 'SELECT * FROM students WHERE 1=1';
    const params = [];
    if (dept)   { sql += ' AND department = ?'; params.push(dept); }
    if (year)   { sql += ' AND year_level = ?';  params.push(year); }
    if (gender) { sql += ' AND gender = ?';       params.push(gender); }
    sql += ' ORDER BY gpa DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE STUDENT
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD STUDENT — automatically included in all analyses
router.post('/', async (req, res) => {
  try {
    const { name, gender, age, department, year_level, gpa, attendance } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const [result] = await db.query(
      `INSERT INTO students (name, gender, age, department, year_level, gpa, attendance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, gender, age, department, year_level, gpa, attendance]
    );
    res.json({ success: true, student_id: result.insertId, message: 'Student added — analytics updated automatically' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE STUDENT
router.put('/:id', async (req, res) => {
  try {
    const { name, gender, age, department, year_level, gpa, attendance } = req.body;
    await db.query(
      `UPDATE students SET name=?, gender=?, age=?, department=?, year_level=?, gpa=?, attendance=?
       WHERE student_id=?`,
      [name, gender, age, department, year_level, gpa, attendance, req.params.id]
    );
    res.json({ success: true, message: 'Student updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE STUDENT
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE student_id=?', [req.params.id]);
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
