// Meniru nextPoId()/nextCustomerId()/nextRequestId() dari app lama: cari nomor terbesar
// yang sudah dipakai untuk prefix tertentu, lalu +1. Dijalankan di dalam transaksi yang sama
// dengan INSERT supaya tidak race condition antar request.

/**
 * @param {import('pg').PoolClient} client
 * @param {string} table
 * @param {string} column - kolom PK/text yang berisi id berformat "PREFIX-0001" dst
 * @param {string} prefix - termasuk dash, misal 'U', 'PO-', 'CUST-', 'REQ-', 'SVC-', 'EXT-'
 * @param {number} padLength - jumlah digit angka, 0 = tanpa padding
 * @param {number} startAt - nomor awal jika belum ada data sama sekali
 */
async function nextId(client, table, column, prefix, padLength, startAt) {
  const { rows } = await client.query(
    `SELECT ${column} AS id FROM ${table} WHERE ${column} LIKE $1`,
    [`${prefix}%`]
  );
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  const re = new RegExp(`^${escaped}(\\d+)$`);
  let max = startAt;
  for (const row of rows) {
    const m = re.exec(row.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  const numStr = padLength > 0 ? String(next).padStart(padLength, '0') : String(next);
  return `${prefix}${numStr}`;
}

module.exports = {
  nextId,
  nextUnitId: (client) => nextId(client, 'units', 'id', 'U', 4, 0),
  nextDusboxSkuId: (client) => nextId(client, 'dusbox_items', 'sku_id', 'DB-', 4, 0),
  nextAksesorisSkuId: (client) => nextId(client, 'aksesoris_items', 'sku_id', 'ACC-', 4, 0),
  nextSparepartSkuId: (client) => nextId(client, 'sparepart_items', 'sku_id', 'SP-', 4, 0),
  nextReturKlaimId: (client, tipe) =>
    nextId(client, 'retur_klaim', 'id', tipe === 'Retur ke Supplier' ? 'KL-' : 'RT-', 4, 0),
  nextPoId: (client) => nextId(client, 'purchase_orders', 'po_id', 'PO-', 0, 2599),
  nextCustomerId: (client) => nextId(client, 'customers', 'id', 'CUST-', 0, 1000),
  nextRequestId: (client) => nextId(client, 'branch_requests', 'id', 'REQ-', 0, 2000),
  nextServiceUnitId: (client) => nextId(client, 'service_units', 'id', 'SVC-', 3, 0),
  nextServiceSparepartId: (client) => nextId(client, 'service_spareparts', 'id', 'SP-', 6, 0),
  nextExternalUnitId: (client) => nextId(client, 'service_units_external', 'id', 'EXT-', 3, 0),
  nextStockTrxId: (client) => nextId(client, 'stock_transactions', 'id', 'TRX-', 4, 0),
};
