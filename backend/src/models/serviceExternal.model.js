const { pool, withTransaction } = require('../config/db');
const { nextExternalUnitId } = require('../utils/idGenerator');

async function list() {
  const { rows } = await pool.query('SELECT * FROM service_units_external ORDER BY tglkeluar DESC NULLS LAST, id');
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM service_units_external WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(data) {
  return withTransaction(async (client) => {
    const id = data.id || (await nextExternalUnitId(client));
    await client.query(
      `INSERT INTO service_units_external (id, series, capacity, color, imei, issue, perbaikan, tujuan,
                                            tglkeluar, tglkembali, deadline, biaya, status, catatan, pic)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id, data.series || null, data.capacity || null, data.color || null, data.imei || null, data.issue || null,
        data.perbaikan || [], data.tujuan || null, data.tglkeluar || null, data.tglkembali || null,
        data.deadline || null, data.biaya || 0, data.status || 'sent', data.catatan || null, data.pic || null,
      ]
    );
    return id;
  }).then(getById);
}

async function update(id, data) {
  await pool.query(
    `UPDATE service_units_external SET series=$2, capacity=$3, color=$4, imei=$5, issue=$6, perbaikan=$7,
                                        tujuan=$8, tglkeluar=$9, tglkembali=$10, deadline=$11, biaya=$12,
                                        status=$13, catatan=$14, pic=$15
     WHERE id=$1`,
    [
      id, data.series || null, data.capacity || null, data.color || null, data.imei || null, data.issue || null,
      data.perbaikan || [], data.tujuan || null, data.tglkeluar || null, data.tglkembali || null,
      data.deadline || null, data.biaya || 0, data.status, data.catatan || null, data.pic || null,
    ]
  );
  return getById(id);
}

async function remove(id) {
  await pool.query('DELETE FROM service_units_external WHERE id = $1', [id]);
}

async function findByImei(imei) {
  const { rows } = await pool.query('SELECT id FROM service_units_external WHERE imei = $1', [imei]);
  return rows[0] || null;
}

async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM service_units_external');
    for (const r of rows) {
      await client.query(
        `INSERT INTO service_units_external (id, series, capacity, color, imei, issue, perbaikan, tujuan,
                                              tglkeluar, tglkembali, deadline, biaya, status, catatan, pic)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          r.id, r.series || null, r.capacity || null, r.color || null, r.imei || null, r.issue || null,
          r.perbaikan || [], r.tujuan || null, r.tglkeluar || null, r.tglkembali || null,
          r.deadline || null, r.biaya || 0, r.status, r.catatan || null, r.pic || null,
        ]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, update, remove, findByImei, bulkReplace };
