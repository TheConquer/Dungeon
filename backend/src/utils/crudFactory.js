const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');
const activityLog = require('../models/activityLog.model');

// Riwayat aktivitas: dicatat best-effort. Kalau penulisan log gagal (mis. tabel belum ada
// karena schema belum di-update di database ini), operasi CRUD yang sebenarnya diminta user
// TETAP harus berhasil — jadi errornya cuma dicatat ke console, tidak dilempar ke caller.
function logSafe(opts) {
  activityLog.record(opts).catch((err) => {
    console.error('Gagal mencatat riwayat aktivitas:', err.message);
  });
}

// Coba beberapa nama field yang umum dipakai di berbagai model untuk merangkai ringkasan
// log yang enak dibaca (mis. "iPhone 15 Pro" untuk unit, "Budi" untuk customer), tanpa
// perlu tiap model mendefinisikan labelnya sendiri-sendiri.
function defaultLabel(row, fallbackId) {
  if (row) {
    const candidate = row.nama || row.model || row.series || row.jenis || row.nama_produk;
    if (candidate) return String(candidate);
  }
  return fallbackId != null ? String(fallbackId) : '';
}

// Model contract: list(), getById(id), create(data), update(id, data), remove(id)
function makeCrudRouter(model, { idParam = 'id', notFoundMsg = 'Data tidak ditemukan', modul } = {}) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await model.list(req.query));
  }));

  router.get(`/:${idParam}`, asyncHandler(async (req, res) => {
    const row = await model.getById(req.params[idParam]);
    if (!row) throw new HttpError(404, notFoundMsg);
    res.json(row);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const row = await model.create(req.body);
    if (modul) {
      logSafe({
        modul, aksi: 'create',
        ringkasan: `Tambah ${defaultLabel(row, row && row[idParam])}`,
        aktor: req.session && req.session.username,
      });
    }
    res.status(201).json(row);
  }));

  router.put(`/:${idParam}`, asyncHandler(async (req, res) => {
    const row = await model.update(req.params[idParam], req.body);
    if (!row) throw new HttpError(404, notFoundMsg);
    if (modul) {
      logSafe({
        modul, aksi: 'update',
        ringkasan: `Ubah ${defaultLabel(row, req.params[idParam])}`,
        aktor: req.session && req.session.username,
      });
    }
    res.json(row);
  }));

  router.delete(`/:${idParam}`, asyncHandler(async (req, res) => {
    await model.remove(req.params[idParam]);
    if (modul) {
      logSafe({
        modul, aksi: 'delete',
        ringkasan: `Hapus ${req.params[idParam]}`,
        aktor: req.session && req.session.username,
      });
    }
    res.status(204).end();
  }));

  return router;
}

// Sama seperti makeCrudRouter, plus POST /import untuk model yang punya bulkReplace(rows).
// /import mengganti SELURUH dataset sekaligus (dipakai pola "bulk resync" frontend), jadi log
// per baris tidak praktis di sini — dicatat sebagai satu entri ringkasan berisi jumlah baris.
function makeCrudRouterWithImport(model, opts = {}) {
  const router = makeCrudRouter(model, opts);
  router.post('/import', asyncHandler(async (req, res) => {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const result = await model.bulkReplace(rows);
    if (opts.modul) {
      logSafe({
        modul: opts.modul, aksi: 'import',
        ringkasan: `Sinkronisasi data: ${rows.length} baris`,
        aktor: req.session && req.session.username,
      });
    }
    res.json(result);
  }));
  return router;
}

module.exports = { makeCrudRouter, makeCrudRouterWithImport, logSafe, defaultLabel };
