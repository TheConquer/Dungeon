const { Pool, types } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum di-set. Salin backend/.env.example ke backend/.env dan isi dengan connection string Neon.');
}

// node-postgres mengembalikan kolom NUMERIC sebagai string (menghindari kehilangan presisi),
// tapi seluruh frontend (diwarisi dari app lama yang datanya selalu angka JS biasa) melakukan
// aritmatika langsung (mis. penjumlahan total nilai stok) — tanpa ini, "+" akan jadi
// concat string, bukan penjumlahan. 1700 = OID tipe NUMERIC di PostgreSQL.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));
// Tanpa ini, kolom DATE dikonversi node-postgres jadi objek Date lalu di-serialize JSON
// sebagai timestamp UTC penuh (mis. "2026-04-24" -> "2026-04-24T17:00:00.000Z", bahkan bisa
// mundur/maju satu hari tergantung timezone server). App lama selalu pakai string "YYYY-MM-DD"
// polos, jadi kita kembalikan juga sebagai string apa adanya. 1082 = OID tipe DATE.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
