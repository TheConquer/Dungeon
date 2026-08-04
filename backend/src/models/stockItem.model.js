// Factory dipakai oleh dusbox_items, aksesoris_items, sparepart_items — ketiganya
// punya struktur kolom identik (schema.sql), jadi satu factory dipakai 3x lewat
// models/dusbox.model.js, aksesoris.model.js, sparepart.model.js.
const { pool, withTransaction } = require('../config/db');
const { resolveSupplierId, resolveBranchId } = require('../utils/lookup');
const { nextId } = require('../utils/idGenerator');

function nextSkuIdFor(table, idPrefix, padLength) {
  return (client) => nextId(client, table, 'sku_id', idPrefix, padLength, 0);
}

function makeStockItemModel(table, idPrefix, padLength, defaultReorderPoint) {
  const SELECT = `
    SELECT t.sku_id, t.jenis, t.kompatibel_model, t.kondisi, t.qty, t.satuan,
           t.harga_beli, t.harga_jual, s.nama AS supplier, b.nama AS gudang,
           t.reorder_point, t.tanggal_update
    FROM ${table} t
    LEFT JOIN suppliers s ON s.id = t.supplier_id
    LEFT JOIN branches b ON b.id = t.branch_id
  `;

  async function list() {
    const { rows } = await pool.query(`${SELECT} ORDER BY t.jenis`);
    return rows;
  }

  async function getById(skuId) {
    const { rows } = await pool.query(`${SELECT} WHERE t.sku_id = $1`, [skuId]);
    return rows[0] || null;
  }

  const nextSkuId = nextSkuIdFor(table, idPrefix, padLength);

  async function create(data) {
    return withTransaction(async (client) => {
      const supplierId = await resolveSupplierId(client, data.supplier);
      const branchId = await resolveBranchId(client, data.gudang);
      const skuId = data.sku_id || (await nextSkuId(client));
      await client.query(
        `INSERT INTO ${table} (sku_id, jenis, kompatibel_model, kondisi, qty, satuan, harga_beli, harga_jual,
                                supplier_id, branch_id, reorder_point, tanggal_update)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CURRENT_DATE)`,
        [
          skuId, data.jenis, data.kompatibel_model || null, data.kondisi, data.qty || 0,
          data.satuan || 'pcs', data.harga_beli || 0, data.harga_jual || 0, supplierId, branchId,
          data.reorder_point || defaultReorderPoint,
        ]
      );
      return skuId;
    }).then(getById);
  }

  async function update(skuId, data) {
    return withTransaction(async (client) => {
      const supplierId = await resolveSupplierId(client, data.supplier);
      const branchId = await resolveBranchId(client, data.gudang);
      await client.query(
        `UPDATE ${table} SET jenis=$2, kompatibel_model=$3, kondisi=$4, qty=$5, satuan=$6, harga_beli=$7,
                              harga_jual=$8, supplier_id=$9, branch_id=$10, reorder_point=$11, tanggal_update=CURRENT_DATE
         WHERE sku_id=$1`,
        [
          skuId, data.jenis, data.kompatibel_model || null, data.kondisi, data.qty, data.satuan,
          data.harga_beli, data.harga_jual, supplierId, branchId, data.reorder_point,
        ]
      );
    }).then(() => getById(skuId));
  }

  async function remove(skuId) {
    await pool.query(`DELETE FROM ${table} WHERE sku_id = $1`, [skuId]);
  }

  async function adjustQty(skuId, delta, client = pool) {
    if (!skuId) return null;
    await client.query(
      `UPDATE ${table} SET qty = GREATEST(0, qty + $2), tanggal_update = CURRENT_DATE WHERE sku_id = $1`,
      [skuId, delta]
    );
    return getById(skuId);
  }

  // Dipakai transaksi "Pindah Cabang": item ini tidak di-split per cabang (satu SKU = satu
  // lokasi), jadi pindah cabang cuma mengganti branch_id, qty tidak berubah sama sekali.
  async function setBranch(skuId, branchId, client = pool) {
    if (!skuId) return null;
    await client.query(
      `UPDATE ${table} SET branch_id = $2, tanggal_update = CURRENT_DATE WHERE sku_id = $1`,
      [skuId, branchId]
    );
    return getById(skuId);
  }

  async function findLinkedSku(nama, kompatibel, client = pool) {
    // meniru findLinkedSparepartSku: cari SKU yang jenis-nya mengandung nama part & cocok model
    const { rows } = await client.query(
      `${SELECT} WHERE t.jenis ILIKE $1 AND ($2::text IS NULL OR t.kompatibel_model ILIKE $2) LIMIT 1`,
      [`%${nama}%`, kompatibel ? `%${kompatibel}%` : null]
    );
    return rows[0] || null;
  }

  // Meniru dashboardBridge.findOrCreateSkuAndIncrement: dipakai saat Unit Service mendaftarkan
  // sparepart fisik baru. Cari SKU yang cocok (fuzzy), kalau tidak ada buat baru, lalu qty +1.
  async function findOrCreateAndIncrement(client, nama, kompatibel) {
    const { rows: existing } = await client.query(
      `SELECT sku_id FROM ${table} WHERE jenis ILIKE $1 AND ($2::text IS NULL OR kompatibel_model ILIKE $2) LIMIT 1`,
      [`%${nama}%`, kompatibel ? `%${kompatibel}%` : null]
    );
    let skuId = existing[0] && existing[0].sku_id;
    if (!skuId) {
      skuId = 'SP-SVC' + Math.random().toString(36).slice(2, 7).toUpperCase();
      const supplierId = await resolveSupplierId(client, 'Input dari Unit Service');
      const { rows: fallbackGudang } = await client.query(`SELECT branch_id FROM ${table} WHERE branch_id IS NOT NULL LIMIT 1`);
      await client.query(
        `INSERT INTO ${table} (sku_id, jenis, kompatibel_model, kondisi, qty, satuan, harga_beli, harga_jual,
                                supplier_id, branch_id, reorder_point, tanggal_update)
         VALUES ($1,$2,$3,'Original',0,'pcs',0,0,$4,$5,5,CURRENT_DATE)`,
        [skuId, nama || 'Sparepart (Unit Service)', kompatibel || 'Universal', supplierId, (fallbackGudang[0] && fallbackGudang[0].branch_id) || null]
      );
    }
    await client.query(`UPDATE ${table} SET qty = qty + 1, tanggal_update = CURRENT_DATE WHERE sku_id = $1`, [skuId]);
    return skuId;
  }

  async function bulkReplace(rows) {
    return withTransaction(async (client) => {
      await client.query(`DELETE FROM ${table}`);
      for (const [idx, r] of rows.entries()) {
        const supplierId = await resolveSupplierId(client, r.supplier);
        const branchId = await resolveBranchId(client, r.gudang);
        const skuId = r.sku_id || `IMP-${idPrefix}${String(idx + 1).padStart(4, '0')}`;
        await client.query(
          `INSERT INTO ${table} (sku_id, jenis, kompatibel_model, kondisi, qty, satuan, harga_beli, harga_jual,
                                  supplier_id, branch_id, reorder_point, tanggal_update)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CURRENT_DATE)
           ON CONFLICT (sku_id) DO UPDATE SET jenis=EXCLUDED.jenis, kompatibel_model=EXCLUDED.kompatibel_model,
             kondisi=EXCLUDED.kondisi, qty=EXCLUDED.qty, satuan=EXCLUDED.satuan, harga_beli=EXCLUDED.harga_beli,
             harga_jual=EXCLUDED.harga_jual, supplier_id=EXCLUDED.supplier_id, branch_id=EXCLUDED.branch_id,
             reorder_point=EXCLUDED.reorder_point, tanggal_update=CURRENT_DATE`,
          [
            skuId, r.jenis || '', r.kompatibel_model || null, r.kondisi || '', Number(r.qty) || 0, 'pcs',
            Number(r.harga_beli) || 0, Number(r.harga_jual) || 0, supplierId, branchId,
            Number(r.reorder_point) || defaultReorderPoint,
          ]
        );
      }
    }).then(list);
  }

  return { list, getById, create, update, remove, adjustQty, setBranch, findLinkedSku, findOrCreateAndIncrement, bulkReplace };
}

module.exports = { makeStockItemModel };
