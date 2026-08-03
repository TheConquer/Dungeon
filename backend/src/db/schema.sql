-- Dashboard Inventory & Service iPhone — schema PostgreSQL (Neon)
-- Menggantikan 12 dataset localStorage dari Dashboard_Inventory_iPhone.html

BEGIN;

-- ============================================================
-- MASTER / REFERENSI
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS repair_categories (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  tipe_hp TEXT NOT NULL,
  kategori_kesulitan TEXT NOT NULL CHECK (kategori_kesulitan IN ('LOW','MID','HIGH'))
);

CREATE TABLE IF NOT EXISTS reorder_thresholds (
  model TEXT PRIMARY KEY,
  threshold INT NOT NULL DEFAULT 8
);

-- ============================================================
-- DASHBOARD UTAMA (8 dataset)
-- ============================================================

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  imei TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  warna TEXT NOT NULL,
  kapasitas TEXT NOT NULL,
  supplier_id INT REFERENCES suppliers(id),
  branch_id INT REFERENCES branches(id),
  tanggal_masuk DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Ready Stock','Trouble','Terjual','Flash Sale','Prioritas FIFO')),
  report_qc TEXT NOT NULL CHECK (report_qc IN ('Pending QC','Lolos QC','Gagal QC')),
  catatan TEXT DEFAULT '-',
  harga_beli NUMERIC(14,2) NOT NULL DEFAULT 0,
  harga_jual NUMERIC(14,2) NOT NULL DEFAULT 0,
  tanggal_terjual DATE,
  alasan_flashsale TEXT
);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_branch ON units(branch_id);
CREATE INDEX IF NOT EXISTS idx_units_supplier ON units(supplier_id);
CREATE INDEX IF NOT EXISTS idx_units_model ON units(model);

