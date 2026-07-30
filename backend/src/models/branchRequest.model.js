const { pool, withTransaction } = require('../config/db');
const { resolveBranchId } = require('../utils/lookup');
const { nextRequestId } = require('../utils/idGenerator');

const SELECT = `
  SELECT r.id, b.nama AS cabang_peminta, r.model, r.warna, r.kapasitas, r.qty,
         r.customer_id, r.customer_nama, r.customer_hp, r.tanggal_permintaan,
         r.deadline, r.status, r.catatan
  FROM branch_requests r
  LEFT JOIN branches b ON b.id = r.cabang_peminta_id
`;

async function list() {
  const { rows } = await pool.query(`${SELECT} ORDER BY r.tanggal_permintaan DESC`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`${SELECT} WHERE r.id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  return withTransaction(async (client) => {
    const branchId = await resolveBranchId(client, data.cabang_peminta);
    const id = data.id || (await nextRequestId(client));
    await client.query(
      `INSERT INTO branch_requests (id, cabang_peminta_id, model, warna, kapasitas, qty, customer_id,
                                     customer_nama, customer_hp, tanggal_permintaan, deadline, status, catatan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id, branchId, data.model, data.warna || null, data.kapasitas || null, data.qty || 1,
        data.customer_id || null, data.customer_nama || null, data.customer_hp || null,
        data.tanggal_permintaan, data.deadline || null, data.status || 'Menunggu', data.catatan || null,
      ]
    );
    return id;
  }).then(getById);
}

async function update(id, data) {
  return withTransaction(async (client) => {
    const branchId = await resolveBranchId(client, data.cabang_peminta);
    await client.query(
      `UPDATE branch_requests SET cabang_peminta_id=$2, model=$3, warna=$4, kapasitas=$5, qty=$6,
                                   customer_id=$7, customer_nama=$8, customer_hp=$9, tanggal_permintaan=$10,
                                   deadline=$11, status=$12, catatan=$13
       WHERE id=$1`,
      [
        id, branchId, data.model, data.warna || null, data.kapasitas || null, data.qty,
        data.customer_id || null, data.customer_nama || null, data.customer_hp || null,
        data.tanggal_permintaan, data.deadline || null, data.status, data.catatan || null,
      ]
    );
  }).then(() => getById(id));
}

async function remove(id) {
  await pool.query('DELETE FROM branch_requests WHERE id = $1', [id]);
}

async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM branch_requests');
    for (const r of rows) {
      const branchId = await resolveBranchId(client, r.cabang_peminta);
      await client.query(
        `INSERT INTO branch_requests (id, cabang_peminta_id, model, warna, kapasitas, qty, customer_id,
                                       customer_nama, customer_hp, tanggal_permintaan, deadline, status, catatan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          r.id, branchId, r.model, r.warna || null, r.kapasitas || null, r.qty || 1,
          r.customer_id || null, r.customer_nama || null, r.customer_hp || null,
          r.tanggal_permintaan, r.deadline || null, r.status, r.catatan || null,
        ]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, update, remove, bulkReplace };
