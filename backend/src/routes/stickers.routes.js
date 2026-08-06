const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');
const { logSafe } = require('../utils/crudFactory');
const model = require('../models/stickerItem.model');

const router = express.Router();

const MODUL = 'Stiker Barcode';

router.get('/', asyncHandler(async (req, res) => res.json(await model.list(req.query.type))));

router.get('/:id', asyncHandler(async (req, res) => {
  const row = await model.getById(req.params.id);
  if (!row) throw new HttpError(404, 'Item stiker tidak ditemukan');
  res.json(row);
}));

router.post('/', asyncHandler(async (req, res) => {
  const row = await model.create(req.body);
  logSafe({ modul: MODUL, aksi: 'create', ringkasan: `Tambah stiker ${row && (row.kode || row.imei || row.id)}`, aktor: req.session && req.session.username });
  res.status(201).json(row);
}));

router.post('/batch', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const result = await model.createMany(items);
  logSafe({ modul: MODUL, aksi: 'create', ringkasan: `Tambah stiker batch: ${items.length} item`, aktor: req.session && req.session.username });
  res.status(201).json(result);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  logSafe({ modul: MODUL, aksi: 'delete', ringkasan: `Hapus stiker ${req.params.id}`, aktor: req.session && req.session.username });
  res.status(204).end();
}));

// Hapus semua item (opsional filter ?type=imei|sparepart|flash) — dipakai tombol "Bersihkan Daftar"
router.delete('/', asyncHandler(async (req, res) => {
  await model.clear(req.query.type);
  logSafe({ modul: MODUL, aksi: 'delete', ringkasan: `Bersihkan daftar stiker${req.query.type ? ' (' + req.query.type + ')' : ''}`, aktor: req.session && req.session.username });
  res.status(204).end();
}));

// Full resync (dipakai saveToStorage() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const result = await model.bulkReplace(items);
  logSafe({ modul: MODUL, aksi: 'import', ringkasan: `Sinkronisasi data: ${items.length} item`, aktor: req.session && req.session.username });
  res.json(result);
}));

module.exports = router;
