// ---------- Persistensi data (dulu localStorage, sekarang REST API + PostgreSQL) ----------
// Strategi migrasi: setiap kali app lama akan localStorage.setItem() seluruh array suatu
// dataset, kita kirim array itu apa adanya ke endpoint bulk-replace ("/import") milik dataset
// tersebut. Ini membuat SELURUH logic render/CRUD/validasi di bawah tetap 100% seperti aslinya
// (masih memutasi array in-memory secara sinkron) — hanya titik simpan/muat datanya yang diganti.
const PERSIST_KEYS = {
  unit:'dash_inventoryData_v1', dusbox:'dash_dusboxData_v1', aksesoris:'dash_aksesorisData_v1',
  sparepart:'dash_sparepartData_v1', returklaim:'dash_returKlaimData_v1', po:'dash_purchaseOrders_v1',
  customer:'dash_customerDatabase_v1', request:'dash_branchRequests_v1'
};
const PERSIST_ENDPOINTS = {
  dash_inventoryData_v1: '/api/units', dash_dusboxData_v1: '/api/dusbox',
  dash_aksesorisData_v1: '/api/aksesoris', dash_sparepartData_v1: '/api/sparepart',
  dash_returKlaimData_v1: '/api/retur-klaim', dash_purchaseOrders_v1: '/api/purchase-orders',
  dash_customerDatabase_v1: '/api/customers', dash_branchRequests_v1: '/api/branch-requests'
};
async function fetchArray(url){
  try{
    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){ return []; }
}
function savePersisted(key, arr){
  const endpoint = PERSIST_ENDPOINTS[key];
  if(!endpoint) return;
  fetch(endpoint + '/import', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows: arr })
  }).then(res => {
    if(!res.ok) return res.json().catch(()=>({})).then(body => {
      throw new Error(body.error || ('Server menolak (status ' + res.status + ')'));
    });
  }).catch(err => {
    alert('⚠️ Gagal menyimpan perubahan ke database: ' + err.message + '\n\nCoba refresh halaman lalu ulangi — perubahan terakhir kemungkinan belum tersimpan.');
  });
}

let inventoryData = [];
function nextUnitId(){
  const nums = inventoryData.map(d=>{ const m=/^U(\d+)$/.exec(d.id); return m?parseInt(m[1],10):0; });
  const maxNum = nums.length ? Math.max(...nums) : 0;
  return `U${String(maxNum+1).padStart(4,'0')}`;
}
function saveInventoryData(){ savePersisted(PERSIST_KEYS.unit, inventoryData); }
let purchaseOrders = [];
function nextPoId(){
  const nums = purchaseOrders.map(p=>{
    const m = /PO-(\d+)/.exec(p.po_id);
    return m ? parseInt(m[1],10) : 0;
  });
  const maxNum = nums.length ? Math.max(...nums) : 2599;
  return `PO-${maxNum+1}`;
}
function savePurchaseOrders(){ savePersisted(PERSIST_KEYS.po, purchaseOrders); }

let customerDatabase = [];
let branchRequests = [];
function nextCustomerId(){
  const nums = customerDatabase.map(c=>{ const m=/CUST-(\d+)/.exec(c.id); return m?parseInt(m[1],10):0; });
  const maxNum = nums.length ? Math.max(...nums) : 1000;
  return `CUST-${maxNum+1}`;
}
function nextRequestId(){
  const nums = branchRequests.map(r=>{ const m=/REQ-(\d+)/.exec(r.id); return m?parseInt(m[1],10):0; });
  const maxNum = nums.length ? Math.max(...nums) : 2000;
  return `REQ-${maxNum+1}`;
}
function saveCustomerDatabase(){ savePersisted(PERSIST_KEYS.customer, customerDatabase); }
function saveBranchRequests(){ savePersisted(PERSIST_KEYS.request, branchRequests); }

const reorderThresholds = {
  "iPhone 13": 8,
  "iPhone 14": 8,
  "iPhone 15": 8,
  "iPhone 15 Pro": 6,
  "iPhone 15 Pro Max": 4,
  "iPhone 16": 6,
  "iPhone 16 Plus": 6,
  "iPhone 16 Pro": 4,
  "iPhone 16 Pro Max": 4
};
let dusboxData = [];
let aksesorisData = [];
let sparepartData = [];
let returKlaimData = [];
function nextRkId(tipe){
  const prefix = tipe==='Retur ke Supplier' ? 'KL-' : 'RT-';
  const re = new RegExp('^'+prefix+'(\\d+)$');
  const nums = returKlaimData.map(r=>{ const m=re.exec(r.id); return m?parseInt(m[1],10):0; });
  const maxNum = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(maxNum+1).padStart(4,'0')}`;
}
function saveReturKlaimData(){ savePersisted(PERSIST_KEYS.returklaim, returKlaimData); }

// ---------- Transaksi Item (keluar-masuk & pindah cabang Dusbox/Aksesoris/Sparepart) ----------
// BEDA dari dataset lain di atas: ini TIDAK lewat savePersisted/bulk-replace, karena setiap
// transaksi punya efek samping ke tabel item terkait (qty bertambah/berkurang, atau branch_id
// pindah) yang dihitung di SERVER (termasuk validasi "stok tidak cukup"). Bulk-replace array ini
// begitu saja tidak akan menjalankan efek sampingnya, jadi qty item bisa nyimpang dari riwayat.
// Makanya setiap create/delete transaksi manggil endpoint langsung, lalu re-fetch data kategori
// terkait supaya array in-memory (dusboxData dkk, dipakai closure lain) ikut ter-update.
let stockTransaksiData = [];
const STOKTRX_CATEGORY_ARR = { Dusbox: ()=>dusboxData, Aksesoris: ()=>aksesorisData, Sparepart: ()=>sparepartData };
const STOKTRX_CATEGORY_ENDPOINT = { Dusbox: PERSIST_ENDPOINTS[PERSIST_KEYS.dusbox], Aksesoris: PERSIST_ENDPOINTS[PERSIST_KEYS.aksesoris], Sparepart: PERSIST_ENDPOINTS[PERSIST_KEYS.sparepart] };
async function loadStockTransaksiData(){
  const rows = await fetchArray('/api/stock-transaksi');
  stockTransaksiData.length = 0;
  stockTransaksiData.push(...rows);
}
async function refreshStockCategoryData(kategori){
  const arr = STOKTRX_CATEGORY_ARR[kategori]();
  const rows = await fetchArray(STOKTRX_CATEGORY_ENDPOINT[kategori]);
  arr.length = 0;
  arr.push(...rows);
}

const fmtRp = n => 'Rp' + n.toLocaleString('id-ID');
document.getElementById('todayBadge').textContent = 'Update: ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

// ---------- Aturan otomatis: unit yang Gagal QC langsung masuk kategori Trouble ----------
// Terjual dikecualikan (unit yang sudah terjual tidak ditarik balik ke Trouble).
function effectiveStatus(d){
  if(d.report_qc === 'Gagal QC' && d.status !== 'Terjual') return 'Trouble';
  return d.status;
}
function isAutoTrouble(d){
  return effectiveStatus(d) === 'Trouble' && d.status !== 'Trouble';
}
// Satu definisi "perlu prioritas FIFO" dipakai bareng oleh KPI card & panel alert supaya
// angkanya selalu konsisten: status memang "Prioritas FIFO", ATAU sudah >60 hari di gudang
// (asal belum Terjual/Trouble — unit begitu tidak relevan buat antrean jual).
function isFifoPriority(d){
  const es = effectiveStatus(d);
  if(es==='Terjual' || es==='Trouble') return false;
  return d.status==='Prioritas FIFO' || d.hari_di_gudang>60;
}

// ---------- KPI ----------
function computeKPI(data){
  const total = data.length;
  const byStatus = s => data.filter(d=>effectiveStatus(d)===s).length;
  const ready = byStatus('Ready Stock');
  const fifo = data.filter(isFifoPriority).length;
  const flash = byStatus('Flash Sale');
  const trouble = byStatus('Trouble');
  const sold = byStatus('Terjual');
  const qcPending = data.filter(d=>normalizeReportQC(d.report_qc)==='Pending QC').length;
  const nilaiStok = data.filter(d=>effectiveStatus(d)!=='Terjual').reduce((a,d)=>a+d.harga_beli,0);
  return {total, ready, fifo, flash, trouble, sold, qcPending, nilaiStok};
}

function renderKPI(){
  const k = computeKPI(inventoryData);
  const cards = [
    {label:'Total Unit', value:k.total, sub:'seluruh unit tercatat', cls:'c-blue'},
    {label:'Ready Stock', value:k.ready, sub:'siap dijual', cls:'c-green'},
    {label:'Prioritas FIFO', value:k.fifo, sub:'stok usia >60 hari', cls:'c-amber'},
    {label:'Flash Sale', value:k.flash, sub:'unit promo aktif', cls:'c-purple'},
    {label:'Pending QC', value:k.qcPending, sub:'unit baru, belum dicek teknis', cls:'c-amber', onclick:"jumpToSubtab('reportqc')"},
    {label:'Trouble', value:k.trouble, sub:'termasuk otomatis dari Gagal QC', cls:'c-red'},
    {label:'Nilai Stok Aktif', value:fmtRp(k.nilaiStok), sub:'harga beli, non-terjual', cls:'c-cyan'},
  ];
  document.getElementById('kpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi ${c.cls}"${c.onclick?` style="cursor:pointer;" onclick="${c.onclick}"`:''}>
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');

  const qcBadge = document.getElementById('qcTabBadge');
  if(qcBadge){
    if(k.qcPending>0){ qcBadge.textContent = k.qcPending; qcBadge.style.display = 'inline-block'; }
    else { qcBadge.style.display = 'none'; }
  }
}

function jumpToSubtab(name){
  document.querySelector(`.subtab-btn[data-subtab="${name}"]`)?.click();
}
window.jumpToSubtab = jumpToSubtab;

function jumpToTab(name){
  document.querySelector(`#tabNav .tab-btn[data-tab="${name}"]`)?.click();
}
window.jumpToTab = jumpToTab;

// ---------- Dashboard Utama (rangkuman seluruh panel jadi satu landing page) ----------
// Unit Service & Stiker Barcode adalah modul terpisah (service.js/sticker.js, masing-masing
// IIFE sendiri dengan bootstrap async sendiri) — datanya diambil lewat svcApp.getSummary()/
// stkApp.getSummary() yang mereka ekspos khusus untuk ini, bukan baca variabel internal langsung.
function renderDashboardUtama(){
  const grid = document.getElementById('dashUtamaGrandKpiGrid');
  const menuGrid = document.getElementById('dashUtamaMenuGrid');
  if(!grid || !menuGrid) return;

  const kUnit = computeKPI(inventoryData);
  const kDusbox = dusboxDash.computeKpi();
  const kAksesoris = aksesorisDash.computeKpi();
  const kSparepart = sparepartDash.computeKpi();
  const nilaiStokBarang = kDusbox.totalNilai + kAksesoris.totalNilai + kSparepart.totalNilai;
  const totalNilaiInventory = kUnit.nilaiStok + nilaiStokBarang;

  // Unit aktif (bukan k.total) supaya konsisten dengan kartu "Unit iPhone" di Ringkasan
  // Gabungan Seluruh Kategori paling atas halaman — dua-duanya sengaja tidak menghitung
  // unit yang sudah Terjual, biar tidak membingungkan (dua angka beda utk label yang sama).
  const unitAktif = inventoryData.filter(d=>effectiveStatus(d)!=='Terjual').length;
  const rkBelumSelesai = returKlaimData.filter(r=>['Diajukan','Diproses'].includes(r.status)).length;
  const svc = window.svcApp && window.svcApp.getSummary ? window.svcApp.getSummary() : {internalTotal:0,internalQueue:0,internalProgress:0,internalDone:0,externalTotal:0,externalProcess:0,externalDone:0};
  const stk = window.stkApp && window.stkApp.getSummary ? window.stkApp.getSummary() : {total:0,imei:0,sparepart:0,flash:0,baru:0};
  const svcDalamProses = svc.internalQueue + svc.internalProgress + svc.externalProcess;

  const grandCards = [
    {label:'Total Nilai Inventory', value:fmtRp(totalNilaiInventory), sub:'seluruh stok barang', cls:'c-green'},
    {label:'Unit Trouble', value:kUnit.trouble, sub:'perlu tindak lanjut', cls:'c-red'},
    {label:'Retur & Klaim Aktif', value:rkBelumSelesai, sub:'belum selesai', cls:'c-amber'},
    {label:'Unit Service Dalam Proses', value:svcDalamProses, sub:'internal + eksternal', cls:'c-purple'},
  ];
  grid.innerHTML = grandCards.map(c=>`
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');

  const menuCards = [
    {tab:'unit', label:'📱 Unit iPhone', value:unitAktif+' unit aktif', sub:`${kUnit.ready} Ready · ${kUnit.trouble} Trouble · ${kUnit.qcPending} Pending QC`, cls:'c-blue'},
    {tab:'dusbox', label:'📦 Dusbox', value:kDusbox.totalQty+' pcs', sub:`${kDusbox.totalSku} SKU · ${fmtRp(kDusbox.totalNilai)}`, cls:'c-blue'},
    {tab:'aksesoris', label:'🔌 Aksesoris', value:kAksesoris.totalQty+' pcs', sub:`${kAksesoris.totalSku} SKU · ${fmtRp(kAksesoris.totalNilai)}`, cls:'c-purple'},
    {tab:'sparepart', label:'🔧 Sparepart', value:kSparepart.totalQty+' pcs', sub:`${kSparepart.totalSku} SKU · ${fmtRp(kSparepart.totalNilai)}`, cls:'c-cyan'},
    {tab:'stoktrx', label:'🔀 Transaksi Item', value:stockTransaksiData.length+' transaksi', sub:'Masuk/Keluar/Pindah Cabang', cls:'c-amber'},
    {tab:'returklaim', label:'🔄 Retur & Klaim', value:returKlaimData.length+' kasus', sub:`${rkBelumSelesai} belum selesai`, cls:'c-red'},
    {tab:'service', label:'🛠️ Unit Service', value:(svc.internalTotal+svc.externalTotal)+' unit', sub:`${svcDalamProses} sedang diproses`, cls:'c-green'},
    {tab:'stiker', label:'🏷️ Stiker Barcode', value:stk.total+' stiker', sub:`${stk.imei} IMEI · ${stk.sparepart} Sparepart · ${stk.flash} Flashsale`, cls:'c-purple'},
  ];
  menuGrid.innerHTML = menuCards.map(c=>`
    <div class="kpi ${c.cls}" style="cursor:pointer;" onclick="jumpToTab('${c.tab}')">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}
window.renderDashboardUtama = renderDashboardUtama;

// ---------- Charts ----------
Chart.defaults.color = '#8b93ab';
Chart.defaults.font.family = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto";
const gridColor = 'rgba(139,147,171,.12)';

// helper: (re)create a Chart on a canvas, destroying any previous instance first
// so renderEverything() can safely be called again after a data import.
function makeChart(canvasId, config){
  const existing = (typeof Chart.getChart === 'function') ? Chart.getChart(canvasId) : null;
  if(existing) existing.destroy();
  return new Chart(document.getElementById(canvasId), config);
}

function countBy(arr, key){
  const m = {};
  arr.forEach(d=>{ m[d[key]] = (m[d[key]]||0)+1; });
  return m;
}
function countByStatus(arr){
  const m = {};
  arr.forEach(d=>{ const s=effectiveStatus(d); m[s] = (m[s]||0)+1; });
  return m;
}

function renderCharts(){
  const modelCounts = countBy(inventoryData,'model');
  makeChart('chartModel', {
    type:'bar',
    data:{ labels:Object.keys(modelCounts), datasets:[{ data:Object.values(modelCounts), backgroundColor:'#3b82f6', borderRadius:5 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ x:{ticks:{maxRotation:60,minRotation:60,font:{size:9}}, grid:{display:false}}, y:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}} } }
  });

  const statusCounts = countByStatus(inventoryData);
  const statusColors = {'Ready Stock':'#22c55e','Prioritas FIFO':'#f59e0b','Flash Sale':'#a855f7','Trouble':'#ef4444','Terjual':'#3b82f6'};
  makeChart('chartStatus', {
    type:'doughnut',
    data:{ labels:Object.keys(statusCounts), datasets:[{ data:Object.values(statusCounts), backgroundColor:Object.keys(statusCounts).map(k=>statusColors[k]), borderColor:'#131a2b', borderWidth:2 }]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10,font:{size:10}, padding:8}}} }
  });

  const gudangCounts = countBy(inventoryData,'gudang');
  makeChart('chartGudang', {
    type:'bar',
    data:{ labels:Object.keys(gudangCounts), datasets:[{ data:Object.values(gudangCounts), backgroundColor:'#06b6d4', borderRadius:5 }]},
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
  });

  const qcCounts = {};
  inventoryData.forEach(d=>{ const k=normalizeReportQC(d.report_qc); qcCounts[k]=(qcCounts[k]||0)+1; });
  const qcColors = {'Lolos QC':'#22c55e','Pending QC':'#f59e0b','Gagal QC':'#ef4444'};
  document.getElementById('qcSummary').textContent = Object.entries(qcCounts).map(([k,v])=>`${k}: ${v}`).join(' · ');
  makeChart('chartQC', {
    type:'bar',
    data:{ labels:Object.keys(qcCounts), datasets:[{ data:Object.values(qcCounts), backgroundColor:Object.keys(qcCounts).map(k=>qcColors[k]), borderRadius:5 }]},
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}}, y:{grid:{display:false}} } }
  });
}

// ---------- FIFO alert list ----------
function renderFifo(){
  const fifoUnits = inventoryData.filter(isFifoPriority)
    .sort((a,b)=>b.hari_di_gudang-a.hari_di_gudang);
  document.getElementById('fifoCount').textContent = `${fifoUnits.length} unit perlu prioritas (per IMEI)`;
  document.getElementById('fifoList').innerHTML = fifoUnits.map(u=>`
    <div class="alert-item">
      <div>
        <div class="a-model">${u.model} · ${u.warna} · ${u.kapasitas}</div>
        <div style="color:var(--muted)">IMEI: ${u.imei} · ${u.id} · ${u.gudang}</div>
      </div>
      <div class="a-days">${u.hari_di_gudang} hari</div>
    </div>`).join('') || '<div style="color:var(--muted);font-size:12px;">Tidak ada unit yang perlu diprioritaskan.</div>';
}

// ---------- Table ----------
let sortKey = 'hari_di_gudang', sortDir = -1;

function pillClass(status){
  return { 'Ready Stock':'pill-ready','Prioritas FIFO':'pill-fifo','Flash Sale':'pill-flash','Trouble':'pill-trouble','Terjual':'pill-sold' }[status] || '';
}
// Unit yang tidak ditandai eksplisit "Gagal QC" atau "Pending QC" otomatis dianggap "Lolos QC"
// (termasuk kalau kolomnya kosong/typo/tidak dikenal saat import) — supaya tiap unit selalu
// punya salah satu dari 3 status QC yang jelas, bukan status kosong/ambigu.
function normalizeReportQC(v){
  return (v==='Gagal QC' || v==='Pending QC') ? v : 'Lolos QC';
}

function qcClass(qc){
  return { 'Lolos QC':'qc-lolos','Pending QC':'qc-pending','Gagal QC':'qc-gagal' }[normalizeReportQC(qc)];
}

