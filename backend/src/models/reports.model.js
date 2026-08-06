const { pool } = require('../config/db');

// Semua fungsi laporan menerima { from, to } (string 'YYYY-MM-DD', boleh kosong = tanpa batas
// bawah/atas) dan mengembalikan { summary, rows } — summary untuk kartu ringkasan di frontend,
// rows untuk tabel detail (dan juga dipakai langsung sebagai baris sheet Excel saat export).

function dateRangeClause(column, from, to, params) {
  const conditions = [];
  if (from) {
    params.push(from);
    conditions.push(`${column} >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`${column} <= $${params.length}`);
  }
  return conditions.length ? `AND ${conditions.join(' AND ')}` : '';
}

// ---------- 1. Laporan Penjualan (unit iPhone terjual) ----------
async function getPenjualan({ from, to } = {}) {
  const params = [];
  const range = dateRangeClause('u.tanggal_terjual', from, to, params);

  const totalRes = await pool.query(
    `SELECT COUNT(*) AS jumlah_unit, COALESCE(SUM(u.harga_jual),0) AS omzet,
            COALESCE(SUM(u.harga_jual - u.harga_beli),0) AS profit
     FROM units u WHERE u.status = 'Terjual' ${range}`,
    params
  );
  const total = totalRes.rows[0];

  const { rows } = await pool.query(
    `SELECT u.model, u.warna, u.kapasitas, COUNT(*) AS jumlah_unit,
            COALESCE(SUM(u.harga_jual),0) AS omzet, COALESCE(SUM(u.harga_beli),0) AS modal,
            COALESCE(SUM(u.harga_jual - u.harga_beli),0) AS profit
     FROM units u WHERE u.status = 'Terjual' ${range}
     GROUP BY u.model, u.warna, u.kapasitas
     ORDER BY omzet DESC`,
    params
  );

  return {
    summary: [
      { label: 'Jumlah Unit Terjual', value: Number(total.jumlah_unit) },
      { label: 'Total Omzet', value: Number(total.omzet) },
      { label: 'Total Profit', value: Number(total.profit) },
    ],
    rows,
  };
}

// ---------- 2. Laporan Stok (kondisi saat ini, tanpa filter tanggal) ----------
async function getStok() {
  const unitRes = await pool.query(
    `SELECT status, COUNT(*) AS jumlah, COALESCE(SUM(harga_beli),0) AS nilai_modal
     FROM units GROUP BY status ORDER BY status`
  );
  const unitSiapJual = unitRes.rows.filter((r) => r.status !== 'Terjual');
  const nilaiStokUnit = unitSiapJual.reduce((a, r) => a + Number(r.nilai_modal), 0);

  const kategoriTables = { Dusbox: 'dusbox_items', Aksesoris: 'aksesoris_items', Sparepart: 'sparepart_items' };
  const rows = [];
  const menipis = [];
  for (const [kategori, table] of Object.entries(kategoriTables)) {
    const { rows: itemRows } = await pool.query(
      `SELECT jenis, kompatibel_model, qty, harga_beli, reorder_point FROM ${table} ORDER BY jenis`
    );
    for (const item of itemRows) {
      rows.push({
        kategori,
        jenis: item.jenis,
        kompatibel_model: item.kompatibel_model || '',
        qty: item.qty,
        nilai_modal: Number(item.qty) * Number(item.harga_beli),
      });
      if (Number(item.qty) <= Number(item.reorder_point)) {
        menipis.push(`${kategori}: ${item.jenis}${item.kompatibel_model ? ' (' + item.kompatibel_model + ')' : ''} — sisa ${item.qty}`);
      }
    }
  }
  const nilaiStokLain = rows.reduce((a, r) => a + r.nilai_modal, 0);

  return {
    summary: [
      { label: 'Nilai Stok Unit iPhone (belum terjual)', value: nilaiStokUnit },
      { label: 'Nilai Stok Dusbox/Aksesoris/Sparepart', value: nilaiStokLain },
      { label: 'Total Nilai Stok', value: nilaiStokUnit + nilaiStokLain },
      { label: 'Item Stok Menipis (≤ reorder point)', value: menipis.length },
    ],
    rows: [
      ...unitSiapJual.map((r) => ({ kategori: 'Unit iPhone', jenis: r.status, kompatibel_model: '', qty: Number(r.jumlah), nilai_modal: Number(r.nilai_modal) })),
      ...rows,
    ],
    menipis,
  };
}

// ---------- 3. Laporan Service (internal + eksternal) ----------
async function getService({ from, to } = {}) {
  const paramsInt = [];
  const rangeInt = dateRangeClause('su.tglkembali', from, to, paramsInt);
  const internalRes = await pool.query(
    `SELECT COALESCE(su.tech,'-') AS tech, COUNT(*) AS jumlah_selesai,
            ROUND(AVG(su.tglkembali - su.datein) FILTER (WHERE su.datein IS NOT NULL), 1) AS rata2_hari
     FROM service_units su WHERE su.status = 'done' ${rangeInt}
     GROUP BY su.tech ORDER BY jumlah_selesai DESC`,
    paramsInt
  );

  const statusInternalRes = await pool.query(
    `SELECT status, COUNT(*) AS jumlah FROM service_units GROUP BY status ORDER BY status`
  );

  const paramsExt = [];
  const rangeExt = dateRangeClause('se.tglkembali', from, to, paramsExt);
  const externalRes = await pool.query(
    `SELECT COALESCE(se.tujuan,'-') AS tujuan, COUNT(*) AS jumlah_selesai,
            COALESCE(SUM(se.biaya),0) AS total_biaya
     FROM service_units_external se WHERE se.status = 'done' ${rangeExt}
     GROUP BY se.tujuan ORDER BY jumlah_selesai DESC`,
    paramsExt
  );

  const statusExternalRes = await pool.query(
    `SELECT status, COUNT(*) AS jumlah FROM service_units_external GROUP BY status ORDER BY status`
  );

  const totalSelesaiInternal = internalRes.rows.reduce((a, r) => a + Number(r.jumlah_selesai), 0);
  const totalSelesaiExternal = externalRes.rows.reduce((a, r) => a + Number(r.jumlah_selesai), 0);

  return {
    summary: [
      { label: 'Unit Selesai (Servis Internal)', value: totalSelesaiInternal },
      { label: 'Unit Selesai (Servis Eksternal)', value: totalSelesaiExternal },
      { label: 'Total Biaya Servis Eksternal', value: externalRes.rows.reduce((a, r) => a + Number(r.total_biaya), 0) },
    ],
    rows: [
      ...internalRes.rows.map((r) => ({ jenis: 'Internal', teknisi_tujuan: r.tech, jumlah_selesai: Number(r.jumlah_selesai), rata2_hari: r.rata2_hari !== null ? Number(r.rata2_hari) : null, total_biaya: null })),
      ...externalRes.rows.map((r) => ({ jenis: 'Eksternal', teknisi_tujuan: r.tujuan, jumlah_selesai: Number(r.jumlah_selesai), rata2_hari: null, total_biaya: Number(r.total_biaya) })),
    ],
    statusInternal: statusInternalRes.rows,
    statusExternal: statusExternalRes.rows,
  };
}

// ---------- 4. Laporan Purchase Order ----------
async function getPo({ from, to } = {}) {
  const params = [];
  const range = dateRangeClause('po.tanggal_order', from, to, params);

  const totalRes = await pool.query(
    `SELECT COUNT(*) AS jumlah_po,
            COALESCE(SUM(po.total_nilai + po.biaya_kirim + po.biaya_lain),0) AS total_belanja
     FROM purchase_orders po WHERE 1=1 ${range}`,
    params
  );

  const { rows } = await pool.query(
    `SELECT s.nama AS supplier, po.status, COUNT(*) AS jumlah_po,
            COALESCE(SUM(po.total_nilai + po.biaya_kirim + po.biaya_lain),0) AS total_belanja
     FROM purchase_orders po LEFT JOIN suppliers s ON s.id = po.supplier_id
     WHERE 1=1 ${range}
     GROUP BY s.nama, po.status
     ORDER BY total_belanja DESC`,
    params
  );

  return {
    summary: [
      { label: 'Jumlah PO', value: Number(totalRes.rows[0].jumlah_po) },
      { label: 'Total Belanja', value: Number(totalRes.rows[0].total_belanja) },
    ],
    rows,
  };
}

module.exports = { getPenjualan, getStok, getService, getPo };
