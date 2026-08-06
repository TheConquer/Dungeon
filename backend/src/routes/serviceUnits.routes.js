const express = require('express');
const { makeCrudRouter, logSafe } = require('../utils/crudFactory');
const { asyncHandler } = require('../middleware/errorHandler');
const model = require('../models/serviceUnit.model');
const externalModel = require('../models/serviceExternal.model');

const router = express.Router();

// Dipakai frontend untuk fitur "cari IMEI ini lagi diservice dimana" (internal atau eksternal)
router.get('/find-by-imei/:imei', asyncHandler(async (req, res) => {
  const internal = await model.findByImei(req.params.imei);
  if (internal) return res.json({ kind: 'internal', id: internal.id });
  const external = await externalModel.findByImei(req.params.imei);
  if (external) return res.json({ kind: 'external', id: external.id });
  res.status(404).json({ error: 'Tidak ditemukan di Unit Service' });
}));

// Full resync (dipakai saveUnitsDB() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const result = await model.bulkReplace(rows);
  logSafe({
    modul: 'Unit Service', aksi: 'import',
    ringkasan: `Sinkronisasi data: ${rows.length} baris`,
    aktor: req.session && req.session.username,
  });
  res.json(result);
}));

router.use('/', makeCrudRouter(model, { notFoundMsg: 'Unit servis tidak ditemukan', modul: 'Unit Service' }));

module.exports = router;
