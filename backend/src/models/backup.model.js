// Backup & Restore — menggantikan buildBackupObject()/tombol Download & Restore Backup di app
// lama. Format JSON dibuat identik dengan localStorage keys lama supaya file backup dari
// Dashboard_Inventory_iPhone.html versi lawas tetap bisa dipulihkan ke sini.
const { pool, withTransaction } = require('../config/db');
const { resolveSupplierId, resolveBranchId } = require('../utils/lookup');

const units = require('./units.model');
const dusbox = require('./dusbox.model');
const aksesoris = require('./aksesoris.model');
const sparepart = require('./sparepart.model');
const returKlaim = require('./returKlaim.model');
const purchaseOrder = require('./purchaseOrder.model');
const customer = require('./customer.model');
const branchRequest = require('./branchRequest.model');
const serviceUnit = require('./serviceUnit.model');
const serviceSparepart = require('./serviceSparepart.model');
const serviceExternal = require('./serviceExternal.model');
const stickerItem = require('./stickerItem.model');

const KEYS = {
  unit: 'dash_inventoryData_v1',
  dusbox: 'dash_dusboxData_v1',
  aksesoris: 'dash_aksesorisData_v1',
  sparepart: 'dash_sparepartData_v1',
  returklaim: 'dash_returKlaimData_v1',
  po: 'dash_purchaseOrders_v1',
  customer: 'dash_customerDatabase_v1',
  request: 'dash_branchRequests_v1',
  svc_units: 'unit_service_iphone_v1',
  svc_sparepart: 'sparepart_inventory_iphone_v1',
  svc_external: 'external_service_iphone_v1',
  stiker: 'stikerImeiData_v1',
};

async function buildBackupObject() {
  const [
    unitRows, dusboxRows, aksesorisRows, sparepartRows, returklaimRows,
    poRows, customerRows, requestRows, svcUnitRows, svcSparepartRows, svcExternalRows, stickerRows,
  ] = await Promise.all([
    units.list(), dusbox.list(), aksesoris.list(), sparepart.list(), returKlaim.list(),
    purchaseOrder.list(), customer.list(), branchRequest.list(),
    serviceUnit.list(), serviceSparepart.list(), serviceExternal.list(), stickerItem.list(),
  ]);

  // Model service_units/service_spareparts/sticker_items sudah meng-alias kolomnya persis
  // seperti nama field di app lama (sparepartImeis, usedByUnitId, namaPart, dst) jadi bisa
  // dipakai langsung tanpa remapping di sini.
  const svcUnits = svcUnitRows;
  const svcSpareparts = svcSparepartRows;

  const maxStickerId = stickerRows.reduce((m, r) => Math.max(m, r.id), 0);

  return {
    _meta: { app: 'Dashboard Inventory iPhone', version: 1, exported_at: new Date().toISOString() },
    [KEYS.unit]: unitRows,
    [KEYS.dusbox]: dusboxRows,
    [KEYS.aksesoris]: aksesorisRows,
    [KEYS.sparepart]: sparepartRows,
    [KEYS.returklaim]: returklaimRows,
    [KEYS.po]: poRows,
    [KEYS.customer]: customerRows,
    [KEYS.request]: requestRows,
    [KEYS.svc_units]: svcUnits,
    [KEYS.svc_sparepart]: svcSpareparts,
    [KEYS.svc_external]: svcExternalRows,
    [KEYS.stiker]: { items: stickerRows, idCounter: maxStickerId + 1 },
  };
}

