const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');
const model = require('../models/serviceSparepart.model');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => res.json(await model.list())));

router.get('/:id', asyncHandler(async (req, res) => {
  const row = await model.getById(req.params.id);
  if (!row) throw new HttpError(404, 'Sparepart servis tidak ditemukan');
  res.json(row);
}));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await model.create(req.body));
}));

// Lepas sparepart dari unit servis yang memakainya (tombol "Lepas")
router.post('/:id/release', asyncHandler(async (req, res) => {
  res.json(await model.releaseStandalone(req.params.id));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
}));

// Full resync (dipakai saveSparepartDB() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  res.json(await model.bulkReplace(rows));
}));

module.exports = router;