CREATE TABLE IF NOT EXISTS dusbox_items (
  sku_id TEXT PRIMARY KEY,
  jenis TEXT NOT NULL,
  kompatibel_model TEXT,
  kondisi TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL DEFAULT 'pcs',
  harga_beli NUMERIC(14,2) DEFAULT 0,
  harga_jual NUMERIC(14,2) DEFAULT 0,
  supplier_id INT REFERENCES suppliers(id),
  branch_id INT REFERENCES branches(id),
  reorder_point INT DEFAULT 10,
  tanggal_update DATE DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_dusbox_branch ON dusbox_items(branch_id);

CREATE TABLE IF NOT EXISTS aksesoris_items (
  sku_id TEXT PRIMARY KEY,
  jenis TEXT NOT NULL,
  kompatibel_model TEXT,
  kondisi TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL DEFAULT 'pcs',
  harga_beli NUMERIC(14,2) DEFAULT 0,
  harga_jual NUMERIC(14,2) DEFAULT 0,
  supplier_id INT REFERENCES suppliers(id),
  branch_id INT REFERENCES branches(id),
  reorder_point INT DEFAULT 15,
  tanggal_update DATE DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_aksesoris_branch ON aksesoris_items(branch_id);

CREATE TABLE IF NOT EXISTS sparepart_items (
  sku_id TEXT PRIMARY KEY,
  jenis TEXT NOT NULL,
  kompatibel_model TEXT,
  kondisi TEXT NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL DEFAULT 'pcs',
  harga_beli NUMERIC(14,2) DEFAULT 0,
  harga_jual NUMERIC(14,2) DEFAULT 0,
  supplier_id INT REFERENCES suppliers(id),
  branch_id INT REFERENCES branches(id),
  reorder_point INT DEFAULT 5,
  tanggal_update DATE DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_sparepart_branch ON sparepart_items(branch_id);

CREATE TABLE IF NOT EXISTS retur_klaim (
  id TEXT PRIMARY KEY,
  tipe TEXT NOT NULL CHECK (tipe IN ('Retur Cabang','Retur ke Supplier')),
  kategori_barang TEXT NOT NULL,
  referensi TEXT,
  imei TEXT,
  deskripsi TEXT,
  alasan TEXT,
  tanggal DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Diajukan','Diproses','Disetujui','Disetujui - Refund','Disetujui - Tukar Unit','Disetujui - Potong Harga','Ditolak','Selesai')),
  nilai NUMERIC(14,2) DEFAULT 0,
  pihak_terkait TEXT,
  catatan TEXT,
  -- Kolom di bawah ini khusus buat men-track progres klaim unit iPhone ke supplier
  -- (retur karena Gagal QC) sampai tuntas: kapan target respons supplier, IMEI unit
  -- pengganti kalau ditukar, biaya service yang kadang (jarang) diberikan supplier
  -- meski unitnya tidak diretur (CAS), dan kapan kasusnya benar-benar selesai.
  deadline DATE,
  imei_baru TEXT,
  nilai_cas NUMERIC(14,2) DEFAULT 0,
  tanggal_kembali DATE
);
CREATE INDEX IF NOT EXISTS idx_returklaim_imei ON retur_klaim(imei);
CREATE INDEX IF NOT EXISTS idx_returklaim_status ON retur_klaim(status);

CREATE TABLE IF NOT EXISTS purchase_orders (
  po_id TEXT PRIMARY KEY,
  supplier_id INT REFERENCES suppliers(id),
  model TEXT NOT NULL,
  qty INT NOT NULL,
  gudang_tujuan_id INT REFERENCES branches(id),
  tanggal_order DATE NOT NULL,
  estimasi_tiba DATE,
  tanggal_diterima DATE,
  lead_time_aktual INT,
  status TEXT NOT NULL CHECK (status IN ('Dalam Perjalanan','Diterima','Terlambat')),
  total_nilai NUMERIC(14,2) DEFAULT 0,
  biaya_kirim NUMERIC(14,2) DEFAULT 0,
  biaya_lain NUMERIC(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  no_hp TEXT,
  cabang_asal_id INT REFERENCES branches(id),
  tanggal_daftar DATE NOT NULL,
  catatan TEXT
);

CREATE TABLE IF NOT EXISTS branch_requests (
  id TEXT PRIMARY KEY,
  cabang_peminta_id INT REFERENCES branches(id),
  model TEXT NOT NULL,
  warna TEXT,
  kapasitas TEXT,
  qty INT NOT NULL DEFAULT 1,
  -- Soft-link ke customers.id (bukan FK keras): frontend menyimpan customers dan branch_requests
  -- lewat "bulk resync" terpisah (delete-semua lalu insert-ulang tiap ada perubahan, meniru
  -- localStorage.setItem penuh di app lama) — FK keras di sini akan gagal saat customers
  -- di-resync duluan. Sama seperti service_spareparts.used_by_unit_id.
  customer_id TEXT,
  customer_nama TEXT,
  customer_hp TEXT,
  tanggal_permintaan DATE NOT NULL,
  deadline DATE,
  status TEXT NOT NULL CHECK (status IN ('Menunggu','Terpenuhi','Dibatalkan')),
  catatan TEXT
);
CREATE INDEX IF NOT EXISTS idx_branchreq_customer ON branch_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_branchreq_status ON branch_requests(status);

-- ============================================================
-- UNIT SERVICE (3 dataset)
-- ============================================================

CREATE TABLE IF NOT EXISTS service_units (
  id TEXT PRIMARY KEY,
  series TEXT NOT NULL,
  capacity TEXT,
  color TEXT,
  imei TEXT NOT NULL,
  issue TEXT,
  perbaikan TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('queue','progress','parts','ready','done')),
  tech TEXT,
  keterangan TEXT,
  datein DATE,
  esteta DATE,
  tglkembali DATE
);
CREATE INDEX IF NOT EXISTS idx_svcunits_status ON service_units(status);
CREATE INDEX IF NOT EXISTS idx_svcunits_imei ON service_units(imei);

CREATE TABLE IF NOT EXISTS service_spareparts (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kompatibel TEXT,
  tgl_masuk DATE,
  status TEXT NOT NULL CHECK (status IN ('tersedia','terpakai')),
  -- Soft-link ke service_units.id (bukan FK keras): frontend menyimpan service_spareparts dan
  -- service_units lewat 2 request terpisah (persis alur applySparepartUsage -> saveUnitsDB di app
  -- lama), jadi urutan commit antar tabel tidak dijamin.
  used_by_unit_id TEXT,
  -- SKU sparepart_items (dashboard utama) yang qty-nya ikut naik/turun tiap sparepart ini
  -- ditambah/dipakai/dilepas/dihapus — meniru window.dashboardBridge di app lama. Soft-link juga.
  linked_sku_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_svcsp_status ON service_spareparts(status);
CREATE INDEX IF NOT EXISTS idx_svcsp_usedby ON service_spareparts(used_by_unit_id);

CREATE TABLE IF NOT EXISTS service_units_external (
  id TEXT PRIMARY KEY,
  series TEXT,
  capacity TEXT,
  color TEXT,
  imei TEXT,
  issue TEXT,
  perbaikan TEXT[] NOT NULL DEFAULT '{}',
  tujuan TEXT,
  tglkeluar DATE,
  tglkembali DATE,
  deadline DATE,
  biaya NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('sent','process','returned','done')),
  catatan TEXT,
  pic TEXT
);
CREATE INDEX IF NOT EXISTS idx_svcext_status ON service_units_external(status);

-- ============================================================
-- STIKER BARCODE (1 dataset)
-- ============================================================

CREATE TABLE IF NOT EXISTS sticker_items (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('imei','sparepart','flash')),
  model TEXT,
  kap TEXT,
  warna TEXT,
  imei TEXT,
  nama_part TEXT,
  kode TEXT,
  nama_produk TEXT,
  minus TEXT,
  tanggal TEXT,
  batch TEXT DEFAULT 'baru'
);
CREATE INDEX IF NOT EXISTS idx_sticker_type ON sticker_items(type);

COMMIT;
