const { pool, withTransaction } = require('../config/db');

const SELECT_COLS = `id, type, model, kap, warna, imei,
  nama_part AS "namaPart", kode, nama_produk AS "namaProduk", minus, tanggal, batch`;

async function list(type) {
  if (type) {
    const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sticker_items WHERE type = $1 ORDER BY id`, [type]);
    return rows;
  }
  const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sticker_items ORDER BY id`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sticker_items WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO sticker_items (type, model, kap, warna, imei, nama_part, kode, nama_produk, minus, tanggal, batch)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      data.type, data.model || null, data.kap || null, data.warna || null, data.imei || null,
      data.namaPart || null, data.kode || null, data.namaProduk || null, data.minus || null,
      data.tanggal || null, data.batch || 'baru',
    ]
  );
  return getById(rows[0].id);
}

// Tambah banyak sekaligus (fitur "Tempel dari Excel" per tipe imei/sparepart/flash)
async function createMany(items) {
  return withTransaction(async (client) => {
    const created = [];
    for (const data of items) {
      const { rows } = await client.query(
        `INSERT INTO sticker_items (type, model, kap, warna, imei, nama_part, kode, nama_produk, minus, tanggal, batch)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          data.type, data.model || null, data.kap || null, data.warna || null, data.imei || null,
          data.namaPart || null, data.kode || null, data.namaProduk || null, data.minus || null,
          data.tanggal || null, data.batch || 'baru',
        ]
      );
      created.push(rows[0].id);
    }
    return Promise.all(created.map(getById));
  });
}

async function remove(id) {
  await pool.query('DELETE FROM sticker_items WHERE id = $1', [id]);
}

// Dipakai saveToStorage() di frontend: seluruh daftar stiker di-resync sekali jalan.
// id dipertahankan dari client (angka idCounter lama) supaya urutan cetak tidak berubah.
async function bulkReplace(items) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM sticker_items');
    for (const it of items) {
      await client.query(
        `INSERT INTO sticker_items (id, type, model, kap, warna, imei, nama_part, kode, nama_produk, minus, tanggal, batch)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          it.id, it.type, it.model || null, it.kap || null, it.warna || null, it.imei || null,
          it.namaPart || null, it.kode || null, it.namaProduk || null, it.minus || null,
          it.tanggal || null, it.batch || 'baru',
        ]
      );
    }
    if (items.length) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('sticker_items','id'), COALESCE((SELECT MAX(id) FROM sticker_items), 0) + 1, false)`
      );
    }
  }).then(() => list());
}

async function clear(type) {
  if (type) {
    await pool.query('DELETE FROM sticker_items WHERE type = $1', [type]);
  } else {
    await pool.query('DELETE FROM sticker_items');
  }
}

module.exports = { list, getById, create, createMany, remove, clear, bulkReplace };
