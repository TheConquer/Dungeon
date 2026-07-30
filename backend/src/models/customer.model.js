const { pool, withTransaction } = require('../config/db');
const { resolveBranchId } = require('../utils/lookup');
const { nextCustomerId } = require('../utils/idGenerator');

const SELECT = `
  SELECT c.id, c.nama, c.no_hp, b.nama AS cabang_asal, c.tanggal_daftar, c.catatan
  FROM customers c
  LEFT JOIN branches b ON b.id = c.cabang_asal_id
`;

async function list() {
  const { rows } = await pool.query(`${SELECT} ORDER BY c.tanggal_daftar DESC`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`${SELECT} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function create(data) {
  return withTransaction(async (client) => {
    const branchId = await resolveBranchId(client, data.cabang_asal);
    const id = data.id || (await nextCustomerId(client));
    await client.query(
      `INSERT INTO customers (id, nama, no_hp, cabang_asal_id, tanggal_daftar, catatan)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, data.nama, data.no_hp || null, branchId, data.tanggal_daftar, data.catatan || null]
    );
    return id;
  }).then(getById);
}

async function update(id, data) {
  return withTransaction(async (client) => {
    const branchId = await resolveBranchId(client, data.cabang_asal);
    await client.query(
      `UPDATE customers SET nama=$2, no_hp=$3, cabang_asal_id=$4, tanggal_daftar=$5, catatan=$6 WHERE id=$1`,
      [id, data.nama, data.no_hp || null, branchId, data.tanggal_daftar, data.catatan || null]
    );
  }).then(() => getById(id));
}

async function remove(id) {
  await pool.query('DELETE FROM customers WHERE id = $1', [id]);
}

async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM customers');
    for (const r of rows) {
      const branchId = await resolveBranchId(client, r.cabang_asal);
      await client.query(
        `INSERT INTO customers (id, nama, no_hp, cabang_asal_id, tanggal_daftar, catatan) VALUES ($1,$2,$3,$4,$5,$6)`,
        [r.id, r.nama, r.no_hp || null, branchId, r.tanggal_daftar, r.catatan || null]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, update, remove, bulkReplace };
