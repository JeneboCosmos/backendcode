const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // ✅ add this line to import the database connection

// CREATE
router.post('/', async (req, res) => {
  try {
    const { number } = req.body;
    if (!number || !/^\+?\d{8,15}$/.test(number))
      return res.status(400).json({ error: 'Invalid number' });

    const [result] = await pool.query('INSERT INTO mobile_numbers (number) VALUES (?)', [number]);
    const [rows] = await pool.query('SELECT * FROM mobile_numbers WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ all
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mobile_numbers ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mobile_numbers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  try {
    const { number } = req.body;
    await pool.query('UPDATE mobile_numbers SET number = ? WHERE id = ?', [number, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM mobile_numbers WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM mobile_numbers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
