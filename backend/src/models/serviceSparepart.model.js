// service_spareparts = sparepart fisik per-item yang dilacak Unit Service (SP-000001 dst),
// beda dari sparepart_items (stok SKU massal dashboard utama). Setiap perubahan status
// tersedia/terpakai di sini ikut menaik/menurunkan qty SKU terkait di sparepart_items —
// meniru window.dashboardBridge dari app lama.
const { pool, withTransaction } = require('../config/db');
const { nextServiceSparepartId } = require('../utils/idGenerator');
const sparepartItems = require('./sparepart.model');

const SELECT = `
  SELECT sp.id AS "imei", sp.nama, sp.kompatibel, sp.tgl_masuk AS "tglMasuk", sp.status,
         sp.used_by_unit_id AS "usedByUnitId", sp.linked_sku_id AS "linkedSkuId",
         CASE WHEN sp.used_by_unit_id IS NULL THEN ''
              ELSE sp.used_by_unit_id || ' - ' || concat_ws(' ', su.series, su.capacity, su.color)
         END AS "usedByLabel"
  FROM service_spareparts sp
  LEFT JOIN service_units su ON su.id = sp.used_by_unit_id
`;

async function list() {
  const { rows } = await pool.query(`${SELECT} ORDER BY sp.tgl_masuk DESC, sp.id`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`${SELECT} WHERE sp.id = $1`, [id]);
  return rows[0] || null;
}

// Dipanggil saat sparepart fisik baru didaftarkan (stok datang) -> +1 di SKU dashboard.
async function create(data) {
  return withTransaction(async (client) => {
    const id = data.id || (await nextServiceSparepartId(client));
    const linkedSkuId = await sparepartItems.findOrCreateAndIncrement(client, data.nama, data.kompatibel);
    await client.query(
      `INSERT INTO service_spareparts (id, nama, kompatibel, tgl_masuk, status, used_by_unit_id, linked_sku_id)
       VALUES ($1,$2,$3,$4,'tersedia',NULL,$5)`,
      [id, data.nama, data.kompatibel || null, data.tgl_masuk || null, linkedSkuId]
    );
    return id;
  }).then(getById);
}

async function ensureLinkedSkuId(client, sp) {
  if (sp.linked_sku_id) return sp.linked_sku_id;
  const sku = await sparepartItems.findLinkedSku(sp.nama, sp.kompatibel, client);
  return sku ? sku.sku_id : null;
}

// Tandai satu sparepart sebagai dipakai oleh sebuah unit servis -> -1 di SKU dashboard
// (hanya jika sebelumnya belum 'terpakai', supaya tidak dobel kurang).
async function markUsed(client, id, unitId, unitLabel) {
  const { rows } = await client.query('SELECT * FROM service_spareparts WHERE id = $1', [id]);
  const sp = rows[0];
  if (!sp) return;
  const wasUsed = sp.status === 'terpakai';
  await client.query(
    `UPDATE service_spareparts SET status='terpakai', used_by_unit_id=$2 WHERE id=$1`,
    [id, unitId]
  );
  if (!wasUsed) {
    const skuId = await ensureLinkedSkuId(client, sp);
    if (skuId) {
      await client.query(`UPDATE service_spareparts SET linked_sku_id=$2 WHERE id=$1`, [id, skuId]);
      await sparepartItems.adjustQty(skuId, -1, client);
    }
  }
}

// Lepas sparepart dari unit servis -> +1 balik di SKU dashboard.
async function release(client, id) {
  const { rows } = await client.query('SELECT * FROM service_spareparts WHERE id = $1', [id]);
  const sp = rows[0];
  if (!sp) return;
  await client.query(
    `UPDATE service_spareparts SET status='tersedia', used_by_unit_id=NULL WHERE id=$1`,
    [id]
  );
  const skuId = await ensureLinkedSkuId(client, sp);
  if (skuId) await sparepartItems.adjustQty(skuId, 1, client);
}

async function releaseStandalone(id) {
  return withTransaction((client) => release(client, id)).then(() => getById(id));
}

// Dipanggil dari service_units.model saat daftar sparepart yang dipakai sebuah unit berubah.
async function applyUsageDiff(client, unitId, unitLabel, newIds, oldIds) {
  const newSet = new Set(newIds || []);
  const oldSet = new Set(oldIds || []);
  for (const id of oldSet) {
    if (!newSet.has(id)) await release(client, id);
  }
  for (const id of newSet) {
    await markUsed(client, id, unitId, unitLabel);
  }
}

async function remove(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM service_spareparts WHERE id = $1', [id]);
    const sp = rows[0];
    if (!sp) return;
    if (sp.status === 'terpakai') {
      const err = new Error('Sparepart ini sedang terpakai di unit servis, lepas dulu sebelum dihapus.');
      err.status = 409;
      throw err;
    }
    const skuId = await ensureLinkedSkuId(client, sp);
    if (skuId) await sparepartItems.adjustQty(skuId, -1, client);
    await client.query('DELETE FROM service_spareparts WHERE id = $1', [id]);
  });
}

// Dipakai saveSparepartDB() di frontend: svcApp menghitung status/usedByUnitId/linkedSkuId
// sendiri di client (persis app lama, lihat applySparepartUsage/resyncSparepartUsage), lalu
// resync seluruh array ke sini apa adanya.
async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM service_spareparts');
    for (const r of rows) {
      await client.query(
        `INSERT INTO service_spareparts (id, nama, kompatibel, tgl_masuk, status, used_by_unit_id, linked_sku_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [r.imei, r.nama, r.kompatibel || null, r.tglMasuk || null, r.status, r.usedByUnitId || null, r.linkedSkuId || null]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, remove, releaseStandalone, applyUsageDiff, bulkReplace };
