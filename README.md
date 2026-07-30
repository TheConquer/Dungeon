# Dashboard Inventory & Service iPhone

Migrasi dari `Dashboard_Inventory_iPhone.html` (satu file, localStorage) menjadi web app
Node.js + Express + PostgreSQL (Neon), dengan frontend dipisah jadi file-file HTML/CSS/JS.

## Struktur Proyek

```
backend/    Express API + koneksi PostgreSQL (Neon)
frontend/   File statis (HTML/CSS/JS) yang di-serve langsung oleh backend
render.yaml Konfigurasi deploy Render (1 Web Service)
```

## 1. Setup Database (Neon)

1. Buat project baru di [neon.tech](https://neon.tech).
2. Buka **Connection Details**, salin **connection string** (versi "Pooled connection"),
   bentuknya:
   ```
   postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
   ```
3. Copy `backend/.env.example` jadi `backend/.env`, isi `DATABASE_URL` dengan string di atas.

## 2. Setup Backend (lokal)

```bash
cd backend
npm install
npm run db:init
```

`npm run db:init` menjalankan `schema.sql` (bikin semua tabel) lalu `seed.sql` (data awal —
sample Unit/Dusbox/Aksesoris/dst yang sama dengan yang ada di HTML lama, ditambah 136 data
stiker IMEI asli yang sudah pernah diinput di tool lama, dan 673 kategori repair/tipe HP
untuk Unit Service). Kalau database sudah berisi data (mis. setelah restore backup), jalankan
`npm run db:init -- --no-seed` untuk hanya memastikan schema up to date tanpa menimpa data.

Jalankan servernya:

```bash
npm start
```

Buka `http://localhost:10000` — frontend otomatis ikut ke-serve dari server yang sama.

## 3. Migrasi Data dari File HTML Lama

Kalau kamu punya data asli (bukan cuma sample) di `Dashboard_Inventory_iPhone.html` versi lama:

1. Buka file HTML lama itu di browser.
2. Klik **⬇ Download Backup** — dapat file `backup-dashboard-iphone-*.json`.
3. Buka aplikasi baru ini, klik **Restore Backup**, pilih file itu.
4. Semua 12 dataset (Unit, Dusbox, Aksesoris, Sparepart, Retur & Klaim, Purchase Order,
   Customer, Permintaan Unit DP, Unit Service internal/eksternal, Stiker Barcode) akan
   ditimpa dengan isi file backup, dalam satu transaksi database.

## 4. Deploy ke Render

1. Push project ini ke sebuah repo Git.
2. Di Render, buat **Blueprint** baru dari repo tersebut (akan otomatis membaca `render.yaml`),
   atau buat **Web Service** manual dengan:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
3. Set environment variable `DATABASE_URL` di Render ke connection string Neon (Render tidak
   boleh dibiarkan pakai database bawaan hosting — pastikan ini mengarah ke Neon).
4. Setelah service pertama kali up, jalankan `npm run db:init` **sekali** (lewat Render Shell,
   atau jalankan `node backend/src/db/init.js` dari komputer lokal dengan `DATABASE_URL` yang
   sama) untuk membuat schema + seed awal.

## Arsitektur Singkat

- **Backend** (`backend/src`): REST API penuh per resource (`/api/units`, `/api/dusbox`, dst)
  dengan model/controller/route terpisah, plus `/api/backup` untuk export/import semua data.
- **Frontend** (`frontend/public`): HTML/CSS/JS hasil pisahan dari file asli. Logic
  render/filter/chart/validasi/animasi **tidak diubah** — hanya titik baca/simpan data yang
  diganti dari `localStorage` ke `fetch()` ke API (strategi "bulk resync": tiap kali app lama
  akan menyimpan seluruh array suatu dataset ke localStorage, sekarang array itu dikirim ke
  endpoint `/import` atau `PUT` milik resource terkait). Ini dipilih supaya seluruh fitur yang
  sudah ada (FIFO, forecast, supplier scorecard, cross-link sparepart Unit Service ↔ dashboard,
  cetak stiker barcode, dst) tetap identik perilakunya dengan versi HTML lama.
- Kode di `js/dashboard.js` sengaja tetap **classic script** (bukan ES module) karena banyak
  `onclick="..."` di HTML yang memanggil fungsi top-level secara global.

## Catatan

- Aplikasi ini belum sempat dijalankan/diuji langsung di mesin pengembangan karena Node.js
  tidak terpasang di lingkungan tempat kode ini ditulis — install Node 18+, lalu jalankan
  langkah di atas untuk verifikasi sebelum dipakai produksi.
