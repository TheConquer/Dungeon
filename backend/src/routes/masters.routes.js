const express = require('express');
const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/suppliers', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, nama FROM suppliers ORDER BY nama');
  res.json(rows);
}));

router.get('/branches', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, nama FROM branches ORDER BY nama');
  res.json(rows);
}));

router.get('/repair-categories', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, nama, tipe_hp, kategori_kesulitan FROM repair_categories ORDER BY nama'
  );
  res.json(rows);
}));

router.get('/reorder-thresholds', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT model, threshold FROM reorder_thresholds ORDER BY model');
  res.json(rows);
}));

module.exports = router;