function populateFilterOptions(){
  const models = [...new Set(inventoryData.map(d=>d.model))].sort();
  const gudangs = [...new Set(inventoryData.map(d=>d.gudang))].sort();
  const suppliers = [...new Set(inventoryData.map(d=>d.supplier))].sort();
  document.getElementById('fModel').innerHTML = '<option value="">Semua Model</option>' + models.map(m=>`<option value="${m}">${m}</option>`).join('');
  document.getElementById('fGudang').innerHTML = '<option value="">Semua Cabang</option>' + gudangs.map(g=>`<option value="${g}">${g}</option>`).join('');
  document.getElementById('fSupplier').innerHTML = '<option value="">Semua Supplier</option>' + suppliers.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function getFiltered(){
  const search = document.getElementById('fSearch').value.toLowerCase();
  const model = document.getElementById('fModel').value;
  const status = document.getElementById('fStatus').value;
  const gudang = document.getElementById('fGudang').value;
  const supplier = document.getElementById('fSupplier').value;
  const qc = document.getElementById('fQC').value;

  let rows = inventoryData.filter(d=>{
    if(model && d.model!==model) return false;
    if(status && effectiveStatus(d)!==status) return false;
    if(gudang && d.gudang!==gudang) return false;
    if(supplier && d.supplier!==supplier) return false;
    if(qc && normalizeReportQC(d.report_qc)!==qc) return false;
    if(search){
      const hay = `${d.model} ${d.warna} ${d.imei} ${d.supplier} ${d.id}`.toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  });

  rows.sort((a,b)=>{
    let va=a[sortKey], vb=b[sortKey];
    if(typeof va==='string') va=va.toLowerCase();
    if(typeof vb==='string') vb=vb.toLowerCase();
    if(va<vb) return -1*sortDir;
    if(va>vb) return 1*sortDir;
    return 0;
  });
  return rows;
}

// ---------- Keterkaitan lintas-tab (Report QC, Unit Service, Retur & Klaim) ----------
// Ekstrak IMEI dari field referensi bebas-teks Retur & Klaim, format lama: "U0037 / IMEI 355273534146542".
function extractImeiFromRef(referensi){
  const m = String(referensi||'').match(/IMEI\s*(\d{6,})/i);
  return m ? m[1] : null;
}
function findRkByImei(imei){
  if(!imei) return null;
  return returKlaimData.find(r => r.kategori_barang==='Unit iPhone' && (r.imei ? String(r.imei).trim()===String(imei).trim() : extractImeiFromRef(r.referensi)===String(imei).trim())) || null;
}
// Highlight + scroll ke baris tujuan setelah lompat antar tab/subtab — bikin transisinya kerasa.
function highlightRow(tbodyId, imei){
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      const tbody = document.getElementById(tbodyId);
      if(!tbody) return;
      const row = [...tbody.querySelectorAll('tr')].find(tr => tr.textContent.includes(imei));
      if(!row) return;
      row.scrollIntoView({behavior:'smooth', block:'center'});
      row.classList.remove('row-highlight'); void row.offsetWidth; row.classList.add('row-highlight');
    }, 80);
  });
}
window.highlightRow = highlightRow;

function jumpToDataUnit(imei){
  document.querySelector('#tabNav .tab-btn[data-tab="unit"]').click();
  document.querySelector('#subtabNav .subtab-btn[data-subtab="dataunit"]').click();
  document.getElementById('fSearch').value = imei;
  renderTable();
  highlightRow('tbody', imei);
}
window.jumpToDataUnit = jumpToDataUnit;

function jumpToReportQC(imei){
  document.querySelector('#tabNav .tab-btn[data-tab="unit"]').click();
  document.querySelector('#subtabNav .subtab-btn[data-subtab="reportqc"]').click();
  document.getElementById('qcDateFSupplier').value = '';
  document.getElementById('qcDateFStatus').value = '';
  renderQcByDate();
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      const wrap = document.getElementById('qcByDateWrap');
      const row = [...wrap.querySelectorAll('tbody tr')].find(tr=>tr.textContent.includes(imei));
      if(!row) return;
      const details = row.closest('details');
      if(details) details.open = true;
      row.scrollIntoView({behavior:'smooth', block:'center'});
      row.classList.remove('row-highlight'); void row.offsetWidth; row.classList.add('row-highlight');
    }, 80);
  });
}
window.jumpToReportQC = jumpToReportQC;

function jumpToUnitService(imei){
  document.querySelector('#tabNav .tab-btn[data-tab="service"]').click();
  if(window.svcApp && window.svcApp.jumpFromDashboard) window.svcApp.jumpFromDashboard(imei);
}
window.jumpToUnitService = jumpToUnitService;

function jumpToRetur(imei){
  document.querySelector('#tabNav .tab-btn[data-tab="returklaim"]').click();
  document.getElementById('rkSearch').value = imei;
  renderRkTable();
  highlightRow('rkTbody', imei);
}
window.jumpToRetur = jumpToRetur;

function keterkaitanBadges(d){
  const badges = [];
  const svcInfo = window.svcApp && window.svcApp.findByImei ? window.svcApp.findByImei(d.imei) : null;
  if(svcInfo) badges.push(`<span class="pill link-badge" onclick="jumpToUnitService('${d.imei}')" title="Lihat di Unit Service">🛠️ Diservice</span>`);
  const rk = findRkByImei(d.imei);
  if(rk) badges.push(`<span class="pill link-badge" onclick="jumpToRetur('${d.imei}')" title="Lihat di Retur & Klaim">↩️ Retur</span>`);
  return badges.join(' ') || '<span style="color:var(--muted);">-</span>';
}

function renderTable(){
  const rows = getFiltered();
  document.getElementById('resultCount').textContent = `Menampilkan ${rows.length} dari ${inventoryData.length} unit`;
  document.getElementById('tbody').innerHTML = rows.map(d=>{
    const es = effectiveStatus(d);
    const auto = isAutoTrouble(d);
    return `
    <tr>
      <td>${d.imei}</td>
      <td>${d.model}</td>
      <td>${d.warna}</td>
      <td>${d.kapasitas}</td>
      <td>${d.supplier}</td>
      <td>${d.gudang}</td>
      <td>${d.tanggal_masuk}</td>
      <td>${d.hari_di_gudang}</td>
      <td><span class="pill ${pillClass(es)}">${es}</span>${auto?' <span style="color:var(--muted);font-size:10px;">(auto: Gagal QC)</span>':''}</td>
      <td><span class="${qcClass(d.report_qc)} link-badge" onclick="jumpToReportQC('${d.imei}')" title="Lihat di Report QC">${normalizeReportQC(d.report_qc)}</span></td>
      <td>${keterkaitanBadges(d)}</td>
      <td>${d.catatan}</td>
      <td>${fmtRp(d.harga_beli)}</td>
      <td>${fmtRp(d.harga_jual)}</td>
      <td><div class="row-actions"><button type="button" onclick="openUnitModal('${d.id}')">Edit</button><button type="button" class="del" onclick="deleteUnitConfirm('${d.id}')">Hapus</button></div></td>
    </tr>`;}).join('');
  document.getElementById('tableCount').textContent = `(${inventoryData.length} unit total)`;
}

// ---------- Unit: Tambah/Edit/Hapus (modal) ----------
function populateUnitModalDatalists(){
  const models = Object.keys(reorderThresholds);
  const suppliers = [...new Set(inventoryData.map(d=>d.supplier))].sort();
  const gudangs = [...new Set(inventoryData.map(d=>d.gudang))].sort();
  document.getElementById('unitModelList').innerHTML = models.map(m=>`<option value="${m}">`).join('');
  document.getElementById('unitSupplierList').innerHTML = suppliers.map(s=>`<option value="${s}">`).join('');
  document.getElementById('unitGudangList').innerHTML = gudangs.map(g=>`<option value="${g}">`).join('');
}

function openUnitModal(id){
  populateUnitModalDatalists();
  const isEdit = !!id;
  document.getElementById('unitModalTitle').textContent = isEdit ? 'Edit Unit' : 'Tambah Unit';
  document.getElementById('unitFormId').value = id || '';
  if(isEdit){
    const d = inventoryData.find(x=>x.id===id);
    if(!d) return;
    document.getElementById('unitFImei').value = d.imei;
    document.getElementById('unitFModel').value = d.model;
    document.getElementById('unitFKapasitas').value = d.kapasitas;
    document.getElementById('unitFWarna').value = d.warna;
    document.getElementById('unitFSupplier').value = d.supplier;
    document.getElementById('unitFGudang').value = d.gudang;
    document.getElementById('unitFTglMasuk').value = d.tanggal_masuk;
    document.getElementById('unitFStatus').value = d.status;
    document.getElementById('unitFReportQc').value = d.report_qc;
    document.getElementById('unitFTglTerjual').value = d.tanggal_terjual || '';
    document.getElementById('unitFHargaBeli').value = d.harga_beli;
    document.getElementById('unitFHargaJual').value = d.harga_jual;
    document.getElementById('unitFCatatan').value = d.catatan || '';
    document.getElementById('unitFAlasanFlashsale').value = d.alasan_flashsale || '';
  }else{
    document.getElementById('unitFImei').value = '';
    document.getElementById('unitFModel').value = '';
    document.getElementById('unitFKapasitas').value = '';
    document.getElementById('unitFWarna').value = '';
    document.getElementById('unitFSupplier').value = '';
    document.getElementById('unitFGudang').value = '';
    document.getElementById('unitFTglMasuk').value = REF_TODAY_STR;
    document.getElementById('unitFStatus').value = 'Ready Stock';
    document.getElementById('unitFReportQc').value = 'Pending QC';
    document.getElementById('unitFTglTerjual').value = '';
    document.getElementById('unitFHargaBeli').value = '';
    document.getElementById('unitFHargaJual').value = '';
    document.getElementById('unitFCatatan').value = '';
    document.getElementById('unitFAlasanFlashsale').value = '';
  }
  document.getElementById('unitModalOverlay').classList.add('open');
}
window.openUnitModal = openUnitModal;

function closeUnitModal(){
  document.getElementById('unitModalOverlay').classList.remove('open');
}
window.closeUnitModal = closeUnitModal;

function saveUnitForm(){
  const id = document.getElementById('unitFormId').value;
  const imei = document.getElementById('unitFImei').value.trim();
  const model = document.getElementById('unitFModel').value.trim();
  const kapasitas = document.getElementById('unitFKapasitas').value.trim();
  const warna = document.getElementById('unitFWarna').value.trim();
  const supplier = document.getElementById('unitFSupplier').value.trim();
  const gudang = document.getElementById('unitFGudang').value.trim();
  const tglMasuk = document.getElementById('unitFTglMasuk').value;
  const status = document.getElementById('unitFStatus').value;
  const reportQc = document.getElementById('unitFReportQc').value;
  const tglTerjual = document.getElementById('unitFTglTerjual').value || null;
  const hargaBeli = parseFloat(document.getElementById('unitFHargaBeli').value) || 0;
  const hargaJual = parseFloat(document.getElementById('unitFHargaJual').value) || 0;
  const catatan = document.getElementById('unitFCatatan').value.trim() || '-';
  const alasanFlashsale = document.getElementById('unitFAlasanFlashsale').value.trim() || null;

  if(!/^\d{15}$/.test(imei) || !model || !kapasitas || !warna || !supplier || !gudang || !tglMasuk){
    alert('Lengkapi dulu IMEI (15 digit), Model, Kapasitas, Warna, Supplier, Gudang & Tanggal Masuk.');
    return;
  }
  const dup = inventoryData.find(d=>d.imei===imei && d.id!==id);
  if(dup){
    alert(`IMEI ini sudah dipakai unit ${dup.id}.`);
    return;
  }

  const payload = {
    imei, model, kapasitas, warna, supplier, gudang, tanggal_masuk: tglMasuk,
    status, report_qc: reportQc, tanggal_terjual: status==='Terjual' ? tglTerjual : null,
    harga_beli: hargaBeli, harga_jual: hargaJual, catatan,
    alasan_flashsale: status==='Flash Sale' ? alasanFlashsale : null,
  };

  if(id){
    const d = inventoryData.find(x=>x.id===id);
    if(!d){ closeUnitModal(); return; }
    Object.assign(d, payload);
  }else{
    inventoryData.push(Object.assign({ id: nextUnitId() }, payload));
  }

  saveInventoryData();
  closeUnitModal();
  renderEverything();
}
window.saveUnitForm = saveUnitForm;

function deleteUnitConfirm(id){
  if(!confirm(`Hapus unit ${id}? Tindakan ini tidak bisa dibatalkan.`)) return;
  const idx = inventoryData.findIndex(d=>d.id===id);
  if(idx===-1) return;
  inventoryData.splice(idx,1);
  saveInventoryData();
  renderEverything();
}
window.deleteUnitConfirm = deleteUnitConfirm;

// [data-key] narrows this to our own sortable table headers only — the merged Unit Service
// tool's tables use a nested <span data-key> for its own sort indicators, not on the <th> itself,
// so this selector never touches its headers.
document.querySelectorAll('thead th[data-key]').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if(sortKey===key) sortDir *= -1; else { sortKey=key; sortDir=1; }
    renderTable();
  });
});

['fSearch','fModel','fStatus','fGudang','fSupplier','fQC'].forEach(id=>{
  document.getElementById(id).addEventListener('input', renderTable);
});

// ---------- Reorder Alert ----------
function stokTersedia(model){
  return inventoryData.filter(d=>{
    if(d.model!==model) return false;
    const es = effectiveStatus(d);
    return es==='Ready Stock' || es==='Prioritas FIFO' || es==='Flash Sale';
  }).length;
}

function renderReorder(){
  const rows = Object.keys(reorderThresholds).map(model=>{
    const stok = stokTersedia(model);
    const threshold = reorderThresholds[model];
    return { model, stok, threshold, deficit: threshold - stok };
  }).filter(r=>r.deficit > 0).sort((a,b)=>b.deficit-a.deficit);

  document.getElementById('reorderCount').textContent = `${rows.length} model perlu reorder`;
  document.getElementById('reorderList').innerHTML = rows.map(r=>`
    <div class="alert-item">
      <div>
        <div class="a-model">${r.model}</div>
        <div style="color:var(--muted)">Stok tersedia: ${r.stok} · Batas aman: ${r.threshold}</div>
      </div>
      <div class="a-days" style="color:var(--danger);">+${r.deficit} unit</div>
    </div>`).join('') || '<div style="color:var(--muted);font-size:12px;">Semua model masih di atas batas aman.</div>';
}

// ---------- Demand vs Stok (tren mingguan) ----------
function renderDemandChart(){
  const weeks = 8;
  const today = new Date('2026-07-29');
  const labels = [];
  const soldCounts = [];
  for(let i=weeks-1;i>=0;i--){
    const end = new Date(today); end.setDate(end.getDate()-i*7);
    const start = new Date(end); start.setDate(start.getDate()-6);
    const count = inventoryData.filter(d=>{
      if(!d.tanggal_terjual) return false;
      const t = new Date(d.tanggal_terjual);
      return t>=start && t<=end;
    }).length;
    labels.push(`${start.getDate()}/${start.getMonth()+1}`);
    soldCounts.push(count);
  }
  const avgWeekly = soldCounts.reduce((a,b)=>a+b,0)/weeks;
  const stokSekarang = inventoryData.filter(d=>{
    const es = effectiveStatus(d);
    return es==='Ready Stock' || es==='Prioritas FIFO' || es==='Flash Sale';
  }).length;
  const estimasiHari = avgWeekly>0 ? Math.round((stokSekarang/avgWeekly)*7) : null;
  document.getElementById('demandNote').textContent = estimasiHari
    ? `Rata² ${avgWeekly.toFixed(1)} unit/minggu · estimasi stok habis ~${estimasiHari} hari lagi`
    : `Rata² ${avgWeekly.toFixed(1)} unit/minggu`;

  makeChart('chartDemand', {
    type:'line',
    data:{ labels, datasets:[{
      label:'Unit Terjual', data:soldCounts, borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,.15)',
      tension:.35, fill:true, pointRadius:3
    }]},
    options:{ plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}, ticks:{font:{size:9}}}, y:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}} } }
  });
}

// ---------- Purchase Order table ----------
function poPillClass(status){
  return { 'Dalam Perjalanan':'pill-po-transit','Diterima':'pill-po-received','Terlambat':'pill-po-late' }[status] || '';
}

