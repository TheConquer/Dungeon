// Supplier & cabang di app lama adalah teks bebas (bisa ketik nama baru kapan saja).
// Supaya perilaku itu tetap sama setelah dinormalisasi ke tabel master, resolve* akan
// membuat baris master baru otomatis kalau namanya belum ada ("get or create").

async function resolveOrCreate(client, table, nama) {
  if (!nama) return null;
  const trimmed = String(nama).trim();
  if (!trimmed) return null;
  // ON CONFLICT DO UPDATE bisa deadlock kalau dua request bersamaan sama-sama insert nama baru
  // yang berbeda (tiap transaksi mengunci baris dengan urutan berbeda). DO NOTHING + fallback
  // SELECT aman dari itu karena tidak pernah mengunci/menulis baris yang sudah ada.
  const { rows } = await client.query(
    `INSERT INTO ${table} (nama) VALUES ($1) ON CONFLICT (nama) DO NOTHING RETURNING id`,
    [trimmed]
  );
  if (rows[0]) return rows[0].id;
  const { rows: existing } = await client.query(`SELECT id FROM ${table} WHERE nama = $1`, [trimmed]);
  return existing[0].id;
}

const resolveSupplierId = (client, nama) => resolveOrCreate(client, 'suppliers', nama);
const resolveBranchId = (client, nama) => resolveOrCreate(client, 'branches', nama);

module.exports = { resolveSupplierId, resolveBranchId };
