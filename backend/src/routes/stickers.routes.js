const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');
const model = require('../models/stickerItem.model');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => res.json(await model.list(req.query.type))));

router.get('/:id', asyncHandler(async (req, res) => {
  const row = await model.getById(req.params.id);
  if (!row) throw new HttpError(404, 'Item stiker tidak ditemukan');
  res.json(row);
}));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await model.create(req.body));
}));

router.post('/batch', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  res.status(201).json(await model.createMany(items));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.status(204).end();
}));

// Hapus semua item (opsional filter ?type=imei|sparepart|flash) — dipakai tombol "Bersihkan Daftar"
router.delete('/', asyncHandler(async (req, res) => {
  await model.clear(req.query.type);
  res.status(204).end();
}));

// Full resync (dipakai saveToStorage() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  res.json(await model.bulkReplace(items));
}));

module.exports = router;