function populatePoFilters(){
  const suppliers = [...new Set(purchaseOrders.map(p=>p.supplier))].sort();
  document.getElementById('fPoSupplier').innerHTML = '<option value="">Semua Supplier</option>' + suppliers.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function renderPoTable(){
  const supplier = document.getElementById('fPoSupplier').value;
  const status = document.getElementById('fPoStatus').value;
  let rows = purchaseOrders.filter(p=>{
    if(supplier && p.supplier!==supplier) return false;
    if(status && p.status!==status) return false;
    return true;
  }).sort((a,b)=> new Date(b.tanggal_order) - new Date(a.tanggal_order));

  document.getElementById('poCount').textContent = `${rows.length} dari ${purchaseOrders.length} PO`;
  document.getElementById('poTbody').innerHTML = rows.map(p=>{
    const grandTotal = p.total_nilai + (p.biaya_kirim||0) + (p.biaya_lain||0);
    return `
    <tr>
      <td>${p.po_id}</td>
      <td>${p.supplier}</td>
      <td>${p.model}</td>
      <td>${p.qty}</td>
      <td>${p.gudang_tujuan}</td>
      <td>${p.tanggal_order}</td>
      <td>${p.estimasi_tiba}</td>
      <td>${p.tanggal_diterima || '-'}</td>
      <td>${p.lead_time_aktual!=null ? p.lead_time_aktual+' hari' : '-'}</td>
      <td><span class="pill ${poPillClass(p.status)}">${p.status}</span></td>
      <td>${fmtRp(grandTotal)}</td>
      <td><div class="row-actions"><button type="button" onclick="openPoModal('${p.po_id}')">Edit</button><button type="button" class="del" onclick="deletePoConfirm('${p.po_id}')">Hapus</button></div></td>
    </tr>`;
  }).join('');
}

document.getElementById('fPoSupplier').addEventListener('input', renderPoTable);
document.getElementById('fPoStatus').addEventListener('input', renderPoTable);

// ---------- Purchase Order: Tambah/Edit/Hapus (modal) ----------
function populatePoModalDatalists(){
  const suppliers = [...new Set([...purchaseOrders.map(p=>p.supplier), ...inventoryData.map(d=>d.supplier)])].sort();
  const models = Object.keys(reorderThresholds);
  const gudangs = [...new Set(inventoryData.map(d=>d.gudang))].sort();
  document.getElementById('poSupplierList').innerHTML = suppliers.map(s=>`<option value="${s}">`).join('');
  document.getElementById('poModelList').innerHTML = models.map(m=>`<option value="${m}">`).join('');
  document.getElementById('poGudangList').innerHTML = gudangs.map(g=>`<option value="${g}">`).join('');
}

function openPoModal(id){
  populatePoModalDatalists();
  const isEdit = !!id;
  document.getElementById('poModalTitle').textContent = isEdit ? 'Edit Purchase Order' : 'Tambah Purchase Order';
  document.getElementById('poFormId').value = id || '';
  if(isEdit){
    const p = purchaseOrders.find(x=>x.po_id===id);
    if(!p) return;
    document.getElementById('poFSupplier').value = p.supplier;
    document.getElementById('poFModel').value = p.model;
    document.getElementById('poFQty').value = p.qty;
    document.getElementById('poFGudang').value = p.gudang_tujuan;
    document.getElementById('poFTglOrder').value = p.tanggal_order;
    document.getElementById('poFEstTiba').value = p.estimasi_tiba;
    document.getElementById('poFStatus').value = p.status;
    document.getElementById('poFTglDiterima').value = p.tanggal_diterima || '';
    document.getElementById('poFTotalNilai').value = p.total_nilai;
    document.getElementById('poFBiayaKirim').value = p.biaya_kirim || 0;
    document.getElementById('poFBiayaLain').value = p.biaya_lain || 0;
  }else{
    document.getElementById('poFSupplier').value = '';
    document.getElementById('poFModel').value = '';
    document.getElementById('poFQty').value = 1;
    document.getElementById('poFGudang').value = '';
    document.getElementById('poFTglOrder').value = REF_TODAY_STR;
    document.getElementById('poFEstTiba').value = '';
    document.getElementById('poFStatus').value = 'Dalam Perjalanan';
    document.getElementById('poFTglDiterima').value = '';
    document.getElementById('poFTotalNilai').value = '';
    document.getElementById('poFBiayaKirim').value = 0;
    document.getElementById('poFBiayaLain').value = 0;
  }
  document.getElementById('poModalOverlay').classList.add('open');
}
window.openPoModal = openPoModal;

function closePoModal(){
  document.getElementById('poModalOverlay').classList.remove('open');
}
window.closePoModal = closePoModal;

function refreshAfterPoChange(){
  populatePoFilters();
  renderPoTable();
  renderSupplierPerformance();
  renderSupplierScorecard();
  renderCostAnalysis();
  renderRestockForecast();
  renderReorder();
  renderNotifications();
}

function savePoForm(){
  const id = document.getElementById('poFormId').value;
  const supplier = document.getElementById('poFSupplier').value.trim();
  const model = document.getElementById('poFModel').value.trim();
  const qty = parseInt(document.getElementById('poFQty').value,10) || 0;
  const gudang = document.getElementById('poFGudang').value.trim();
  const tglOrder = document.getElementById('poFTglOrder').value;
  const estTiba = document.getElementById('poFEstTiba').value;
  const status = document.getElementById('poFStatus').value;
  const tglDiterima = document.getElementById('poFTglDiterima').value || null;
  const totalNilai = parseFloat(document.getElementById('poFTotalNilai').value) || 0;
  const biayaKirim = parseFloat(document.getElementById('poFBiayaKirim').value) || 0;
  const biayaLain = parseFloat(document.getElementById('poFBiayaLain').value) || 0;

  if(!supplier || !model || !gudang || !tglOrder || !estTiba || qty<=0){
    alert('Lengkapi dulu Supplier, Model, Cabang Tujuan, Qty, Tanggal Order & Estimasi Tiba.');
    return;
  }

  let leadTimeAktual = null;
  if(status==='Diterima' && tglDiterima){
    leadTimeAktual = Math.round((new Date(tglDiterima) - new Date(tglOrder)) / 86400000);
  }

  const payload = {
    supplier, model, qty, gudang_tujuan: gudang, tanggal_order: tglOrder, estimasi_tiba: estTiba,
    status, tanggal_diterima: status==='Diterima' ? tglDiterima : null,
    lead_time_aktual: status==='Diterima' ? leadTimeAktual : null,
    total_nilai: totalNilai, biaya_kirim: biayaKirim, biaya_lain: biayaLain
  };

  if(id){
    const p = purchaseOrders.find(x=>x.po_id===id);
    if(!p){ closePoModal(); return; }
    Object.assign(p, payload);
  }else{
    purchaseOrders.push(Object.assign({ po_id: nextPoId() }, payload));
  }

  savePurchaseOrders();
  closePoModal();
  refreshAfterPoChange();
}
window.savePoForm = savePoForm;

function deletePoConfirm(id){
  if(!confirm(`Hapus Purchase Order ${id}? Tindakan ini tidak bisa dibatalkan.`)) return;
  const idx = purchaseOrders.findIndex(p=>p.po_id===id);
  if(idx===-1) return;
  purchaseOrders.splice(idx,1);
  savePurchaseOrders();
  refreshAfterPoChange();
}
window.deletePoConfirm = deletePoConfirm;

// ---------- Prediksi Kebutuhan Restock ----------
function computeAvgLeadTimeGlobal(){
  const done = purchaseOrders.filter(p=>p.status==='Diterima' && p.lead_time_aktual!=null);
  if(!done.length) return 14;
  return done.reduce((a,p)=>a+p.lead_time_aktual,0)/done.length;
}

function weeklyDemandForModel(model, weeks=8){
  const today = new Date(REF_TODAY_STR);
  const start = new Date(today); start.setDate(start.getDate() - weeks*7);
  const count = inventoryData.filter(d=>{
    if(d.model!==model || !d.tanggal_terjual) return false;
    const t = new Date(d.tanggal_terjual);
    return t>=start && t<=today;
  }).length;
  return count/weeks;
}

function avgLeadTimeForModel(model){
  const done = purchaseOrders.filter(p=>p.model===model && p.status==='Diterima' && p.lead_time_aktual!=null);
  if(done.length) return done.reduce((a,p)=>a+p.lead_time_aktual,0)/done.length;
  return computeAvgLeadTimeGlobal();
}

function fmtDateShort(d){
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}

function renderRestockForecast(){
  const today = new Date(REF_TODAY_STR);
  const models = Object.keys(reorderThresholds);
  const rows = models.map(model=>{
    const stok = stokTersedia(model);
    const weeklyDemand = weeklyDemandForModel(model);
    const dailyDemand = weeklyDemand/7;
    const daysLeft = dailyDemand>0 ? stok/dailyDemand : null;
    const leadTime = avgLeadTimeForModel(model);
    let stockoutDate=null, orderDate=null, orderUrgent=false;
    if(daysLeft!=null){
      stockoutDate = new Date(today); stockoutDate.setDate(stockoutDate.getDate()+Math.round(daysLeft));
      orderDate = new Date(stockoutDate); orderDate.setDate(orderDate.getDate()-Math.round(leadTime));
      orderUrgent = orderDate <= today;
    }
    const targetStock = Math.ceil(weeklyDemand*4);
    let suggestedQty = Math.max(targetStock - stok, 0);
    if(weeklyDemand===0){
      suggestedQty = Math.max(reorderThresholds[model]-stok, 0);
    }
    return { model, stok, weeklyDemand, daysLeft, stockoutDate, orderDate, orderUrgent, leadTime, suggestedQty };
  }).filter(r=> r.suggestedQty>0 || (r.daysLeft!=null && r.daysLeft<30))
    .sort((a,b)=>{
      const da = a.daysLeft==null? Infinity : a.daysLeft;
      const db = b.daysLeft==null? Infinity : b.daysLeft;
      return da-db;
    });

  document.getElementById('restockForecastCount').textContent = rows.length ? `${rows.length} model perlu dipantau` : 'Semua model aman';
  document.getElementById('restockForecastTbody').innerHTML = rows.map(r=>{
    let urgencyClass = '';
    if(r.daysLeft!=null){
      if(r.daysLeft<=7) urgencyClass='row-critical';
      else if(r.daysLeft<=14) urgencyClass='row-warning';
    }
    return `<tr class="${urgencyClass}">
      <td>${r.model}</td>
      <td>${r.stok}</td>
      <td>${r.weeklyDemand.toFixed(1)}/minggu</td>
      <td>${r.daysLeft!=null ? Math.round(r.daysLeft)+' hari lagi' : 'Tidak ada penjualan'}</td>
      <td>${r.stockoutDate ? fmtDateShort(r.stockoutDate) : '-'}</td>
      <td>${r.orderDate ? (r.orderUrgent ? '<b style="color:var(--danger)">Sekarang!</b>' : fmtDateShort(r.orderDate)) : '-'}</td>
      <td><b>${r.suggestedQty}</b> unit</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);">Semua model dalam kondisi aman, tidak ada yang perlu direstock dalam waktu dekat.</td></tr>';
}

// ---------- Supplier performance ----------
function computeSupplierStats(){
  const suppliers = [...new Set(inventoryData.map(d=>d.supplier))].sort();
  return suppliers.map(sup=>{
    const units = inventoryData.filter(d=>d.supplier===sup);
    const troubleCount = units.filter(d=>effectiveStatus(d)==='Trouble').length;
    const troublePct = units.length ? (troubleCount/units.length*100) : 0;

    const pos = purchaseOrders.filter(p=>p.supplier===sup);
    const done = pos.filter(p=>p.status==='Diterima');
    const avgLead = done.length ? done.reduce((a,p)=>a+p.lead_time_aktual,0)/done.length : null;
    const onTime = done.length ? done.filter(p=> new Date(p.tanggal_diterima) <= new Date(p.estimasi_tiba)).length / done.length * 100 : null;

    let rating = 'rating-mid', ratingLabel = 'Cukup';
    if(troublePct < 10 && (onTime===null || onTime>=75)) { rating='rating-good'; ratingLabel='Baik'; }
    if(troublePct >= 20 || (onTime!==null && onTime<50)) { rating='rating-bad'; ratingLabel='Perlu Evaluasi'; }

    return { sup, total: units.length, troublePct, doneCount: done.length, avgLead, onTime, rating, ratingLabel };
  });
}

function renderSupplierPerformance(){
  const rows = [...computeSupplierStats()].sort((a,b)=>b.troublePct-a.troublePct);

  document.getElementById('supplierTbody').innerHTML = rows.map(r=>`
    <tr>
      <td>${r.sup}</td>
      <td>${r.total}</td>
      <td>${r.troublePct.toFixed(1)}%</td>
      <td>${r.doneCount}</td>
      <td>${r.avgLead!=null ? r.avgLead.toFixed(1)+' hari' : '-'}</td>
      <td>${r.onTime!=null ? r.onTime.toFixed(0)+'%' : '-'}</td>
      <td class="${r.rating}">${r.ratingLabel}</td>
    </tr>`).join('');
}

// ---------- Supplier Scorecard & Ranking (radar) ----------
const SCORECARD_COLORS = ['#3b82f6','#f59e0b','#22c55e','#a855f7','#ef4444','#06b6d4','#ec4899','#84cc16'];

function renderSupplierScorecard(){
  const rows = computeSupplierStats();
  const maxTotal = Math.max(...rows.map(r=>r.total), 1);
  document.getElementById('scorecardNote').textContent = `${rows.length} supplier dibandingkan`;

  const datasets = rows.map((r,i)=>{
    const color = SCORECARD_COLORS[i % SCORECARD_COLORS.length];
    return {
      label: r.sup,
      data: [
        Math.round(r.onTime!=null ? r.onTime : 100),
        Math.round(100 - r.troublePct),
        Math.round((r.total/maxTotal)*100)
      ],
      borderColor: color,
      backgroundColor: color+'33',
      pointBackgroundColor: color,
      borderWidth: 2
    };
  });

  makeChart('chartScorecard', {
    type:'radar',
    data:{ labels:['On-Time Rate','Kualitas (100-Trouble%)','Volume Pengiriman'], datasets },
    options:{
      plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, font:{size:10} } } },
      scales:{ r:{ suggestedMin:0, suggestedMax:100, grid:{color:gridColor}, angleLines:{color:gridColor}, pointLabels:{font:{size:10}}, ticks:{display:false, backdropColor:'transparent'} } }
    }
  });
}

// ---------- Analisis Biaya Pengadaan ----------
function renderCostAnalysis(){
  const suppliers = [...new Set(purchaseOrders.map(p=>p.supplier))].sort();
  const rows = suppliers.map(sup=>{
    const pos = purchaseOrders.filter(p=>p.supplier===sup);
    const nilai = pos.reduce((a,p)=>a+p.total_nilai,0);
    const kirim = pos.reduce((a,p)=>a+(p.biaya_kirim||0),0);
    const lain = pos.reduce((a,p)=>a+(p.biaya_lain||0),0);
    return { sup, count: pos.length, nilai, kirim, lain, grand: nilai+kirim+lain };
  }).sort((a,b)=>b.grand-a.grand);

  const grandTotalAll = rows.reduce((a,r)=>a+r.grand,0);
  document.getElementById('costAnalysisNote').textContent = `Total pengadaan: ${fmtRp(grandTotalAll)}`;

  document.getElementById('costBreakdownTbody').innerHTML = rows.map(r=>`
    <tr>
      <td>${r.sup}</td>
      <td>${r.count}</td>
      <td>${fmtRp(r.nilai)}</td>
      <td>${fmtRp(r.kirim)}</td>
      <td>${fmtRp(r.lain)}</td>
      <td><b>${fmtRp(r.grand)}</b></td>
    </tr>`).join('');

  makeChart('chartCostPerSupplier', {
    type:'bar',
    data:{ labels:rows.map(r=>r.sup), datasets:[{ label:'Total Biaya', data:rows.map(r=>r.grand), backgroundColor:'#3b82f6', borderRadius:5 }] },
    options:{
      indexAxis:'y',
      plugins:{ legend:{display:false}, title:{display:true, text:'Total Biaya per Supplier', color:'#8b93ab', font:{size:11}} },
      scales:{ x:{grid:{color:gridColor}, ticks:{callback:v=>'Rp'+(v/1e6).toFixed(0)+'jt'}}, y:{grid:{display:false}, ticks:{font:{size:9}}} }
    }
  });

  // Tren biaya per bulan (semua supplier digabung), 6 bulan terakhir berdasarkan tanggal_order
  const today = new Date(REF_TODAY_STR);
  const months = 6;
  const labels = [];
  const totals = [];
  for(let i=months-1;i>=0;i--){
    const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
    const monthLabel = d.toLocaleDateString('id-ID',{month:'short',year:'2-digit'});
    const sum = purchaseOrders.filter(p=>{
      const t = new Date(p.tanggal_order);
      return t.getFullYear()===d.getFullYear() && t.getMonth()===d.getMonth();
    }).reduce((a,p)=>a+p.total_nilai+(p.biaya_kirim||0)+(p.biaya_lain||0),0);
    labels.push(monthLabel);
    totals.push(sum);
  }
  makeChart('chartCostTrend', {
    type:'line',
    data:{ labels, datasets:[{ label:'Total Biaya', data:totals, borderColor:'#22c55e', backgroundColor:'rgba(34,197,94,.15)', tension:.35, fill:true, pointRadius:3 }] },
    options:{
      plugins:{ legend:{display:false}, title:{display:true, text:'Tren Biaya Pengadaan per Bulan', color:'#8b93ab', font:{size:11}} },
      scales:{ x:{grid:{display:false}, ticks:{font:{size:9}}}, y:{grid:{color:gridColor}, ticks:{callback:v=>'Rp'+(v/1e6).toFixed(0)+'jt'}} }
    }
  });
}

// ---------- Unit DP: Permintaan Unit dari Cabang + Database Customer ----------
function requestDisplayStatus(r){
  if(r.status==='Menunggu' && new Date(r.deadline) < new Date(REF_TODAY_STR)) return 'Terlambat';
  return r.status;
}
function requestPillClass(displayStatus){
  return { 'Menunggu':'pill-fifo', 'Terlambat':'pill-trouble', 'Terpenuhi':'pill-ready', 'Dibatalkan':'pill-cancelled' }[displayStatus] || '';
}

function renderUnitDpKpi(){
  const aktif = branchRequests.filter(r=>r.status==='Menunggu');
  const terlambat = branchRequests.filter(r=>requestDisplayStatus(r)==='Terlambat');
  const today = new Date(REF_TODAY_STR);
  const terpenuhiBulanIni = branchRequests.filter(r=>{
    if(r.status!=='Terpenuhi') return false;
    const t = new Date(r.tanggal_permintaan);
    return t.getFullYear()===today.getFullYear() && t.getMonth()===today.getMonth();
  });
  const cards = [
    {label:'Permintaan Aktif', value:aktif.length, sub:'status Menunggu', cls:'c-blue'},
    {label:'Terlambat', value:terlambat.length, sub:'deadline sudah lewat', cls:'c-red'},
    {label:'Terpenuhi Bulan Ini', value:terpenuhiBulanIni.length, sub:'sudah selesai diambil', cls:'c-green'},
    {label:'Total Customer', value:customerDatabase.length, sub:'di Database Customer', cls:'c-cyan'},
  ];
  document.getElementById('unitDpKpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

function populateRequestFilters(){
  const cabangs = [...new Set(branchRequests.map(r=>r.cabang_peminta))].sort();
  document.getElementById('fReqCabang').innerHTML = '<option value="">Semua Cabang</option>' + cabangs.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function renderRequestTable(){
  const search = (document.getElementById('fReqSearch').value||'').trim().toLowerCase();
  const cabang = document.getElementById('fReqCabang').value;
  const status = document.getElementById('fReqStatus').value;
  let rows = branchRequests.filter(r=>{
    if(cabang && r.cabang_peminta!==cabang) return false;
    const disp = requestDisplayStatus(r);
    if(status && disp!==status) return false;
    if(search){
      const hay = `${r.customer_nama} ${r.customer_hp} ${r.model} ${r.id}`.toLowerCase();
      if(!hay.includes(search)) return false;
    }
    return true;
  }).sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));

  document.getElementById('requestCount').textContent = `${rows.length} dari ${branchRequests.length} permintaan`;
  document.getElementById('requestTbody').innerHTML = rows.map(r=>{
    const disp = requestDisplayStatus(r);
    const rowClass = disp==='Terlambat' ? 'row-critical' : '';
    return `
    <tr class="${rowClass}">
      <td>${r.id}</td>
      <td>${r.cabang_peminta}</td>
      <td>${r.model}</td>
      <td>${r.warna}${r.kapasitas ? ' / '+r.kapasitas : ''}</td>
      <td>${r.qty}</td>
      <td>${r.customer_nama}</td>
      <td>${r.customer_hp}</td>
      <td>${r.tanggal_permintaan}</td>
      <td>${r.deadline}</td>
      <td><span class="pill ${requestPillClass(disp)}">${disp}</span></td>
      <td><div class="row-actions"><button type="button" onclick="openRequestModal('${r.id}')">Edit</button><button type="button" class="del" onclick="deleteRequestConfirm('${r.id}')">Hapus</button></div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="11" style="text-align:center;color:var(--muted);">Belum ada permintaan yang cocok dengan filter.</td></tr>';
}

document.getElementById('fReqSearch').addEventListener('input', renderRequestTable);
document.getElementById('fReqCabang').addEventListener('input', renderRequestTable);
document.getElementById('fReqStatus').addEventListener('input', renderRequestTable);

function populateRequestModalDatalists(){
  const cabangs = [...new Set([...branchRequests.map(r=>r.cabang_peminta), ...inventoryData.map(d=>d.gudang)])].sort();
  const models = Object.keys(reorderThresholds);
  document.getElementById('reqCabangList').innerHTML = cabangs.map(c=>`<option value="${c}">`).join('');
  document.getElementById('reqModelList').innerHTML = models.map(m=>`<option value="${m}">`).join('');
  document.getElementById('reqCustomerList').innerHTML = customerDatabase.map(c=>`<option value="${c.nama}">`).join('');
}

function openRequestModal(id){
  populateRequestModalDatalists();
  const isEdit = !!id;
  document.getElementById('requestModalTitle').textContent = isEdit ? 'Edit Permintaan Unit' : 'Tambah Permintaan Unit';
  document.getElementById('reqFormId').value = id || '';
  if(isEdit){
    const r = branchRequests.find(x=>x.id===id);
    if(!r) return;
    document.getElementById('reqFCabang').value = r.cabang_peminta;
    document.getElementById('reqFModel').value = r.model;
    document.getElementById('reqFQty').value = r.qty;
    document.getElementById('reqFWarna').value = r.warna || '';
    document.getElementById('reqFKapasitas').value = r.kapasitas || '';
    document.getElementById('reqFCustomerNama').value = r.customer_nama;
    document.getElementById('reqFCustomerHp').value = r.customer_hp || '';
    document.getElementById('reqFTglPermintaan').value = r.tanggal_permintaan;
    document.getElementById('reqFDeadline').value = r.deadline;
    document.getElementById('reqFStatus').value = r.status;
    document.getElementById('reqFCatatan').value = r.catatan || '';
  }else{
    document.getElementById('reqFCabang').value = '';
    document.getElementById('reqFModel').value = '';
    document.getElementById('reqFQty').value = 1;
    document.getElementById('reqFWarna').value = '';
    document.getElementById('reqFKapasitas').value = '';
    document.getElementById('reqFCustomerNama').value = '';
    document.getElementById('reqFCustomerHp').value = '';
    document.getElementById('reqFTglPermintaan').value = REF_TODAY_STR;
    document.getElementById('reqFDeadline').value = '';
    document.getElementById('reqFStatus').value = 'Menunggu';
    document.getElementById('reqFCatatan').value = '';
  }
  document.getElementById('requestModalOverlay').classList.add('open');
}
window.openRequestModal = openRequestModal;

function closeRequestModal(){
  document.getElementById('requestModalOverlay').classList.remove('open');
}
window.closeRequestModal = closeRequestModal;

function refreshAfterRequestChange(){
  populateRequestFilters();
  renderRequestTable();
  renderCustomerTable();
  renderUnitDpKpi();
}

function saveRequestForm(){
  const id = document.getElementById('reqFormId').value;
  const cabang = document.getElementById('reqFCabang').value.trim();
  const model = document.getElementById('reqFModel').value.trim();
  const qty = parseInt(document.getElementById('reqFQty').value,10) || 0;
  const warna = document.getElementById('reqFWarna').value.trim();
  const kapasitas = document.getElementById('reqFKapasitas').value.trim();
  const custNama = document.getElementById('reqFCustomerNama').value.trim();
  const custHp = document.getElementById('reqFCustomerHp').value.trim();
  const tglPermintaan = document.getElementById('reqFTglPermintaan').value;
  const deadline = document.getElementById('reqFDeadline').value;
  const status = document.getElementById('reqFStatus').value;
  const catatan = document.getElementById('reqFCatatan').value.trim();

  if(!cabang || !model || !custNama || !tglPermintaan || !deadline || qty<=0){
    alert('Lengkapi dulu Cabang, Model, Qty, Customer, Tanggal Permintaan & Deadline.');
    return;
  }

  // Cari customer yang sudah ada (cocok nama, case-insensitive) atau otomatis buat baru di Database Customer
  let cust = customerDatabase.find(c=>c.nama.trim().toLowerCase()===custNama.toLowerCase());
  if(cust){
    if(custHp && !cust.no_hp) cust.no_hp = custHp;
  }else{
    cust = {
      id: nextCustomerId(), nama: custNama, no_hp: custHp, cabang_asal: cabang,
      catatan: '', tanggal_daftar: REF_TODAY_STR
    };
    customerDatabase.push(cust);
  }
  saveCustomerDatabase();

  const payload = {
    cabang_peminta: cabang, model, warna, kapasitas, qty,
    customer_id: cust.id, customer_nama: custNama, customer_hp: custHp || cust.no_hp,
    tanggal_permintaan: tglPermintaan, deadline, status, catatan
  };

  if(id){
    const r = branchRequests.find(x=>x.id===id);
    if(!r){ closeRequestModal(); return; }
    Object.assign(r, payload);
  }else{
    branchRequests.push(Object.assign({ id: nextRequestId() }, payload));
  }

  saveBranchRequests();
  closeRequestModal();
  refreshAfterRequestChange();
}
window.saveRequestForm = saveRequestForm;

function deleteRequestConfirm(id){
  if(!confirm(`Hapus permintaan ${id}? Tindakan ini tidak bisa dibatalkan.`)) return;
  const idx = branchRequests.findIndex(r=>r.id===id);
  if(idx===-1) return;
  branchRequests.splice(idx,1);
  saveBranchRequests();
  refreshAfterRequestChange();
}
window.deleteRequestConfirm = deleteRequestConfirm;

// ---------- Database Customer ----------
function renderCustomerTable(){
  const search = (document.getElementById('fCustSearch').value||'').trim().toLowerCase();
  let rows = customerDatabase.filter(c=>{
    if(!search) return true;
    return `${c.nama} ${c.no_hp}`.toLowerCase().includes(search);
  }).sort((a,b)=>a.nama.localeCompare(b.nama));

  document.getElementById('customerCount').textContent = `${rows.length} dari ${customerDatabase.length} customer`;
  document.getElementById('customerTbody').innerHTML = rows.map(c=>{
    const jumlahPermintaan = branchRequests.filter(r=>r.customer_id===c.id).length;
    return `
    <tr>
      <td>${c.id}</td>
      <td>${c.nama}</td>
      <td>${c.no_hp}</td>
      <td>${c.cabang_asal}</td>
      <td>${c.tanggal_daftar}</td>
      <td>${jumlahPermintaan}</td>
      <td><div class="row-actions"><button type="button" onclick="openCustomerModal('${c.id}')">Edit</button><button type="button" class="del" onclick="deleteCustomerConfirm('${c.id}')">Hapus</button></div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);">Belum ada customer yang cocok dengan pencarian.</td></tr>';
}

document.getElementById('fCustSearch').addEventListener('input', renderCustomerTable);

function populateCustomerModalDatalists(){
  const cabangs = [...new Set([...customerDatabase.map(c=>c.cabang_asal), ...inventoryData.map(d=>d.gudang)])].sort();
  document.getElementById('custCabangList').innerHTML = cabangs.map(c=>`<option value="${c}">`).join('');
}

function openCustomerModal(id){
  populateCustomerModalDatalists();
  const isEdit = !!id;
  document.getElementById('customerModalTitle').textContent = isEdit ? 'Edit Customer' : 'Tambah Customer';
  document.getElementById('custFormId').value = id || '';
  if(isEdit){
    const c = customerDatabase.find(x=>x.id===id);
    if(!c) return;
    document.getElementById('custFNama').value = c.nama;
    document.getElementById('custFHp').value = c.no_hp || '';
    document.getElementById('custFCabang').value = c.cabang_asal || '';
    document.getElementById('custFCatatan').value = c.catatan || '';
  }else{
    document.getElementById('custFNama').value = '';
    document.getElementById('custFHp').value = '';
    document.getElementById('custFCabang').value = '';
    document.getElementById('custFCatatan').value = '';
  }
  document.getElementById('customerModalOverlay').classList.add('open');
}
window.openCustomerModal = openCustomerModal;

function closeCustomerModal(){
  document.getElementById('customerModalOverlay').classList.remove('open');
}
window.closeCustomerModal = closeCustomerModal;

function saveCustomerForm(){
  const id = document.getElementById('custFormId').value;
  const nama = document.getElementById('custFNama').value.trim();
  const hp = document.getElementById('custFHp').value.trim();
  const cabang = document.getElementById('custFCabang').value.trim();
  const catatan = document.getElementById('custFCatatan').value.trim();

  if(!nama || !cabang){
    alert('Lengkapi dulu Nama & Cabang Asal.');
    return;
  }

  if(id){
    const c = customerDatabase.find(x=>x.id===id);
    if(!c){ closeCustomerModal(); return; }
    const oldNama = c.nama;
    Object.assign(c, { nama, no_hp:hp, cabang_asal:cabang, catatan });
    // sinkronkan nama/HP baru ke permintaan yang terkait customer ini
    branchRequests.forEach(r=>{
      if(r.customer_id===id){ r.customer_nama = nama; r.customer_hp = hp; }
    });
    saveBranchRequests();
  }else{
    customerDatabase.push({ id: nextCustomerId(), nama, no_hp:hp, cabang_asal:cabang, catatan, tanggal_daftar: REF_TODAY_STR });
  }

  saveCustomerDatabase();
  closeCustomerModal();
  refreshAfterRequestChange();
}
window.saveCustomerForm = saveCustomerForm;

function deleteCustomerConfirm(id){
  const linked = branchRequests.filter(r=>r.customer_id===id).length;
  const msg = linked>0
    ? `Customer ini masih terhubung ke ${linked} permintaan unit. Hapus tetap? Data permintaan terkait tidak akan ikut terhapus, tapi link customer-nya akan lepas.`
    : 'Hapus customer ini? Tindakan ini tidak bisa dibatalkan.';
  if(!confirm(msg)) return;
  const idx = customerDatabase.findIndex(c=>c.id===id);
  if(idx===-1) return;
  customerDatabase.splice(idx,1);
  saveCustomerDatabase();
  refreshAfterRequestChange();
}
window.deleteCustomerConfirm = deleteCustomerConfirm;

// ---------- Notification Center ----------
function renderNotifications(){
  const items = [];

  const troubleUnits = inventoryData.filter(d=>effectiveStatus(d)==='Trouble');
  if(troubleUnits.length){
    items.push({sev:'high', msg:`${troubleUnits.length} unit berstatus Trouble (termasuk auto dari Gagal QC) — perlu tindak lanjut teknis/klaim ke supplier.`});
  }

  const poTerlambat = purchaseOrders.filter(p=>p.status==='Terlambat');
  if(poTerlambat.length){
    items.push({sev:'high', msg:`${poTerlambat.length} Purchase Order berstatus Terlambat — konfirmasi ulang ke supplier terkait.`});
  }

  const reorderModels = Object.keys(reorderThresholds).filter(m=> stokTersedia(m) < reorderThresholds[m]);
  if(reorderModels.length){
    items.push({sev:'med', msg:`${reorderModels.length} model di bawah batas aman stok: ${reorderModels.join(', ')}.`});
  }

  const reqTerlambat = branchRequests.filter(r=>requestDisplayStatus(r)==='Terlambat');
  if(reqTerlambat.length){
    items.push({sev:'high', msg:`${reqTerlambat.length} permintaan unit dari cabang sudah lewat deadline (lihat subtab Unit DP) — konfirmasi ke customer terkait.`});
  }

  const qcPending = inventoryData.filter(d=>d.report_qc==='Pending QC');
  if(qcPending.length){
    items.push({sev:'low', msg:`${qcPending.length} unit masih Pending QC — menunggu pemeriksaan teknis.`});
  }

  const poTransit = purchaseOrders.filter(p=>p.status==='Dalam Perjalanan');
  if(poTransit.length){
    items.push({sev:'low', msg:`${poTransit.length} Purchase Order sedang Dalam Perjalanan menuju gudang.`});
  }

  const order = {high:0, med:1, low:2};
  items.sort((a,b)=>order[a.sev]-order[b.sev]);

  document.getElementById('notifCount').textContent = `${items.length} notifikasi aktif`;
  document.getElementById('notifList').innerHTML = items.map(it=>`
    <div class="notif-item notif-${it.sev}">
      <span class="notif-dot"></span>
      <span class="notif-msg">${it.msg}</span>
      <span class="notif-sev">${it.sev==='high'?'Tinggi':it.sev==='med'?'Sedang':'Rendah'}</span>
    </div>`).join('') || '<div style="color:var(--muted);font-size:12px;">Tidak ada notifikasi aktif. Semua aman.</div>';
}

// ---------- Margin & Profitabilitas ----------
function renderMarginChart(){
  const models = [...new Set(inventoryData.map(d=>d.model))];
  const marginPct = models.map(model=>{
    const units = inventoryData.filter(d=>d.model===model);
    const avgBeli = units.reduce((a,d)=>a+d.harga_beli,0)/units.length;
    const avgJual = units.reduce((a,d)=>a+d.harga_jual,0)/units.length;
    return ((avgJual-avgBeli)/avgBeli*100);
  });
  const totalProfit = inventoryData.filter(d=>d.status==='Terjual').reduce((a,d)=>a+(d.harga_jual-d.harga_beli),0);
  document.getElementById('marginNote').textContent = `Total profit terealisasi: ${fmtRp(totalProfit)}`;

  makeChart('chartMargin', {
    type:'bar',
    data:{ labels:models, datasets:[{ data:marginPct.map(v=>v.toFixed(1)), backgroundColor:'#22c55e', borderRadius:5 }]},
    options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:(ctx)=>ctx.parsed.y+'% margin'}}},
      scales:{ x:{ticks:{maxRotation:60,minRotation:60,font:{size:9}}, grid:{display:false}}, y:{grid:{color:gridColor}, ticks:{callback:v=>v+'%'}} } }
  });
}

// ---------- Inventory Turnover ----------
function renderTurnoverChart(){
  const models = [...new Set(inventoryData.map(d=>d.model))];
  const today = new Date('2026-07-29');
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate()-90);

  const turnoverData = models.map(model=>{
    const sold90 = inventoryData.filter(d=>d.model===model && d.tanggal_terjual && new Date(d.tanggal_terjual)>=cutoff).length;
    const stok = stokTersedia(model) || 1;
    return sold90/stok;
  });

  const avgTurnover = turnoverData.reduce((a,b)=>a+b,0)/turnoverData.length;
  document.getElementById('turnoverNote').textContent = `Rata² turnover: ${avgTurnover.toFixed(2)}x (90 hari)`;

  const colors = turnoverData.map(v=> v>=1.5 ? '#22c55e' : v>=0.5 ? '#f59e0b' : '#ef4444');

  makeChart('chartTurnover', {
    type:'bar',
    data:{ labels:models, datasets:[{ data:turnoverData.map(v=>v.toFixed(2)), backgroundColor:colors, borderRadius:5 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ x:{ticks:{maxRotation:60,minRotation:60,font:{size:9}}, grid:{display:false}}, y:{grid:{color:gridColor}, beginAtZero:true} } }
  });
}

// ---------- Dead Stock Aging Heatmap ----------
function renderHeatmap(){
  const models = [...new Set(inventoryData.map(d=>d.model))];
  const buckets = [
    {label:'0-30 hari', test:h=>h<=30},
    {label:'31-60 hari', test:h=>h>30 && h<=60},
    {label:'61-90 hari', test:h=>h>60 && h<=90},
    {label:'>90 hari', test:h=>h>90},
  ];

  const nonSold = inventoryData.filter(d=>effectiveStatus(d)!=='Terjual');
  const grid = models.map(model=> buckets.map(b=> nonSold.filter(d=>d.model===model && b.test(d.hari_di_gudang)).length));
  const maxVal = Math.max(1, ...grid.flat());

  function colorFor(v){
    if(v===0) return 'rgba(139,147,171,.08)';
    const ratio = v/maxVal;
    const r = Math.round(34 + (239-34)*ratio);
    const g = Math.round(197 + (68-197)*ratio);
    const b = Math.round(94 + (68-94)*ratio);
    return `rgb(${r},${g},${b})`;
  }

  let html = '<table class="heatmap-table"><thead><tr><th>Model</th>' + buckets.map(b=>`<th>${b.label}</th>`).join('') + '</tr></thead><tbody>';
  models.forEach((model,i)=>{
    html += `<tr><td class="model-name">${model}</td>` + grid[i].map(v=>`<td><div class="heat-cell" style="background:${colorFor(v)};">${v||''}</div></td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('heatmapWrap').innerHTML = html;

  const deadCount = nonSold.filter(d=>d.hari_di_gudang>60).length;
  document.getElementById('deadstockNote').textContent = `${deadCount} unit berusia >60 hari di gudang`;
}

// ---------- Transfer Antar Cabang ----------
function renderTransferRecommendations(){
  const models = [...new Set(inventoryData.map(d=>d.model))];
  const gudangs = [...new Set(inventoryData.map(d=>d.gudang))];
  const recs = [];

  models.forEach(model=>{
    const perGudang = gudangs.map(g=>({
      gudang:g,
      stok: inventoryData.filter(d=>d.model===model && d.gudang===g && ['Ready Stock','Prioritas FIFO','Flash Sale'].includes(effectiveStatus(d))).length
    }));
    const deficit = perGudang.filter(x=>x.stok<=1).sort((a,b)=>a.stok-b.stok);
    const surplus = perGudang.filter(x=>x.stok>=4).sort((a,b)=>b.stok-a.stok);

    deficit.forEach(def=>{
      const sur = surplus.find(s=>s.gudang!==def.gudang && !recs.some(r=>r.from===s.gudang && r.model===model && r.usedUp));
      if(sur){
        const qty = Math.min(2, sur.stok-2);
        if(qty>0){
          recs.push({model, from:sur.gudang, to:def.gudang, qty, fromStock:sur.stok, toStock:def.stok});
        }
      }
    });
  });

  document.getElementById('transferCount').textContent = `${recs.length} rekomendasi`;
  document.getElementById('transferList').innerHTML = recs.slice(0,12).map(r=>`
    <div class="transfer-item">
      <div>
        <div class="a-model">${r.model}</div>
        <div class="t-route">${r.from} (stok ${r.fromStock}) → ${r.to} (stok ${r.toStock})</div>
      </div>
      <div class="t-qty">${r.qty} unit</div>
    </div>`).join('') || '<div style="color:var(--muted);font-size:12px;">Belum ada rekomendasi transfer — distribusi stok antar gudang cukup merata.</div>';
}

// ---------- Flash Sale: tidak bisa diservice / jual minus (per IMEI) ----------
function renderFlashsale(){
  const units = inventoryData.filter(d=>effectiveStatus(d)==='Flash Sale')
    .sort((a,b)=> (a.alasan_flashsale||'').localeCompare(b.alasan_flashsale||''));

  const totalRugi = units.filter(u=>u.alasan_flashsale==='Jual Minus').reduce((a,u)=>a+Math.max(0,u.harga_beli-u.harga_jual),0);
  document.getElementById('flashsaleCount').textContent = `${units.length} unit · estimasi rugi ${fmtRp(totalRugi)}`;

  document.getElementById('flashsaleList').innerHTML = units.map(u=>{
    const isMinus = u.alasan_flashsale === 'Jual Minus';
    const rugi = isMinus ? Math.max(0, u.harga_beli - u.harga_jual) : 0;
    return `
    <div class="alert-item">
      <div>
        <div class="a-model">${u.model} · ${u.warna} · ${u.kapasitas}</div>
        <div style="color:var(--muted)">IMEI: ${u.imei} · ${u.id} · ${u.gudang}</div>
        <div style="margin-top:4px;">
          <span class="fs-reason ${isMinus?'fs-minus':'fs-noservice'}">${u.alasan_flashsale || '-'}</span>
          ${isMinus ? `<span class="fs-loss" style="margin-left:6px;">Rugi ${fmtRp(rugi)}</span>` : ''}
        </div>
        <div style="margin-top:5px;color:var(--muted);font-size:11px;max-width:520px;">${u.catatan}</div>
      </div>
      <div class="a-days">${fmtRp(u.harga_jual)}</div>
    </div>`;
  }).join('') || '<div style="color:var(--muted);font-size:12px;">Tidak ada unit Flash Sale saat ini.</div>';
}

// ---------- Report QC per Tanggal Masuk (dari Supplier) ----------
function populateQcDateFilters(){
  const suppliers = [...new Set(inventoryData.map(d=>d.supplier))].sort();
  document.getElementById('qcDateFSupplier').innerHTML = '<option value="">Semua Supplier</option>' + suppliers.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function renderQcByDate(){
  const fSupplier = document.getElementById('qcDateFSupplier').value;
  const fStatus = document.getElementById('qcDateFStatus').value;

  const filtered = inventoryData.filter(d=>{
    if(fSupplier && d.supplier!==fSupplier) return false;
    if(fStatus && normalizeReportQC(d.report_qc)!==fStatus) return false;
    return true;
  });

  const groups = {};
  filtered.forEach(d=>{ (groups[d.tanggal_masuk] = groups[d.tanggal_masuk] || []).push(d); });
  const dates = Object.keys(groups).sort((a,b)=> new Date(b)-new Date(a));

  document.getElementById('qcByDateCount').textContent = `${dates.length} tanggal kedatangan · ${filtered.length} unit`;

  document.getElementById('qcByDateWrap').innerHTML = dates.map((tgl, idx)=>{
    const units = groups[tgl].sort((a,b)=> a.supplier.localeCompare(b.supplier));
    const lolos = units.filter(u=>normalizeReportQC(u.report_qc)==='Lolos QC').length;
    const pending = units.filter(u=>normalizeReportQC(u.report_qc)==='Pending QC').length;
    const gagal = units.filter(u=>normalizeReportQC(u.report_qc)==='Gagal QC').length;
    const suppliers = [...new Set(units.map(u=>u.supplier))];
    const tglLabel = new Date(tgl).toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'});

    const rows = units.map(u=>`
      <tr>
        <td>${u.id}</td>
        <td><span class="link-badge" onclick="jumpToDataUnit('${u.imei}')" title="Lihat di Data Unit">${u.imei} 🔗</span></td>
        <td>${u.model}</td>
        <td>${u.warna}</td>
        <td>${u.kapasitas}</td>
        <td>${u.supplier}</td>
        <td>${u.gudang}</td>
        <td><span class="pill ${pillClass(effectiveStatus(u))}">${effectiveStatus(u)}</span></td>
        <td><span class="${qcClass(u.report_qc)}">${normalizeReportQC(u.report_qc)}</span></td>
        <td>${u.catatan}</td>
      </tr>`).join('');

    return `
    <details class="qc-date-group" ${idx<2?'open':''}>
      <summary>
        <span class="qc-date-title">${tglLabel}</span>
        <span class="qc-date-sub">${units.length} unit masuk · Supplier: ${suppliers.join(', ')}</span>
        <span style="margin-left:auto;display:flex;gap:6px;">
          <span class="qc-mini-pill qc-mini-lolos">Lolos ${lolos}</span>
          <span class="qc-mini-pill qc-mini-pending">Pending ${pending}</span>
          <span class="qc-mini-pill qc-mini-gagal">Gagal ${gagal}</span>
        </span>
      </summary>
      <div class="qc-date-body">
        <div class="table-scroll" style="max-height:280px;">
          <table>
            <thead><tr><th>ID Unit</th><th>IMEI</th><th>Model</th><th>Warna</th><th>Kapasitas</th><th>Supplier</th><th>Cabang</th><th>Status</th><th>Report QC</th><th>Catatan</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </details>`;
  }).join('') || '<div style="color:var(--muted);font-size:12px;">Tidak ada unit yang cocok dengan filter.</div>';
}
document.getElementById('qcDateFSupplier').addEventListener('input', renderQcByDate);
document.getElementById('qcDateFStatus').addEventListener('input', renderQcByDate);

// ---------- Export & Print ----------
function toCSV(rows, columns){
  const header = columns.map(c=>c.label).join(',');
  const lines = rows.map(r=> columns.map(c=>{
    let v = r[c.key];
    if(v===null || v===undefined) v='';
    v = String(v).replace(/"/g,'""');
    return /[",\n]/.test(v) ? `"${v}"` : v;
  }).join(','));
  return [header, ...lines].join('\n');
}
function downloadCSV(content, filename){
  const blob = new Blob(['﻿'+content], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// Template import dipakai sebagai .xlsx (bukan .csv) supaya setiap kolom pasti kebuka jadi
// cell terpisah di Excel. CSV pakai koma sebagai pemisah, tapi Excel dengan region Indonesia
// (pemisah desimal koma) otomatis menganggap pemisah kolom itu titik-koma — hasilnya semua
// data nyangkut di satu cell. .xlsx tidak punya masalah ini karena strukturnya sudah per-cell,
// tidak tergantung pengaturan region sama sekali.
function downloadTemplateXLSX(rows, columns, filename){
  const data = rows.map(r=>{
    const obj = {};
    columns.forEach(c=>{ obj[c.label] = (r[c.key]===null || r[c.key]===undefined) ? '' : r[c.key]; });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(data, {header: columns.map(c=>c.label)});
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}
document.getElementById('btnExportInventory').addEventListener('click', ()=>{
  const cols = [
    {key:'id',label:'ID Unit'},{key:'imei',label:'IMEI'},{key:'model',label:'Model'},{key:'warna',label:'Warna'},
    {key:'kapasitas',label:'Kapasitas'},{key:'supplier',label:'Supplier'},{key:'gudang',label:'Cabang'},
    {key:'tanggal_masuk',label:'Tanggal Masuk'},{key:'hari_di_gudang',label:'Hari di Cabang'},
    {key:'status',label:'Status'},{key:'report_qc',label:'Report QC'},{key:'catatan',label:'Catatan'},
    {key:'harga_beli',label:'Harga Beli'},{key:'harga_jual',label:'Harga Jual'}
  ];
  const rows = getFiltered().map(d=>({...d, status: effectiveStatus(d), report_qc: normalizeReportQC(d.report_qc)}));
  downloadCSV(toCSV(rows, cols), `inventory_iphone_${new Date().toISOString().slice(0,10)}.csv`);
});
document.getElementById('btnPrint').addEventListener('click', ()=> window.print());

// ---------- Animasi transisi tab (fade + slide) ----------
// Dipakai ulang oleh semua sistem tab di dashboard (tab utama, subtab, dan dipanggil
// juga oleh svcApp/stkApp) supaya perpindahan panel terasa mulus & seragam.
function playTabAnim(el){
  if(!el) return;
  el.classList.remove('tab-anim');
  void el.offsetWidth; // force reflow supaya animasi selalu restart
  el.classList.add('tab-anim');
}
window.playTabAnim = playTabAnim;

// ---------- Tab navigation ----------
// Scoped to #tabNav specifically: the merged Unit Service tool (inside #svcRoot) also has
// its own internal "Servis Internal / Servis Eksternal" buttons using the same .tab-btn class,
// so an unscoped selector here would double-fire and break both.
document.querySelectorAll('#tabNav .tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#tabNav .tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c=>c.style.display='none');
    btn.classList.add('active');
    const target = document.getElementById('tab-'+btn.dataset.tab);
    target.style.display='block';
    playTabAnim(target);
    // Chart.js yang dibuat sewaktu tab masih display:none salah ukur lebar canvas-nya
    // (mengukur 0 atau ukuran lama) dan bisa memaksa halaman melebar di layar kecil.
    // Chart.js secara default dengar event resize window untuk hitung ulang ukuran chart.
    window.dispatchEvent(new Event('resize'));
    // Dipakai print CSS: saat tab Stiker Barcode aktif, header/KPI/tab-nav dashboard
    // disembunyikan khusus saat print supaya yang tercetak cuma lembar stiker, bukan
    // ikut ke-print jadi "halaman 1" yang tidak diinginkan.
    document.body.classList.toggle('stiker-active', btn.dataset.tab === 'stiker');
    // Setiap kali tab utama "Unit iPhone" dibuka, selalu mulai dari subtab Ringkasan
    // (bukan subtab terakhir yang aktif sebelumnya). Fungsi jumpToDataUnit/jumpToReportQC
    // tetap jalan normal karena mereka klik subtab tujuan SESUDAH ini, jadi hasil akhirnya
    // tetap lompat ke subtab yang benar, bukan ketimpa balik ke Ringkasan.
    if(btn.dataset.tab === 'unit'){
      const ringkasanBtn = document.querySelector('#subtabNav .subtab-btn[data-subtab="ringkasan"]');
      if(ringkasanBtn) ringkasanBtn.click();
    }
    // Re-render tiap kali dibuka (bukan cuma sekali di renderEverything) supaya angka dari
    // Unit Service & Stiker Barcode — dua modul terpisah yang bootstrap datanya sendiri-sendiri
    // secara async — selalu ikut ke-refresh walau load-nya lebih lambat dari dashboard utama.
    if(btn.dataset.tab === 'dashboardutama'){
      renderDashboardUtama();
    }
  });
});

// ---------- Sub-tab navigation (dalam tab Unit iPhone) ----------
document.querySelectorAll('.subtab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.subtab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.subtab-content').forEach(c=>c.style.display='none');
    btn.classList.add('active');
    const target = document.getElementById('subtab-'+btn.dataset.subtab);
    target.style.display='block';
    playTabAnim(target);
    window.dispatchEvent(new Event('resize'));
  });
});

// ---------- Ringkasan Gabungan (semua kategori) ----------
function nilaiStokKategori(arr, isUnit){
  if(isUnit) return arr.filter(d=>effectiveStatus(d)!=='Terjual').reduce((a,d)=>a+d.harga_beli,0);
  return arr.reduce((a,d)=>a+(d.qty*d.harga_beli),0);
}
function renderOverviewKPI(){
  const unitVal = nilaiStokKategori(inventoryData, true);
  const unitQty = inventoryData.filter(d=>effectiveStatus(d)!=='Terjual').length;
  const dbVal = nilaiStokKategori(dusboxData, false);
  const dbQty = dusboxData.reduce((a,d)=>a+d.qty,0);
  const accVal = nilaiStokKategori(aksesorisData, false);
  const accQty = aksesorisData.reduce((a,d)=>a+d.qty,0);
  const spVal = nilaiStokKategori(sparepartData, false);
  const spQty = sparepartData.reduce((a,d)=>a+d.qty,0);
  const totalVal = unitVal+dbVal+accVal+spVal;

  const cards = [
    {label:'Unit iPhone', value:unitQty+' unit', sub:fmtRp(unitVal), cls:'c-blue'},
    {label:'Dusbox', value:dbQty+' pcs', sub:fmtRp(dbVal), cls:'c-amber'},
    {label:'Aksesoris', value:accQty+' pcs', sub:fmtRp(accVal), cls:'c-purple'},
    {label:'Sparepart', value:spQty+' pcs', sub:fmtRp(spVal), cls:'c-cyan'},
    {label:'Total Nilai Inventory', value:fmtRp(totalVal), sub:'seluruh kategori', cls:'c-green'},
  ];
  document.getElementById('overviewKpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value" style="font-size:18px;">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

// ---------- Generic SKU-category dashboard (Dusbox / Aksesoris / Sparepart) ----------
function buildCategoryDashboard(cfg){
  const { data, prefix, groupKey, chartId } = cfg;

  function computeKpi(){
    const totalSku = data.length;
    const totalQty = data.reduce((a,d)=>a+d.qty,0);
    const totalNilai = data.reduce((a,d)=>a+(d.qty*d.harga_beli),0);
    const belowReorder = data.filter(d=>d.qty < d.reorder_point).length;
    const habis = data.filter(d=>d.qty===0).length;
    return {totalSku, totalQty, totalNilai, belowReorder, habis};
  }

  function renderKpiCards(){
    const k = computeKpi();
    const cards = [
      {label:'Total SKU', value:k.totalSku, sub:'jenis item tercatat', cls:'c-blue'},
      {label:'Total Qty', value:k.totalQty+' pcs', sub:'seluruh stok', cls:'c-cyan'},
      {label:'Nilai Stok', value:fmtRp(k.totalNilai), sub:'harga beli', cls:'c-green'},
      {label:'Di Bawah Reorder', value:k.belowReorder, sub:'SKU perlu restock', cls:'c-amber'},
      {label:'Stok Habis', value:k.habis, sub:'qty = 0', cls:'c-red'},
    ];
    document.getElementById(prefix+'KpiGrid').innerHTML = cards.map(c=>`
      <div class="kpi ${c.cls}">
        <div class="label">${c.label}</div>
        <div class="value">${c.value}</div>
        <div class="sub">${c.sub}</div>
      </div>`).join('');
  }

  function renderChart(){
    const grouped = {};
    data.forEach(d=>{ grouped[d[groupKey]] = (grouped[d[groupKey]]||0) + d.qty; });
    const entries = Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,12);
    makeChart(chartId, {
      type:'bar',
      data:{ labels:entries.map(e=>e[0]), datasets:[{ data:entries.map(e=>e[1]), backgroundColor:'#3b82f6', borderRadius:5 }]},
      options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}}, y:{grid:{display:false}, ticks:{font:{size:10}}} } }
    });
  }

  function renderReorderAlert(){
    const rows = data.filter(d=>d.qty < d.reorder_point).sort((a,b)=>(a.qty-a.reorder_point)-(b.qty-b.reorder_point));
    document.getElementById(prefix+'ReorderCount').textContent = `${rows.length} SKU perlu reorder`;
    document.getElementById(prefix+'ReorderList').innerHTML = rows.map(d=>`
      <div class="alert-item">
        <div>
          <div class="a-model">${d.jenis}${d.kompatibel_model && d.kompatibel_model!=='Universal' ? ' · '+d.kompatibel_model : ''}</div>
          <div style="color:var(--muted)">${d.gudang} · Stok: ${d.qty} / Min: ${d.reorder_point}</div>
        </div>
        <div class="a-days" style="color:${d.qty===0?'var(--danger)':'var(--warn)'};">${d.qty===0?'HABIS':'+'+(d.reorder_point-d.qty)}</div>
      </div>`).join('') || '<div style="color:var(--muted);font-size:12px;">Semua SKU masih di atas batas aman.</div>';
  }

  function populateFilters(filterIds){
    filterIds.forEach(({id,key})=>{
      const el = document.getElementById(id);
      if(!el) return;
      const vals = [...new Set(data.map(d=>d[key]))].filter(Boolean).sort();
      const defaultOpt = el.querySelector('option');
      el.innerHTML = (defaultOpt ? defaultOpt.outerHTML : '') + vals.map(v=>`<option value="${v}">${v}</option>`).join('');
    });
  }

  return { computeKpi, renderKpiCards, renderChart, renderReorderAlert, populateFilters };
}

// ---- Dusbox ----
const dusboxDash = buildCategoryDashboard({ data:dusboxData, prefix:'dusbox', groupKey:'kompatibel_model', chartId:'chartDusbox' });
function renderDusboxTable(){
  const search = document.getElementById('dusboxSearch').value.toLowerCase();
  const fModel = document.getElementById('dusboxFModel').value;
  const fKondisi = document.getElementById('dusboxFKondisi').value;
  const fGudang = document.getElementById('dusboxFGudang').value;
  let rows = dusboxData.filter(d=>{
    if(fModel && d.kompatibel_model!==fModel) return false;
    if(fKondisi && d.kondisi!==fKondisi) return false;
    if(fGudang && d.gudang!==fGudang) return false;
    if(search && !`${d.jenis} ${d.sku_id} ${d.kompatibel_model}`.toLowerCase().includes(search)) return false;
    return true;
  });
  document.getElementById('dusboxResultCount').textContent = `Menampilkan ${rows.length} dari ${dusboxData.length} SKU`;
  document.getElementById('dusboxTableCount').textContent = `(${dusboxData.length} SKU total)`;
  document.getElementById('dusboxTbody').innerHTML = rows.map(d=>`
    <tr><td>${d.jenis}</td><td>${d.kompatibel_model}</td><td>${d.kondisi}</td><td>${d.qty}</td><td>${d.gudang}</td><td>${d.supplier}</td><td>${fmtRp(d.harga_beli)}</td><td>${fmtRp(d.harga_jual)}</td><td>${d.tanggal_update}</td><td><div class="row-actions"><button type="button" onclick="openStokTrxModal('Dusbox','${d.sku_id}')" title="Catat keluar/masuk/pindah cabang">🔀</button><button type="button" onclick="openStockModal('dusbox','${d.sku_id}')">Edit</button><button type="button" class="del" onclick="deleteStockConfirm('dusbox','${d.sku_id}')">Hapus</button></div></td></tr>`).join('');
}
['dusboxSearch','dusboxFModel','dusboxFKondisi','dusboxFGudang'].forEach(id=>document.getElementById(id).addEventListener('input', renderDusboxTable));

// ---- Aksesoris ----
const aksesorisDash = buildCategoryDashboard({ data:aksesorisData, prefix:'aksesoris', groupKey:'jenis', chartId:'chartAksesoris' });
function renderAksesorisTable(){
  const search = document.getElementById('aksesorisSearch').value.toLowerCase();
  const fJenis = document.getElementById('aksesorisFJenis').value;
  const fGudang = document.getElementById('aksesorisFGudang').value;
  const fSupplier = document.getElementById('aksesorisFSupplier').value;
  let rows = aksesorisData.filter(d=>{
    if(fJenis && d.jenis!==fJenis) return false;
    if(fGudang && d.gudang!==fGudang) return false;
    if(fSupplier && d.supplier!==fSupplier) return false;
    if(search && !`${d.jenis} ${d.sku_id} ${d.kompatibel_model}`.toLowerCase().includes(search)) return false;
    return true;
  });
  document.getElementById('aksesorisResultCount').textContent = `Menampilkan ${rows.length} dari ${aksesorisData.length} SKU`;
  document.getElementById('aksesorisTableCount').textContent = `(${aksesorisData.length} SKU total)`;
  document.getElementById('aksesorisTbody').innerHTML = rows.map(d=>`
    <tr><td>${d.jenis}</td><td>${d.kompatibel_model}</td><td>${d.kondisi}</td><td>${d.qty}</td><td>${d.gudang}</td><td>${d.supplier}</td><td>${fmtRp(d.harga_beli)}</td><td>${fmtRp(d.harga_jual)}</td><td>${d.tanggal_update}</td><td><div class="row-actions"><button type="button" onclick="openStokTrxModal('Aksesoris','${d.sku_id}')" title="Catat keluar/masuk/pindah cabang">🔀</button><button type="button" onclick="openStockModal('aksesoris','${d.sku_id}')">Edit</button><button type="button" class="del" onclick="deleteStockConfirm('aksesoris','${d.sku_id}')">Hapus</button></div></td></tr>`).join('');
}
['aksesorisSearch','aksesorisFJenis','aksesorisFGudang','aksesorisFSupplier'].forEach(id=>document.getElementById(id).addEventListener('input', renderAksesorisTable));

// ---- Sparepart ----
const sparepartDash = buildCategoryDashboard({ data:sparepartData, prefix:'sparepart', groupKey:'jenis', chartId:'chartSparepart' });
function renderSparepartTable(){
  const search = document.getElementById('sparepartSearch').value.toLowerCase();
  const fJenis = document.getElementById('sparepartFJenis').value;
  const fKondisi = document.getElementById('sparepartFKondisi').value;
  const fGudang = document.getElementById('sparepartFGudang').value;
  let rows = sparepartData.filter(d=>{
    if(fJenis && d.jenis!==fJenis) return false;
    if(fKondisi && d.kondisi!==fKondisi) return false;
    if(fGudang && d.gudang!==fGudang) return false;
    if(search && !`${d.jenis} ${d.sku_id} ${d.kompatibel_model}`.toLowerCase().includes(search)) return false;
    return true;
  });
  document.getElementById('sparepartResultCount').textContent = `Menampilkan ${rows.length} dari ${sparepartData.length} SKU`;
  document.getElementById('sparepartTableCount').textContent = `(${sparepartData.length} SKU total)`;
  document.getElementById('sparepartTbody').innerHTML = rows.map(d=>`
    <tr><td>${d.jenis}</td><td>${d.kompatibel_model}</td><td>${d.kondisi}</td><td>${d.qty}</td><td>${d.gudang}</td><td>${d.supplier}</td><td>${fmtRp(d.harga_beli)}</td><td>${fmtRp(d.harga_jual)}</td><td>${d.tanggal_update}</td><td><div class="row-actions"><button type="button" onclick="openStokTrxModal('Sparepart','${d.sku_id}')" title="Catat keluar/masuk/pindah cabang">🔀</button><button type="button" onclick="openStockModal('sparepart','${d.sku_id}')">Edit</button><button type="button" class="del" onclick="deleteStockConfirm('sparepart','${d.sku_id}')">Hapus</button></div></td></tr>`).join('');
}
['sparepartSearch','sparepartFJenis','sparepartFKondisi','sparepartFGudang'].forEach(id=>document.getElementById(id).addEventListener('input', renderSparepartTable));

// ---------- Dusbox/Aksesoris/Sparepart: Tambah/Edit/Hapus (modal generik, field-nya identik) ----------
function nextStockSkuId(arr, prefix){
  const re = new RegExp('^'+prefix+'(\\d+)$');
  const nums = arr.map(d=>{ const m=re.exec(d.sku_id); return m?parseInt(m[1],10):0; });
  const maxNum = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(maxNum+1).padStart(4,'0')}`;
}
const STOCK_CATEGORY_CONFIG = {
  dusbox: { getArr: ()=>dusboxData, prefix:'DB-', defaultReorder:10, persistKey:PERSIST_KEYS.dusbox, label:'Dusbox' },
  aksesoris: { getArr: ()=>aksesorisData, prefix:'ACC-', defaultReorder:15, persistKey:PERSIST_KEYS.aksesoris, label:'Aksesoris' },
  sparepart: { getArr: ()=>sparepartData, prefix:'SP-', defaultReorder:5, persistKey:PERSIST_KEYS.sparepart, label:'Sparepart' },
};

function populateStockModalDatalists(){
  const allStock = [...dusboxData, ...aksesorisData, ...sparepartData];
  const models = [...new Set([...Object.keys(reorderThresholds), ...allStock.map(d=>d.kompatibel_model)])].filter(Boolean).sort();
  const suppliers = [...new Set(allStock.map(d=>d.supplier))].sort();
  const gudangs = [...new Set(allStock.map(d=>d.gudang))].sort();
  document.getElementById('stockModelList').innerHTML = models.map(m=>`<option value="${m}">`).join('');
  document.getElementById('stockSupplierList').innerHTML = suppliers.map(s=>`<option value="${s}">`).join('');
  document.getElementById('stockGudangList').innerHTML = gudangs.map(g=>`<option value="${g}">`).join('');
}

function openStockModal(category, id){
  const cfg = STOCK_CATEGORY_CONFIG[category];
  if(!cfg) return;
  populateStockModalDatalists();
  const isEdit = !!id;
  document.getElementById('stockModalTitle').textContent = (isEdit?'Edit ':'Tambah ') + cfg.label;
  document.getElementById('stockFormCategory').value = category;
  document.getElementById('stockFormId').value = id || '';
  if(isEdit){
    const d = cfg.getArr().find(x=>x.sku_id===id);
    if(!d) return;
    document.getElementById('stockFJenis').value = d.jenis;
    document.getElementById('stockFKompatibel').value = d.kompatibel_model || '';
    document.getElementById('stockFKondisi').value = d.kondisi;
    document.getElementById('stockFSatuan').value = d.satuan || 'pcs';
    document.getElementById('stockFQty').value = d.qty;
    document.getElementById('stockFReorderPoint').value = d.reorder_point;
    document.getElementById('stockFSupplier').value = d.supplier;
    document.getElementById('stockFGudang').value = d.gudang;
    document.getElementById('stockFHargaBeli').value = d.harga_beli;
    document.getElementById('stockFHargaJual').value = d.harga_jual;
  }else{
    document.getElementById('stockFJenis').value = '';
    document.getElementById('stockFKompatibel').value = '';
    document.getElementById('stockFKondisi').value = '';
    document.getElementById('stockFSatuan').value = 'pcs';
    document.getElementById('stockFQty').value = 0;
    document.getElementById('stockFReorderPoint').value = cfg.defaultReorder;
    document.getElementById('stockFSupplier').value = '';
    document.getElementById('stockFGudang').value = '';
    document.getElementById('stockFHargaBeli').value = '';
    document.getElementById('stockFHargaJual').value = '';
  }
  document.getElementById('stockModalOverlay').classList.add('open');
}
window.openStockModal = openStockModal;

function closeStockModal(){
  document.getElementById('stockModalOverlay').classList.remove('open');
}
window.closeStockModal = closeStockModal;

function saveStockForm(){
  const category = document.getElementById('stockFormCategory').value;
  const cfg = STOCK_CATEGORY_CONFIG[category];
  if(!cfg) return;
  const id = document.getElementById('stockFormId').value;
  const jenis = document.getElementById('stockFJenis').value.trim();
  const kompatibel = document.getElementById('stockFKompatibel').value.trim();
  const kondisi = document.getElementById('stockFKondisi').value.trim();
  const satuan = document.getElementById('stockFSatuan').value.trim() || 'pcs';
  const qty = parseInt(document.getElementById('stockFQty').value,10) || 0;
  const reorderPoint = parseInt(document.getElementById('stockFReorderPoint').value,10) || 0;
  const supplier = document.getElementById('stockFSupplier').value.trim();
  const gudang = document.getElementById('stockFGudang').value.trim();
  const hargaBeli = parseFloat(document.getElementById('stockFHargaBeli').value) || 0;
  const hargaJual = parseFloat(document.getElementById('stockFHargaJual').value) || 0;

  if(!jenis || !kondisi || !supplier || !gudang){
    alert('Lengkapi dulu Jenis, Kondisi, Supplier & Cabang.');
    return;
  }

  const payload = {
    jenis, kompatibel_model: kompatibel, kondisi, satuan, qty, reorder_point: reorderPoint,
    supplier, gudang, harga_beli: hargaBeli, harga_jual: hargaJual, tanggal_update: REF_TODAY_STR,
  };

  const arr = cfg.getArr();
  if(id){
    const d = arr.find(x=>x.sku_id===id);
    if(!d){ closeStockModal(); return; }
    Object.assign(d, payload);
  }else{
    arr.push(Object.assign({ sku_id: nextStockSkuId(arr, cfg.prefix) }, payload));
  }

  savePersisted(cfg.persistKey, arr);
  closeStockModal();
  renderEverything();
}
window.saveStockForm = saveStockForm;

function deleteStockConfirm(category, id){
  const cfg = STOCK_CATEGORY_CONFIG[category];
  if(!cfg) return;
  if(!confirm(`Hapus SKU ${id}? Tindakan ini tidak bisa dibatalkan.`)) return;
  const arr = cfg.getArr();
  const idx = arr.findIndex(d=>d.sku_id===id);
  if(idx===-1) return;
  arr.splice(idx,1);
  savePersisted(cfg.persistKey, arr);
  renderEverything();
}
window.deleteStockConfirm = deleteStockConfirm;

// ---------- Transaksi Item (Dusbox/Aksesoris/Sparepart: Masuk/Keluar/Pindah Cabang) ----------
const STOKTRX_TUJUAN_OPTIONS = {
  Masuk: ['Pembelian dari Supplier (Restock)', 'Retur dari Customer/Servis', 'Lainnya'],
  Keluar: ['Terjual ke Customer', 'Dipakai untuk Servis Unit', 'Retur ke Supplier', 'Lainnya'],
};

function populateStoktrxCabangList(){
  const allStock = [...dusboxData, ...aksesorisData, ...sparepartData];
  const gudangs = [...new Set(allStock.map(d=>d.gudang))].filter(Boolean).sort();
  document.getElementById('stoktrxCabangList').innerHTML = gudangs.map(g=>`<option value="${g}">`).join('');
}

function populateStoktrxSkuOptions(){
  const cfg = STOCK_CATEGORY_CONFIG[document.getElementById('stoktrxFKategoriForm').value.toLowerCase()];
  const arr = cfg ? cfg.getArr() : [];
  const sel = document.getElementById('stoktrxFSku');
  sel.innerHTML = arr.map(d=>`<option value="${d.sku_id}">${d.sku_id} — ${d.jenis}${d.kompatibel_model ? ' ('+d.kompatibel_model+')' : ''}</option>`).join('');
  updateStoktrxSkuInfo();
}

function updateStoktrxSkuInfo(){
  const kategori = document.getElementById('stoktrxFKategoriForm').value;
  const cfg = STOCK_CATEGORY_CONFIG[kategori.toLowerCase()];
  const skuId = document.getElementById('stoktrxFSku').value;
  const d = cfg && cfg.getArr().find(x=>x.sku_id===skuId);
  document.getElementById('stoktrxSkuInfo').textContent = d
    ? `Stok saat ini: ${d.qty} ${d.satuan} · Lokasi: ${d.gudang}`
    : '';
}

function toggleStoktrxTipeFields(){
  const tipe = document.getElementById('stoktrxFTipeForm').value;
  const isPindah = tipe === 'Pindah Cabang';
  document.getElementById('stoktrxQtyTujuanWrap').style.display = isPindah ? 'none' : 'flex';
  document.getElementById('stoktrxCabangWrap').style.display = isPindah ? 'block' : 'none';
  if(!isPindah){
    const tujuanSel = document.getElementById('stoktrxFTujuan');
    tujuanSel.innerHTML = STOKTRX_TUJUAN_OPTIONS[tipe].map(t=>`<option value="${t}">${t}</option>`).join('');
  }
}

document.getElementById('stoktrxFKategoriForm').addEventListener('change', populateStoktrxSkuOptions);
document.getElementById('stoktrxFSku').addEventListener('change', updateStoktrxSkuInfo);
document.getElementById('stoktrxFTipeForm').addEventListener('change', toggleStoktrxTipeFields);

function openStokTrxModal(prefillKategori, prefillSku){
  populateStoktrxCabangList();
  document.getElementById('stoktrxFKategoriForm').value = prefillKategori || 'Dusbox';
  populateStoktrxSkuOptions();
  if(prefillSku) document.getElementById('stoktrxFSku').value = prefillSku;
  updateStoktrxSkuInfo();
  document.getElementById('stoktrxFTipeForm').value = 'Masuk';
  toggleStoktrxTipeFields();
  document.getElementById('stoktrxFTanggal').value = REF_TODAY_STR;
  document.getElementById('stoktrxFQty').value = '';
  document.getElementById('stoktrxFCabangTujuan').value = '';
  document.getElementById('stoktrxFKeterangan').value = '';
  document.getElementById('stoktrxModalOverlay').classList.add('open');
}
window.openStokTrxModal = openStokTrxModal;

function closeStokTrxModal(){
  document.getElementById('stoktrxModalOverlay').classList.remove('open');
}
window.closeStokTrxModal = closeStokTrxModal;

async function saveStokTrxForm(){
  const kategori = document.getElementById('stoktrxFKategoriForm').value;
  const skuId = document.getElementById('stoktrxFSku').value;
  const tipe = document.getElementById('stoktrxFTipeForm').value;
  const tanggal = document.getElementById('stoktrxFTanggal').value;
  const keterangan = document.getElementById('stoktrxFKeterangan').value.trim();

  if(!skuId){ alert('Pilih SKU / item dulu.'); return; }
  if(!tanggal){ alert('Tanggal wajib diisi.'); return; }

  const payload = { kategori, sku_id: skuId, tipe, tanggal, keterangan };
  if(tipe === 'Pindah Cabang'){
    const cabangTujuan = document.getElementById('stoktrxFCabangTujuan').value.trim();
    if(!cabangTujuan){ alert('Cabang tujuan wajib diisi.'); return; }
    payload.cabang_tujuan = cabangTujuan;
  }else{
    const qty = parseInt(document.getElementById('stoktrxFQty').value, 10);
    if(!qty || qty <= 0){ alert('Qty harus lebih dari 0.'); return; }
    payload.qty = qty;
    payload.tujuan = document.getElementById('stoktrxFTujuan').value;
  }

  try{
    const res = await fetch('/api/stock-transaksi', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if(!res.ok){
      const body = await res.json().catch(()=>({}));
      throw new Error(body.error || `Server menolak (status ${res.status})`);
    }
    await loadStockTransaksiData();
    await refreshStockCategoryData(kategori);
    closeStokTrxModal();
    renderEverything();
  }catch(err){
    alert('⚠️ Gagal menyimpan transaksi: ' + err.message);
  }
}
window.saveStokTrxForm = saveStokTrxForm;

async function deleteStokTrxConfirm(id){
  const trx = stockTransaksiData.find(t=>t.id===id);
  if(!trx) return;
  if(!confirm(`Hapus transaksi ${id}? Efeknya ke qty/lokasi item akan dibalik (dikembalikan seperti sebelum transaksi ini dicatat).`)) return;
  try{
    const res = await fetch(`/api/stock-transaksi/${id}`, { method:'DELETE' });
    if(!res.ok){
      const body = await res.json().catch(()=>({}));
      throw new Error(body.error || `Server menolak (status ${res.status})`);
    }
    await loadStockTransaksiData();
    await refreshStockCategoryData(trx.kategori);
    renderEverything();
  }catch(err){
    alert('⚠️ Gagal menghapus transaksi: ' + err.message);
  }
}
window.deleteStokTrxConfirm = deleteStokTrxConfirm;

function renderStokTrxKpi(){
  const totalMasuk = stockTransaksiData.filter(t=>t.tipe==='Masuk').reduce((a,t)=>a+t.qty,0);
  const totalKeluar = stockTransaksiData.filter(t=>t.tipe==='Keluar').reduce((a,t)=>a+t.qty,0);
  const totalPindah = stockTransaksiData.filter(t=>t.tipe==='Pindah Cabang').length;
  const cards = [
    {label:'Total Transaksi', value:stockTransaksiData.length, sub:'seluruh riwayat', cls:'c-blue'},
    {label:'Total Masuk', value:totalMasuk, sub:'akumulasi qty masuk', cls:'c-green'},
    {label:'Total Keluar', value:totalKeluar, sub:'akumulasi qty keluar', cls:'c-red'},
    {label:'Pindah Cabang', value:totalPindah, sub:'perpindahan lokasi item', cls:'c-purple'},
  ];
  document.getElementById('stoktrxKpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

function renderStokTrxTable(){
  const search = document.getElementById('stoktrxSearch').value.toLowerCase();
  const fKategori = document.getElementById('stoktrxFKategori').value;
  const fTipe = document.getElementById('stoktrxFTipe').value;
  let rows = stockTransaksiData.filter(t=>{
    if(fKategori && t.kategori!==fKategori) return false;
    if(fTipe && t.tipe!==fTipe) return false;
    if(search && !`${t.sku_id} ${t.nama_item} ${t.keterangan||''}`.toLowerCase().includes(search)) return false;
    return true;
  });
  document.getElementById('stoktrxResultCount').textContent = `Menampilkan ${rows.length} dari ${stockTransaksiData.length} transaksi`;
  document.getElementById('stoktrxTableCount').textContent = `(${stockTransaksiData.length} transaksi total)`;
  const tipeCls = { Masuk:'qc-lolos', Keluar:'qc-gagal', 'Pindah Cabang':'qc-pending' };
  document.getElementById('stoktrxTbody').innerHTML = rows.map(t=>{
    const lokasi = t.tipe==='Pindah Cabang' ? `${t.cabang_asal||'-'} → ${t.cabang_tujuan||'-'}` : (t.cabang_asal||'-');
    return `
    <tr>
      <td>${t.tanggal}</td><td>${t.kategori}</td><td>${t.sku_id}</td><td>${t.nama_item||'-'}</td>
      <td><span class="${tipeCls[t.tipe]}">${t.tipe}</span></td>
      <td>${t.qty}</td><td>${t.tujuan||'-'}</td><td>${lokasi}</td><td>${t.keterangan||'-'}</td>
      <td><div class="row-actions"><button type="button" class="del" onclick="deleteStokTrxConfirm('${t.id}')">Hapus</button></div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="color:var(--muted);text-align:center;">Belum ada transaksi tercatat.</td></tr>';
}
['stoktrxSearch','stoktrxFKategori','stoktrxFTipe'].forEach(id=>document.getElementById(id).addEventListener('input', renderStokTrxTable));

// ---------- Retur & Klaim ----------
function renderRkKpi(){
  const retur = returKlaimData.filter(r=>r.tipe==='Retur Cabang');
  const klaim = returKlaimData.filter(r=>r.tipe==='Retur ke Supplier');
  const nilaiRetur = retur.reduce((a,r)=>a+r.nilai,0);
  const nilaiKlaim = klaim.reduce((a,r)=>a+r.nilai,0);
  const openStatuses = ['Diajukan','Diproses'];
  const belumSelesai = returKlaimData.filter(r=>openStatuses.includes(r.status)).length;

  const cards = [
    {label:'Total Retur Cabang', value:retur.length, sub:fmtRp(nilaiRetur), cls:'c-blue'},
    {label:'Total Retur ke Supplier', value:klaim.length, sub:fmtRp(nilaiKlaim), cls:'c-purple'},
    {label:'Masih Diproses', value:belumSelesai, sub:'perlu tindak lanjut', cls:'c-amber'},
    {label:'Total Kasus', value:returKlaimData.length, sub:'retur + klaim', cls:'c-cyan'},
  ];
  document.getElementById('rkKpiGrid').innerHTML = cards.map(c=>`
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

function renderRkCharts(){
  const tipes = ['Retur Cabang','Retur ke Supplier'];
  const statuses = [...new Set(returKlaimData.map(r=>r.status))];
  const dataByStatus = statuses.map(st=> tipes.map(tp=> returKlaimData.filter(r=>r.status===st && r.tipe===tp).length));

  makeChart('chartRkStatus', {
    type:'bar',
    data:{ labels:statuses, datasets:tipes.map((tp,i)=>({
      label:tp, data:statuses.map(st=>returKlaimData.filter(r=>r.status===st && r.tipe===tp).length),
      backgroundColor: i===0 ? '#3b82f6' : '#a855f7', borderRadius:5
    }))},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10,font:{size:10}}}}, scales:{ x:{grid:{display:false}, ticks:{font:{size:9}}}, y:{grid:{color:gridColor}, beginAtZero:true, ticks:{precision:0}} } }
  });

  const kategoris = [...new Set(returKlaimData.map(r=>r.kategori_barang))];
  const kategoriCounts = kategoris.map(k=>returKlaimData.filter(r=>r.kategori_barang===k).length);
  makeChart('chartRkKategori', {
    type:'doughnut',
    data:{ labels:kategoris, datasets:[{ data:kategoriCounts, backgroundColor:['#3b82f6','#f59e0b','#a855f7','#22c55e','#06b6d4'], borderColor:'#131a2b', borderWidth:2 }]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10,font:{size:10}}}} }
  });
}

function populateRkFilters(){
  const kategoris = [...new Set(returKlaimData.map(r=>r.kategori_barang))].sort();
  const statuses = [...new Set(returKlaimData.map(r=>r.status))].sort();
  const elK = document.getElementById('rkFKategori');
  const elS = document.getElementById('rkFStatus');
  elK.innerHTML = '<option value="">Semua Kategori Barang</option>' + kategoris.map(k=>`<option value="${k}">${k}</option>`).join('');
  elS.innerHTML = '<option value="">Semua Status</option>' + statuses.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function renderRkTable(){
  const search = document.getElementById('rkSearch').value.toLowerCase();
  const fTipe = document.getElementById('rkFTipe').value;
  const fKategori = document.getElementById('rkFKategori').value;
  const fStatus = document.getElementById('rkFStatus').value;
  let rows = returKlaimData.filter(r=>{
    if(fTipe && r.tipe!==fTipe) return false;
    if(fKategori && r.kategori_barang!==fKategori) return false;
    if(fStatus && r.status!==fStatus) return false;
    if(search && !`${r.referensi} ${r.deskripsi} ${r.pihak_terkait} ${r.id}`.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=> new Date(b.tanggal)-new Date(a.tanggal));

  document.getElementById('rkResultCount').textContent = `Menampilkan ${rows.length} dari ${returKlaimData.length} kasus`;
  document.getElementById('rkTableCount').textContent = `(${returKlaimData.length} kasus total)`;
  document.getElementById('rkTbody').innerHTML = rows.map(r=>{
    let referensiCell = r.referensi;
    if(r.kategori_barang === 'Unit iPhone'){
      const imei = r.imei || extractImeiFromRef(r.referensi);
      const unit = imei ? inventoryData.find(d=>String(d.imei).trim()===String(imei).trim()) : null;
      if(imei){
        referensiCell = `<span class="link-badge" onclick="jumpToDataUnit('${imei}')" title="Lihat data unit asli (harga jual, tanggal jual, dll)">${r.referensi} 🔗</span>`;
        if(unit) referensiCell += `<div style="color:var(--muted);font-size:10px;margin-top:2px;">Terjual ${fmtRp(unit.harga_jual)} · ${unit.tanggal_terjual || unit.tanggal_masuk}</div>`;
      }
    }
    const isSupplierUnitClaim = r.tipe==='Retur ke Supplier' && r.kategori_barang==='Unit iPhone';
    const dash = '<span style="color:var(--muted);">-</span>';
    return `
    <tr>
      <td>${r.id}</td><td>${r.tipe}</td><td>${r.kategori_barang}</td><td>${referensiCell}</td><td>${r.deskripsi}</td>
      <td>${r.alasan}</td><td>${r.tanggal}</td><td>${r.status}</td><td>${fmtRp(r.nilai)}</td><td>${r.pihak_terkait}</td><td>${r.catatan}</td>
      <td>${isSupplierUnitClaim ? (r.imei_baru || dash) : dash}</td>
      <td>${isSupplierUnitClaim && r.nilai_cas>0 ? fmtRp(r.nilai_cas) : dash}</td>
      <td>${isSupplierUnitClaim ? (r.tanggal_kembali || dash) : dash}</td>
      <td><div class="row-actions"><button type="button" onclick="openRkModal('${r.id}')">Edit</button><button type="button" class="del" onclick="deleteRkConfirm('${r.id}')">Hapus</button></div></td>
    </tr>`;}).join('');
}

// ---------- Retur & Klaim: sub-panel otomatis "Unit Gagal QC" ----------
// Sumber datanya bukan tabel tersendiri — murni turunan dari inventoryData yang
// report_qc-nya "Gagal QC" (di-set lewat Edit Unit / Report QC), jadi selalu sinkron
// tanpa perlu input manual. Kolom Type/Kendala/Supplier meniru format rekap Excel yang
// biasa dipakai untuk klaim ke supplier.
function populateRkGagalQcFilters(){
  const gagal = inventoryData.filter(d=>normalizeReportQC(d.report_qc)==='Gagal QC');
  const suppliers = [...new Set(gagal.map(d=>d.supplier))].sort();
  document.getElementById('rkGagalQcFSupplier').innerHTML = '<option value="">Semua Supplier</option>' + suppliers.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function renderRkGagalQc(){
  const search = document.getElementById('rkGagalQcSearch').value.toLowerCase();
  const fSupplier = document.getElementById('rkGagalQcFSupplier').value;
  let rows = inventoryData.filter(d=>normalizeReportQC(d.report_qc)==='Gagal QC');
  if(fSupplier) rows = rows.filter(d=>d.supplier===fSupplier);
  if(search){
    rows = rows.filter(d=>`${d.model} ${d.kapasitas} ${d.warna} ${d.imei} ${d.catatan} ${d.supplier}`.toLowerCase().includes(search));
  }
  rows.sort((a,b)=> new Date(b.tanggal_masuk)-new Date(a.tanggal_masuk));

  document.getElementById('rkGagalQcCount').textContent = `(${rows.length} unit)`;
  document.getElementById('rkGagalQcTbody').innerHTML = rows.map(d=>{
    const type = `${d.model} ${d.kapasitas} ${d.warna}`.replace(/\s+/g,' ').trim();
    const rk = findRkByImei(d.imei);
    const statusCell = rk
      ? `<span class="pill link-badge" onclick="jumpToRetur('${d.imei}')" title="Lihat klaim yang sudah dibuat">✅ ${rk.status}</span>`
      : `<span style="color:var(--muted);">⏳ Belum diklaim</span>`;
    const aksiCell = rk
      ? `<button type="button" onclick="jumpToRetur('${d.imei}')">Lihat Klaim</button>`
      : `<button type="button" onclick="openRkModalFromGagalQc('${d.imei}')">+ Buat Klaim</button>`;
    return `
    <tr>
      <td>${type}</td>
      <td><span class="link-badge" onclick="jumpToDataUnit('${d.imei}')" title="Lihat di Data Unit">${d.imei} 🔗</span></td>
      <td>${d.catatan && d.catatan!=='-' ? d.catatan : '<span style="color:var(--muted);">- (belum ada catatan)</span>'}</td>
      <td>${d.supplier}</td>
      <td>${statusCell}</td>
      <td><div class="row-actions">${aksiCell}</div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="color:var(--muted);text-align:center;">Tidak ada unit Gagal QC saat ini.</td></tr>';
}

// Prefill modal Tambah Retur/Klaim dari satu unit Gagal QC, biar tinggal cek & simpan.
function openRkModalFromGagalQc(imei){
  const d = inventoryData.find(u=>String(u.imei).trim()===String(imei).trim());
  if(!d) return;
  openRkModal();
  document.getElementById('rkFTipeForm').value = 'Retur ke Supplier';
  document.getElementById('rkFKategoriForm').value = 'Unit iPhone';
  document.getElementById('rkFReferensi').value = `${d.id} / IMEI ${d.imei}`;
  document.getElementById('rkFImei').value = d.imei;
  document.getElementById('rkFDeskripsi').value = `${d.model} ${d.kapasitas} ${d.warna}`.replace(/\s+/g,' ').trim();
  document.getElementById('rkFAlasan').value = (d.catatan && d.catatan!=='-') ? d.catatan : 'Gagal QC';
  document.getElementById('rkFPihakTerkait').value = d.supplier || '';
  toggleRkSupplierProgressWrap();
}
window.openRkModalFromGagalQc = openRkModalFromGagalQc;

['rkGagalQcSearch','rkGagalQcFSupplier'].forEach(id=>document.getElementById(id).addEventListener('input', renderRkGagalQc));

// ---------- Retur & Klaim: Tambah/Edit/Hapus (modal) ----------
function openRkModal(id){
  const isEdit = !!id;
  document.getElementById('rkModalTitle').textContent = isEdit ? 'Edit Retur/Klaim' : 'Tambah Retur/Klaim';
  document.getElementById('rkFormId').value = id || '';
  if(isEdit){
    const r = returKlaimData.find(x=>x.id===id);
    if(!r) return;
    document.getElementById('rkFTipeForm').value = r.tipe;
    document.getElementById('rkFKategoriForm').value = r.kategori_barang;
    document.getElementById('rkFReferensi').value = r.referensi || '';
    document.getElementById('rkFImei').value = r.imei || '';
    document.getElementById('rkFDeskripsi').value = r.deskripsi || '';
    document.getElementById('rkFAlasan').value = r.alasan || '';
    document.getElementById('rkFTanggal').value = r.tanggal;
    document.getElementById('rkFStatusForm').value = r.status;
    document.getElementById('rkFNilai').value = r.nilai;
    document.getElementById('rkFPihakTerkait').value = r.pihak_terkait || '';
    document.getElementById('rkFCatatan').value = r.catatan || '';
    document.getElementById('rkFTanggalKembali').value = r.tanggal_kembali || '';
    document.getElementById('rkFImeiBaru').value = r.imei_baru || '';
    document.getElementById('rkFNilaiCas').value = r.nilai_cas || '';
  }else{
    document.getElementById('rkFTipeForm').value = 'Retur Cabang';
    document.getElementById('rkFKategoriForm').value = '';
    document.getElementById('rkFReferensi').value = '';
    document.getElementById('rkFImei').value = '';
    document.getElementById('rkFDeskripsi').value = '';
    document.getElementById('rkFAlasan').value = '';
    document.getElementById('rkFTanggal').value = REF_TODAY_STR;
    document.getElementById('rkFStatusForm').value = 'Diajukan';
    document.getElementById('rkFNilai').value = '';
    document.getElementById('rkFPihakTerkait').value = '';
    document.getElementById('rkFCatatan').value = '';
    document.getElementById('rkFTanggalKembali').value = '';
    document.getElementById('rkFImeiBaru').value = '';
    document.getElementById('rkFNilaiCas').value = '';
  }
  toggleRkSupplierProgressWrap();
  document.getElementById('rkModalOverlay').classList.add('open');
}
window.openRkModal = openRkModal;

// Fieldset "Progress Klaim ke Supplier" (IMEI Baru/CAS/Tgl Kembali) cuma relevan buat
// klaim Unit iPhone yang diretur ke supplier (alur: Report QC Gagal QC -> komplain ke supplier
// -> nunggu keputusan potong harga / tukar unit, kadang dapat CAS juga) — disembunyikan di kasus lain
// (Retur Cabang, klaim Sparepart/Dusbox/Aksesoris) biar modalnya nggak penuh field yang tidak relevan.
// (Tidak ada field Deadline: kapan supplier merespon di luar kendali gudang, jadi tidak ditrack.)
function toggleRkSupplierProgressWrap(){
  const relevant = document.getElementById('rkFTipeForm').value === 'Retur ke Supplier'
    && document.getElementById('rkFKategoriForm').value.trim() === 'Unit iPhone';
  document.getElementById('rkSupplierProgressWrap').style.display = relevant ? 'block' : 'none';
}
document.getElementById('rkFTipeForm').addEventListener('change', toggleRkSupplierProgressWrap);
document.getElementById('rkFKategoriForm').addEventListener('input', toggleRkSupplierProgressWrap);

function closeRkModal(){
  document.getElementById('rkModalOverlay').classList.remove('open');
}
window.closeRkModal = closeRkModal;

function saveRkForm(){
  const id = document.getElementById('rkFormId').value;
  const tipe = document.getElementById('rkFTipeForm').value;
  const kategori = document.getElementById('rkFKategoriForm').value.trim();
  const referensi = document.getElementById('rkFReferensi').value.trim();
  const imei = document.getElementById('rkFImei').value.trim();
  const deskripsi = document.getElementById('rkFDeskripsi').value.trim();
  const alasan = document.getElementById('rkFAlasan').value.trim();
  const tanggal = document.getElementById('rkFTanggal').value;
  const status = document.getElementById('rkFStatusForm').value;
  const nilai = parseFloat(document.getElementById('rkFNilai').value) || 0;
  const pihakTerkait = document.getElementById('rkFPihakTerkait').value.trim();
  const catatan = document.getElementById('rkFCatatan').value.trim();
  const tanggalKembali = document.getElementById('rkFTanggalKembali').value || null;
  const imeiBaru = document.getElementById('rkFImeiBaru').value.trim() || null;
  const nilaiCas = parseFloat(document.getElementById('rkFNilaiCas').value) || 0;

  if(!kategori || !deskripsi || !alasan || !tanggal){
    alert('Lengkapi dulu Kategori Barang, Deskripsi, Alasan & Tanggal.');
    return;
  }

  const payload = {
    tipe, kategori_barang: kategori, referensi, imei: imei || null, deskripsi, alasan, tanggal,
    status, nilai, pihak_terkait: pihakTerkait, catatan,
    tanggal_kembali: tanggalKembali, imei_baru: imeiBaru, nilai_cas: nilaiCas,
  };

  if(id){
    const r = returKlaimData.find(x=>x.id===id);
    if(!r){ closeRkModal(); return; }
    Object.assign(r, payload);
  }else{
    returKlaimData.push(Object.assign({ id: nextRkId(tipe) }, payload));
  }

  saveReturKlaimData();
  closeRkModal();
  renderEverything();
}
window.saveRkForm = saveRkForm;

function deleteRkConfirm(id){
  if(!confirm(`Hapus kasus ${id}? Tindakan ini tidak bisa dibatalkan.`)) return;
  const idx = returKlaimData.findIndex(r=>r.id===id);
  if(idx===-1) return;
  returKlaimData.splice(idx,1);
  saveReturKlaimData();
  renderEverything();
}
window.deleteRkConfirm = deleteRkConfirm;
['rkSearch','rkFTipe','rkFKategori','rkFStatus'].forEach(id=>document.getElementById(id).addEventListener('input', renderRkTable));

// ---------- Input Massal (tabel banyak baris ATAU tempel dari Excel) ----------
// Dipakai bersama 5 panel: Unit/Dusbox/Aksesoris/Sparepart/Retur & Klaim. Ini MENAMBAH baris
// baru ke data yang sudah ada — beda dari fitur Import Data yang MENGGANTI seluruh dataset.
function makeStockBulkConfig(category, getArr, persistKey, defaultReorder){
  const prefix = {dusbox:'DB-', aksesoris:'ACC-', sparepart:'SP-'}[category];
  const label = {dusbox:'Dusbox', aksesoris:'Aksesoris', sparepart:'Sparepart'}[category];
  return {
    label, getArr,
    columns: [
      {key:'jenis', label:'Jenis*', type:'text', width:150},
      {key:'kompatibel_model', label:'Kompatibel', type:'text', width:110, list:'stockModelList'},
      {key:'kondisi', label:'Kondisi*', type:'text', width:100},
      {key:'qty', label:'Qty*', type:'number', width:70},
      {key:'supplier', label:'Supplier*', type:'text', width:140},
      {key:'gudang', label:'Gudang*', type:'text', width:140},
      {key:'harga_beli', label:'Harga Beli', type:'number', width:110},
      {key:'harga_jual', label:'Harga Jual', type:'number', width:110},
    ],
    pasteHint: 'Urutan kolom: Jenis, Kompatibel Model, Kondisi, Qty, Supplier, Gudang, Harga Beli, Harga Jual. Pisahkan tiap kolom dengan Tab (langsung dari paste Excel), satu baris per SKU.',
    validateRow(v){
      if(!v.jenis) return 'Jenis wajib diisi';
      if(!v.kondisi) return 'Kondisi wajib diisi';
      if(!v.supplier) return 'Supplier wajib diisi';
      if(!v.gudang) return 'Gudang wajib diisi';
      return null;
    },
    buildRow(v){
      return {
        sku_id: nextStockSkuId(getArr(), prefix), jenis: v.jenis, kompatibel_model: v.kompatibel_model||'',
        kondisi: v.kondisi, qty: Number(v.qty)||0, satuan: 'pcs',
        harga_beli: Number(v.harga_beli)||0, harga_jual: Number(v.harga_jual)||0,
        supplier: v.supplier, gudang: v.gudang, reorder_point: defaultReorder, tanggal_update: REF_TODAY_STR,
      };
    },
    afterSave(){ savePersisted(persistKey, getArr()); renderEverything(); },
  };
}

const BULK_CONFIGS = {
  unit: {
    label: 'Unit iPhone', getArr: () => inventoryData, dupeKey: 'imei',
    columns: [
      {key:'imei', label:'IMEI*', type:'text', width:120},
      {key:'model', label:'Model*', type:'text', width:130, list:'unitModelList'},
      {key:'kapasitas', label:'Kapasitas*', type:'text', width:90},
      {key:'warna', label:'Warna*', type:'text', width:110},
      {key:'supplier', label:'Supplier*', type:'text', width:140},
      {key:'gudang', label:'Gudang*', type:'text', width:140},
      {key:'tanggal_masuk', label:'Tgl Masuk*', type:'date', width:130},
      {key:'harga_beli', label:'Harga Beli', type:'number', width:110},
      {key:'harga_jual', label:'Harga Jual', type:'number', width:110},
    ],
    pasteHint: 'Urutan kolom: IMEI, Model, Kapasitas, Warna, Supplier, Gudang, Tanggal Masuk (YYYY-MM-DD), Harga Beli, Harga Jual. Pisahkan tiap kolom dengan Tab (langsung dari paste Excel), satu baris per unit.',
    validateRow(v){
      if(!/^\d{15}$/.test(v.imei||'')) return 'IMEI harus 15 digit angka';
      if(!v.model) return 'Model wajib diisi';
      if(!v.kapasitas) return 'Kapasitas wajib diisi';
      if(!v.warna) return 'Warna wajib diisi';
      if(!v.supplier) return 'Supplier wajib diisi';
      if(!v.gudang) return 'Gudang wajib diisi';
      if(!v.tanggal_masuk) return 'Tanggal masuk wajib diisi';
      if(inventoryData.some(d=>d.imei===v.imei)) return 'IMEI sudah dipakai unit lain';
      return null;
    },
    buildRow(v){
      return {
        id: nextUnitId(), imei: v.imei, model: v.model, kapasitas: v.kapasitas, warna: v.warna,
        supplier: v.supplier, gudang: v.gudang, tanggal_masuk: v.tanggal_masuk,
        status: 'Ready Stock', report_qc: 'Pending QC', catatan: '-',
        harga_beli: Number(v.harga_beli)||0, harga_jual: Number(v.harga_jual)||0,
        tanggal_terjual: null, alasan_flashsale: null,
      };
    },
    afterSave(){ saveInventoryData(); renderEverything(); },
  },
  dusbox: null, aksesoris: null, sparepart: null,
  returklaim: {
    label: 'Retur & Klaim', getArr: () => returKlaimData,
    columns: [
      {key:'tipe', label:'Tipe*', type:'select', options:['Retur Cabang','Retur ke Supplier'], width:130},
      {key:'kategori_barang', label:'Kategori*', type:'text', width:120},
      {key:'referensi', label:'Referensi', type:'text', width:130},
      {key:'deskripsi', label:'Deskripsi*', type:'text', width:150},
      {key:'alasan', label:'Alasan*', type:'text', width:150},
      {key:'tanggal', label:'Tanggal*', type:'date', width:130},
      {key:'nilai', label:'Nilai', type:'number', width:110},
      {key:'pihak_terkait', label:'Pihak Terkait', type:'text', width:130},
    ],
    pasteHint: 'Urutan kolom: Tipe (persis "Retur Cabang" atau "Retur ke Supplier"), Kategori Barang, Referensi, Deskripsi, Alasan, Tanggal (YYYY-MM-DD), Nilai, Pihak Terkait. Pisahkan dengan Tab.',
    validateRow(v){
      if(v.tipe!=='Retur Cabang' && v.tipe!=='Retur ke Supplier') return 'Tipe harus persis "Retur Cabang" atau "Retur ke Supplier"';
      if(!v.kategori_barang) return 'Kategori Barang wajib diisi';
      if(!v.deskripsi) return 'Deskripsi wajib diisi';
      if(!v.alasan) return 'Alasan wajib diisi';
      if(!v.tanggal) return 'Tanggal wajib diisi';
      return null;
    },
    buildRow(v){
      return {
        id: nextRkId(v.tipe), tipe: v.tipe, kategori_barang: v.kategori_barang, referensi: v.referensi||'',
        imei: null, deskripsi: v.deskripsi, alasan: v.alasan, tanggal: v.tanggal, status: 'Diajukan',
        nilai: Number(v.nilai)||0, pihak_terkait: v.pihak_terkait||'', catatan: '',
      };
    },
    afterSave(){ saveReturKlaimData(); renderEverything(); },
  },
};
BULK_CONFIGS.dusbox = makeStockBulkConfig('dusbox', ()=>dusboxData, PERSIST_KEYS.dusbox, 10);
BULK_CONFIGS.aksesoris = makeStockBulkConfig('aksesoris', ()=>aksesorisData, PERSIST_KEYS.aksesoris, 15);
BULK_CONFIGS.sparepart = makeStockBulkConfig('sparepart', ()=>sparepartData, PERSIST_KEYS.sparepart, 5);

let bulkMode = 'table';

function buildBulkTableHead(cfg){
  document.getElementById('bulkTableHead').innerHTML = cfg.columns.map(c=>`<th>${c.label}</th>`).join('') + '<th></th>';
}

function addBulkRow(){
  const category = document.getElementById('bulkFormCategory').value;
  const cfg = BULK_CONFIGS[category];
  if(!cfg) return;
  const tr = document.createElement('tr');
  tr.innerHTML = cfg.columns.map(c=>{
    if(c.type==='select'){
      return `<td><select data-key="${c.key}" style="width:100%;min-width:${c.width||90}px;">${c.options.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></td>`;
    }
    const listAttr = c.list ? ` list="${c.list}"` : '';
    return `<td><input type="${c.type}" data-key="${c.key}"${listAttr} style="width:100%;min-width:${c.width||90}px;"></td>`;
  }).join('') + `<td><button type="button" class="del" onclick="this.closest('tr').remove()">×</button></td>`;
  document.getElementById('bulkTableBody').appendChild(tr);
}
window.addBulkRow = addBulkRow;

function openBulkModal(category){
  const cfg = BULK_CONFIGS[category];
  if(!cfg) return;
  document.getElementById('bulkFormCategory').value = category;
  document.getElementById('bulkModalTitle').textContent = 'Tambah Massal — ' + cfg.label;
  document.getElementById('bulkPasteHint').textContent = cfg.pasteHint;
  document.getElementById('bulkPasteText').value = '';
  document.getElementById('bulkStatusMsg').textContent = '';
  buildBulkTableHead(cfg);
  document.getElementById('bulkTableBody').innerHTML = '';
  addBulkRow(); addBulkRow(); addBulkRow();
  switchBulkMode('table');
  document.getElementById('bulkModalOverlay').classList.add('open');
}
window.openBulkModal = openBulkModal;

function closeBulkModal(){
  document.getElementById('bulkModalOverlay').classList.remove('open');
}
window.closeBulkModal = closeBulkModal;

function switchBulkMode(mode){
  bulkMode = mode;
  document.getElementById('bulkModeTablePanel').style.display = mode==='table' ? 'block' : 'none';
  document.getElementById('bulkModePastePanel').style.display = mode==='paste' ? 'block' : 'none';
  document.getElementById('bulkModeTableBtn').className = 'btn' + (mode==='table' ? '' : ' btn-outline');
  document.getElementById('bulkModePasteBtn').className = 'btn' + (mode==='paste' ? '' : ' btn-outline');
}
window.switchBulkMode = switchBulkMode;

function readBulkTableRows(cfg){
  const rows = [...document.querySelectorAll('#bulkTableBody tr')];
  return rows.map(tr=>{
    const v = {};
    cfg.columns.forEach(c=>{
      const el = tr.querySelector(`[data-key="${c.key}"]`);
      v[c.key] = el ? el.value.trim() : '';
    });
    return v;
  }).filter(v => Object.values(v).some(x=>x));
}

function parsePastedBulkRows(cfg, text){
  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>0);
  return lines.map(line=>{
    const parts = line.includes('\t') ? line.split('\t') : line.split('|');
    const v = {};
    cfg.columns.forEach((c,i)=>{ v[c.key] = (parts[i]||'').trim(); });
    return v;
  });
}

function saveBulkForm(){
  const category = document.getElementById('bulkFormCategory').value;
  const cfg = BULK_CONFIGS[category];
  if(!cfg) return;

  const rawRows = bulkMode==='table' ? readBulkTableRows(cfg) : parsePastedBulkRows(cfg, document.getElementById('bulkPasteText').value);
  const statusEl = document.getElementById('bulkStatusMsg');
  if(rawRows.length===0){
    statusEl.textContent = 'Belum ada baris untuk disimpan.';
    statusEl.style.color = 'var(--danger)';
    return;
  }

  let added = 0;
  const errors = [];
  const seenKeys = new Set();
  rawRows.forEach((v, idx)=>{
    const err = cfg.validateRow(v);
    if(err){ errors.push(`Baris ${idx+1}: ${err}`); return; }
    if(cfg.dupeKey){
      const k = v[cfg.dupeKey];
      if(seenKeys.has(k)){ errors.push(`Baris ${idx+1}: ${cfg.dupeKey} duplikat di daftar ini`); return; }
      seenKeys.add(k);
    }
    cfg.getArr().push(cfg.buildRow(v));
    added++;
  });

  if(added>0) cfg.afterSave();

  const msgParts = [];
  if(added>0) msgParts.push(`✓ ${added} baris berhasil ditambahkan.`);
  if(errors.length>0) msgParts.push(`${errors.length} baris dilewati — ` + errors.join(' | '));
  statusEl.textContent = msgParts.join(' ');
  statusEl.style.color = errors.length>0 ? 'var(--danger)' : 'var(--muted)';

  if(added>0 && errors.length===0){
    closeBulkModal();
  }
}
window.saveBulkForm = saveBulkForm;

// ---------- Rekomendasi Transfer Antar Cabang (SKU: Aksesoris / Sparepart) ----------
function renderCategoryTransfer(containerId, countId, data){
  const groups = {};
  data.forEach(d=>{
    const key = d.jenis + '|' + (d.kompatibel_model||'');
    (groups[key] = groups[key] || []).push(d);
  });

  const recs = [];
  Object.values(groups).forEach(items=>{
    if(items.length < 2) return; // butuh minimal 2 cabang untuk dibandingkan
    const deficit = items.filter(d=>d.qty < d.reorder_point).sort((a,b)=>a.qty-b.qty);
    const surplus = items.filter(d=>d.qty >= d.reorder_point*2 && (d.qty-d.reorder_point)>=3).sort((a,b)=>b.qty-a.qty);
    const used = new Set();
    deficit.forEach(def=>{
      const sur = surplus.find(s=> s.gudang!==def.gudang && !used.has(s.sku_id));
      if(sur){
        const qty = Math.min(3, sur.qty - sur.reorder_point);
        if(qty>0){
          used.add(sur.sku_id);
          const label = sur.jenis + (sur.kompatibel_model && sur.kompatibel_model!=='Universal' ? ' · '+sur.kompatibel_model : '');
          recs.push({ label, from:sur.gudang, to:def.gudang, qty, fromStock:sur.qty, toStock:def.qty });
        }
      }
    });
  });

  document.getElementById(countId).textContent = `${recs.length} rekomendasi`;
  document.getElementById(containerId).innerHTML = recs.slice(0,12).map(r=>`
    <div class="transfer-item">
      <div>
        <div class="a-model">${r.label}</div>
        <div class="t-route">${r.from} (stok ${r.fromStock}) → ${r.to} (stok ${r.toStock})</div>
      </div>
      <div class="t-qty">${r.qty} pcs</div>
    </div>`).join('') || '<div style="color:var(--muted);font-size:12px;">Belum ada rekomendasi transfer — distribusi stok antar cabang cukup merata.</div>';
}

// ---------- Import Data (CSV / Excel) ----------
function replaceArrayContents(arr, items){
  arr.length = 0;
  items.forEach(it=>arr.push(it));
}

// Dulu tanggal tetap (demo data) — sekarang tanggal hari ini yang sesungguhnya, supaya
// hari_di_gudang, filter FIFO, forecast, dst tetap akurat seiring waktu berjalan.
const REF_TODAY_STR = new Date().toISOString().slice(0,10);

const importConfigs = [
  {
    key:'unit', label:'Unit iPhone', arr:inventoryData,
    columns:['imei','model','warna','kapasitas','supplier','gudang','tanggal_masuk','status','report_qc','catatan','harga_beli','harga_jual','tanggal_terjual','alasan_flashsale'],
    example:{imei:'351234567890123', model:'iPhone 15', warna:'Blue', kapasitas:'256GB', supplier:'CV Gadget Prima', gudang:'Cabang Jakarta Pusat', tanggal_masuk:'2026-07-01', status:'Ready Stock', report_qc:'Lolos QC', catatan:'-', harga_beli:14000000, harga_jual:15000000, tanggal_terjual:'', alasan_flashsale:''},
    transform:(row, idx)=>{
      const tglMasuk = row.tanggal_masuk || REF_TODAY_STR;
      const hari = Math.max(0, Math.round((new Date(REF_TODAY_STR) - new Date(tglMasuk))/86400000));
      return {
        id: row.id || ('IMP-U'+String(idx+1).padStart(4,'0')),
        imei: String(row.imei||''),
        model: row.model||'', warna: row.warna||'', kapasitas: row.kapasitas||'',
        supplier: row.supplier||'', gudang: row.gudang||'',
        tanggal_masuk: tglMasuk, hari_di_gudang: hari,
        status: row.status || 'Ready Stock', report_qc: normalizeReportQC(row.report_qc), catatan: row.catatan || '-',
        harga_beli: Number(row.harga_beli)||0, harga_jual: Number(row.harga_jual)||0,
        tanggal_terjual: row.tanggal_terjual || null, alasan_flashsale: row.alasan_flashsale || null
      };
    }
  },
  {
    key:'dusbox', label:'Dusbox', arr:dusboxData,
    columns:['jenis','kompatibel_model','kondisi','qty','harga_beli','harga_jual','supplier','gudang','reorder_point'],
    example:{jenis:'Dusbox iPhone 15', kompatibel_model:'iPhone 15', kondisi:'Baik', qty:12, harga_beli:50000, harga_jual:60000, supplier:'CV Gadget Prima', gudang:'Cabang Jakarta Pusat', reorder_point:10},
    transform:(row, idx)=>({
      sku_id: row.sku_id || ('IMP-DB'+String(idx+1).padStart(4,'0')),
      jenis: row.jenis||'', kompatibel_model: row.kompatibel_model||'', kondisi: row.kondisi||'Baik',
      qty: Number(row.qty)||0, satuan:'pcs', harga_beli:Number(row.harga_beli)||0, harga_jual:Number(row.harga_jual)||0,
      supplier: row.supplier||'', gudang: row.gudang||'', reorder_point:Number(row.reorder_point)||10,
      tanggal_update: REF_TODAY_STR
    })
  },
  {
    key:'aksesoris', label:'Aksesoris', arr:aksesorisData,
    columns:['jenis','kompatibel_model','kondisi','qty','harga_beli','harga_jual','supplier','gudang','reorder_point'],
    example:{jenis:'Charger 20W Original', kompatibel_model:'Universal', kondisi:'Original Sealed', qty:30, harga_beli:120000, harga_jual:170000, supplier:'Agen Erafone Pusat', gudang:'Cabang Surabaya', reorder_point:15},
    transform:(row, idx)=>({
      sku_id: row.sku_id || ('IMP-ACC'+String(idx+1).padStart(4,'0')),
      jenis: row.jenis||'', kompatibel_model: row.kompatibel_model||'Universal', kondisi: row.kondisi||'',
      qty: Number(row.qty)||0, satuan:'pcs', harga_beli:Number(row.harga_beli)||0, harga_jual:Number(row.harga_jual)||0,
      supplier: row.supplier||'', gudang: row.gudang||'', reorder_point:Number(row.reorder_point)||15,
      tanggal_update: REF_TODAY_STR
    })
  },
  {
    key:'sparepart', label:'Sparepart', arr:sparepartData,
    columns:['jenis','kompatibel_model','kondisi','qty','harga_beli','harga_jual','supplier','gudang','reorder_point'],
    example:{jenis:'LCD Assembly', kompatibel_model:'iPhone 15', kondisi:'Original', qty:8, harga_beli:850000, harga_jual:1100000, supplier:'PT Trikomsel Abadi', gudang:'Cabang Bandung', reorder_point:5},
    transform:(row, idx)=>({
      sku_id: row.sku_id || ('IMP-SP'+String(idx+1).padStart(4,'0')),
      jenis: row.jenis||'', kompatibel_model: row.kompatibel_model||'', kondisi: row.kondisi||'',
      qty: Number(row.qty)||0, satuan:'pcs', harga_beli:Number(row.harga_beli)||0, harga_jual:Number(row.harga_jual)||0,
      supplier: row.supplier||'', gudang: row.gudang||'', reorder_point:Number(row.reorder_point)||5,
      tanggal_update: REF_TODAY_STR
    })
  },
  {
    key:'returklaim', label:'Retur & Klaim', arr:returKlaimData,
    columns:['tipe','kategori_barang','referensi','imei','deskripsi','alasan','tanggal','status','nilai','pihak_terkait','catatan','imei_baru','nilai_cas','tanggal_kembali'],
    example:{tipe:'Retur ke Supplier', kategori_barang:'Unit iPhone', referensi:'U0001 / IMEI 351234567890123', imei:'351234567890123', deskripsi:'iPhone 15 Blue 256GB', alasan:'Unit mati total', tanggal:'2026-07-20', status:'Diproses', nilai:15000000, pihak_terkait:'CV Gadget Prima', catatan:'Repair', imei_baru:'', nilai_cas:0, tanggal_kembali:''},
    transform:(row, idx)=>({
      id: row.id || ('IMP-RK'+String(idx+1).padStart(4,'0')),
      tipe: row.tipe || 'Retur Cabang', kategori_barang: row.kategori_barang||'', referensi: row.referensi||'',
      imei: row.imei ? String(row.imei).trim() : '',
      deskripsi: row.deskripsi||'', alasan: row.alasan||'', tanggal: row.tanggal || REF_TODAY_STR,
      status: row.status || 'Diajukan', nilai: Number(row.nilai)||0, pihak_terkait: row.pihak_terkait||'', catatan: row.catatan||'',
      imei_baru: row.imei_baru||'', nilai_cas: Number(row.nilai_cas)||0, tanggal_kembali: row.tanggal_kembali||null,
    })
  }
];

function buildImportUI(){
  document.getElementById('importGrid').innerHTML = importConfigs.map(cfg=>`
    <div class="import-card">
      <h3>${cfg.label}</h3>
      <div class="imp-sub">Kolom: ${cfg.columns.join(', ')}</div>
      <div class="btn-row" style="margin-bottom:0;">
        <button class="btn btn-outline" data-download="${cfg.key}" type="button">⬇ Download Template (Excel)</button>
      </div>
      <label style="display:block;font-size:11px;color:var(--muted);margin:10px 0 2px;">Ganti Semua Data (isi file = seluruh data baru, yang lama ditimpa)</label>
      <input type="file" accept=".csv,.xlsx,.xls" data-upload="${cfg.key}">
      <div class="imp-status" id="impStatus-${cfg.key}"></div>
      ${cfg.key==='unit' ? `
      <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border);">
        <label style="display:block;font-size:11px;color:var(--muted);margin-bottom:2px;">🔄 Sync Harian (update data fisik unit dari file, TANPA menghapus unit lain & TANPA mengubah status/Report QC/Tanggal Terjual yang sudah tercatat di aplikasi)</label>
        <input type="file" accept=".csv,.xlsx,.xls" data-upload-sync="unit">
        <div class="imp-status" id="impStatus-unit-sync"></div>
      </div>
      <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border);">
        <label style="display:block;font-size:11px;color:var(--muted);margin-bottom:2px;">💰 Import Unit Terjual (tandai unit yang sudah ada jadi Terjual dari file, TANPA mengubah data fisik unit lain)</label>
        <div class="imp-sub">Kolom: imei, tanggal_terjual, harga_jual</div>
        <div class="btn-row" style="margin-bottom:6px;">
          <button class="btn btn-outline" type="button" id="btnDownloadSoldTemplate">⬇ Download Template (Excel)</button>
        </div>
        <input type="file" accept=".csv,.xlsx,.xls" data-upload-sold="unit">
        <div class="imp-status" id="impStatus-unit-sold"></div>
      </div>` : ''}
    </div>`).join('');

  importConfigs.forEach(cfg=>{
    document.querySelector(`[data-download="${cfg.key}"]`).addEventListener('click', ()=>{
      downloadTemplateXLSX([cfg.example], cfg.columns.map(c=>({key:c, label:c})), `template_${cfg.key}.xlsx`);
    });
    document.querySelector(`[data-upload="${cfg.key}"]`).addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const statusEl = document.getElementById('impStatus-'+cfg.key);
      const reader = new FileReader();
      reader.onload = (ev)=>{
        try{
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, {type:'array'});
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
          if(!rows.length) throw new Error('File kosong atau format tidak terbaca.');
          const transformed = rows.map((r,i)=>cfg.transform(r,i));
          replaceArrayContents(cfg.arr, transformed);
          if(PERSIST_KEYS[cfg.key]) savePersisted(PERSIST_KEYS[cfg.key], cfg.arr);
          renderEverything();
          statusEl.className = 'imp-status ok';
          statusEl.textContent = `✓ ${transformed.length} baris berhasil diimpor, dan otomatis tersimpan ke database — tetap ada meski halaman dibuka ulang atau dari perangkat lain.`;
        }catch(err){
          statusEl.className = 'imp-status err';
          statusEl.textContent = `✗ Gagal impor: ${err.message}`;
        }
      };
      reader.readAsArrayBuffer(file);
    });
  });

  // "Sync Harian" — cuma untuk Unit iPhone (lihat catatan di units.model.js: update field
  // fisik unit dari file, tapi status/report_qc/tanggal_terjual TIDAK ikut berubah, dan unit
  // yang tidak ada di file TIDAK dihapus).
  const syncInput = document.querySelector('[data-upload-sync="unit"]');
  if(syncInput){
    const unitCfg = importConfigs.find(c=>c.key==='unit');
    syncInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const statusEl = document.getElementById('impStatus-unit-sync');
      const reader = new FileReader();
      reader.onload = async (ev)=>{
        try{
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, {type:'array'});
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
          if(!rows.length) throw new Error('File kosong atau format tidak terbaca.');
          const transformed = rows.map((r,i)=>unitCfg.transform(r,i));
          const res = await fetch('/api/units/sync', {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows: transformed })
          });
          const result = await res.json();
          if(!res.ok) throw new Error(result.error || 'Gagal sync.');
          inventoryData.length = 0;
          inventoryData.push(...result.rows);
          renderEverything();
          statusEl.className = 'imp-status ok';
          statusEl.textContent = `✓ Sync selesai — ${result.added} unit baru ditambahkan, ${result.updated} unit diperbarui` + (result.skipped ? `, ${result.skipped} baris dilewati (IMEI tidak valid)` : '') + `. Status/Report QC/Tanggal Terjual unit yang sudah ada TIDAK berubah.`;
        }catch(err){
          statusEl.className = 'imp-status err';
          statusEl.textContent = `✗ Gagal sync: ${err.message}`;
        }finally{
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Import "Unit Terjual" — file harian yang isinya cuma unit yang laku (IMEI, tanggal jual,
  // harga jual). Cuma menandai unit yang SUDAH ADA jadi Terjual, tidak pernah bikin unit baru
  // dan tidak menyentuh field fisik lain. Lihat catatan lengkap di units.model.js.
  const soldTemplateBtn = document.getElementById('btnDownloadSoldTemplate');
  if(soldTemplateBtn){
    soldTemplateBtn.addEventListener('click', ()=>{
      const columns = [
        {key:'imei', label:'imei'}, {key:'tanggal_terjual', label:'tanggal_terjual'}, {key:'harga_jual', label:'harga_jual'},
      ];
      const example = {imei:'351234567890123', tanggal_terjual:REF_TODAY_STR, harga_jual:15000000};
      downloadTemplateXLSX([example], columns, 'template_unit_terjual.xlsx');
    });
  }
  const soldInput = document.querySelector('[data-upload-sold="unit"]');
  if(soldInput){
    soldInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const statusEl = document.getElementById('impStatus-unit-sold');
      const reader = new FileReader();
      reader.onload = async (ev)=>{
        try{
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, {type:'array'});
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
          if(!rows.length) throw new Error('File kosong atau format tidak terbaca.');
          const transformed = rows.map(r=>({
            imei: String(r.imei||'').trim(),
            tanggal_terjual: r.tanggal_terjual || '',
            harga_jual: Number(r.harga_jual) || 0,
          }));
          const res = await fetch('/api/units/mark-sold', {
            method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows: transformed })
          });
          const result = await res.json();
          if(!res.ok) throw new Error(result.error || 'Gagal impor.');
          inventoryData.length = 0;
          inventoryData.push(...result.rows);
          renderEverything();
          statusEl.className = 'imp-status ok';
          statusEl.textContent = `✓ ${result.updated} unit ditandai Terjual` + (result.notFound ? `, ${result.notFound} IMEI tidak ditemukan di database` : '') + (result.skipped ? `, ${result.skipped} baris dilewati (IMEI tidak valid)` : '') + `.`;
        }catch(err){
          statusEl.className = 'imp-status err';
          statusEl.textContent = `✗ Gagal impor: ${err.message}`;
        }finally{
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }
}

