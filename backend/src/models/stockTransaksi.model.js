// Transaksi keluar-masuk (dan pindah cabang) untuk Dusbox/Aksesoris/Sparepart. Setiap transaksi
// yang tercatat di sini otomatis menyesuaikan qty (atau branch_id, untuk Pindah Cabang) di tabel
// item terkait — jadi qty di panel Dusbox/Aksesoris/Sparepart selalu mengikuti riwayat transaksi,
// bukan diedit manual terpisah lagi (satu sumber kebenaran, sesuai keputusan produk).
const { pool, withTransaction } = require('../config/db');
const { resolveBranchId } = require('../utils/lookup');
const { nextStockTrxId } = require('../utils/idGenerator');
const dusboxModel = require('./dusbox.model');
const aksesorisModel = require('./aksesoris.model');
const sparepartModel = require('./sparepart.model');

const ITEM_MODEL = { Dusbox: dusboxModel, Aksesoris: aksesorisModel, Sparepart: sparepartModel };

const SELECT = `
  SELECT tr.id, tr.kategori, tr.sku_id, tr.nama_item, tr.tipe, tr.qty, tr.tujuan,
         ca.nama AS cabang_asal, ct.nama AS cabang_tujuan, tr.keterangan, tr.tanggal
  FROM stock_transactions tr
  LEFT JOIN branches ca ON ca.id = tr.cabang_asal_id
  LEFT JOIN branches ct ON ct.id = tr.cabang_tujuan_id
`;

async function list() {
  const { rows } = await pool.query(`${SELECT} ORDER BY tr.tanggal DESC, tr.dibuat_pada DESC`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`${SELECT} WHERE tr.id = $1`, [id]);
  return rows[0] || null;
}

function err(msg, status) {
  return Object.assign(new Error(msg), { status });
}

async function create(data) {
  const itemModel = ITEM_MODEL[data.kategori];
  if (!itemModel) throw err('Kategori tidak valid', 400);
  if (!['Masuk', 'Keluar', 'Pindah Cabang'].includes(data.tipe)) throw err('Tipe transaksi tidak valid', 400);
  if (!data.tanggal) throw err('Tanggal wajib diisi', 400);

  const item = await itemModel.getById(data.sku_id);
  if (!item) throw err('SKU tidak ditemukan', 404);

  return withTransaction(async (client) => {
    const id = data.id || (await nextStockTrxId(client));
    const cabangAsalId = item.gudang ? await resolveBranchId(client, item.gudang) : null;
    let cabangTujuanId = null;
    let qty = Number(data.qty) || 0;

    if (data.tipe === 'Masuk') {
      if (qty <= 0) throw err('Qty harus lebih dari 0', 400);
      await itemModel.adjustQty(data.sku_id, qty, client);
    } else if (data.tipe === 'Keluar') {
      if (qty <= 0) throw err('Qty harus lebih dari 0', 400);
      if (qty > item.qty) throw err(`Stok tidak cukup (tersedia ${item.qty})`, 400);
      await itemModel.adjustQty(data.sku_id, -qty, client);
    } else {
      if (!data.cabang_tujuan) throw err('Cabang tujuan wajib diisi', 400);
      cabangTujuanId = await resolveBranchId(client, data.cabang_tujuan);
      await itemModel.setBranch(data.sku_id, cabangTujuanId, client);
      qty = item.qty; // snapshot: seluruh stok SKU ini yang ikut pindah (tidak di-split per cabang)
    }

    const namaItem = `${item.jenis}${item.kompatibel_model ? ' - ' + item.kompatibel_model : ''}`;
    await client.query(
      `INSERT INTO stock_transactions (id, kategori, sku_id, nama_item, tipe, qty, tujuan, cabang_asal_id, cabang_tujuan_id, keterangan, tanggal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, data.kategori, data.sku_id, namaItem, data.tipe, qty, data.tujuan || null,
        cabangAsalId, cabangTujuanId, data.keterangan || null, data.tanggal]
    );
    return id;
  }).then(getById);
}

// Hapus transaksi = koreksi salah catat, jadi efeknya ke qty/cabang item juga dibalik supaya
// tetap satu sumber kebenaran (bukan cuma menghapus baris riwayat tapi qty-nya nyangkut).
async function remove(id) {
  const { rows } = await pool.query('SELECT * FROM stock_transactions WHERE id = $1', [id]);
  const trx = rows[0];
  if (!trx) return;
  const itemModel = ITEM_MODEL[trx.kategori];
  await withTransaction(async (client) => {
    if (itemModel) {
      if (trx.tipe === 'Masuk') await itemModel.adjustQty(trx.sku_id, -trx.qty, client);
      else if (trx.tipe === 'Keluar') await itemModel.adjustQty(trx.sku_id, trx.qty, client);
      else if (trx.tipe === 'Pindah Cabang') await itemModel.setBranch(trx.sku_id, trx.cabang_asal_id, client);
    }
    await client.query('DELETE FROM stock_transactions WHERE id = $1', [id]);
  });
}

module.exports = { list, getById, create, remove };
