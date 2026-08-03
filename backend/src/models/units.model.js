const { pool, withTransaction } = require('../config/db');
const { resolveSupplierId, resolveBranchId } = require('../utils/lookup');
const { nextUnitId } = require('../utils/idGenerator');

const SELECT = `
  SELECT u.id, u.imei, u.model, u.warna, u.kapasitas,
         s.nama AS supplier, b.nama AS gudang,
         u.tanggal_masuk,
         (CURRENT_DATE - u.tanggal_masuk) AS hari_di_gudang,
         u.status, u.report_qc, u.catatan, u.harga_beli, u.harga_jual,
         u.tanggal_terjual, u.alasan_flashsale
  FROM units u
  LEFT JOIN suppliers s ON s.id = u.supplier_id
  LEFT JOIN branches b ON b.id = u.branch_id
`;

async function list() {
  const { rows } = await pool.query(`${SELECT} ORDER BY u.tanggal_masuk DESC, u.id`);
  return rows;
}

async function getByImei(imei) {
  const { rows } = await pool.query(`${SELECT} WHERE u.imei = $1`, [imei]);
  return rows[0] || null;
}

async function getById(id) {
  const { rows } = await pool.query(`${SELECT} WHERE u.id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  return withTransaction(async (client) => {
    const supplierId = await resolveSupplierId(client, data.supplier);
    const branchId = await resolveBranchId(client, data.gudang);
    const id = data.id || (await nextUnitId(client));
    await client.query(
      `INSERT INTO units (id, imei, model, warna, kapasitas, supplier_id, branch_id, tanggal_masuk,
                           status, report_qc, catatan, harga_beli, harga_jual, tanggal_terjual, alasan_flashsale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id, data.imei, data.model, data.warna, data.kapasitas, supplierId, branchId,
        data.tanggal_masuk, data.status || 'Ready Stock', data.report_qc || 'Pending QC',
        data.catatan || '-', data.harga_beli || 0, data.harga_jual || 0,
        data.tanggal_terjual || null, data.alasan_flashsale || null,
      ]
    );
    return id;
  }).then(getById);
}

async function update(id, data) {
  return withTransaction(async (client) => {
    const supplierId = await resolveSupplierId(client, data.supplier);
    const branchId = await resolveBranchId(client, data.gudang);
    await client.query(
      `UPDATE units SET imei=$2, model=$3, warna=$4, kapasitas=$5, supplier_id=$6, branch_id=$7,
                         tanggal_masuk=$8, status=$9, report_qc=$10, catatan=$11, harga_beli=$12,
                         harga_jual=$13, tanggal_terjual=$14, alasan_flashsale=$15
       WHERE id=$1`,
      [
        id, data.imei, data.model, data.warna, data.kapasitas, supplierId, branchId,
        data.tanggal_masuk, data.status, data.report_qc, data.catatan, data.harga_beli,
        data.harga_jual, data.tanggal_terjual || null, data.alasan_flashsale || null,
      ]
    );
  }).then(() => getById(id));
}

async function remove(id) {
  await pool.query('DELETE FROM units WHERE id = $1', [id]);
}

