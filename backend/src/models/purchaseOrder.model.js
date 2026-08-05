const { pool, withTransaction } = require('../config/db');
const { resolveSupplierId, resolveBranchId } = require('../utils/lookup');
const { nextPoId } = require('../utils/idGenerator');

const SELECT = `
  SELECT po.po_id, s.nama AS supplier, po.kategori, po.model, po.qty, b.nama AS gudang_tujuan,
         po.tanggal_order, po.estimasi_tiba, po.tanggal_diterima, po.lead_time_aktual,
         po.status, po.total_nilai, po.biaya_kirim, po.biaya_lain
  FROM purchase_orders po
  LEFT JOIN suppliers s ON s.id = po.supplier_id
  LEFT JOIN branches b ON b.id = po.gudang_tujuan_id
`;

async function list() {
  const { rows } = await pool.query(`${SELECT} ORDER BY po.tanggal_order DESC`);
  return rows;
}

async function getById(poId) {
  const { rows } = await pool.query(`${SELECT} WHERE po.po_id = $1`, [poId]);
  return rows[0] || null;
}

async function create(data) {
  return withTransaction(async (client) => {
    const supplierId = await resolveSupplierId(client, data.supplier);
    const branchId = await resolveBranchId(client, data.gudang_tujuan);
    const poId = data.po_id || (await nextPoId(client));
    await client.query(
      `INSERT INTO purchase_orders (po_id, supplier_id, kategori, model, qty, gudang_tujuan_id, tanggal_order,
                                     estimasi_tiba, tanggal_diterima, lead_time_aktual, status, total_nilai, biaya_kirim, biaya_lain)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        poId, supplierId, data.kategori || 'Unit iPhone', data.model, data.qty, branchId, data.tanggal_order,
        data.estimasi_tiba || null, data.tanggal_diterima || null, data.lead_time_aktual || null,
        data.status || 'Dalam Perjalanan', data.total_nilai || 0, data.biaya_kirim || 0, data.biaya_lain || 0,
      ]
    );
    return poId;
  }).then(getById);
}

async function update(poId, data) {
  return withTransaction(async (client) => {
    const supplierId = await resolveSupplierId(client, data.supplier);
    const branchId = await resolveBranchId(client, data.gudang_tujuan);
    await client.query(
      `UPDATE purchase_orders SET supplier_id=$2, kategori=$3, model=$4, qty=$5, gudang_tujuan_id=$6, tanggal_order=$7,
                                   estimasi_tiba=$8, tanggal_diterima=$9, lead_time_aktual=$10, status=$11,
                                   total_nilai=$12, biaya_kirim=$13, biaya_lain=$14
       WHERE po_id=$1`,
      [
        poId, supplierId, data.kategori || 'Unit iPhone', data.model, data.qty, branchId, data.tanggal_order,
        data.estimasi_tiba || null, data.tanggal_diterima || null, data.lead_time_aktual || null,
        data.status, data.total_nilai || 0, data.biaya_kirim || 0, data.biaya_lain || 0,
      ]
    );
  }).then(() => getById(poId));
}

async function remove(poId) {
  await pool.query('DELETE FROM purchase_orders WHERE po_id = $1', [poId]);
}

// Dipakai savePersisted(PERSIST_KEYS.po, purchaseOrders) di frontend: resync seluruh array
// dalam satu transaksi (bukan hanya CSV import) — lihat catatan di frontend/public/js/api.js.
async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM purchase_orders');
    for (const r of rows) {
      const supplierId = await resolveSupplierId(client, r.supplier);
      const branchId = await resolveBranchId(client, r.gudang_tujuan);
      await client.query(
        `INSERT INTO purchase_orders (po_id, supplier_id, kategori, model, qty, gudang_tujuan_id, tanggal_order,
                                       estimasi_tiba, tanggal_diterima, lead_time_aktual, status, total_nilai, biaya_kirim, biaya_lain)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          r.po_id, supplierId, r.kategori || 'Unit iPhone', r.model, r.qty, branchId, r.tanggal_order, r.estimasi_tiba || null,
          r.tanggal_diterima || null, r.lead_time_aktual || null, r.status, r.total_nilai || 0,
          r.biaya_kirim || 0, r.biaya_lain || 0,
        ]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, update, remove, bulkReplace };
