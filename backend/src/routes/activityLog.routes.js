const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const activityLog = require('../models/activityLog.model');

const router = express.Router();

// Riwayat aktivitas bersifat baca-saja dari sisi API — log-nya sendiri hanya ditulis
// secara internal (lihat logSafe di utils/crudFactory.js), tidak ada endpoint POST/PUT/DELETE.
router.get('/', asyncHandler(async (req, res) => {
  const { modul, aksi, from, to, page, pageSize } = req.query;
  res.json(await activityLog.list({ modul, aksi, from, to, page, pageSize }));
}));

router.get('/modules', asyncHandler(async (req, res) => {
  res.json(await activityLog.distinctModules());
}));

module.exports = router;
