const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');
const { logSafe, defaultLabel } = require('../utils/crudFactory');
const model = require('../models/serviceSparepart.model');

const router = express.Router();

const MODUL = 'Sparepart Service';

router.get('/', asyncHandler(async (req, res) => res.json(await model.list())));

router.get('/:id', asyncHandler(async (req, res) => {
  const row = await model.getById(req.params.id);
  if (!row) throw new HttpError(404, 'Sparepart servis tidak ditemukan');
  res.json(row);
}));

router.post('/', asyncHandler(async (req, res) => {
  const row = await model.create(req.body);
  logSafe({ modul: MODUL, aksi: 'create', ringkasan: `Tambah ${defaultLabel(row, row && row.id)}`, aktor: req.session && req.session.username });
  res.status(201).json(row);
}));

// Lepas sparepart dari unit servis yang memakainya (tombol "Lepas")
router.post('/:id/release', asyncHandler(async (req, res) => {
  const row = await model.releaseStandalone(req.params.id);
  logSafe({ modul: MODUL, aksi: 'update', ringkasan: `Lepas ${defaultLabel(row, req.params.id)} dari unit servis`, aktor: req.session && req.session.username });
  res.json(row);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  logSafe({ modul: MODUL, aksi: 'delete', ringkasan: `Hapus ${req.params.id}`, aktor: req.session && req.session.username });
  res.status(204).end();
}));

// Full resync (dipakai saveSparepartDB() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const result = await model.bulkReplace(rows);
  logSafe({ modul: MODUL, aksi: 'import', ringkasan: `Sinkronisasi data: ${rows.length} baris`, aktor: req.session && req.session.username });
  res.json(result);
}));

module.exports = router;