async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM units');
    for (const [idx, r] of rows.entries()) {
      const supplierId = await resolveSupplierId(client, r.supplier);
      const branchId = await resolveBranchId(client, r.gudang);
      const id = r.id || `IMP-U${String(idx + 1).padStart(4, '0')}`;
      await client.query(
        `INSERT INTO units (id, imei, model, warna, kapasitas, supplier_id, branch_id, tanggal_masuk,
                             status, report_qc, catatan, harga_beli, harga_jual, tanggal_terjual, alasan_flashsale)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO UPDATE SET imei=EXCLUDED.imei, model=EXCLUDED.model, warna=EXCLUDED.warna,
           kapasitas=EXCLUDED.kapasitas, supplier_id=EXCLUDED.supplier_id, branch_id=EXCLUDED.branch_id,
           tanggal_masuk=EXCLUDED.tanggal_masuk, status=EXCLUDED.status, report_qc=EXCLUDED.report_qc,
           catatan=EXCLUDED.catatan, harga_beli=EXCLUDED.harga_beli, harga_jual=EXCLUDED.harga_jual,
           tanggal_terjual=EXCLUDED.tanggal_terjual, alasan_flashsale=EXCLUDED.alasan_flashsale`,
        [
          id, String(r.imei || ''), r.model || '', r.warna || '', r.kapasitas || '', supplierId, branchId,
          r.tanggal_masuk, r.status || 'Ready Stock', r.report_qc || 'Pending QC', r.catatan || '-',
          Number(r.harga_beli) || 0, Number(r.harga_jual) || 0, r.tanggal_terjual || null, r.alasan_flashsale || null,
        ]
      );
    }
  }).then(list);
}

// "Sync Harian" — beda dari bulkReplace (yang hapus-semua-lalu-insert-ulang). Ini untuk file
// export harian dari sistem kasir/toko yang berisi SEMUA unit (stok fisik, harga, dll) tapi
// TIDAK membawa status penjualan aplikasi ini (Ready Stock/Terjual/Trouble/dst), Report QC,
// atau Tanggal Terjual — field-field itu murni dikelola lewat aplikasi ini, jadi:
//  - IMEI yang SUDAH ADA di database: field lain di-update dari file, tapi status/report_qc/
//    tanggal_terjual/alasan_flashsale TETAP seperti yang sudah tercatat di aplikasi.
//  - IMEI yang BELUM ADA: dibuat unit baru (status default Ready Stock/Pending QC).
//  - Unit yang ada di database tapi TIDAK muncul di file hari itu: dibiarkan apa adanya,
//    TIDAK dihapus (menghindari risiko data hilang kalau file harian kebetulan tidak lengkap).
async function syncFromFile(rows) {
  return withTransaction(async (client) => {
    let added = 0;
    let updated = 0;
    let skipped = 0;
    for (const r of rows) {
      const imei = String(r.imei || '').trim();
      if (!/^\d{15}$/.test(imei)) { skipped++; continue; }
      const supplierId = await resolveSupplierId(client, r.supplier);
      const branchId = await resolveBranchId(client, r.gudang);
      const { rows: existing } = await client.query('SELECT id FROM units WHERE imei = $1', [imei]);
      if (existing.length) {
        await client.query(
          `UPDATE units SET model=$2, warna=$3, kapasitas=$4, supplier_id=$5, branch_id=$6,
                             tanggal_masuk=$7, harga_beli=$8, harga_jual=$9, catatan=$10
           WHERE imei=$1`,
          [
            imei, r.model || '', r.warna || '', r.kapasitas || '', supplierId, branchId,
            r.tanggal_masuk || null, Number(r.harga_beli) || 0, Number(r.harga_jual) || 0, r.catatan || '-',
          ]
        );
        updated++;
      } else {
        const id = await nextUnitId(client);
        await client.query(
          `INSERT INTO units (id, imei, model, warna, kapasitas, supplier_id, branch_id, tanggal_masuk,
                               status, report_qc, catatan, harga_beli, harga_jual, tanggal_terjual, alasan_flashsale)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Ready Stock','Pending QC',$9,$10,$11,NULL,NULL)`,
          [
            id, imei, r.model || '', r.warna || '', r.kapasitas || '', supplierId, branchId,
            r.tanggal_masuk || null, r.catatan || '-', Number(r.harga_beli) || 0, Number(r.harga_jual) || 0,
          ]
        );
        added++;
      }
    }
    return { added, updated, skipped };
  }).then(async (counts) => ({ ...counts, rows: await list() }));
}

module.exports = { list, getById, getByImei, create, update, remove, bulkReplace, syncFromFile };
