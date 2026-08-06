// Modul Laporan (Penjualan/Stok/Service/PO) + Riwayat Aktivitas. Berdiri sendiri (tidak
// bergantung ke variabel dashboard.js) supaya urutan <script> di index.html tidak jadi rawan —
// sama seperti pola service.js/sticker.js sebelumnya.
(function () {
  'use strict';

  const fmtRp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  function escHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ============================================================
  // Laporan
  // ============================================================
  const REPORT_DEF = {
    penjualan: {
      hint: 'Filter tanggal berdasarkan tanggal unit terjual.',
      useDate: true,
      columns: [['model', 'Model'], ['warna', 'Warna'], ['kapasitas', 'Kapasitas'], ['jumlah_unit', 'Jumlah Unit'], ['omzet', 'Omzet'], ['modal', 'Modal'], ['profit', 'Profit']],
      money: ['omzet', 'modal', 'profit'],
    },
    stok: {
      hint: 'Laporan stok selalu menampilkan kondisi SAAT INI (tidak dipengaruhi filter tanggal).',
      useDate: false,
      columns: [['kategori', 'Kategori'], ['jenis', 'Jenis / Status'], ['kompatibel_model', 'Kompatibel Model'], ['qty', 'Qty'], ['nilai_modal', 'Nilai Modal']],
      money: ['nilai_modal'],
    },
    service: {
      hint: 'Filter tanggal berdasarkan tanggal unit selesai dikembalikan (status Selesai/Done).',
      useDate: true,
      columns: [['jenis', 'Jenis'], ['teknisi_tujuan', 'Teknisi / Tujuan'], ['jumlah_selesai', 'Jumlah Selesai'], ['rata2_hari', 'Rata-rata Hari'], ['total_biaya', 'Total Biaya']],
      money: ['total_biaya'],
    },
    po: {
      hint: 'Filter tanggal berdasarkan tanggal order Purchase Order.',
      useDate: true,
      columns: [['supplier', 'Supplier'], ['status', 'Status'], ['jumlah_po', 'Jumlah PO'], ['total_belanja', 'Total Belanja']],
      money: ['total_belanja'],
    },
  };
  const TAB_ID = { penjualan: 'lap_tabPenjualan', stok: 'lap_tabStok', service: 'lap_tabService', po: 'lap_tabPo' };

  let currentType = 'penjualan';

  function lapDateParams() {
    return { from: document.getElementById('lapFrom').value, to: document.getElementById('lapTo').value };
  }

  function switchType(jenis) {
    currentType = jenis;
    Object.keys(TAB_ID).forEach((k) => {
      document.getElementById(TAB_ID[k]).classList.toggle('active', k === jenis);
    });
    const cfg = REPORT_DEF[jenis];
    document.getElementById('lapHint').textContent = cfg.hint;
    document.getElementById('lapFrom').style.visibility = cfg.useDate ? 'visible' : 'hidden';
    document.getElementById('lapTo').style.visibility = cfg.useDate ? 'visible' : 'hidden';
    reload();
  }

  async function reload() {
    const cfg = REPORT_DEF[currentType];
    const qs = cfg.useDate ? '?' + new URLSearchParams(lapDateParams()).toString() : '';
    let data;
    try {
      const res = await fetch('/api/reports/' + currentType + qs);
      if (!res.ok) throw new Error('status ' + res.status);
      data = await res.json();
    } catch (e) {
      alert('Gagal memuat laporan: ' + e.message);
      return;
    }
    renderKpi(data.summary || []);
    renderTable(cfg, data.rows || []);
    renderMenipis(data.menipis);
  }

  function renderKpi(summary) {
    const palette = ['c-blue', 'c-amber', 'c-purple', 'c-cyan', 'c-green'];
    document.getElementById('lapKpiGrid').innerHTML = summary.map((s, idx) => {
      const isMoney = /omzet|profit|nilai|belanja|biaya/i.test(s.label);
      const val = isMoney ? fmtRp(s.value) : (typeof s.value === 'number' ? s.value.toLocaleString('id-ID') : s.value);
      return `<div class="kpi ${palette[idx % palette.length]}"><div class="label">${escHtml(s.label)}</div><div class="value" style="font-size:18px;">${val}</div></div>`;
    }).join('');
  }

  function renderTable(cfg, rows) {
    const thead = document.getElementById('lapTableHead');
    const tbody = document.getElementById('lapTableBody');
    thead.innerHTML = '<tr>' + cfg.columns.map((c) => `<th>${escHtml(c[1])}</th>`).join('') + '</tr>';
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${cfg.columns.length}" style="text-align:center;color:var(--muted);">Tidak ada data untuk periode ini.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r) => '<tr>' + cfg.columns.map(([key]) => {
      let val = r[key];
      if (cfg.money.includes(key)) val = fmtRp(val || 0);
      else if (val === null || val === undefined || val === '') val = '-';
      return `<td>${escHtml(val)}</td>`;
    }).join('') + '</tr>').join('');
  }

  function renderMenipis(menipis) {
    const box = document.getElementById('lapMenipisBox');
    if (!menipis || !menipis.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = '';
    box.innerHTML = `<h3 style="margin:0 0 8px;font-size:13px;">⚠️ Stok Menipis (${menipis.length})</h3>` +
      '<div class="alert-list">' + menipis.map((m) => `<div class="alert-item"><span>${escHtml(m)}</span></div>`).join('') + '</div>';
  }

  function exportExcel() {
    const cfg = REPORT_DEF[currentType];
    const qs = cfg.useDate ? '?' + new URLSearchParams(lapDateParams()).toString() : '';
    window.location.href = '/api/reports/' + currentType + '/export' + qs;
  }

  window.laporanApp = { switchType, reload, exportExcel };

  // ============================================================
  // Riwayat Aktivitas
  // ============================================================
  const AKSI_LABEL = { create: 'Tambah', update: 'Ubah', delete: 'Hapus', import: 'Sinkronisasi', restore: 'Restore Backup' };
  const RW_PAGE_SIZE = 50;
  let rwPage = 1;
  let rwTotal = 0;

  async function loadModuleOptions() {
    try {
      const res = await fetch('/api/activity-log/modules');
      if (!res.ok) return;
      const mods = await res.json();
      const sel = document.getElementById('rwModul');
      const current = sel.value;
      sel.innerHTML = '<option value="">Semua Modul</option>' + mods.map((m) => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
      sel.value = current;
    } catch (e) { /* dropdown filter opsional, biarkan daftar default kalau gagal dimuat */ }
  }

  async function rwFetch() {
    const raw = {
      modul: document.getElementById('rwModul').value,
      aksi: document.getElementById('rwAksi').value,
      from: document.getElementById('rwFrom').value,
      to: document.getElementById('rwTo').value,
      page: rwPage,
      pageSize: RW_PAGE_SIZE,
    };
    const params = {};
    Object.keys(raw).forEach((k) => { if (raw[k]) params[k] = raw[k]; });

    let data;
    try {
      const res = await fetch('/api/activity-log?' + new URLSearchParams(params).toString());
      if (!res.ok) throw new Error('status ' + res.status);
      data = await res.json();
    } catch (e) {
      alert('Gagal memuat riwayat: ' + e.message);
      return;
    }

    rwTotal = data.total || 0;
    const tbody = document.getElementById('rwTbody');
    if (!data.rows || !data.rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);">Belum ada riwayat.</td></tr>';
    } else {
      tbody.innerHTML = data.rows.map((r) => {
        const waktu = new Date(r.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
        return `<tr><td>${waktu}</td><td>${escHtml(r.modul)}</td><td>${escHtml(AKSI_LABEL[r.aksi] || r.aksi)}</td><td>${escHtml(r.ringkasan)}</td><td>${escHtml(r.aktor || '-')}</td></tr>`;
      }).join('');
    }
    const totalPages = Math.max(Math.ceil(rwTotal / RW_PAGE_SIZE), 1);
    document.getElementById('rwPageInfo').textContent = `Halaman ${rwPage} dari ${totalPages} (${rwTotal} data)`;
  }

  async function rwReload() {
    rwPage = 1;
    await loadModuleOptions();
    await rwFetch();
  }

  function rwPrevPage() { if (rwPage > 1) { rwPage--; rwFetch(); } }
  function rwNextPage() { if (rwPage * RW_PAGE_SIZE < rwTotal) { rwPage++; rwFetch(); } }

  window.riwayatApp = { reload: rwReload, prevPage: rwPrevPage, nextPage: rwNextPage };
})();