// ---------- Master render: dipanggil saat load & setelah import data ----------
function renderEverything(){
  renderKPI();
  renderCharts();
  renderFifo();
  renderFlashsale();
  populateFilterOptions();
  renderTable();
  renderReorder();
  renderDemandChart();
  renderRestockForecast();
  populatePoFilters();
  renderPoTable();
  renderSupplierPerformance();
  renderSupplierScorecard();
  renderCostAnalysis();
  populateRequestFilters();
  renderRequestTable();
  renderCustomerTable();
  renderUnitDpKpi();
  renderNotifications();
  renderMarginChart();
  renderTurnoverChart();
  renderHeatmap();
  renderTransferRecommendations();
  populateQcDateFilters();
  renderQcByDate();

  renderOverviewKPI();

  dusboxDash.renderKpiCards();
  dusboxDash.renderChart();
  dusboxDash.renderReorderAlert();
  dusboxDash.populateFilters([{id:'dusboxFModel',key:'kompatibel_model'},{id:'dusboxFKondisi',key:'kondisi'},{id:'dusboxFGudang',key:'gudang'}]);
  renderDusboxTable();

  aksesorisDash.renderKpiCards();
  aksesorisDash.renderChart();
  aksesorisDash.renderReorderAlert();
  aksesorisDash.populateFilters([{id:'aksesorisFJenis',key:'jenis'},{id:'aksesorisFGudang',key:'gudang'},{id:'aksesorisFSupplier',key:'supplier'}]);
  renderAksesorisTable();
  renderCategoryTransfer('aksesorisTransferList','aksesorisTransferCount', aksesorisData);

  sparepartDash.renderKpiCards();
  sparepartDash.renderChart();
  sparepartDash.renderReorderAlert();
  sparepartDash.populateFilters([{id:'sparepartFJenis',key:'jenis'},{id:'sparepartFKondisi',key:'kondisi'},{id:'sparepartFGudang',key:'gudang'}]);
  renderSparepartTable();
  renderCategoryTransfer('sparepartTransferList','sparepartTransferCount', sparepartData);

  renderStokTrxKpi();
  renderStokTrxTable();

  renderRkKpi();
  renderRkCharts();
  populateRkFilters();
  renderRkTable();
  populateRkGagalQcFilters();
  renderRkGagalQc();

  renderDashboardUtama();
}

