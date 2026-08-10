(function(){

// --- Code 128 encoder (self-contained, no external dependency) ---
// Official Code128 symbol widths (values 0-105), verified against the ISO/IEC 15417 table.
const CODE128_WIDTHS = ["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232"];
const CODE128_STOP = "2331112"; // Stop symbol (value 106), 7 elements / 13 units

// Encodes a 15-digit IMEI as: Start B, 1 digit (Code B), Code C switch, 7 digit-pairs (Code C), checksum, Stop.
// This uses roughly half the width of Code 39 for the same data, which lets bars print thick enough to scan reliably.
function buildCode128SymbolsForImei(digits){
  const symbols = [104]; // Start Code B
  symbols.push(digits.charCodeAt(0) - 32); // first digit, Code B ascii mapping
  symbols.push(99); // switch to Code C
  for(let i = 1; i < digits.length; i += 2){
    symbols.push(parseInt(digits.substring(i, i + 2), 10));
  }
  let sum = symbols[0];
  for(let k = 1; k < symbols.length; k++){
    sum += symbols[k] * k;
  }
  symbols.push(sum % 103); // checksum
  symbols.push(106); // Stop
  return symbols;
}

function buildCode128Elements(digits){
  const symbols = buildCode128SymbolsForImei(digits);
  const elements = [];
  const QUIET = 10; // required quiet zone, in modules, each side
  elements.push({ bar:false, units:QUIET });
  symbols.forEach((val, idx) => {
    const widths = (idx === symbols.length - 1) ? CODE128_STOP : CODE128_WIDTHS[val];
    for(let j = 0; j < widths.length; j++){
      elements.push({ bar: j % 2 === 0, units: parseInt(widths[j], 10) });
    }
  });
  elements.push({ bar:false, units:QUIET });
  return elements;
}

function drawBarcode(svg, digits){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  if(!/^\d{15}$/.test(digits)) return;
  const elements = buildCode128Elements(digits);
  renderBarElements(svg, elements);
}

// General Code128 (Code Set B) encoder — any printable ASCII text (letters, digits,
// symbols), used for sparepart SKU/codes which aren't fixed-length digits like IMEI.
function buildCode128GeneralSymbols(text){
  const symbols = [104]; // Start Code B
  for(let i = 0; i < text.length; i++){
    symbols.push(text.charCodeAt(i) - 32);
  }
  let sum = symbols[0];
  for(let k = 1; k < symbols.length; k++){
    sum += symbols[k] * k;
  }
  symbols.push(sum % 103); // checksum
  symbols.push(106); // Stop
  return symbols;
}

function buildCode128GeneralElements(text){
  const symbols = buildCode128GeneralSymbols(text);
  const elements = [];
  const QUIET = 10;
  elements.push({ bar:false, units:QUIET });
  symbols.forEach((val, idx) => {
    const widths = (idx === symbols.length - 1) ? CODE128_STOP : CODE128_WIDTHS[val];
    for(let j = 0; j < widths.length; j++){
      elements.push({ bar: j % 2 === 0, units: parseInt(widths[j], 10) });
    }
  });
  elements.push({ bar:false, units:QUIET });
  return elements;
}

function drawBarcodeGeneral(svg, text){
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const clean = String(text || '').trim();
  if(!clean) return;
  for(let i = 0; i < clean.length; i++){
    const c = clean.charCodeAt(i);
    if(c < 32 || c > 126) return; // unsupported character for Code128B — skip drawing
  }
  const elements = buildCode128GeneralElements(clean);
  renderBarElements(svg, elements);
}

function renderBarElements(svg, elements){
  const totalUnits = elements.reduce((sum, el) => sum + el.units, 0);
  const H = 40;
  svg.setAttribute('viewBox', `0 0 ${totalUnits} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  let x = 0;
  for(const el of elements){
    if(el.bar){
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', el.units);
      rect.setAttribute('height', H);
      rect.setAttribute('fill', '#141414');
      svg.appendChild(rect);
    }
    x += el.units;
  }
}

// --- product name parsing: "IPHONE 11 128GB BLACK" -> model/kap/warna ---
function parseProductName(raw){
  const name = raw.replace(/\s+/g, ' ').trim();
  const m = name.match(/^(.*?)\s*(\d+\s?(?:GB|TB))\s*(.*)$/i);
  if(m){
    return {
      model: m[1].trim(),
      kap: m[2].replace(/\s+/g,'').toUpperCase(),
      warna: m[3].trim()
    };
  }
  return { model: name, kap: '', warna: '' };
}

// --- state ---
let items = []; // {model, kap, warna, imei}
let idCounter = 0;
let imeiSet = new Set();
let skuSet = new Set();
let flashImeiSet = new Set();
// Dulu localStorage, sekarang di-resync penuh ke REST API tiap ada perubahan.
function saveToStorage(){
  fetch('/api/stickers', {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items })
  }).then(res => {
    if(!res.ok) return res.json().catch(()=>({})).then(body => {
      throw new Error(body.error || ('Server menolak (status ' + res.status + ')'));
    });
  }).catch(err => {
    alert('⚠️ Gagal menyimpan perubahan ke database: ' + err.message + '\n\nCoba refresh halaman lalu ulangi — perubahan terakhir kemungkinan belum tersimpan.');
  });
}

function cleanImei(v){
  return String(v).replace(/\D/g, '');
}
function validateImei(v){
  if(!/^\d{15}$/.test(v)) return "IMEI harus 15 digit angka";
  return "";
}

let currentMode = 'imei'; // 'imei' | 'sparepart' | 'flash'

const MODE_CAP = { imei: 'Imei', sparepart: 'Sparepart', flash: 'Flash' };
const MODE_SEARCH_PLACEHOLDER = {
  imei: 'Cari model, warna, atau IMEI...',
  sparepart: 'Cari nama sparepart atau kode/SKU...',
  flash: 'Cari nama produk atau IMEI...',
};

function switchMode(mode){
  currentMode = mode;
  const imeiWrap = document.getElementById('stk_imeiInputWrap');
  const spWrap = document.getElementById('stk_sparepartInputWrap');
  const flashWrap = document.getElementById('stk_flashInputWrap');
  imeiWrap.classList.toggle('hidden', mode !== 'imei');
  spWrap.classList.toggle('hidden', mode !== 'sparepart');
  flashWrap.classList.toggle('hidden', mode !== 'flash');
  document.getElementById('stk_modeImeiBtn').classList.toggle('active', mode === 'imei');
  document.getElementById('stk_modeSparepartBtn').classList.toggle('active', mode === 'sparepart');
  document.getElementById('stk_modeFlashBtn').classList.toggle('active', mode === 'flash');
  const activeWrap = mode === 'imei' ? imeiWrap : (mode === 'sparepart' ? spWrap : flashWrap);
  if (window.playTabAnim) window.playTabAnim(activeWrap);
  // show the "single" input tab by default for whichever mode we just entered
  switchTab(mode, 'single');
  document.getElementById('stk_searchBox').placeholder = MODE_SEARCH_PLACEHOLDER[mode] || '';
  renderList();
}

function switchTab(mode, tab){
  const cap = MODE_CAP[mode];
  const panelSingle = document.getElementById('stk_panelSingle' + cap);
  const panelBatch = document.getElementById('stk_panelBatch' + cap);
  panelSingle.classList.toggle('hidden', tab !== 'single');
  panelBatch.classList.toggle('hidden', tab !== 'batch');
  if (window.playTabAnim) window.playTabAnim(tab === 'single' ? panelSingle : panelBatch);
  document.getElementById('stk_tabSingle' + cap + 'Btn').classList.toggle('active', tab === 'single');
  document.getElementById('stk_tabBatch' + cap + 'Btn').classList.toggle('active', tab === 'batch');
}

function formatTanggal(v){
  // accepts "YYYY-MM-DD" (from <input type=date>) and converts to "DD-MM-YYYY"; passes other formats through
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return `${m[3]}-${m[2]}-${m[1]}`;
  return String(v || '').trim();
}

function formatTanggalShort(v){
  // "DD-MM-YYYY" or "YYYY-MM-DD" -> "D/M" (no leading zeros, no year)
  const raw = String(v || '').trim();
  let d, mo;
  let m = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if(m){ d = m[1]; mo = m[2]; }
  else {
    m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){ d = m[3]; mo = m[2]; }
  }
  if(d === undefined) return raw;
  return `${parseInt(d,10)}/${parseInt(mo,10)}`;
}

function addSingle(){
  const full = document.getElementById('stk_model').value.trim() || 'IPHONE';
  const imei = cleanImei(document.getElementById('stk_imei').value);
  const tanggal = formatTanggal(document.getElementById('stk_tanggal').value);
  const err = validateImei(imei);
  if(!err && imeiSet.has(imei)){
    document.getElementById('stk_imeiErr').textContent = 'IMEI ini sudah ada di daftar';
    return;
  }
  document.getElementById('stk_imeiErr').textContent = err;
  if(err) return;
  const parsed = parseProductName(full);
  items.push({ id: idCounter++, type: 'imei', ...parsed, imei, tanggal, batch: 'baru' });
  imeiSet.add(imei);
  renderList();
  saveToStorage();
}

function parseLine(line){
  // supports tab-separated (paste from Excel) or "|"-separated
  let parts;
  if(line.includes('\t')) parts = line.split('\t');
  else parts = line.split('|');
  parts = parts.map(p => p.trim()).filter((p,i,arr) => !(p === '' && i === arr.length-1));
  return parts;
}

function addRows(rows, defaultBatch){
  // rows: array of {name, imei, tanggal}
  const batchTag = defaultBatch || 'baru';
  let added = 0, skipped = 0, duplicate = 0;
  for(const row of rows){
    const imei = cleanImei(row.imei);
    if(validateImei(imei)){ skipped++; continue; }
    if(imeiSet.has(imei)){ duplicate++; continue; }
    const parsed = parseProductName(row.name || 'IPHONE');
    items.push({ id: idCounter++, type: 'imei', ...parsed, imei, tanggal: (row.tanggal || '').trim(), batch: batchTag });
    imeiSet.add(imei);
    added++;
  }
  return { added, skipped, duplicate };
}

function addBatchFromTextarea(){
  const raw = document.getElementById('stk_batchInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rows = [];
  let malformed = 0;
  for(const line of lines){
    const parts = parseLine(line);
    if(parts.length < 2){ malformed++; continue; }
    rows.push({ name: parts[0], imei: parts[1], tanggal: parts[2] || '' });
  }
  const { added, skipped, duplicate } = addRows(rows, 'baru');
  const parts2 = [];
  if(added > 0) parts2.push(`${added} ditambahkan`);
  if(skipped > 0 || malformed > 0) parts2.push(`${skipped + malformed} dilewati (format/IMEI tidak valid)`);
  if(duplicate > 0) parts2.push(`${duplicate} dilewati (IMEI sudah ada)`);
  document.getElementById('stk_batchErr').textContent = parts2.join(', ') + (parts2.length ? '.' : '');
  if(added > 0) document.getElementById('stk_batchInput').value = '';
  renderList();
  if(added > 0) saveToStorage();
}

// ---------- Sparepart ----------
function validateKode(v){
  const clean = String(v || '').trim();
  if(!clean) return 'Kode/SKU tidak boleh kosong';
  if(clean.length > 30) return 'Kode/SKU maksimal 30 karakter';
  for(let i = 0; i < clean.length; i++){
    const c = clean.charCodeAt(i);
    if(c < 32 || c > 126) return 'Kode/SKU mengandung karakter yang tidak didukung';
  }
  return '';
}

function addSingleSparepart(){
  const nama = document.getElementById('stk_spNama').value.trim() || 'Sparepart';
  const kode = document.getElementById('stk_spKode').value.trim();
  const tanggal = formatTanggal(document.getElementById('stk_spTanggal').value);
  const err = validateKode(kode);
  if(!err && skuSet.has(kode)){
    document.getElementById('stk_spKodeErr').textContent = 'Kode/SKU ini sudah ada di daftar';
    return;
  }
  document.getElementById('stk_spKodeErr').textContent = err;
  if(err) return;
  items.push({ id: idCounter++, type: 'sparepart', namaPart: nama, kode, tanggal, batch: 'baru' });
  skuSet.add(kode);
  renderList();
  saveToStorage();
}

function addRowsSparepart(rows, defaultBatch){
  const batchTag = defaultBatch || 'baru';
  let added = 0, skipped = 0, duplicate = 0;
  for(const row of rows){
    const kode = String(row.kode || '').trim();
    if(validateKode(kode)){ skipped++; continue; }
    if(skuSet.has(kode)){ duplicate++; continue; }
    items.push({
      id: idCounter++, type: 'sparepart',
      namaPart: row.nama || 'Sparepart', kode,
      tanggal: (row.tanggal || '').trim(),
      batch: batchTag,
    });
    skuSet.add(kode);
    added++;
  }
  return { added, skipped, duplicate };
}

function addBatchFromTextareaSparepart(){
  const raw = document.getElementById('stk_spBatchInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rows = [];
  let malformed = 0;
  for(const line of lines){
    const parts = parseLine(line);
    if(parts.length < 2){ malformed++; continue; }
    rows.push({ nama: parts[0], kode: parts[1], tanggal: parts[2] || '' });
  }
  const { added, skipped, duplicate } = addRowsSparepart(rows, 'baru');
  const parts2 = [];
  if(added > 0) parts2.push(`${added} ditambahkan`);
  if(skipped > 0 || malformed > 0) parts2.push(`${skipped + malformed} dilewati (format/kode tidak valid)`);
  if(duplicate > 0) parts2.push(`${duplicate} dilewati (kode sudah ada)`);
  document.getElementById('stk_spBatchErr').textContent = parts2.join(', ') + (parts2.length ? '.' : '');
  if(added > 0) document.getElementById('stk_spBatchInput').value = '';
  renderList();
  if(added > 0) saveToStorage();
}

// ---------- Flashsale ----------
function addSingleFlash(){
  const nama = document.getElementById('stk_flNama').value.trim() || 'Produk';
  const imei = cleanImei(document.getElementById('stk_flImei').value);
  const minus = document.getElementById('stk_flMinus').value.trim();
  const errImei = validateImei(imei);
  if(!errImei && flashImeiSet.has(imei)){
    document.getElementById('stk_flImeiErr').textContent = 'IMEI ini sudah ada di daftar flashsale';
    return;
  }
  document.getElementById('stk_flImeiErr').textContent = errImei;
  if(errImei) return;
  items.push({ id: idCounter++, type: 'flash', namaProduk: nama, imei, minus, batch: 'baru' });
  flashImeiSet.add(imei);
  renderList();
  saveToStorage();
}

function addRowsFlash(rows, defaultBatch){
  const batchTag = defaultBatch || 'baru';
  let added = 0, skipped = 0, duplicate = 0;
  for(const row of rows){
    const imei = cleanImei(row.imei);
    if(validateImei(imei)){ skipped++; continue; }
    if(flashImeiSet.has(imei)){ duplicate++; continue; }
    items.push({ id: idCounter++, type: 'flash', namaProduk: row.nama || 'Produk', imei, minus: String(row.minus || '').trim(), batch: batchTag });
    flashImeiSet.add(imei);
    added++;
  }
  return { added, skipped, duplicate };
}

function addBatchFromTextareaFlash(){
  const raw = document.getElementById('stk_flBatchInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rows = [];
  let malformed = 0;
  for(const line of lines){
    const parts = parseLine(line);
    if(parts.length < 2){ malformed++; continue; }
    rows.push({ nama: parts[0], imei: parts[1], minus: parts[2] || '' });
  }
  const { added, skipped, duplicate } = addRowsFlash(rows, 'baru');
  const parts2 = [];
  if(added > 0) parts2.push(`${added} ditambahkan`);
  if(skipped > 0 || malformed > 0) parts2.push(`${skipped + malformed} dilewati (format/IMEI tidak valid)`);
  if(duplicate > 0) parts2.push(`${duplicate} dilewati (IMEI sudah ada)`);
  document.getElementById('stk_flBatchErr').textContent = parts2.join(', ') + (parts2.length ? '.' : '');
  if(added > 0) document.getElementById('stk_flBatchInput').value = '';
  renderList();
  if(added > 0) saveToStorage();
}


function removeItem(id){
  const removed = items.find(it => it.id === id);
  items = items.filter(it => it.id !== id);
  if(removed){
    if(removed.type === 'sparepart') skuSet.delete(removed.kode);
    else if(removed.type === 'flash') flashImeiSet.delete(removed.imei);
    else imeiSet.delete(removed.imei);
  }
  renderList();
  saveToStorage();
}

function clearAll(){
  const scopeCount = items.filter(it => (it.type || 'imei') === currentMode).length;
  if(scopeCount === 0){ alert('Daftar mode ini sudah kosong.'); return; }
  const labels = { imei: 'stiker IMEI', sparepart: 'stiker sparepart', flash: 'stiker flashsale' };
  const label = labels[currentMode] || 'stiker';
  if(!confirm(`Kosongkan ${scopeCount} ${label} di mode ini? Tindakan ini tidak bisa dibatalkan.`)) return;
  items = items.filter(it => {
    if((it.type || 'imei') === currentMode){
      if(it.type === 'sparepart') skuSet.delete(it.kode);
      else if(it.type === 'flash') flashImeiSet.delete(it.imei);
      else imeiSet.delete(it.imei);
      return false;
    }
    return true;
  });
  renderList();
  saveToStorage();
}

function makeStickerNode(item, forPrint){
  if(item.type === 'flash') return makeFlashStickerNode(item, forPrint);

  const el = document.createElement('div');
  el.className = 'sticker';
  const isSparepart = item.type === 'sparepart';
  const line1 = isSparepart ? item.namaPart : item.model;
  const line2 = isSparepart ? '' : [item.kap, item.warna].filter(Boolean).join(' · ');
  const footerCode = isSparepart ? item.kode : item.imei;
  el.innerHTML = `
    ${forPrint ? '' : `<button class="remove-btn" onclick="stkApp.removeItem(${item.id})">&times;</button>`}
    ${item.batch === 'baru' ? '<div class="badge-new">BARU</div>' : ''}
    <img class="logo-badge" src="${LOGO_DATA_URI}" alt="">
    <div class="top-row">
      <div class="model">${escapeHtml(line1)}</div>
      <div class="specs">${escapeHtml(line2)}</div>
    </div>
    <div class="barcode-row"><svg xmlns="http://www.w3.org/2000/svg"></svg></div>
    <div class="footer">
      <div class="imei-line">${escapeHtml(footerCode)}</div>
      <div class="brandmark">${escapeHtml(formatTanggalShort(item.tanggal))}</div>
    </div>
  `;
  const svg = el.querySelector('svg');
  if(isSparepart) drawBarcodeGeneral(svg, item.kode);
  else drawBarcode(svg, item.imei);
  return el;
}

function makeFlashStickerNode(item, forPrint){
  const el = document.createElement('div');
  el.className = 'sticker-flash';
  el.innerHTML = `
    ${forPrint ? '' : `<button class="remove-btn" onclick="stkApp.removeItem(${item.id})">&times;</button>`}
    ${item.batch === 'baru' ? '<div class="badge-new">BARU</div>' : ''}
    <img class="logo-badge" src="${LOGO_DATA_URI}" alt="">
    <div class="flash-ribbon">FLASH SALE</div>
    <div class="flash-body">
      <div class="flash-nama">${escapeHtml(item.namaProduk)}</div>
      ${item.minus ? `<div class="flash-minus">Minus: ${escapeHtml(item.minus)}</div>` : ''}
    </div>
    <div class="flash-barcode-row"><svg xmlns="http://www.w3.org/2000/svg"></svg></div>
    <div class="flash-footer">
      <div>${escapeHtml(item.imei)}</div>
    </div>
  `;
  drawBarcode(el.querySelector('svg'), item.imei);
  return el;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function itemsForCurrentMode(){
  return items.filter(it => (it.type || 'imei') === currentMode);
}

function getFilteredItems(){
  const q = (document.getElementById('stk_searchBox').value || '').trim().toLowerCase();
  const base = itemsForCurrentMode();
  if(!q) return base;
  return base.filter(it => {
    const haystack = [it.model, it.kap, it.warna, it.imei, it.namaPart, it.kode, it.namaProduk, it.minus].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

const PAPER_SIZES = {
  a4: { width: 210, height: 297, cssSize: '210mm 297mm' },
  f4: { width: 215, height: 330, cssSize: '215mm 330mm' }
};
const PAGE_MARGIN_MM = 5;
const PAGE_COLS = 3; // stiker 50mm x 3 kolom = 150mm, aman di bawah lebar cetak A4 (200mm) maupun F4 (205mm)
const ROW_HEIGHT_MM = 25;
const ROW_GAP_MM = 2;

function computePageRows(paperKey){
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
  const usableHeight = paper.height - PAGE_MARGIN_MM * 2;
  return Math.max(1, Math.floor((usableHeight + ROW_GAP_MM) / (ROW_HEIGHT_MM + ROW_GAP_MM)));
}

function applyPaperSize(){
  const paperKey = document.getElementById('stk_paperSize').value;
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES.a4;
  document.getElementById('stk_dynamicPageStyle').textContent =
    `@page{ size:${paper.cssSize}; margin:${PAGE_MARGIN_MM}mm; }`;
  return computePageRows(paperKey);
}

function getPrintScopeItems(){
  const scope = document.getElementById('stk_printScope').value;
  const base = itemsForCurrentMode();
  if(scope !== 'new') return base;
  const baru = base.filter(it => it.batch === 'baru');
  const dateFilter = document.getElementById('stk_printScopeDate').value;
  if(dateFilter === 'all') return baru;
  return baru.filter(it => (it.tanggal || '(tanpa tanggal)') === dateFilter);
}

function updatePrintDateOptions(){
  const scope = document.getElementById('stk_printScope').value;
  const field = document.getElementById('stk_printDateField');
  const select = document.getElementById('stk_printScopeDate');
  field.classList.toggle('hidden', scope !== 'new');
  if(scope !== 'new') return;

  const baru = itemsForCurrentMode().filter(it => it.batch === 'baru');
  const dates = [...new Set(baru.map(it => it.tanggal || '(tanpa tanggal)'))];
  // sort by actual date where possible (DD-MM-YYYY)
  dates.sort((a, b) => {
    const pa = a.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    const pb = b.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if(pa && pb){
      const da = new Date(+pa[3], +pa[2]-1, +pa[1]);
      const db = new Date(+pb[3], +pb[2]-1, +pb[1]);
      return db - da;
    }
    return a.localeCompare(b);
  });

  const currentValue = select.value;
  select.innerHTML = '<option value="all">Semua Tanggal (' + baru.length + ')</option>' +
    dates.map(d => {
      const count = baru.filter(it => (it.tanggal || '(tanpa tanggal)') === d).length;
      return `<option value="${escapeHtml(d)}">${escapeHtml(d)} (${count})</option>`;
    }).join('');
  if(dates.includes(currentValue) || currentValue === 'all'){
    select.value = currentValue;
  }
}

function getStokSummary(){
  return {
    total: items.length,
    imei: items.filter(it => (it.type || 'imei') === 'imei').length,
    sparepart: items.filter(it => it.type === 'sparepart').length,
    flash: items.filter(it => it.type === 'flash').length,
    baru: items.filter(it => it.batch === 'baru').length,
  };
}

function renderRingkasanStiker(){
  const el = document.getElementById('stk_ringkasanKpiGrid');
  if(!el) return;
  const {imei, sparepart, flash, baru} = getStokSummary();
  const cards = [
    {label:'Total Stiker', value:items.length, sub:'seluruh tipe', cls:'c-blue'},
    {label:'Stiker IMEI', value:imei, sub:'unit iPhone', cls:'c-green'},
    {label:'Stiker Sparepart', value:sparepart, sub:'komponen servis', cls:'c-cyan'},
    {label:'Stiker Flashsale', value:flash, sub:'unit promo', cls:'c-purple'},
    {label:'Belum Dicetak', value:baru, sub:'data baru ditambahkan', cls:'c-amber'},
  ];
  el.innerHTML = cards.map(c=>`
    <div class="kpi ${c.cls}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join('');
}

function renderList(){
  renderRingkasanStiker();
  const stage = document.getElementById('stk_stage');
  stage.innerHTML = '';
  updatePrintDateOptions();
  const modeItems = itemsForCurrentMode();
  const filtered = getFilteredItems();
  document.getElementById('stk_countBadge').textContent =
    filtered.length === modeItems.length ? modeItems.length + ' stiker' : `${filtered.length} dari ${modeItems.length} stiker`;
  if(modeItems.length === 0){
    stage.classList.add('empty');
    const emptyLabels = { imei: 'stiker IMEI', sparepart: 'stiker sparepart', flash: 'stiker flashsale' };
    const emptyLabel = emptyLabels[currentMode] || 'stiker';
    stage.innerHTML = `<div class="empty-msg">Belum ada ${emptyLabel}. Tambahkan lewat panel di kiri.</div>`;
  } else if(filtered.length === 0){
    stage.classList.add('empty');
    stage.innerHTML = '<div class="empty-msg">Tidak ada stiker yang cocok dengan pencarian.</div>';
  } else {
    stage.classList.remove('empty');
    const existing = filtered.filter(it => it.batch !== 'baru');
    const baru = filtered.filter(it => it.batch === 'baru');
    if(existing.length > 0){
      if(baru.length > 0){
        const h = document.createElement('div');
        h.className = 'section-header';
        h.textContent = `Data Sudah Ada (${existing.length})`;
        stage.appendChild(h);
      }
      for(const item of existing) stage.appendChild(makeStickerNode(item, false));
    }
    if(baru.length > 0){
      const h = document.createElement('div');
      h.className = 'section-header';
      h.textContent = `Data Baru Ditambahkan (${baru.length})`;
      stage.appendChild(h);
      for(const item of baru) stage.appendChild(makeStickerNode(item, false));
    }
  }

  applyPaperSize();
  const printItems = getPrintScopeItems();

  const modeCols = currentMode === 'flash' ? 3 : PAGE_COLS;
  const modeRows = currentMode === 'flash' ? 9 : 10; // stiker biasa 25mm/baris: 10 baris aman untuk A4 maupun F4 (halaman lebih pendek dari F4)
  const ITEMS_PER_PAGE = modeRows * modeCols;

  const printSheet = document.getElementById('stk_printSheet');
  printSheet.innerHTML = '';
  for(let i = 0; i < printItems.length; i += ITEMS_PER_PAGE){
    const pageItems = printItems.slice(i, i + ITEMS_PER_PAGE);
    const pageEl = document.createElement('div');
    pageEl.className = 'print-page' + (currentMode === 'flash' ? ' mode-flash' : '');
    for(const item of pageItems){
      pageEl.appendChild(makeStickerNode(item, true));
    }
    printSheet.appendChild(pageEl);
  }
  // CATATAN PENTING: renderList() SENGAJA tidak lagi memanggil saveToStorage() di sini.
  // renderList() dipanggil untuk render murni (ganti mode, ketik di search box, sebelum
  // print/PDF, bootstrap awal) — kalau render ini ikut nge-save, render dengan `items` kosong
  // (mis. saat sesi login belum siap / fetch awal gagal) akan MENIMPA data asli di database
  // dengan array kosong. Ini pernah benar-benar terjadi dan menghapus data stiker produksi.
  // saveToStorage() sekarang dipanggil eksplisit HANYA di fungsi yang benar-benar mengubah
  // `items` (addSingle, addBatch*, removeItem, clearAll, markAllAsExisting).
}

function markAllAsExisting(){
  const modeItems = itemsForCurrentMode();
  const baruCount = modeItems.filter(it => it.batch === 'baru').length;
  if(baruCount === 0){ alert('Tidak ada data baru untuk ditandai di mode ini.'); return; }
  modeItems.forEach(it => { it.batch = 'awal'; });
  renderList();
  saveToStorage();
}

function printAll(){
  const printItems = getPrintScopeItems();
  if(printItems.length === 0){ alert('Tidak ada data untuk dicetak pada cakupan ini.'); return; }
  renderList();
  window.print();
}

function exportPdf(){
  const printItems = getPrintScopeItems();
  if(printItems.length === 0){ alert('Tidak ada data untuk dicetak pada cakupan ini.'); return; }
  renderList();
  alert('Pada kotak dialog cetak yang muncul, pilih tujuan "Simpan sebagai PDF" (Save as PDF). Set Margins ke "None" dan matikan "Headers and footers" di "More settings" supaya ruang cetak terpakai maksimal.');
  window.print();
}

function exportExcel(){
  const scopeItems = getPrintScopeItems();
  if(scopeItems.length === 0){ alert('Tidak ada data untuk diekspor pada cakupan ini.'); return; }
  const headerMap = {
    imei: ['Model', 'Kapasitas', 'Warna', 'IMEI', 'Tanggal Masuk'],
    sparepart: ['Nama Sparepart', 'Kode/SKU', 'Tanggal Masuk'],
    flash: ['Nama Produk', 'IMEI', 'Minus/Kekurangan'],
  };
  const headers = headerMap[currentMode] || headerMap.imei;
  let rowsHtml = '<tr>' + headers.map(h => `<th style="background:#141414;color:#fff;padding:4px 8px;">${escapeHtml(h)}</th>`).join('') + '</tr>';
  for(const it of scopeItems){
    if(currentMode === 'sparepart'){
      rowsHtml += '<tr>'
        + `<td style="padding:4px 8px;">${escapeHtml(it.namaPart)}</td>`
        + `<td style="padding:4px 8px;mso-number-format:'\\@';">${escapeHtml(it.kode)}</td>`
        + `<td style="padding:4px 8px;mso-number-format:'\\@';">${escapeHtml(it.tanggal || '')}</td>`
        + '</tr>';
    } else if(currentMode === 'flash'){
      rowsHtml += '<tr>'
        + `<td style="padding:4px 8px;">${escapeHtml(it.namaProduk)}</td>`
        + `<td style="padding:4px 8px;mso-number-format:'\\@';">${escapeHtml(it.imei)}</td>`
        + `<td style="padding:4px 8px;">${escapeHtml(it.minus || '')}</td>`
        + '</tr>';
    } else {
      rowsHtml += '<tr>'
        + `<td style="padding:4px 8px;">${escapeHtml(it.model)}</td>`
        + `<td style="padding:4px 8px;">${escapeHtml(it.kap)}</td>`
        + `<td style="padding:4px 8px;">${escapeHtml(it.warna)}</td>`
        + `<td style="padding:4px 8px;mso-number-format:'\\@';">${escapeHtml(it.imei)}</td>`
        + `<td style="padding:4px 8px;mso-number-format:'\\@';">${escapeHtml(it.tanggal || '')}</td>`
        + '</tr>';
    }
  }
  const sheetNames = { imei: 'Stiker IMEI', sparepart: 'Stiker Sparepart', flash: 'Stiker Flashsale' };
  const sheetName = sheetNames[currentMode] || 'Stiker';
  const fileNames = { imei: 'stiker-imei.xls', sparepart: 'stiker-sparepart.xls', flash: 'stiker-flashsale.xls' };
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${sheetName}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body><table border="1" style="border-collapse:collapse;font-family:Arial;font-size:11px;">${rowsHtml}</table></body>
  </html>`;
  const blob = new Blob(['\ufeff', template], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileNames[currentMode] || 'stiker.xls';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- preset data imported from user's uploaded file ---
const LOGO_DATA_URI = "data:image/png;base64,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";


async function bootstrapStiker(){
  try{
    const res = await fetch('/api/stickers');
    items = res.ok ? await res.json() : [];
  }catch(e){ items = []; }
  idCounter = items.length ? Math.max(0, ...items.map(i => i.id)) + 1 : 0;
  imeiSet = new Set(items.filter(i => (i.type || 'imei') === 'imei').map(i => i.imei));
  skuSet = new Set(items.filter(i => i.type === 'sparepart').map(i => i.kode));
  flashImeiSet = new Set(items.filter(i => i.type === 'flash').map(i => i.imei));
  renderList();
  window.renderDashboardUtama?.();
}
bootstrapStiker();


window.stkApp = {
  switchMode,
  switchTab,
  addSingle,
  addBatchFromTextarea,
  addSingleSparepart,
  addBatchFromTextareaSparepart,
  addSingleFlash,
  addBatchFromTextareaFlash,
  removeItem,
  clearAll,
  printAll,
  exportPdf,
  exportExcel,
  markAllAsExisting,
  renderList,
  getSummary: getStokSummary
};

})();
