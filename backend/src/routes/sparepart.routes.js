const express = require('express');
const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const { asyncHandler } = require('../middleware/errorHandler');
const model = require('../models/sparepart.model');

const router = express.Router();

// Dipakai internal oleh Unit Service saat sparepart dipakai/dilepas dari servis
// (lihat backend/src/models/serviceSparepart.model.js -> adjustLinkedSparepart).
router.get('/find-linked', asyncHandler(async (req, res) => {
  const { nama, kompatibel } = req.query;
  const row = await model.findLinkedSku(nama, kompatibel);
  res.json(row);
}));

router.use('/', makeCrudRouterWithImport(model, { notFoundMsg: 'Sparepart tidak ditemukan', modul: 'Sparepart' }));

module.exports = router;