// ---------- Bridge: sinkronisasi stok Sparepart dengan tab Unit Service ----------
function refreshSparepartViews(){
  savePersisted(PERSIST_KEYS.sparepart, sparepartData);
  sparepartDash.renderKpiCards();
  sparepartDash.renderChart();
  sparepartDash.renderReorderAlert();
  renderSparepartTable();
  renderCategoryTransfer('sparepartTransferList','sparepartTransferCount', sparepartData);
  renderOverviewKPI();
}

function findLinkedSparepartSku(nama, kompatibel){
  const n = String(nama||'').trim().toLowerCase();
  const k = String(kompatibel||'').trim().toLowerCase();
  if(!n) return null;
  let candidates = sparepartData.filter(d=>{
    const jenis = String(d.jenis||'').trim().toLowerCase();
    return jenis === n || jenis.includes(n) || n.includes(jenis);
  });
  if(k){
    const withModel = candidates.filter(d=> String(d.kompatibel_model||'').trim().toLowerCase() === k);
    if(withModel.length) candidates = withModel;
  }
  if(!candidates.length) return null;
  candidates.sort((a,b)=>b.qty-a.qty);
  return candidates[0];
}

window.dashboardBridge = {
  // dipanggil saat sparepart baru ditambahkan ke database Unit Service (stok fisik datang)
  findOrCreateSkuAndIncrement(nama, kompatibel){
    let sku = findLinkedSparepartSku(nama, kompatibel);
    if(!sku){
      sku = {
        sku_id: 'SP-SVC' + Math.random().toString(36).slice(2,7).toUpperCase(),
        jenis: nama || 'Sparepart (Unit Service)',
        kompatibel_model: kompatibel || 'Universal',
        kondisi: 'Original',
        qty: 0,
        satuan: 'pcs',
        harga_beli: 0,
        harga_jual: 0,
        supplier: 'Input dari Unit Service',
        gudang: (sparepartData[0] && sparepartData[0].gudang) || 'Cabang Jakarta Pusat',
        reorder_point: 5,
        tanggal_update: REF_TODAY_STR
      };
      sparepartData.push(sku);
    }
    sku.qty += 1;
    sku.tanggal_update = REF_TODAY_STR;
    refreshSparepartViews();
    return sku.sku_id;
  },
  // fuzzy-cari SKU terkait tanpa membuat baru (dipakai saat consume/release item lama yang belum ada linknya)
  findSkuId(nama, kompatibel){
    const sku = findLinkedSparepartSku(nama, kompatibel);
    return sku ? sku.sku_id : null;
  },
  // tambah/kurangi qty SKU tertentu (dipakai saat sparepart dipakai/dilepas/dihapus di Unit Service)
  adjustQty(skuId, delta){
    if(!skuId) return;
    const sku = sparepartData.find(d=>d.sku_id===skuId);
    if(sku){
      sku.qty = Math.max(0, sku.qty + delta);
      sku.tanggal_update = REF_TODAY_STR;
      refreshSparepartViews();
    }
  }
};