async function restoreFromBackup(data) {
  if (!data || typeof data !== 'object') {
    const err = new Error('Format file backup tidak valid.');
    err.status = 400;
    throw err;
  }

  let restoredKeys = 0;

  await withTransaction(async (client) => {
    // Hapus dulu (urutan: anak sebelum induk untuk FK)
    await client.query('DELETE FROM service_spareparts');
    await client.query('DELETE FROM service_units');
    await client.query('DELETE FROM service_units_external');
    await client.query('DELETE FROM sticker_items');
    await client.query('DELETE FROM branch_requests');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM purchase_orders');
    await client.query('DELETE FROM retur_klaim');
    await client.query('DELETE FROM sparepart_items');
    await client.query('DELETE FROM aksesoris_items');
    await client.query('DELETE FROM dusbox_items');
    await client.query('DELETE FROM units');

    if (Array.isArray(data[KEYS.unit])) {
      for (const r of data[KEYS.unit]) {
        const supplierId = await resolveSupplierId(client, r.supplier);
        const branchId = await resolveBranchId(client, r.gudang);
        await client.query(
          `INSERT INTO units (id, imei, model, warna, kapasitas, supplier_id, branch_id, tanggal_masuk,
                               status, report_qc, catatan, harga_beli, harga_jual, tanggal_terjual, alasan_flashsale)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [
            r.id, r.imei, r.model, r.warna, r.kapasitas, supplierId, branchId, r.tanggal_masuk,
            r.status, r.report_qc, r.catatan || '-', r.harga_beli || 0, r.harga_jual || 0,
            r.tanggal_terjual || null, r.alasan_flashsale || null,
          ]
        );
      }
      restoredKeys++;
    }

    async function restoreStockTable(table, key) {
      if (!Array.isArray(data[key])) return;
      for (const r of data[key]) {
        const supplierId = await resolveSupplierId(client, r.supplier);
        const branchId = await resolveBranchId(client, r.gudang);
        await client.query(
          `INSERT INTO ${table} (sku_id, jenis, kompatibel_model, kondisi, qty, satuan, harga_beli, harga_jual,
                                  supplier_id, branch_id, reorder_point, tanggal_update)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            r.sku_id, r.jenis, r.kompatibel_model || null, r.kondisi, r.qty || 0, r.satuan || 'pcs',
            r.harga_beli || 0, r.harga_jual || 0, supplierId, branchId, r.reorder_point || 0,
            r.tanggal_update || null,
          ]
        );
      }
      restoredKeys++;
    }
    await restoreStockTable('dusbox_items', KEYS.dusbox);
    await restoreStockTable('aksesoris_items', KEYS.aksesoris);
    await restoreStockTable('sparepart_items', KEYS.sparepart);

    if (Array.isArray(data[KEYS.returklaim])) {
      for (const r of data[KEYS.returklaim]) {
        await client.query(
          `INSERT INTO retur_klaim (id, tipe, kategori_barang, referensi, imei, deskripsi, alasan, tanggal, status, nilai, pihak_terkait, catatan)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            r.id, r.tipe, r.kategori_barang, r.referensi || null, r.imei || null, r.deskripsi || null,
            r.alasan || null, r.tanggal, r.status, r.nilai || 0, r.pihak_terkait || null, r.catatan || null,
          ]
        );
      }
      restoredKeys++;
    }

    if (Array.isArray(data[KEYS.po])) {
      for (const r of data[KEYS.po]) {
        const supplierId = await resolveSupplierId(client, r.supplier);
        const branchId = await resolveBranchId(client, r.gudang_tujuan);
        await client.query(
          `INSERT INTO purchase_orders (po_id, supplier_id, model, qty, gudang_tujuan_id, tanggal_order,
                                         estimasi_tiba, tanggal_diterima, lead_time_aktual, status, total_nilai, biaya_kirim, biaya_lain)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            r.po_id, supplierId, r.model, r.qty, branchId, r.tanggal_order, r.estimasi_tiba || null,
            r.tanggal_diterima || null, r.lead_time_aktual || null, r.status, r.total_nilai || 0,
            r.biaya_kirim || 0, r.biaya_lain || 0,
          ]
        );
      }
      restoredKeys++;
    }

    if (Array.isArray(data[KEYS.customer])) {
      for (const r of data[KEYS.customer]) {
        const branchId = await resolveBranchId(client, r.cabang_asal);
        await client.query(
          `INSERT INTO customers (id, nama, no_hp, cabang_asal_id, tanggal_daftar, catatan) VALUES ($1,$2,$3,$4,$5,$6)`,
          [r.id, r.nama, r.no_hp || null, branchId, r.tanggal_daftar, r.catatan || null]
        );
      }
      restoredKeys++;
    }

    if (Array.isArray(data[KEYS.request])) {
      for (const r of data[KEYS.request]) {
        const branchId = await resolveBranchId(client, r.cabang_peminta);
        await client.query(
          `INSERT INTO branch_requests (id, cabang_peminta_id, model, warna, kapasitas, qty, customer_id,
                                         customer_nama, customer_hp, tanggal_permintaan, deadline, status, catatan)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            r.id, branchId, r.model, r.warna || null, r.kapasitas || null, r.qty || 1,
            r.customer_id || null, r.customer_nama || null, r.customer_hp || null,
            r.tanggal_permintaan, r.deadline || null, r.status, r.catatan || null,
          ]
        );
      }
      restoredKeys++;
    }

    if (Array.isArray(data[KEYS.svc_units])) {
      for (const r of data[KEYS.svc_units]) {
        await client.query(
          `INSERT INTO service_units (id, series, capacity, color, imei, issue, perbaikan, status, tech, keterangan, datein, esteta, tglkembali)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            r.id, r.series, r.capacity || null, r.color || null, r.imei, r.issue || null,
            r.perbaikan || [], r.status, r.tech || null, r.keterangan || null,
            r.datein || null, r.esteta || null, r.tglkembali || null,
          ]
        );
      }
      restoredKeys++;
    }

    if (Array.isArray(data[KEYS.svc_sparepart])) {
      for (const r of data[KEYS.svc_sparepart]) {
        await client.query(
          `INSERT INTO service_spareparts (id, nama, kompatibel, tgl_masuk, status, used_by_unit_id, linked_sku_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [r.imei, r.nama, r.kompatibel || null, r.tglMasuk || null, r.status, r.usedByUnitId || null, r.linkedSkuId || null]
        );
      }
      restoredKeys++;
    }

    if (Array.isArray(data[KEYS.svc_external])) {
      for (const r of data[KEYS.svc_external]) {
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
      restoredKeys++;
    }

    const stiker = data[KEYS.stiker];
    if (stiker && Array.isArray(stiker.items)) {
      for (const it of stiker.items) {
        await client.query(
          `INSERT INTO sticker_items (id, type, model, kap, warna, imei, nama_part, kode, nama_produk, minus, tanggal, batch)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            it.id, it.type, it.model || null, it.kap || null, it.warna || null, it.imei || null,
            it.namaPart || null, it.kode || null, it.namaProduk || null, it.minus || null,
            it.tanggal || null, it.batch || 'baru',
          ]
        );
      }
      await client.query(
        `SELECT setval(pg_get_serial_sequence('sticker_items','id'), COALESCE((SELECT MAX(id) FROM sticker_items), 0) + 1, false)`
      );
      restoredKeys++;
    }
  });

  if (restoredKeys === 0) {
    const err = new Error('File ini tidak berisi data yang dikenali dashboard.');
    err.status = 400;
    throw err;
  }

  return { restoredKeys };
}

module.exports = { buildBackupObject, restoreFromBackup, KEYS };
