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

router.use('/', makeCrudRouterWithImport(model, { notFoundMsg: 'Unit tidak ditemukan' }));

module.exports = router;