buildImportUI();

// ---------- Bootstrap: muat ke-8 dataset dashboard utama dari API ----------
// renderEverything() sengaja TIDAK dipanggil sebelum data ke-fetch (beda dari app lama yang
// datanya selalu sudah ada secara sinkron) — supaya fungsi render tidak pernah harus menangani
// array kosong yang sebenarnya "belum dimuat", cukup array kosong yang "memang kosong".
// Array di atas (inventoryData, dusboxData, dst) dimutasi IN-PLACE (bukan di-reassign) supaya
// referensi yang sudah dipakai closure lain (mis. dusboxDash/aksesorisDash/sparepartDash yang
// dibuat sebelum baris ini) tetap menunjuk ke array yang sama dan otomatis ikut ter-update.
async function bootstrapDashboard(){
  const targets = [
    [inventoryData, PERSIST_ENDPOINTS.dash_inventoryData_v1],
    [dusboxData, PERSIST_ENDPOINTS.dash_dusboxData_v1],
    [aksesorisData, PERSIST_ENDPOINTS.dash_aksesorisData_v1],
    [sparepartData, PERSIST_ENDPOINTS.dash_sparepartData_v1],
    [returKlaimData, PERSIST_ENDPOINTS.dash_returKlaimData_v1],
    [purchaseOrders, PERSIST_ENDPOINTS.dash_purchaseOrders_v1],
    [customerDatabase, PERSIST_ENDPOINTS.dash_customerDatabase_v1],
    [branchRequests, PERSIST_ENDPOINTS.dash_branchRequests_v1],
  ];
  await Promise.all(targets.map(async ([arr, endpoint]) => {
    const rows = await fetchArray(endpoint);
    arr.length = 0;
    arr.push(...rows);
  }));
  await loadStockTransaksiData();
  renderEverything();
}
bootstrapDashboard();

