const { pool, withTransaction } = require('../config/db');
const { nextServiceUnitId } = require('../utils/idGenerator');
const serviceSpareparts = require('./serviceSparepart.model');

async function list() {
  const { rows } = await pool.query(`
    SELECT su.*, COALESCE(
      (SELECT array_agg(sp.id) FROM service_spareparts sp WHERE sp.used_by_unit_id = su.id), '{}'
    ) AS "sparepartImeis"
    FROM service_units su ORDER BY su.datein DESC NULLS LAST, su.id
  `);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`
    SELECT su.*, COALESCE(
      (SELECT array_agg(sp.id) FROM service_spareparts sp WHERE sp.used_by_unit_id = su.id), '{}'
    ) AS "sparepartImeis"
    FROM service_units su WHERE su.id = $1
  `, [id]);
  return rows[0] || null;
}

function unitLabel(data) {
  return [data.series, data.capacity, data.color].filter(Boolean).join(' ');
}

async function create(data) {
  return withTransaction(async (client) => {
    const id = data.id || (await nextServiceUnitId(client));
    await client.query(
      `INSERT INTO service_units (id, series, capacity, color, imei, issue, perbaikan, status, tech, keterangan, datein, esteta, tglkembali)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        id, data.series, data.capacity || null, data.color || null, data.imei, data.issue || null,
        data.perbaikan || [], data.status || 'queue', data.tech || null, data.keterangan || null,
        data.datein || null, data.esteta || null, data.tglkembali || null,
      ]
    );
    await serviceSpareparts.applyUsageDiff(client, id, unitLabel(data), data.sparepartImeis || [], []);
    return id;
  }).then(getById);
}

async function update(id, data) {
  return withTransaction(async (client) => {
    const { rows: oldRows } = await client.query(
      'SELECT id FROM service_spareparts WHERE used_by_unit_id = $1', [id]
    );
    const oldIds = oldRows.map((r) => r.id);
    await client.query(
      `UPDATE service_units SET series=$2, capacity=$3, color=$4, imei=$5, issue=$6, perbaikan=$7,
                                 status=$8, tech=$9, keterangan=$10, datein=$11, esteta=$12, tglkembali=$13
       WHERE id=$1`,
      [
        id, data.series, data.capacity || null, data.color || null, data.imei, data.issue || null,
        data.perbaikan || [], data.status, data.tech || null, data.keterangan || null,
        data.datein || null, data.esteta || null, data.tglkembali || null,
      ]
    );
    await serviceSpareparts.applyUsageDiff(client, id, unitLabel(data), data.sparepartImeis || [], oldIds);
  }).then(() => getById(id));
}

async function remove(id) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT id FROM service_spareparts WHERE used_by_unit_id = $1', [id]
    );
    for (const row of rows) {
      await serviceSpareparts.applyUsageDiff(client, id, '', [], [row.id]);
    }
    await client.query('DELETE FROM service_units WHERE id = $1', [id]);
  });
}

async function findByImei(imei) {
  const { rows } = await pool.query('SELECT id FROM service_units WHERE imei = $1', [imei]);
  return rows[0] || null;
}

// Dipakai saveUnitsDB() di frontend: seluruh array unit servis (svcApp.units) di-resync apa
// adanya. Status/usedBy sparepart sudah dihitung di client (persis app lama) dan disimpan
// terpisah lewat service_spareparts bulk-replace, jadi di sini cukup raw insert.
async function bulkReplace(rows) {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM service_units');
    for (const r of rows) {
      await client.query(
        `INSERT INTO service_units (id, series, capacity, color, imei, issue, perbaikan, status, tech, keterangan, datein, esteta, tglkembali)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          r.id, r.series, r.capacity || null, r.color || null, r.imei || '', r.issue || null,
          r.perbaikan || [], r.status, r.tech || null, r.keterangan || null,
          r.datein || null, r.esteta || null, r.tglkembali || null,
        ]
      );
    }
  }).then(list);
}

module.exports = { list, getById, create, update, remove, findByImei, bulkReplace };
