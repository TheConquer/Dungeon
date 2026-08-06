const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');
const { sendExcelReport } = require('../utils/excelExport');
const reports = require('../models/reports.model');

const router = express.Router();

const REPORT_TYPES = {
  penjualan: {
    title: 'Laporan Penjualan',
    fetch: reports.getPenjualan,
    columns: [
      { header: 'Model', key: 'model' },
      { header: 'Warna', key: 'warna' },
      { header: 'Kapasitas', key: 'kapasitas' },
      { header: 'Jumlah Unit', key: 'jumlah_unit' },
      { header: 'Omzet', key: 'omzet', format: 'currency' },
      { header: 'Modal', key: 'modal', format: 'currency' },
      { header: 'Profit', key: 'profit', format: 'currency' },
    ],
  },
  stok: {
    title: 'Laporan Stok',
    fetch: reports.getStok,
    columns: [
      { header: 'Kategori', key: 'kategori' },
      { header: 'Jenis / Status', key: 'jenis' },
      { header: 'Kompatibel Model', key: 'kompatibel_model' },
      { header: 'Qty', key: 'qty' },
      { header: 'Nilai Modal', key: 'nilai_modal', format: 'currency' },
    ],
  },
  service: {
    title: 'Laporan Service',
    fetch: reports.getService,
    columns: [
      { header: 'Jenis', key: 'jenis' },
      { header: 'Teknisi / Tujuan', key: 'teknisi_tujuan' },
      { header: 'Jumlah Selesai', key: 'jumlah_selesai' },
      { header: 'Rata-rata Hari', key: 'rata2_hari' },
      { header: 'Total Biaya', key: 'total_biaya', format: 'currency' },
    ],
  },
  po: {
    title: 'Laporan Purchase Order',
    fetch: reports.getPo,
    columns: [
      { header: 'Supplier', key: 'supplier' },
      { header: 'Status', key: 'status' },
      { header: 'Jumlah PO', key: 'jumlah_po' },
      { header: 'Total Belanja', key: 'total_belanja', format: 'currency' },
    ],
  },
};

function resolveType(jenis) {
  const def = REPORT_TYPES[jenis];
  if (!def) throw new HttpError(404, `Jenis laporan tidak dikenal: ${jenis}`);
  return def;
}

router.get('/:jenis', asyncHandler(async (req, res) => {
  const def = resolveType(req.params.jenis);
  const data = await def.fetch({ from: req.query.from, to: req.query.to });
  res.json(data);
}));

// Cuma izinkan karakter aman untuk nama file (header Content-Disposition) — query 'from'/'to'
// datang dari user, jangan dipakai mentah-mentah supaya tidak bisa menyisipkan karakter aneh.
function safeDatePart(s) {
  return String(s || '').replace(/[^0-9-]/g, '');
}

router.get('/:jenis/export', asyncHandler(async (req, res) => {
  const def = resolveType(req.params.jenis);
  const data = await def.fetch({ from: req.query.from, to: req.query.to });
  const fromSafe = safeDatePart(req.query.from);
  const toSafe = safeDatePart(req.query.to);
  const periode = fromSafe || toSafe
    ? `${fromSafe || 'awal'}_sd_${toSafe || 'sekarang'}`
    : new Date().toISOString().slice(0, 10);
  await sendExcelReport(res, {
    filename: `laporan-${req.params.jenis}-${periode}.xlsx`,
    title: `${def.title} (${req.query.from || '...'} s/d ${req.query.to || '...'})`,
    summary: data.summary,
    columns: def.columns,
    rows: data.rows,
  });
}));

module.exports = router;