document.getElementById('btnResetSampleData').addEventListener('click', ()=>{
  alert('Data sekarang tersimpan di database, bukan di browser ini lagi. Untuk mengembalikan ke data sample, jalankan ulang "npm run db:init" di server (lihat README) — ini akan menimpa seluruh data saat ini.');
});

// ====== Backup & Restore (semua data: dashboard utama + Unit Service + Stiker Barcode) ======
// Sekarang cukup panggil endpoint /api/backup di server — server yang menggabungkan
// ke-12 dataset dari PostgreSQL jadi satu file JSON (format sama persis dengan backup lama,
// jadi file backup dari versi localStorage lama pun tetap bisa di-restore ke sini).
document.getElementById('btnDownloadBackup').addEventListener('click', async ()=>{
  try{
    const res = await fetch('/api/backup');
    if(!res.ok) throw new Error('Server mengembalikan status ' + res.status);
    const backup = await res.json();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-dashboard-iphone-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(err){
    alert('Gagal membuat file backup: ' + err.message);
  }
});

document.getElementById('btnRestoreBackup').addEventListener('click', ()=>{
  document.getElementById('fileRestoreBackup').click();
});

document.getElementById('fileRestoreBackup').addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async (ev)=>{
    try{
      const data = JSON.parse(ev.target.result);
      if(!data || typeof data !== 'object') throw new Error('Format file tidak valid.');
      const res = await fetch('/api/backup/restore', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: ev.target.result
      });
      const result = await res.json();
      if(!res.ok) throw new Error(result.error || 'Gagal memulihkan backup.');
      alert(`Berhasil memulihkan ${result.restoredKeys} kategori data dari backup. Halaman akan dimuat ulang.`);
      location.reload();
    }catch(err){
      alert('Gagal memulihkan backup: ' + err.message);
    }finally{
      e.target.value = '';
    }
  };
  reader.readAsText(file);
});
