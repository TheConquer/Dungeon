const { pool } = require('../config/db');

// Dipanggil dari crudFactory dan beberapa route custom (bukan bagian dari alur utama request) —
// selalu dibungkus try/catch di pemanggilnya (lihat logSafe di crudFactory.js) supaya kegagalan
// mencatat log tidak pernah menggagalkan operasi yang sebenarnya diminta user.
async function record({ modul, aksi, ringkasan, aktor }) {
  await pool.query(
    `INSERT INTO activity_log (modul, aksi, ringkasan, aktor) VALUES ($1,$2,$3,$4)`,
    [modul, aksi, ringkasan, aktor || null]
  );
}

async function list({ modul, aksi, from, to, page, pageSize } = {}) {
  const conditions = [];
  const params = [];
  if (modul) {
    params.push(modul);
    conditions.push(`modul = $${params.length}`);
  }
  if (aksi) {
    params.push(aksi);
    conditions.push(`aksi = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`waktu >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`waktu < ($${params.length}::date + interval '1 day')`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await pool.query(`SELECT COUNT(*) FROM activity_log ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const limit = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 200);
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (currentPage - 1) * limit;

  const dataParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT id, waktu, modul, aksi, ringkasan, aktor FROM activity_log
     ${where} ORDER BY waktu DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { rows, total, page: currentPage, pageSize: limit };
}

// Dipakai dropdown filter "Modul" di frontend, supaya daftarnya selalu sesuai isi log
// yang benar-benar ada (bukan daftar hardcode yang bisa basi kalau ada modul baru).
async function distinctModules() {
  const { rows } = await pool.query('SELECT DISTINCT modul FROM activity_log ORDER BY modul');
  return rows.map((r) => r.modul);
}

module.exports = { record, list, distinctModules };
