const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { logSafe } = require('../utils/crudFactory');
const model = require('../models/stockTransaksi.model');

const router = express.Router();

const MODUL = 'Transaksi Item';

router.get('/', asyncHandler(async (req, res) => {
  res.json(await model.list());
}));

router.post('/', asyncHandler(async (req, res) => {
  const row = await model.create(req.body);
  logSafe({
    modul: MODUL, aksi: 'create',
    ringkasan: `${row.tipe} ${row.kategori} ${row.nama_item || row.sku_id} (${row.qty})`,
    aktor: req.session && req.session.username,
  });
  res.status(201).json(row);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  logSafe({ modul: MODUL, aksi: 'delete', ringkasan: `Hapus transaksi ${req.params.id}`, aktor: req.session && req.session.username });
  res.json({ ok: true });
}));

// Backfill riwayat historis (mis. dari spreadsheet lama) — beda dari POST '/' biasa, endpoint ini
// TIDAK menyesuaikan qty/cabang item (lihat catatan di model importHistory), khusus dipakai saat
// qty saat ini sudah benar dari sumber lain (mis. import Stok Akhir) dan baris-baris ini murni
// arsip riwayat tanggal/tujuan.
router.post('/import-history', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const result = await model.importHistory(rows);
  logSafe({
    modul: MODUL, aksi: 'import',
    ringkasan: `Import riwayat historis: ${rows.length} baris`,
    aktor: req.session && req.session.username,
  });
  res.json(result);
}));

module.exports = router;
