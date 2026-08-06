const express = require('express');
const { makeCrudRouter, logSafe } = require('../utils/crudFactory');
const { asyncHandler } = require('../middleware/errorHandler');
const model = require('../models/serviceExternal.model');

const router = express.Router();

// Full resync (dipakai saveExternalDB() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const result = await model.bulkReplace(rows);
  logSafe({
    modul: 'Unit Service Eksternal', aksi: 'import',
    ringkasan: `Sinkronisasi data: ${rows.length} baris`,
    aktor: req.session && req.session.username,
  });
  res.json(result);
}));

router.use('/', makeCrudRouter(model, { notFoundMsg: 'Unit servis eksternal tidak ditemukan', modul: 'Unit Service Eksternal' }));

module.exports = router;
