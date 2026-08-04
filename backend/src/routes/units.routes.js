const express = require('express');
const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const { asyncHandler } = require('../middleware/errorHandler');
const model = require('../models/units.model');

const router = express.Router();

router.get('/by-imei/:imei', asyncHandler(async (req, res) => {
  const row = await model.getByImei(req.params.imei);
  if (!row) return res.status(404).json({ error: 'Unit tidak ditemukan' });
  res.json(row);
}));

// "Sync Harian": update/tambah dari file export harian TANPA menghapus/menimpa status,
// report QC, atau tanggal terjual unit yang sudah ada. Lihat catatan di units.model.js.
router.post('/sync', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  res.json(await model.syncFromFile(rows));
}));

// Import "Unit Terjual": tandai unit yang sudah ada jadi Terjual dari file. Lihat catatan
// di units.model.js — tidak pernah membuat unit baru.
router.post('/mark-sold', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  res.json(await model.markSoldFromFile(rows));
}));

router.use('/', makeCrudRouterWithImport(model, { notFoundMsg: 'Unit tidak ditemukan' }));

module.exports = router;
