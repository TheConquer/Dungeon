const { pool, withTransaction } = require('../config/db');
const { nextReturKlaimId } = require('../utils/idGenerator');

async function list() {
  const { rows } = await pool.query('SELECT * FROM retur_klaim ORDER BY tanggal DESC, id');
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM retur_klaim WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(data) {
  return withTransaction(async (client) => {
    const id = data.id || (await nextReturKlaimId(client, data.tipe));
    await client.query(
      `INSERT INTO retur_klaim (id, tipe, kategori_barang, referensi, imei, deskripsi, alasan, tanggal, status, nilai, pihak_terkait, catatan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id, data.tipe, data.kategori_barang, data.referensi || null, data.imei || null,
        data.deskripsi || null, data.alasan || null, data.tanggal, data.status || 'Diajukan',
        data.nilai || 0, data.pihak_terkait || null, data.catatan || null,
      ]
    );
    return id;
  }).then(getById);
}

async function update(id, data) {
  await pool.query(
    `UPDATE retur_klaim SET tipe=$2, kategori_barang=$3, referensi=$4, imei=$5, deskripsi=$6, alasan=$7,
                             tanggal=$8, status=$9, nilai=$10, pihak_terkait=$11, catatan=$12
     WHERE id=$1`,
    [
      id, data.tipe, data.kategori_barang, data.referensi || null, data.imei || null,
      data.deskripsi || null, data.alasan || null, data.tanggal, data.status,
      data.nilai || 0, data.pihak_terkait || null, data.catatan || null,
    ]
  );
  return getById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM retur_klaim WHERE id = $1', [id]);
}

async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM retur_klaim');
    for (const [idx, r] of rows.entries()) {
      const id = r.id || `IMP-RK${String(idx + 1).padStart(4, '0')}`;
      await client.query(
        `INSERT INTO retur_klaim (id, tipe, kategori_barang, referensi, imei, deskripsi, alasan, tanggal, status, nilai, pihak_terkait, catatan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET tipe=EXCLUDED.tipe, kategori_barang=EXCLUDED.kategori_barang,
           referensi=EXCLUDED.referensi, imei=EXCLUDED.imei, deskripsi=EXCLUDED.deskripsi, alasan=EXCLUDED.alasan,
           tanggal=EXCLUDED.tanggal, status=EXCLUDED.status, nilai=EXCLUDED.nilai,
           pihak_terkait=EXCLUDED.pihak_terkait, catatan=EXCLUDED.catatan`,
        [
          id, r.tipe || 'Retur Cabang', r.kategori_barang || '', r.referensi || null,
          r.imei ? String(r.imei).trim() : null, r.deskripsi || null, r.alasan || null,
          r.tanggal, r.status || 'Diajukan', Number(r.nilai) || 0, r.pihak_terkait || null, r.catatan || null,
        ]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, update, remove, bulkReplace };
