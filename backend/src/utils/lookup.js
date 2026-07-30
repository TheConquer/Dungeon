// Supplier & cabang di app lama adalah teks bebas (bisa ketik nama baru kapan saja).
// Supaya perilaku itu tetap sama setelah dinormalisasi ke tabel master, resolve* akan
// membuat baris master baru otomatis kalau namanya belum ada ("get or create").

async function resolveOrCreate(client, table, nama) {
  if (!nama) return null;
  const trimmed = String(nama).trim();
  if (!trimmed) return null;
  const { rows } = await client.query(
    `INSERT INTO ${table} (nama) VALUES ($1)
     ON CONFLICT (nama) DO UPDATE SET nama = EXCLUDED.nama
     RETURNING id`,
    [trimmed]
  );
  return rows[0].id;
}

const resolveSupplierId = (client, nama) => resolveOrCreate(client, 'suppliers', nama);
const resolveBranchId = (client, nama) => resolveOrCreate(client, 'branches', nama);

module.exports = { resolveSupplierId, resolveBranchId };
