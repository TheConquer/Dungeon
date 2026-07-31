(function(){
  'use strict';
  const svcApp = { addBulkRow, addExtBulkRow, addSparepartBulkRow, closeAddModal, closeExtAddModal, closeExtModal, closeModal, closePicker, closeSparepartModal, closeSparepartPicker, confirmPicker, confirmSparepartPicker, deleteExtUnit, deleteSparepart, deleteUnit, editExtUnit, editUnit, exportExcel, exportExtExcel, exportSparepartExcel, extRender, extSortBy, filterPicker, filterSparepartPicker, handleImportExtFile, handleImportFile, openAddModal, openExtAddModal, openPicker, openSparepartModal, openSparepartPicker, releaseSparepart, render, renderSparepartTable, saveBulk, saveExtBulk, saveExtUnit, saveSparepartBulk, saveUnit, sortBy, switchTab, togglePickerItem, toggleSparepartPickerItem, findByImei, jumpFromDashboard };
  window.svcApp = svcApp;

const statusLabel = {
  queue: 'Antrian',
  progress: 'Diperbaiki',
  parts: 'Tunggu sparepart',
  ready: 'Siap diambil',
  done: 'Selesai'
};

// Standar kategori kesulitan service (REPAIR, TYPE HP, KATEGORI) - sinkron dgn master
const MASTER_KATEGORI = [["BACK GLASS 11", "11", "HIGH"], ["BACK GLASS 11 PRO", "11 PRO", "HIGH"], ["BACK GLASS 11 PRO MAX", "11 PRO MAX", "HIGH"], ["BACK GLASS 12", "12", "HIGH"], ["BACK GLASS 12 MINI", "12 MINI", "HIGH"], ["BACK GLASS 12 PRO", "12 PRO", "HIGH"], ["BACK GLASS 12 PRO MAX", "12 PRO MAX", "HIGH"], ["BACK GLASS 13", "13", "HIGH"], ["BACK GLASS 13 MIN", "13 MIN", "HIGH"], ["BACK GLASS 13 PRO", "13 PRO", "HIGH"], ["BACK GLASS 13 PRO MAX", "13 PRO MAX", "HIGH"], ["BACK GLASS 14", "14", "HIGH"], ["BACK GLASS 14 PLUS", "14 PLUS", "HIGH"], ["BACK GLASS 14 PRO", "14 PRO", "HIGH"], ["BACK GLASS 14 PRO MAX", "14 PRO MAX", "HIGH"], ["BACK GLASS 15", "15", "HIGH"], ["BACK GLASS 15 PLUS", "15 PLUS", "HIGH"], ["BACK GLASS 15 PRO", "15 PRO", "HIGH"], ["BACK GLASS 15 PRO MAX", "15 PRO MAX", "HIGH"], ["BACK GLASS 8 PLUS", "8 PLUS", "HIGH"], ["BACK GLASS 8G", "8G", "HIGH"], ["BACK GLASS X", "X", "HIGH"], ["BACK GLASS XR", "XR", "HIGH"], ["BACK GLASS XS", "XS", "HIGH"], ["BACK GLASS XS MAX", "XS MAX", "HIGH"], ["BATERAI 11", "11", "LOW"], ["BATERAI 11 PRO", "11 PRO", "LOW"], ["BATERAI 11 PRO MAX", "11 PRO MAX", "LOW"], ["BATERAI 12", "12", "LOW"], ["BATERAI 12 MINI", "12 MINI", "LOW"], ["BATERAI 12 PRO", "12 PRO", "LOW"], ["BATERAI 12 PRO MAX", "12 PRO MAX", "LOW"], ["BATERAI 13", "13", "MID"], ["BATERAI 13 MIN", "13 MIN", "MID"], ["BATERAI 13 PRO", "13 PRO", "MID"], ["BATERAI 13 PRO MAX", "13 PRO MAX", "MID"], ["BATERAI 14", "14", "MID"], ["BATERAI 14 PLUS", "14 PLUS", "MID"], ["BATERAI 14 PRO", "14 PRO", "MID"], ["BATERAI 14 PRO MAX", "14 PRO MAX", "MID"], ["BATERAI 15", "15", "MID"], ["BATERAI 15 PLUS", "15 PLUS", "MID"], ["BATERAI 15 PRO", "15 PRO", "MID"], ["BATERAI 15 PRO MAX", "15 PRO MAX", "MID"], ["BATERAI 6 PLUS", "6 PLUS", "LOW"], ["BATERAI 6G", "6G", "LOW"], ["BATERAI 6S", "6S", "LOW"], ["BATERAI 6S PLUS", "6S PLUS", "LOW"], ["BATERAI 7 PLUS", "7 PLUS", "LOW"], ["BATERAI 7G", "7G", "LOW"], ["BATERAI 8 PLUS", "8 PLUS", "LOW"], ["BATERAI 8G", "8G", "LOW"], ["BATERAI X", "X", "LOW"], ["BATERAI XR", "XR", "LOW"], ["BATERAI XS", "XS", "LOW"], ["BATERAI XS MAX", "XS MAX", "LOW"], ["CAM BELAKANG 11", "11", "LOW"], ["CAM BELAKANG 11 PRO", "11 PRO", "LOW"], ["CAM BELAKANG 11 PRO MAX", "11 PRO MAX", "LOW"], ["CAM BELAKANG 12", "12", "LOW"], ["CAM BELAKANG 12 MINI", "12 MINI", "LOW"], ["CAM BELAKANG 12 PRO", "12 PRO", "LOW"], ["CAM BELAKANG 12 PRO MAX", "12 PRO MAX", "LOW"], ["CAM BELAKANG 13", "13", "MID"], ["CAM BELAKANG 13 MIN", "13 MIN", "MID"], ["CAM BELAKANG 13 PRO", "13 PRO", "MID"], ["CAM BELAKANG 13 PRO MAX", "13 PRO MAX", "MID"], ["CAM BELAKANG 14", "14", "MID"], ["CAM BELAKANG 14 PLUS", "14 PLUS", "MID"], ["CAM BELAKANG 14 PRO", "14 PRO", "MID"], ["CAM BELAKANG 14 PRO MAX", "14 PRO MAX", "MID"], ["CAM BELAKANG 15", "15", "MID"], ["CAM BELAKANG 15 PLUS", "15 PLUS", "MID"], ["CAM BELAKANG 15 PRO", "15 PRO", "MID"], ["CAM BELAKANG 15 PRO MAX", "15 PRO MAX", "MID"], ["CAM BELAKANG 6 PLUS", "6 PLUS", "LOW"], ["CAM BELAKANG 6G", "6G", "LOW"], ["CAM BELAKANG 6S", "6S", "LOW"], ["CAM BELAKANG 6S PLUS", "6S PLUS", "LOW"], ["CAM BELAKANG 7 PLUS", "7 PLUS", "LOW"], ["CAM BELAKANG 7G", "7G", "LOW"], ["CAM BELAKANG 8 PLUS", "8 PLUS", "LOW"], ["CAM BELAKANG 8G", "8G", "LOW"], ["CAM BELAKANG X", "X", "LOW"], ["CAM BELAKANG XR", "XR", "LOW"], ["CAM BELAKANG XS", "XS", "LOW"], ["CAM BELAKANG XS MAX", "XS MAX", "LOW"], ["CAM DEPAN 11", "11", "HIGH"], ["CAM DEPAN 11 PRO", "11 PRO", "HIGH"], ["CAM DEPAN 11 PRO MAX", "11 PRO MAX", "HIGH"], ["CAM DEPAN 12", "12", "HIGH"], ["CAM DEPAN 12 MINI", "12 MINI", "HIGH"], ["CAM DEPAN 12 PRO", "12 PRO", "HIGH"], ["CAM DEPAN 12 PRO MAX", "12 PRO MAX", "HIGH"], ["CAM DEPAN 13", "13", "HIGH"], ["CAM DEPAN 13 MIN", "13 MIN", "HIGH"], ["CAM DEPAN 13 PRO", "13 PRO", "HIGH"], ["CAM DEPAN 13 PRO MAX", "13 PRO MAX", "HIGH"], ["CAM DEPAN 14", "14", "HIGH"], ["CAM DEPAN 14 PLUS", "14 PLUS", "HIGH"], ["CAM DEPAN 14 PRO", "14 PRO", "HIGH"], ["CAM DEPAN 14 PRO MAX", "14 PRO MAX", "HIGH"], ["CAM DEPAN 15", "15", "HIGH"], ["CAM DEPAN 15 PLUS", "15 PLUS", "HIGH"], ["CAM DEPAN 15 PRO", "15 PRO", "HIGH"], ["CAM DEPAN 15 PRO MAX", "15 PRO MAX", "HIGH"], ["CAM DEPAN 6 PLUS", "6 PLUS", "HIGH"], ["CAM DEPAN 6G", "6G", "HIGH"], ["CAM DEPAN 6S", "6S", "HIGH"], ["CAM DEPAN 6S PLUS", "6S PLUS", "HIGH"], ["CAM DEPAN 7 PLUS", "7 PLUS", "HIGH"], ["CAM DEPAN 7G", "7G", "HIGH"], ["CAM DEPAN 8 PLUS", "8 PLUS", "HIGH"], ["CAM DEPAN 8G", "8G", "HIGH"], ["CAM DEPAN X", "X", "HIGH"], ["CAM DEPAN XR", "XR", "HIGH"], ["CAM DEPAN XS", "XS", "HIGH"], ["CAM DEPAN XS MAX", "XS MAX", "HIGH"], ["CAM GETAR 11", "11", "MID"], ["CAM GETAR 11 PRO", "11 PRO", "MID"], ["CAM GETAR 11 PRO MAX", "11 PRO MAX", "MID"], ["CAM GETAR 12", "12", "MID"], ["CAM GETAR 12 MINI", "12 MINI", "MID"], ["CAM GETAR 12 PRO", "12 PRO", "MID"], ["CAM GETAR 12 PRO MAX", "12 PRO MAX", "MID"], ["CAM GETAR 13", "13", "MID"], ["CAM GETAR 13 MIN", "13 MIN", "MID"], ["CAM GETAR 13 PRO", "13 PRO", "MID"], ["CAM GETAR 13 PRO MAX", "13 PRO MAX", "MID"], ["CAM GETAR 14", "14", "MID"], ["CAM GETAR 14 PLUS", "14 PLUS", "MID"], ["CAM GETAR 14 PRO", "14 PRO", "MID"], ["CAM GETAR 14 PRO MAX", "14 PRO MAX", "MID"], ["CAM GETAR 15", "15", "MID"], ["CAM GETAR 15 PLUS", "15 PLUS", "MID"], ["CAM GETAR 15 PRO", "15 PRO", "MID"], ["CAM GETAR 15 PRO MAX", "15 PRO MAX", "MID"], ["CAM GETAR 6 PLUS", "6 PLUS", "MID"], ["CAM GETAR 6G", "6G", "MID"], ["CAM GETAR 6S", "6S", "MID"], ["CAM GETAR 6S PLUS", "6S PLUS", "MID"], ["CAM GETAR 7 PLUS", "7 PLUS", "MID"], ["CAM GETAR 7G", "7G", "MID"], ["CAM GETAR 8 PLUS", "8 PLUS", "MID"], ["CAM GETAR 8G", "8G", "MID"], ["CAM GETAR X", "X", "MID"], ["CAM GETAR XR", "XR", "MID"], ["CAM GETAR XS", "XS", "MID"], ["CAM GETAR XS MAX", "XS MAX", "MID"], ["CAM JAMUR 11", "11", "HIGH"], ["CAM JAMUR 11 PRO", "11 PRO", "HIGH"], ["CAM JAMUR 11 PRO MAX", "11 PRO MAX", "HIGH"], ["CAM JAMUR 12", "12", "HIGH"], ["CAM JAMUR 12 MINI", "12 MINI", "HIGH"], ["CAM JAMUR 12 PRO", "12 PRO", "HIGH"], ["CAM JAMUR 12 PRO MAX", "12 PRO MAX", "HIGH"], ["CAM JAMUR 13", "13", "HIGH"], ["CAM JAMUR 13 MIN", "13 MIN", "HIGH"], ["CAM JAMUR 13 PRO", "13 PRO", "HIGH"], ["CAM JAMUR 13 PRO MAX", "13 PRO MAX", "HIGH"], ["CAM JAMUR 14", "14", "HIGH"], ["CAM JAMUR 14 PLUS", "14 PLUS", "HIGH"], ["CAM JAMUR 14 PRO", "14 PRO", "HIGH"], ["CAM JAMUR 14 PRO MAX", "14 PRO MAX", "HIGH"], ["CAM JAMUR 15", "15", "HIGH"], ["CAM JAMUR 15 PLUS", "15 PLUS", "HIGH"], ["CAM JAMUR 15 PRO", "15 PRO", "HIGH"], ["CAM JAMUR 15 PRO MAX", "15 PRO MAX", "HIGH"], ["CAM JAMUR 6 PLUS", "6 PLUS", "MID"], ["CAM JAMUR 6G", "6G", "MID"], ["CAM JAMUR 6S", "6S", "MID"], ["CAM JAMUR 6S PLUS", "6S PLUS", "MID"], ["CAM JAMUR 7 PLUS", "7 PLUS", "MID"], ["CAM JAMUR 7G", "7G", "MID"], ["CAM JAMUR 8 PLUS", "8 PLUS", "MID"], ["CAM JAMUR 8G", "8G", "MID"], ["CAM JAMUR X", "X", "MID"], ["CAM JAMUR XR", "XR", "MID"], ["CAM JAMUR XS", "XS", "MID"], ["CAM JAMUR XS MAX", "XS MAX", "MID"], ["CHIP BATERAI 11", "11", "HIGH"], ["CHIP BATERAI 11 PRO", "11 PRO", "HIGH"], ["CHIP BATERAI 11 PRO MAX", "11 PRO MAX", "HIGH"], ["CHIP BATERAI 12", "12", "HIGH"], ["CHIP BATERAI 12 MINI", "12 MINI", "HIGH"], ["CHIP BATERAI 12 PRO", "12 PRO", "HIGH"], ["CHIP BATERAI 12 PRO MAX", "12 PRO MAX", "HIGH"], ["CHIP BATERAI 13", "13", "HIGH"], ["CHIP BATERAI 13 MIN", "13 MIN", "HIGH"], ["CHIP BATERAI 13 PRO", "13 PRO", "HIGH"], ["CHIP BATERAI 13 PRO MAX", "13 PRO MAX", "HIGH"], ["CHIP BATERAI 14", "14", "HIGH"], ["CHIP BATERAI 14 PLUS", "14 PLUS", "HIGH"], ["CHIP BATERAI 14 PRO", "14 PRO", "HIGH"], ["CHIP BATERAI 14 PRO MAX", "14 PRO MAX", "HIGH"], ["CHIP BATERAI 15", "15", "HIGH"], ["CHIP BATERAI 15 PLUS", "15 PLUS", "HIGH"], ["CHIP BATERAI 15 PRO", "15 PRO", "HIGH"], ["CHIP BATERAI 15 PRO MAX", "15 PRO MAX", "HIGH"], ["CHIP BATERAI XR", "XR", "HIGH"], ["CHIP BATERAI XS", "XS", "HIGH"], ["CHIP BATERAI XS MAX", "XS MAX", "HIGH"], ["CHIP LCD 11", "11", "HIGH"], ["CHIP LCD 11 PRO", "11 PRO", "HIGH"], ["CHIP LCD 11 PRO MAX", "11 PRO MAX", "HIGH"], ["CHIP LCD 12", "12", "HIGH"], ["CHIP LCD 12 MINI", "12 MINI", "HIGH"], ["CHIP LCD 12 PRO", "12 PRO", "HIGH"], ["CHIP LCD 12 PRO MAX", "12 PRO MAX", "HIGH"], ["CHIP LCD 13", "13", "HIGH"], ["CHIP LCD 13 MIN", "13 MIN", "HIGH"], ["CHIP LCD 13 PRO", "13 PRO", "HIGH"], ["CHIP LCD 13 PRO MAX", "13 PRO MAX", "HIGH"], ["CHIP LCD 14", "14", "HIGH"], ["CHIP LCD 14 PLUS", "14 PLUS", "HIGH"], ["CHIP LCD 14 PRO", "14 PRO", "HIGH"], ["CHIP LCD 14 PRO MAX", "14 PRO MAX", "HIGH"], ["CHIP LCD 15", "15", "HIGH"], ["CHIP LCD 15 PLUS", "15 PLUS", "HIGH"], ["CHIP LCD 15 PRO", "15 PRO", "HIGH"], ["CHIP LCD 15 PRO MAX", "15 PRO MAX", "HIGH"], ["FLEX PORT 11", "11", "MID"], ["FLEX PORT 11 PRO", "11 PRO", "MID"], ["FLEX PORT 11 PRO MAX", "11 PRO MAX", "MID"], ["FLEX PORT 12", "12", "MID"], ["FLEX PORT 12 MINI", "12 MINI", "MID"], ["FLEX PORT 12 PRO", "12 PRO", "MID"], ["FLEX PORT 12 PRO MAX", "12 PRO MAX", "MID"], ["FLEX PORT 13", "13", "MID"], ["FLEX PORT 13 MIN", "13 MIN", "MID"], ["FLEX PORT 13 PRO", "13 PRO", "MID"], ["FLEX PORT 13 PRO MAX", "13 PRO MAX", "MID"], ["FLEX PORT 14", "14", "MID"], ["FLEX PORT 14 PLUS", "14 PLUS", "MID"], ["FLEX PORT 14 PRO", "14 PRO", "MID"], ["FLEX PORT 14 PRO MAX", "14 PRO MAX", "MID"], ["FLEX PORT 15", "15", "MID"], ["FLEX PORT 15 PLUS", "15 PLUS", "MID"], ["FLEX PORT 15 PRO", "15 PRO", "MID"], ["FLEX PORT 15 PRO MAX", "15 PRO MAX", "MID"], ["FLEX PORT 8 PLUS", "8 PLUS", "MID"], ["FLEX PORT X", "X", "MID"], ["FLEX PORT XR", "XR", "MID"], ["FLEX PORT XS", "XS", "MID"], ["FLEX PORT XS MAX", "XS MAX", "MID"], ["FLEX SPEAKER/BUZEER 11", "11", "HIGH"], ["FLEX SPEAKER/BUZEER 11 PRO", "11 PRO", "HIGH"], ["FLEX SPEAKER/BUZEER 11 PRO MAX", "11 PRO MAX", "HIGH"], ["FLEX SPEAKER/BUZEER 12", "12", "HIGH"], ["FLEX SPEAKER/BUZEER 12 MINI", "12 MINI", "HIGH"], ["FLEX SPEAKER/BUZEER 12 PRO", "12 PRO", "HIGH"], ["FLEX SPEAKER/BUZEER 12 PRO MAX", "12 PRO MAX", "HIGH"], ["FLEX SPEAKER/BUZEER 13", "13", "HIGH"], ["FLEX SPEAKER/BUZEER 13 MIN", "13 MIN", "HIGH"], ["FLEX SPEAKER/BUZEER 13 PRO", "13 PRO", "HIGH"], ["FLEX SPEAKER/BUZEER 13 PRO MAX", "13 PRO MAX", "HIGH"], ["FLEX SPEAKER/BUZEER 14", "14", "HIGH"], ["FLEX SPEAKER/BUZEER 14 PLUS", "14 PLUS", "HIGH"], ["FLEX SPEAKER/BUZEER 14 PRO", "14 PRO", "HIGH"], ["FLEX SPEAKER/BUZEER 14 PRO MAX", "14 PRO MAX", "HIGH"], ["FLEX SPEAKER/BUZEER 15", "15", "HIGH"], ["FLEX SPEAKER/BUZEER 15 PLUS", "15 PLUS", "HIGH"], ["FLEX SPEAKER/BUZEER 15 PRO", "15 PRO", "HIGH"], ["FLEX SPEAKER/BUZEER 15 PRO MAX", "15 PRO MAX", "HIGH"], ["FLEX SPEAKER/BUZEER 6 PLUS", "6 PLUS", "LOW"], ["FLEX SPEAKER/BUZEER 6G", "6G", "LOW"], ["FLEX SPEAKER/BUZEER 6S", "6S", "LOW"], ["FLEX SPEAKER/BUZEER 6S PLUS", "6S PLUS", "LOW"], ["FLEX SPEAKER/BUZEER 7 PLUS", "7 PLUS", "LOW"], ["FLEX SPEAKER/BUZEER 7G", "7G", "LOW"], ["FLEX SPEAKER/BUZEER 8 PLUS", "8 PLUS", "LOW"], ["FLEX SPEAKER/BUZEER 8G", "8G", "LOW"], ["FLEX SPEAKER/BUZEER X", "X", "HIGH"], ["FLEX SPEAKER/BUZEER XR", "XR", "HIGH"], ["FLEX SPEAKER/BUZEER XS", "XS", "HIGH"], ["FLEX SPEAKER/BUZEER XS MAX", "XS MAX", "HIGH"], ["FLEX VOLUM 11", "11", "HIGH"], ["FLEX VOLUM 11 PRO", "11 PRO", "HIGH"], ["FLEX VOLUM 11 PRO MAX", "11 PRO MAX", "HIGH"], ["FLEX VOLUM 12", "12", "HIGH"], ["FLEX VOLUM 12 MINI", "12 MINI", "HIGH"], ["FLEX VOLUM 12 PRO", "12 PRO", "HIGH"], ["FLEX VOLUM 12 PRO MAX", "12 PRO MAX", "HIGH"], ["FLEX VOLUM 13", "13", "HIGH"], ["FLEX VOLUM 13 MIN", "13 MIN", "HIGH"], ["FLEX VOLUM 13 PRO", "13 PRO", "HIGH"], ["FLEX VOLUM 13 PRO MAX", "13 PRO MAX", "HIGH"], ["FLEX VOLUM 14", "14", "HIGH"], ["FLEX VOLUM 14 PLUS", "14 PLUS", "HIGH"], ["FLEX VOLUM 14 PRO", "14 PRO", "HIGH"], ["FLEX VOLUM 14 PRO MAX", "14 PRO MAX", "HIGH"], ["FLEX VOLUM 15", "15", "HIGH"], ["FLEX VOLUM 15 PLUS", "15 PLUS", "HIGH"], ["FLEX VOLUM 15 PRO", "15 PRO", "HIGH"], ["FLEX VOLUM 15 PRO MAX", "15 PRO MAX", "HIGH"], ["FLEX VOLUM 6 PLUS", "6 PLUS", "HIGH"], ["FLEX VOLUM 6G", "6G", "HIGH"], ["FLEX VOLUM 6S", "6S", "HIGH"], ["FLEX VOLUM 6S PLUS", "6S PLUS", "HIGH"], ["FLEX VOLUM 7 PLUS", "7 PLUS", "HIGH"], ["FLEX VOLUM 7G", "7G", "HIGH"], ["FLEX VOLUM 8 PLUS", "8 PLUS", "HIGH"], ["FLEX VOLUM 8G", "8G", "HIGH"], ["FLEX VOLUM X", "X", "HIGH"], ["FLEX VOLUM XR", "XR", "HIGH"], ["FLEX VOLUM XS", "XS", "HIGH"], ["FLEX VOLUM XS MAX", "XS MAX", "HIGH"], ["GREEN SCREEN 13", "13", "HIGH"], ["GREEN SCREEN 13 PRO", "13 PRO", "HIGH"], ["GREEN SCREEN 13 PRO MAX", "13 PRO MAX", "HIGH"], ["GREEN SCREEN 14", "14", "HIGH"], ["GREEN SCREEN 14 PLUS", "14 PLUS", "HIGH"], ["GREEN SCREEN 14 PRO", "14 PRO", "HIGH"], ["GREEN SCREEN 14 PRO MAX", "14 PRO MAX", "HIGH"], ["GREEN SCREEN 15", "15", "HIGH"], ["GREEN SCREEN 15 PLUS", "15 PLUS", "HIGH"], ["GREEN SCREEN 15 PRO", "15 PRO", "HIGH"], ["GREEN SCREEN 15 PRO MAX", "15 PRO MAX", "HIGH"], ["HOUSING 11", "11", "HIGH"], ["HOUSING 11 PRO", "11 PRO", "HIGH"], ["HOUSING 11 PRO MAX", "11 PRO MAX", "HIGH"], ["HOUSING 12", "12", "HIGH"], ["HOUSING 12 MINI", "12 MINI", "HIGH"], ["HOUSING 12 PRO", "12 PRO", "HIGH"], ["HOUSING 12 PRO MAX", "12 PRO MAX", "HIGH"], ["HOUSING 13", "13", "HIGH"], ["HOUSING 13 MIN", "13 MIN", "HIGH"], ["HOUSING 13 PRO", "13 PRO", "HIGH"], ["HOUSING 13 PRO MAX", "13 PRO MAX", "HIGH"], ["HOUSING 14", "14", "HIGH"], ["HOUSING 14 PLUS", "14 PLUS", "HIGH"], ["HOUSING 14 PRO", "14 PRO", "HIGH"], ["HOUSING 14 PRO MAX", "14 PRO MAX", "HIGH"], ["HOUSING 15", "15", "HIGH"], ["HOUSING 15 PLUS", "15 PLUS", "HIGH"], ["HOUSING 15 PRO", "15 PRO", "HIGH"], ["HOUSING 15 PRO MAX", "15 PRO MAX", "HIGH"], ["HOUSING 6 PLUS", "6 PLUS", "HIGH"], ["HOUSING 6G", "6G", "HIGH"], ["HOUSING 6S", "6S", "HIGH"], ["HOUSING 6S PLUS", "6S PLUS", "HIGH"], ["HOUSING 7 PLUS", "7 PLUS", "HIGH"], ["HOUSING 7G", "7G", "HIGH"], ["HOUSING 8 PLUS", "8 PLUS", "HIGH"], ["HOUSING 8G", "8G", "HIGH"], ["HOUSING X", "X", "HIGH"], ["HOUSING XR", "XR", "HIGH"], ["HOUSING XS", "XS", "HIGH"], ["HOUSING XS MAX", "XS MAX", "HIGH"], ["KACA KAMERA 11", "11", "MID"], ["KACA KAMERA 11 PRO", "11 PRO", "MID"], ["KACA KAMERA 11 PRO MAX", "11 PRO MAX", "MID"], ["KACA KAMERA 12", "12", "MID"], ["KACA KAMERA 12 MINI", "12 MINI", "MID"], ["KACA KAMERA 12 PRO", "12 PRO", "MID"], ["KACA KAMERA 12 PRO MAX", "12 PRO MAX", "MID"], ["KACA KAMERA 13", "13", "MID"], ["KACA KAMERA 13 MIN", "13 MIN", "MID"], ["KACA KAMERA 13 PRO", "13 PRO", "MID"], ["KACA KAMERA 13 PRO MAX", "13 PRO MAX", "MID"], ["KACA KAMERA 14", "14", "MID"], ["KACA KAMERA 14 PLUS", "14 PLUS", "MID"], ["KACA KAMERA 14 PRO", "14 PRO", "MID"], ["KACA KAMERA 14 PRO MAX", "14 PRO MAX", "MID"], ["KACA KAMERA 15", "15", "MID"], ["KACA KAMERA 15 PLUS", "15 PLUS", "MID"], ["KACA KAMERA 15 PRO", "15 PRO", "MID"], ["KACA KAMERA 15 PRO MAX", "15 PRO MAX", "MID"], ["KACA KAMERA 6 PLUS", "6 PLUS", "MID"], ["KACA KAMERA 6G", "6G", "MID"], ["KACA KAMERA 6S", "6S", "MID"], ["KACA KAMERA 6S PLUS", "6S PLUS", "MID"], ["KACA KAMERA 7 PLUS", "7 PLUS", "MID"], ["KACA KAMERA 7G", "7G", "MID"], ["KACA KAMERA 8 PLUS", "8 PLUS", "MID"], ["KACA KAMERA 8G", "8G", "MID"], ["KACA KAMERA X", "X", "MID"], ["KACA KAMERA XR", "XR", "MID"], ["KACA KAMERA XS", "XS", "MID"], ["KACA KAMERA XS MAX", "XS MAX", "MID"], ["KOCAK 11", "11", "LOW"], ["KOCAK 11 PRO", "11 PRO", "LOW"], ["KOCAK 11 PRO MAX", "11 PRO MAX", "LOW"], ["KOCAK 12", "12", "MID"], ["KOCAK 12 MINI", "12 MINI", "MID"], ["KOCAK 12 PRO", "12 PRO", "MID"], ["KOCAK 12 PRO MAX", "12 PRO MAX", "MID"], ["KOCAK 13", "13", "MID"], ["KOCAK 13 MIN", "13 MIN", "MID"], ["KOCAK 13 PRO", "13 PRO", "MID"], ["KOCAK 13 PRO MAX", "13 PRO MAX", "MID"], ["KOCAK 14", "14", "MID"], ["KOCAK 14 PLUS", "14 PLUS", "MID"], ["KOCAK 14 PRO", "14 PRO", "MID"], ["KOCAK 14 PRO MAX", "14 PRO MAX", "MID"], ["KOCAK 15", "15", "MID"], ["KOCAK 15 PLUS", "15 PLUS", "MID"], ["KOCAK 15 PRO", "15 PRO", "MID"], ["KOCAK 15 PRO MAX", "15 PRO MAX", "MID"], ["KOCAK 6 PLUS", "6 PLUS", "LOW"], ["KOCAK 6G", "6G", "LOW"], ["KOCAK 6S", "6S", "LOW"], ["KOCAK 6S PLUS", "6S PLUS", "LOW"], ["KOCAK 7 PLUS", "7 PLUS", "LOW"], ["KOCAK 7G", "7G", "LOW"], ["KOCAK 8 PLUS", "8 PLUS", "LOW"], ["KOCAK 8G", "8G", "LOW"], ["KOCAK X", "X", "LOW"], ["KOCAK XR", "XR", "LOW"], ["KOCAK XS", "XS", "LOW"], ["KOCAK XS MAX", "XS MAX", "LOW"], ["LCD 11", "11", "LOW"], ["LCD 11 PRO", "11 PRO", "LOW"], ["LCD 11 PRO MAX", "11 PRO MAX", "LOW"], ["LCD 12", "12", "LOW"], ["LCD 12 MINI", "12 MINI", "LOW"], ["LCD 12 PRO", "12 PRO", "LOW"], ["LCD 12 PRO MAX", "12 PRO MAX", "LOW"], ["LCD 13", "13", "LOW"], ["LCD 13 MIN", "13 MIN", "LOW"], ["LCD 13 PRO", "13 PRO", "LOW"], ["LCD 13 PRO MAX", "13 PRO MAX", "LOW"], ["LCD 14", "14", "MID"], ["LCD 14 PLUS", "14 PLUS", "MID"], ["LCD 14 PRO", "14 PRO", "MID"], ["LCD 14 PRO MAX", "14 PRO MAX", "MID"], ["LCD 15", "15", "MID"], ["LCD 15 PLUS", "15 PLUS", "MID"], ["LCD 15 PRO", "15 PRO", "MID"], ["LCD 15 PRO MAX", "15 PRO MAX", "MID"], ["LCD 6 PLUS", "6 PLUS", "LOW"], ["LCD 6G", "6G", "LOW"], ["LCD 6S", "6S", "LOW"], ["LCD 6S PLUS", "6S PLUS", "LOW"], ["LCD 7 PLUS", "7 PLUS", "LOW"], ["LCD 7G", "7G", "LOW"], ["LCD 8 PLUS", "8 PLUS", "LOW"], ["LCD 8G", "8G", "LOW"], ["LCD X", "X", "LOW"], ["LCD XR", "XR", "LOW"], ["LCD XS", "XS", "LOW"], ["LCD XS MAX", "XS MAX", "LOW"], ["NO SIM 11", "11", "LOW"], ["NO SIM 11 PRO", "11 PRO", "LOW"], ["NO SIM 11 PRO MAX", "11 PRO MAX", "LOW"], ["NO SIM 12", "12", "MID"], ["NO SIM 12 MINI", "12 MINI", "MID"], ["NO SIM 12 PRO", "12 PRO", "MID"], ["NO SIM 12 PRO MAX", "12 PRO MAX", "MID"], ["NO SIM 13", "13", "MID"], ["NO SIM 13 MIN", "13 MIN", "MID"], ["NO SIM 13 PRO", "13 PRO", "MID"], ["NO SIM 13 PRO MAX", "13 PRO MAX", "MID"], ["NO SIM 14", "14", "MID"], ["NO SIM 14 PLUS", "14 PLUS", "MID"], ["NO SIM 14 PRO", "14 PRO", "MID"], ["NO SIM 14 PRO MAX", "14 PRO MAX", "MID"], ["NO SIM 15", "15", "MID"], ["NO SIM 15 PLUS", "15 PLUS", "MID"], ["NO SIM 15 PRO", "15 PRO", "MID"], ["NO SIM 15 PRO MAX", "15 PRO MAX", "MID"], ["NO SIM 6 PLUS", "6 PLUS", "LOW"], ["NO SIM 6G", "6G", "LOW"], ["NO SIM 6S", "6S", "LOW"], ["NO SIM 6S PLUS", "6S PLUS", "LOW"], ["NO SIM 7 PLUS", "7 PLUS", "LOW"], ["NO SIM 7G", "7G", "LOW"], ["NO SIM 8 PLUS", "8 PLUS", "LOW"], ["NO SIM 8G", "8G", "LOW"], ["NO SIM X", "X", "LOW"], ["NO SIM XS", "XS", "LOW"], ["NO SIM XS MAX", "XS MAX", "LOW"], ["PANICFULL 11", "11", "HIGH"], ["PANICFULL 11 PRO", "11 PRO", "HIGH"], ["PANICFULL 11 PRO MAX", "11 PRO MAX", "HIGH"], ["PANICFULL 12", "12", "HIGH"], ["PANICFULL 12 MINI", "12 MINI", "HIGH"], ["PANICFULL 12 PRO", "12 PRO", "HIGH"], ["PANICFULL 12 PRO MAX", "12 PRO MAX", "HIGH"], ["PANICFULL 13", "13", "HIGH"], ["PANICFULL 13 MIN", "13 MIN", "HIGH"], ["PANICFULL 13 PRO", "13 PRO", "HIGH"], ["PANICFULL 13 PRO MAX", "13 PRO MAX", "HIGH"], ["PANICFULL 14", "14", "HIGH"], ["PANICFULL 14 PLUS", "14 PLUS", "HIGH"], ["PANICFULL 14 PRO", "14 PRO", "HIGH"], ["PANICFULL 14 PRO MAX", "14 PRO MAX", "HIGH"], ["PANICFULL 15", "15", "HIGH"], ["PANICFULL 15 PLUS", "15 PLUS", "HIGH"], ["PANICFULL 15 PRO", "15 PRO", "HIGH"], ["PANICFULL 15 PRO MAX", "15 PRO MAX", "HIGH"], ["PANICFULL 6 PLUS", "6 PLUS", "HIGH"], ["PANICFULL 6G", "6G", "HIGH"], ["PANICFULL 6S", "6S", "HIGH"], ["PANICFULL 6S PLUS", "6S PLUS", "HIGH"], ["PANICFULL 7 PLUS", "7 PLUS", "HIGH"], ["PANICFULL 7G", "7G", "HIGH"], ["PANICFULL 8 PLUS", "8 PLUS", "HIGH"], ["PANICFULL 8G", "8G", "HIGH"], ["PANICFULL XR", "XR", "HIGH"], ["PANICFULL XS", "XS", "HIGH"], ["PANICFULL XS MAX", "XS MAX", "HIGH"], ["PROXY 11", "11", "LOW"], ["PROXY 11 PRO", "11 PRO", "LOW"], ["PROXY 11 PRO MAX", "11 PRO MAX", "LOW"], ["PROXY 12", "12", "LOW"], ["PROXY 12 MINI", "12 MINI", "LOW"], ["PROXY 12 PRO", "12 PRO", "LOW"], ["PROXY 12 PRO MAX", "12 PRO MAX", "LOW"], ["PROXY 13", "13", "LOW"], ["PROXY 13 MIN", "13 MIN", "LOW"], ["PROXY 13 PRO", "13 PRO", "LOW"], ["PROXY 13 PRO MAX", "13 PRO MAX", "LOW"], ["PROXY 14", "14", "LOW"], ["PROXY 14 PLUS", "14 PLUS", "LOW"], ["PROXY 14 PRO", "14 PRO", "LOW"], ["PROXY 14 PRO MAX", "14 PRO MAX", "LOW"], ["PROXY 15", "15", "LOW"], ["PROXY 15 PLUS", "15 PLUS", "LOW"], ["PROXY 15 PRO", "15 PRO", "LOW"], ["PROXY 15 PRO MAX", "15 PRO MAX", "LOW"], ["PROXY 6 PLUS", "6 PLUS", "LOW"], ["PROXY 6G", "6G", "LOW"], ["PROXY 6S", "6S", "LOW"], ["PROXY 6S PLUS", "6S PLUS", "LOW"], ["PROXY 7 PLUS", "7 PLUS", "LOW"], ["PROXY 7G", "7G", "LOW"], ["PROXY 8 PLUS", "8 PLUS", "LOW"], ["PROXY 8G", "8G", "LOW"], ["PROXY XR", "XR", "LOW"], ["PROXY XS", "XS", "LOW"], ["PROXY XS MAX", "XS MAX", "LOW"], ["REPAIR CAM BELAKANG 11", "11", "MID"], ["REPAIR CAM BELAKANG 11 PRO", "11 PRO", "MID"], ["REPAIR CAM BELAKANG 11 PRO MAX", "11 PRO MAX", "MID"], ["REPAIR CAM BELAKANG 12", "12", "HIGH"], ["REPAIR CAM BELAKANG 12 MINI", "12 MINI", "HIGH"], ["REPAIR CAM BELAKANG 12 PRO", "12 PRO", "HIGH"], ["REPAIR CAM BELAKANG 12 PRO MAX", "12 PRO MAX", "HIGH"], ["REPAIR CAM BELAKANG 13", "13", "HIGH"], ["REPAIR CAM BELAKANG 13 MIN", "13 MIN", "HIGH"], ["REPAIR CAM BELAKANG 13 PRO", "13 PRO", "HIGH"], ["REPAIR CAM BELAKANG 13 PRO MAX", "13 PRO MAX", "HIGH"], ["REPAIR CAM BELAKANG 14", "14", "HIGH"], ["REPAIR CAM BELAKANG 14 PLUS", "14 PLUS", "HIGH"], ["REPAIR CAM BELAKANG 14 PRO", "14 PRO", "HIGH"], ["REPAIR CAM BELAKANG 14 PRO MAX", "14 PRO MAX", "HIGH"], ["REPAIR CAM BELAKANG 15", "15", "HIGH"], ["REPAIR CAM BELAKANG 15 PLUS", "15 PLUS", "HIGH"], ["REPAIR CAM BELAKANG 15 PRO", "15 PRO", "HIGH"], ["REPAIR CAM BELAKANG 15 PRO MAX", "15 PRO MAX", "HIGH"], ["REPAIR CAM BELAKANG 6 PLUS", "6 PLUS", "LOW"], ["REPAIR CAM BELAKANG 6G", "6G", "LOW"], ["REPAIR CAM BELAKANG 6S", "6S", "LOW"], ["REPAIR CAM BELAKANG 6S PLUS", "6S PLUS", "LOW"], ["REPAIR CAM BELAKANG 7 PLUS", "7 PLUS", "LOW"], ["REPAIR CAM BELAKANG 7G", "7G", "LOW"], ["REPAIR CAM BELAKANG 8 PLUS", "8 PLUS", "LOW"], ["REPAIR CAM BELAKANG 8G", "8G", "LOW"], ["REPAIR CAM BELAKANG X", "X", "HIGH"], ["REPAIR CAM BELAKANG XR", "XR", "MID"], ["REPAIR CAM BELAKANG XS", "XS", "HIGH"], ["REPAIR CAM BELAKANG XS MAX", "XS MAX", "HIGH"], ["REPAIR FI 11", "11", "HIGH"], ["REPAIR FI 11 PRO", "11 PRO", "HIGH"], ["REPAIR FI 11 PRO MAX", "11 PRO MAX", "HIGH"], ["REPAIR FI 12", "12", "HIGH"], ["REPAIR FI 12 MINI", "12 MINI", "HIGH"], ["REPAIR FI 12 PRO", "12 PRO", "HIGH"], ["REPAIR FI 12 PRO MAX", "12 PRO MAX", "HIGH"], ["REPAIR FI 13", "13", "HIGH"], ["REPAIR FI 13 MIN", "13 MIN", "HIGH"], ["REPAIR FI 13 PRO", "13 PRO", "HIGH"], ["REPAIR FI 13 PRO MAX", "13 PRO MAX", "HIGH"], ["REPAIR FI 14", "14", "HIGH"], ["REPAIR FI 14 PLUS", "14 PLUS", "HIGH"], ["REPAIR FI 14 PRO", "14 PRO", "HIGH"], ["REPAIR FI 14 PRO MAX", "14 PRO MAX", "HIGH"], ["REPAIR FI 15", "15", "HIGH"], ["REPAIR FI 15 PLUS", "15 PLUS", "HIGH"], ["REPAIR FI 15 PRO", "15 PRO", "HIGH"], ["REPAIR FI 15 PRO MAX", "15 PRO MAX", "HIGH"], ["REPAIR FI X", "X", "HIGH"], ["REPAIR FI XR", "XR", "HIGH"], ["REPAIR FI XS", "XS", "HIGH"], ["REPAIR FI XS MAX", "XS MAX", "HIGH"], ["REPAIR LCD 11", "11", "MID"], ["REPAIR LCD 11 PRO", "11 PRO", "MID"], ["REPAIR LCD 11 PRO MAX", "11 PRO MAX", "MID"], ["REPAIR LCD 12", "12", "MID"], ["REPAIR LCD 12 MINI", "12 MINI", "MID"], ["REPAIR LCD 12 PRO", "12 PRO", "MID"], ["REPAIR LCD 12 PRO MAX", "12 PRO MAX", "MID"], ["REPAIR LCD 13", "13", "MID"], ["REPAIR LCD 13 MIN", "13 MIN", "MID"], ["REPAIR LCD 13 PRO", "13 PRO", "MID"], ["REPAIR LCD 13 PRO MAX", "13 PRO MAX", "MID"], ["REPAIR LCD 14", "14", "MID"], ["REPAIR LCD 14 PLUS", "14 PLUS", "MID"], ["REPAIR LCD 14 PRO", "14 PRO", "MID"], ["REPAIR LCD 14 PRO MAX", "14 PRO MAX", "MID"], ["REPAIR LCD 15", "15", "MID"], ["REPAIR LCD 15 PLUS", "15 PLUS", "MID"], ["REPAIR LCD 15 PRO", "15 PRO", "MID"], ["REPAIR LCD 15 PRO MAX", "15 PRO MAX", "MID"], ["REPAIR LCD X", "X", "MID"], ["REPAIR LCD XR", "XR", "MID"], ["REPAIR LCD XS", "XS", "MID"], ["REPAIR LCD XS MAX", "XS MAX", "MID"], ["SPEAKER PELAN 11", "11", "LOW"], ["SPEAKER PELAN 11 PRO", "11 PRO", "LOW"], ["SPEAKER PELAN 11 PRO MAX", "11 PRO MAX", "LOW"], ["SPEAKER PELAN 12", "12", "LOW"], ["SPEAKER PELAN 12 MINI", "12 MINI", "LOW"], ["SPEAKER PELAN 12 PRO", "12 PRO", "LOW"], ["SPEAKER PELAN 12 PRO MAX", "12 PRO MAX", "LOW"], ["SPEAKER PELAN 13", "13", "LOW"], ["SPEAKER PELAN 13 MIN", "13 MIN", "LOW"], ["SPEAKER PELAN 13 PRO", "13 PRO", "LOW"], ["SPEAKER PELAN 13 PRO MAX", "13 PRO MAX", "LOW"], ["SPEAKER PELAN 14", "14", "LOW"], ["SPEAKER PELAN 14 PLUS", "14 PLUS", "LOW"], ["SPEAKER PELAN 14 PRO", "14 PRO", "LOW"], ["SPEAKER PELAN 14 PRO MAX", "14 PRO MAX", "LOW"], ["SPEAKER PELAN 15", "15", "LOW"], ["SPEAKER PELAN 15 PLUS", "15 PLUS", "LOW"], ["SPEAKER PELAN 15 PRO", "15 PRO", "LOW"], ["SPEAKER PELAN 15 PRO MAX", "15 PRO MAX", "LOW"], ["SPEAKER PELAN 6 PLUS", "6 PLUS", "LOW"], ["SPEAKER PELAN 6G", "6G", "LOW"], ["SPEAKER PELAN 6S", "6S", "LOW"], ["SPEAKER PELAN 6S PLUS", "6S PLUS", "LOW"], ["SPEAKER PELAN 7 PLUS", "7 PLUS", "LOW"], ["SPEAKER PELAN 7G", "7G", "LOW"], ["SPEAKER PELAN 8 PLUS", "8 PLUS", "LOW"], ["SPEAKER PELAN 8G", "8G", "LOW"], ["SPEAKER PELAN XR", "XR", "LOW"], ["SPEAKER PELAN XS", "XS", "LOW"], ["SPEAKER PELAN XS MAX", "XS MAX", "LOW"], ["UP BATERAI 11", "11", "LOW"], ["UP BATERAI 11 PRO", "11 PRO", "LOW"], ["UP BATERAI 11 PRO MAX", "11 PRO MAX", "LOW"], ["UP BATERAI 12", "12", "MID"], ["UP BATERAI 12 MINI", "12 MINI", "MID"], ["UP BATERAI 12 PRO", "12 PRO", "MID"], ["UP BATERAI 12 PRO MAX", "12 PRO MAX", "MID"], ["UP BATERAI 13", "13", "MID"], ["UP BATERAI 13 MIN", "13 MIN", "MID"], ["UP BATERAI 13 PRO", "13 PRO", "MID"], ["UP BATERAI 13 PRO MAX", "13 PRO MAX", "MID"], ["UP BATERAI 14", "14", "HIGH"], ["UP BATERAI 14 PLUS", "14 PLUS", "HIGH"], ["UP BATERAI 14 PRO", "14 PRO", "HIGH"], ["UP BATERAI 14 PRO MAX", "14 PRO MAX", "HIGH"], ["UP BATERAI 6 PLUS", "6 PLUS", "LOW"], ["UP BATERAI 6G", "6G", "LOW"], ["UP BATERAI 6S", "6S", "LOW"], ["UP BATERAI 6S PLUS", "6S PLUS", "LOW"], ["UP BATERAI 7 PLUS", "7 PLUS", "LOW"], ["UP BATERAI 7G", "7G", "LOW"], ["UP BATERAI 8 PLUS", "8 PLUS", "LOW"], ["UP BATERAI 8G", "8G", "LOW"], ["UP BATERAI X", "X", "LOW"], ["UP BATERAI XR", "XR", "LOW"], ["UP BATERAI XS", "XS", "LOW"], ["UP BATERAI XS MAX", "XS MAX", "LOW"], ["FLASH", "ALL", "LOW"], ["FLEX POWER", "ALL", "HIGH"], ["FLEX MIC", "ALL", "HIGH"], ["CEK BONGKAR", "ALL", "LOW"], ["FLEX MICROPHONE", "ALL", "HIGH"], ["SPEAKER BAWAH", "ALL", "HIGH"], ["SPEAKER ATAS", "ALL", "MID"]];

const MASTER_MAP = {};
MASTER_KATEGORI.forEach(function (row) {
  MASTER_MAP[row[0].trim().toUpperCase()] = row[2];
});

function lookupKategori(name) {
  const key = String(name || '').trim().toUpperCase();
  return MASTER_MAP[key] || '';
}

function aggregateKategori(list) {
  const kats = (list || []).map(lookupKategori).filter(Boolean);
  if (!kats.length) return '';
  if (kats.includes('HIGH')) return 'HIGH';
  if (kats.includes('MID')) return 'MID';
  return 'LOW';
}

function kategoriBadge(kat) {
  if (!kat) return '<span class="badge kat-empty">-</span>';
  const cls = kat === 'HIGH' ? 'kat-high' : kat === 'MID' ? 'kat-mid' : 'kat-low';
  return '<span class="badge ' + cls + '">' + kat + '</span>';
}

function kategoriBadgesFor(list) {
  if (!list || !list.length) return kategoriBadge('');
  return list.map(name => kategoriBadge(lookupKategori(name))).join(' ');
}

function findSparepart(imei) {
  return sparepartInventory.find(s => s.imei === imei);
}

function sparepartLabel(imeis) {
  if (!imeis || !imeis.length) return 'Pilih sparepart...';
  return imeis.map(im => { const sp = findSparepart(im); return sp ? sp.nama + ' (' + sp.imei + ')' : im; }).join(', ');
}

function sparepartNamesText(imeis) {
  if (!imeis || !imeis.length) return '-';
  return imeis.map(im => { const sp = findSparepart(im); return sp ? sp.nama : im; }).join(', ');
}

function applySparepartUsage(unitId, unitLabel, newImeis, oldImeis) {
  (oldImeis || []).forEach(im => {
    if (!(newImeis || []).includes(im)) {
      const sp = findSparepart(im);
      if (sp && sp.usedByUnitId === unitId) {
        sp.status = 'tersedia';
        sp.usedByUnitId = null;
        sp.usedByLabel = '';
        if (window.dashboardBridge) {
          const skuId = sp.linkedSkuId || window.dashboardBridge.findSkuId(sp.nama, sp.kompatibel);
          window.dashboardBridge.adjustQty(skuId, 1);
        }
      }
    }
  });
  (newImeis || []).forEach(im => {
    const sp = findSparepart(im);
    if (sp) {
      const wasAlreadyUsed = sp.status === 'terpakai';
      sp.status = 'terpakai';
      sp.usedByUnitId = unitId;
      sp.usedByLabel = unitLabel;
      if (!wasAlreadyUsed && window.dashboardBridge) {
        const skuId = sp.linkedSkuId || window.dashboardBridge.findSkuId(sp.nama, sp.kompatibel);
        if (skuId) { sp.linkedSkuId = skuId; window.dashboardBridge.adjustQty(skuId, -1); }
      }
    }
  });
  saveSparepartDB();
  const modal = document.getElementById('svc_sparepartModalOverlay');
  if (modal && modal.classList.contains('open')) svcApp.renderSparepartTable();
}

function resyncSparepartUsage(unitList) {
  const usageMap = {};
  (unitList || []).forEach(u => {
    (u.sparepartImeis || []).forEach(im => { usageMap[im] = u; });
  });
  sparepartInventory.forEach(sp => {
    const u = usageMap[sp.imei];
    const wasUsed = sp.status === 'terpakai';
    if (u) {
      sp.status = 'terpakai';
      sp.usedByUnitId = u.id;
      sp.usedByLabel = u.id + ' - ' + fullModel(u);
      if (!wasUsed && window.dashboardBridge) {
        const skuId = sp.linkedSkuId || window.dashboardBridge.findSkuId(sp.nama, sp.kompatibel);
        if (skuId) { sp.linkedSkuId = skuId; window.dashboardBridge.adjustQty(skuId, -1); }
      }
    } else {
      sp.status = 'tersedia';
      sp.usedByUnitId = null;
      sp.usedByLabel = '';
      if (wasUsed && window.dashboardBridge) {
        const skuId = sp.linkedSkuId || window.dashboardBridge.findSkuId(sp.nama, sp.kompatibel);
        window.dashboardBridge.adjustQty(skuId, 1);
      }
    }
  });
  saveSparepartDB();
}




// Dulu localStorage, sekarang di-resync penuh ke REST API tiap kali dipanggil — svcApp
// menghitung status/usedByUnitId/linkedSkuId sendiri persis seperti sebelumnya (lihat
// applySparepartUsage/resyncSparepartUsage di bawah), kita cuma ganti titik simpannya.
function reportSaveFailure(err) {
  alert('⚠️ Gagal menyimpan perubahan ke database: ' + err.message + '\n\nCoba refresh halaman lalu ulangi — perubahan terakhir kemungkinan belum tersimpan.');
}
function putRows(url, rows) {
  return fetch(url, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows })
  }).then(res => {
    if(!res.ok) return res.json().catch(()=>({})).then(body => {
      throw new Error(body.error || ('Server menolak (status ' + res.status + ')'));
    });
  }).catch(reportSaveFailure);
}
function saveUnitsDB() {
  putRows('/api/service/units', units);
}
function saveSparepartDB() {
  putRows('/api/service/spareparts', sparepartInventory);
}

function computeNextIdNum(list) {
  let max = 0;
  (list || []).forEach(u => {
    const m = String(u.id || '').match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max + 1;
}

let units = [];
let sparepartInventory = [];

let nextIdNum = computeNextIdNum(units);
let editingId = null;
let editPerbaikanValues = [];
let editSparepartImeis = [];
let editSparepartImeisOriginal = [];

function fullModel(u) {
  return [u.series, u.capacity, u.color].filter(Boolean).join(' ');
}

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysLate(deadline) {
  const dt = new Date(deadline + 'T00:00:00');
  const now = new Date(todayISO() + 'T00:00:00');
  return Math.round((now - dt) / 86400000);
}

function isOverdueInternal(u) {
  return !!u.esteta && u.status !== 'done' && u.esteta < todayISO();
}

function isOverdueExternal(u) {
  return !!u.deadline && u.status !== 'done' && u.deadline < todayISO();
}

function overdueBadge(deadline) {
  const n = daysLate(deadline);
  return ' <span class="badge kat-high">Telat ' + n + ' hari</span>';
}

function findActiveDuplicateImei(imei, excludeId, list) {
  const key = String(imei || '').trim();
  if (!key) return null;
  return list.find(u => u.imei && String(u.imei).trim() === key && u.status !== 'done' && u.id !== excludeId) || null;
}

const STATUS_ORDER = { queue: 0, progress: 1, parts: 2, ready: 3, done: 4 };
const EXT_STATUS_ORDER = { sent: 0, process: 1, returned: 2, done: 3 };
const KAT_ORDER = { '': 0, LOW: 1, MID: 2, HIGH: 3 };

function sortRows(rows, key, dir, scope) {
  if (!key) return rows;
  const mul = dir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => {
    let va, vb;
    if (key === 'series') {
      va = fullModel(a).toLowerCase();
      vb = fullModel(b).toLowerCase();
    } else if (key === 'kategori') {
      va = KAT_ORDER[aggregateKategori(a.perbaikan)] || 0;
      vb = KAT_ORDER[aggregateKategori(b.perbaikan)] || 0;
    } else if (key === 'status') {
      const order = scope === 'ext' ? EXT_STATUS_ORDER : STATUS_ORDER;
      va = order[a.status] ?? 0;
      vb = order[b.status] ?? 0;
    } else if (key === 'biaya') {
      va = Number(a.biaya || 0);
      vb = Number(b.biaya || 0);
    } else {
      va = a[key] || '';
      vb = b[key] || '';
    }
    if (va < vb) return -1 * mul;
    if (va > vb) return 1 * mul;
    return 0;
  });
}

function updateSortIndicators(scope, sortState) {
  document.querySelectorAll('.sort-ind[data-scope="' + scope + '"]').forEach(el => {
    const k = el.getAttribute('data-key');
    el.textContent = sortState.key === k ? (sortState.dir === 'asc' ? ' ▲' : ' ▼') : '';
  });
}

let currentSort = { key: null, dir: 'asc' };
function sortBy(key) {
  if (currentSort.key === key) currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
  else { currentSort.key = key; currentSort.dir = 'asc'; }
  svcApp.render();
}

let extCurrentSort = { key: null, dir: 'asc' };
function extSortBy(key) {
  if (extCurrentSort.key === key) extCurrentSort.dir = extCurrentSort.dir === 'asc' ? 'desc' : 'asc';
  else { extCurrentSort.key = key; extCurrentSort.dir = 'asc'; }
  svcApp.extRender();
}

function renderStats() {
  const total = units.length;
  const queue = units.filter(u => u.status === 'queue').length;
  const progress = units.filter(u => u.status === 'progress').length;
  const parts = units.filter(u => u.status === 'parts').length;
  const done = units.filter(u => u.status === 'done').length;
  const high = units.filter(u => aggregateKategori(u.perbaikan) === 'HIGH').length;
  const late = units.filter(isOverdueInternal).length;

  const cards = [
    { label: 'Total unit', value: total },
    { label: 'Antrian', value: queue },
    { label: 'Sedang diperbaiki', value: progress },
    { label: 'Tunggu sparepart', value: parts },
    { label: 'Selesai', value: done },
    { label: 'Kategori HIGH', value: high },
    { label: 'Telat deadline', value: late }
  ];

  document.getElementById('svc_stats').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
    </div>
  `).join('');
}

function render() {
  renderStats();
  const search = document.getElementById('svc_search').value.toLowerCase();
  const filterStatus = document.getElementById('svc_filterStatus').value;
  const filterKategori = document.getElementById('svc_filterKategori').value;

  const filtered = units.filter(u => {
    const perbaikanText = (u.perbaikan || []).join(' ').toLowerCase();
    const sparepartText = sparepartNamesText(u.sparepartImeis).toLowerCase() + ' ' + (u.sparepartImeis || []).join(' ').toLowerCase();
    const matchSearch = !search ||
      fullModel(u).toLowerCase().includes(search) ||
      u.issue.toLowerCase().includes(search) ||
      perbaikanText.includes(search) ||
      (u.imei || '').toLowerCase().includes(search) ||
      sparepartText.includes(search) ||
      (u.keterangan || '').toLowerCase().includes(search) ||
      u.tech.toLowerCase().includes(search);
    const matchStatus = !filterStatus || u.status === filterStatus;
    const matchKategori = !filterKategori || (u.perbaikan || []).some(p => lookupKategori(p) === filterKategori);
    return matchSearch && matchStatus && matchKategori;
  });

  const sorted = sortRows(filtered, currentSort.key, currentSort.dir, 'int');

  const tbody = document.getElementById('svc_tbody');
  document.getElementById('svc_emptyMsg').style.display = sorted.length ? 'none' : 'block';

  tbody.innerHTML = sorted.map(u => {
    const list = u.perbaikan || [];
    const overdue = isOverdueInternal(u);
    return `
    <tr class="${overdue ? 'row-overdue' : ''}">
      <td>${fullModel(u)}</td>
      <td>${u.imei || '-'}</td>
      <td>${u.issue}</td>
      <td>${list.length ? list.join(', ') : '-'}</td>
      <td>${kategoriBadgesFor(list)}</td>
      <td>${sparepartNamesText(u.sparepartImeis)}</td>
      <td>${(u.sparepartImeis && u.sparepartImeis.length) ? u.sparepartImeis.join(', ') : '-'}</td>
      <td>${formatDate(u.datein)}</td>
      <td>${formatDate(u.tglkembali)}</td>
      <td>${formatDate(u.esteta)}${overdue ? overdueBadge(u.esteta) : ''}</td>
      <td><span class="badge ${u.status}">${statusLabel[u.status]}</span></td>
      <td>${u.tech}</td>
      <td>${u.keterangan || '-'}</td>
      <td class="row-actions">
        <button onclick="svcApp.editUnit('${u.id}')">Edit</button>
        <button class="del" onclick="svcApp.deleteUnit('${u.id}')">Hapus</button>
        ${u.imei && window.jumpToDataUnit ? `<button onclick="window.jumpToDataUnit('${u.imei}')" title="Lihat di Data Unit">🔗</button>` : ''}
      </td>
    </tr>
  `;
  }).join('');

  updateSortIndicators('int', currentSort);
}

function setEditPerbaikan(values) {
  editPerbaikanValues = values.slice();
  document.getElementById('svc_f_perbaikan_label').textContent = values.length ? values.join(', ') : 'Pilih perbaikan...';
  document.getElementById('svc_f_kat_preview').innerHTML = kategoriBadgesFor(values);
}

function editUnit(id) {
  const u = units.find(x => x.id === id);
  if (!u) return;
  editingId = id;
  document.getElementById('svc_modalTitle').textContent = 'Edit unit ' + id;
  document.getElementById('svc_f_series').value = u.series;
  document.getElementById('svc_f_capacity').value = u.capacity;
  document.getElementById('svc_f_color').value = u.color;
  document.getElementById('svc_f_imei').value = u.imei || '';
  document.getElementById('svc_f_issue').value = u.issue;
  document.getElementById('svc_f_status').value = u.status;
  document.getElementById('svc_f_tech').value = u.tech;
  document.getElementById('svc_f_keterangan').value = u.keterangan || '';
  document.getElementById('svc_f_datein').value = u.datein;
  document.getElementById('svc_f_esteta').value = u.esteta;
  document.getElementById('svc_f_tglkembali').value = u.tglkembali || '';
  setEditPerbaikan(u.perbaikan || []);
  editSparepartImeisOriginal = (u.sparepartImeis || []).slice();
  editSparepartImeis = editSparepartImeisOriginal.slice();
  document.getElementById('svc_f_sparepart_label').textContent = sparepartLabel(editSparepartImeis);
  document.getElementById('svc_modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('svc_modalOverlay').classList.remove('open');
}

function saveUnit() {
  const series = document.getElementById('svc_f_series').value.trim();
  const color = document.getElementById('svc_f_color').value.trim();
  if (!series || !color) {
    alert('Series dan warna iPhone wajib diisi.');
    return;
  }
  const data = {
    series,
    capacity: document.getElementById('svc_f_capacity').value,
    color,
    imei: document.getElementById('svc_f_imei').value.trim(),
    issue: document.getElementById('svc_f_issue').value.trim() || '-',
    perbaikan: editPerbaikanValues.slice(),
    sparepartImeis: editSparepartImeis.slice(),
    status: document.getElementById('svc_f_status').value,
    tech: document.getElementById('svc_f_tech').value.trim() || '-',
    keterangan: document.getElementById('svc_f_keterangan').value.trim(),
    datein: document.getElementById('svc_f_datein').value,
    esteta: document.getElementById('svc_f_esteta').value,
    tglkembali: document.getElementById('svc_f_tglkembali').value
  };

  if (data.imei) {
    const dup = findActiveDuplicateImei(data.imei, editingId, units);
    if (dup) {
      const proceed = confirm('IMEI ' + data.imei + ' sudah tercatat di unit aktif ' + dup.id + ' (' + fullModel(dup) + '). Tetap simpan?');
      if (!proceed) return;
    }
  }

  const idx = units.findIndex(u => u.id === editingId);
  if (idx > -1) {
    units[idx] = { ...units[idx], ...data };
    applySparepartUsage(editingId, editingId + ' - ' + fullModel(units[idx]), data.sparepartImeis, editSparepartImeisOriginal);
  }

  saveUnitsDB();
  svcApp.closeModal();
  svcApp.render();
}

function deleteUnit(id) {
  if (!confirm('Hapus unit ' + id + '?')) return;
  const u = units.find(x => x.id === id);
  if (u) applySparepartUsage(id, '', [], u.sparepartImeis || []);
  units = units.filter(u => u.id !== id);
  saveUnitsDB();
  svcApp.render();
}

function bulkRowTemplate() {
  const today = new Date().toISOString().slice(0, 10);
  return `
    <tr>
      <td><input type="text" class="r-series" placeholder="iPhone 13 Pro"></td>
      <td>
        <select class="r-capacity">
          <option value="64GB">64GB</option>
          <option value="128GB" selected>128GB</option>
          <option value="256GB">256GB</option>
          <option value="512GB">512GB</option>
          <option value="1TB">1TB</option>
        </select>
      </td>
      <td><input type="text" class="r-color" placeholder="Graphite"></td>
      <td><input type="text" class="r-imei" placeholder="356874118643095"></td>
      <td><input type="text" class="r-issue" placeholder="Layar retak"></td>
      <td><button type="button" class="btn secondary picker-btn" onclick="svcApp.openPicker({type:'bulk', rowEl:this.closest('tr')})"><span class="r-perbaikan-label">Pilih...</span></button></td>
      <td class="r-kat-cell">${kategoriBadge('')}</td>
      <td><button type="button" class="btn secondary picker-btn" onclick="svcApp.openSparepartPicker({type:'bulk', rowEl:this.closest('tr')})"><span class="r-sparepart-label">Pilih sparepart...</span></button></td>
      <td><input type="date" class="r-datein" value="${today}"></td>
      <td><input type="date" class="r-tglkembali"></td>
      <td><input type="date" class="r-esteta"></td>
      <td>
        <select class="r-status">
          <option value="queue" selected>Antrian</option>
          <option value="progress">Diperbaiki</option>
          <option value="parts">Tunggu sparepart</option>
          <option value="ready">Siap diambil</option>
          <option value="done">Selesai</option>
        </select>
      </td>
      <td><input type="text" class="r-tech" placeholder="-"></td>
      <td><input type="text" class="r-keterangan" placeholder="-"></td>
      <td><button class="del" onclick="this.closest('tr').remove()">Hapus</button></td>
    </tr>
  `;
}

function openAddModal() {
  document.getElementById('svc_bulkBody').innerHTML = '';
  svcApp.addBulkRow();
  document.getElementById('svc_addModalOverlay').classList.add('open');
}

function addBulkRow() {
  const tbody = document.getElementById('svc_bulkBody');
  tbody.insertAdjacentHTML('beforeend', bulkRowTemplate());
  tbody.lastElementChild._perbaikan = [];
  tbody.lastElementChild._sparepartImeis = [];
}

function closeAddModal() {
  document.getElementById('svc_addModalOverlay').classList.remove('open');
}

function saveBulk() {
  const rows = document.querySelectorAll('#svc_bulkBody tr');
  let added = 0;
  const duplicateNotices = [];
  rows.forEach(row => {
    const series = row.querySelector('.r-series').value.trim();
    const color = row.querySelector('.r-color').value.trim();
    if (!series || !color) return;
    const id = 'SVC-' + String(nextIdNum++).padStart(3, '0');
    const sparepartImeis = (row._sparepartImeis || []).slice();
    const imei = row.querySelector('.r-imei').value.trim();
    if (imei) {
      const dup = findActiveDuplicateImei(imei, null, units);
      if (dup) duplicateNotices.push(imei + ' (sudah ada di unit ' + dup.id + ')');
    }
    const newUnit = {
      id,
      series,
      capacity: row.querySelector('.r-capacity').value,
      color,
      imei,
      issue: row.querySelector('.r-issue').value.trim() || '-',
      perbaikan: (row._perbaikan || []).slice(),
      sparepartImeis,
      status: row.querySelector('.r-status').value,
      tech: row.querySelector('.r-tech').value.trim() || '-',
      keterangan: row.querySelector('.r-keterangan').value.trim(),
      datein: row.querySelector('.r-datein').value,
      esteta: row.querySelector('.r-esteta').value,
      tglkembali: row.querySelector('.r-tglkembali').value
    };
    units.push(newUnit);
    applySparepartUsage(id, id + ' - ' + fullModel(newUnit), sparepartImeis, []);
    added++;
  });

  if (!added) {
    alert('Isi minimal satu baris dengan series dan warna.');
    return;
  }

  saveUnitsDB();
  svcApp.closeAddModal();
  svcApp.render();

  if (duplicateNotices.length) {
    alert('Perhatian, IMEI berikut sudah tercatat di unit aktif lain:\n- ' + duplicateNotices.join('\n- '));
  }
}

// ---- Export / Import Excel ----
const EXCEL_HEADERS = ['ID', 'SERIES', 'KAPASITAS', 'WARNA', 'IMEI', 'KERUSAKAN',
  'NAMA PERBAIKAN', 'KATEGORI', 'SPAREPART DIGUNAKAN', 'IMEI SPAREPART',
  'TGL MASUK', 'TGL KEMBALI', 'DEADLINE', 'STATUS', 'TEKNISI', 'KETERANGAN'];

const STATUS_CODE_BY_LABEL = {};
Object.keys(statusLabel).forEach(code => {
  STATUS_CODE_BY_LABEL[statusLabel[code].toUpperCase()] = code;
});

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel belum siap dimuat, coba lagi sesaat lagi.');
    return;
  }
  const rows = [EXCEL_HEADERS];
  units.forEach(u => {
    rows.push([
      u.id,
      u.series,
      u.capacity,
      u.color,
      u.imei || '',
      u.issue || '',
      (u.perbaikan || []).join('; '),
      aggregateKategori(u.perbaikan),
      sparepartNamesText(u.sparepartImeis),
      (u.sparepartImeis || []).join('; '),
      u.datein || '',
      u.tglkembali || '',
      u.esteta || '',
      statusLabel[u.status] || u.status,
      u.tech || '',
      u.keterangan || ''
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = EXCEL_HEADERS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Unit Service');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'unit_service_iphone_' + stamp + '.xlsx');
}

function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel belum siap dimuat, coba lagi sesaat lagi.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (!rows.length) {
        alert('File kosong atau formatnya tidak dikenali.');
        return;
      }
      const header = rows[0].map(h => String(h || '').trim().toUpperCase());
      const colIndex = {};
      EXCEL_HEADERS.forEach(h => { colIndex[h] = header.indexOf(h); });

      let imported = 0;
      let maxNum = 0;
      const importedUnits = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.length) continue;
        const get = (h) => {
          const idx = colIndex[h];
          return idx > -1 && r[idx] !== undefined ? String(r[idx]).trim() : '';
        };
        const series = get('SERIES');
        const color = get('WARNA');
        if (!series && !color) continue;

        let id = get('ID');
        const m = id.match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        if (!id) {
          id = 'SVC-IMP-' + (i);
        }

        const perbaikanRaw = get('NAMA PERBAIKAN');
        const perbaikan = perbaikanRaw ? perbaikanRaw.split(/;\s*/).map(s => s.trim()).filter(Boolean) : [];

        const sparepartImeiRaw = get('IMEI SPAREPART');
        const sparepartImeis = sparepartImeiRaw ? sparepartImeiRaw.split(/;\s*/).map(s => s.trim()).filter(Boolean) : [];

        let statusVal = get('STATUS').toUpperCase();
        const statusCode = STATUS_CODE_BY_LABEL[statusVal] || (statusLabel[statusVal.toLowerCase()] ? statusVal.toLowerCase() : 'queue');

        importedUnits.push({
          id,
          series,
          capacity: get('KAPASITAS'),
          color,
          imei: get('IMEI'),
          issue: get('KERUSAKAN') || '-',
          perbaikan,
          sparepartImeis,
          status: statusCode,
          tech: get('TEKNISI') || '-',
          keterangan: get('KETERANGAN'),
          datein: get('TGL MASUK'),
          esteta: get('DEADLINE'),
          tglkembali: get('TGL KEMBALI')
        });
        imported++;
      }

      if (!imported) {
        alert('Tidak ada baris yang bisa diimpor. Pastikan file memakai format hasil Export Excel dari dashboard ini.');
        event.target.value = '';
        return;
      }

      units = importedUnits;
      nextIdNum = Math.max(maxNum + 1, units.length + 1);
      resyncSparepartUsage(units);
      saveUnitsDB();
      svcApp.render();
      alert(imported + ' unit berhasil diimpor. Kategori dan status sparepart otomatis dihitung ulang dari daftar standar.');
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

// ---- Servis eksternal (tab terpisah) ----

// (EXTERNAL_STORAGE_KEY dulu; sekarang lewat /api/service/external, lihat saveExternalDB)

const externalStatusLabel = {
  sent: 'Dikirim',
  process: 'Diproses eksternal',
  returned: 'Kembali dari eksternal',
  done: 'Selesai'
};
const EXTERNAL_STATUS_BADGE_CLASS = {
  sent: 'queue',
  process: 'progress',
  returned: 'ready',
  done: 'done'
};

function saveExternalDB() {
  putRows('/api/service/external', externalUnits);
}

let externalUnits = [];
let nextExtIdNum = computeNextIdNum(externalUnits);
let editingExtId = null;
let editExtPerbaikanValues = [];

// Dipakai oleh Data Unit (dashboard utama) untuk badge "Diservice" & tombol lompat balik —
// mengecek apakah sebuah IMEI sedang tercatat di database servis internal atau eksternal.
function findByImei(imei){
  if(!imei) return null;
  const key = String(imei).trim();
  const internal = units.find(u => u.imei && String(u.imei).trim() === key);
  if(internal) return { kind:'internal', status: internal.status, id: internal.id };
  const external = externalUnits.find(u => u.imei && String(u.imei).trim() === key);
  if(external) return { kind:'external', status: external.status, id: external.id };
  return null;
}

// Dipanggil dari dashboard utama saat user klik badge "Diservice" untuk lompat & auto-filter.
function jumpFromDashboard(imei){
  switchTab(imei && findByImei(imei) && findByImei(imei).kind === 'external' ? 'external' : 'internal');
  const info = findByImei(imei);
  const isExternal = info && info.kind === 'external';
  const searchEl = document.getElementById(isExternal ? 'svc_extSearch' : 'svc_search');
  searchEl.value = imei;
  if(isExternal) extRender(); else render();
  if(window.highlightRow) window.highlightRow(isExternal ? 'svc_extTbody' : 'svc_tbody', imei);
}

function switchTab(tab) {
  const isInternal = tab === 'internal';
  const internalEl = document.getElementById('svc_internalSection');
  const externalEl = document.getElementById('svc_externalSection');
  internalEl.style.display = isInternal ? '' : 'none';
  externalEl.style.display = isInternal ? 'none' : '';
  document.getElementById('svc_tabBtnInternal').classList.toggle('active', isInternal);
  document.getElementById('svc_tabBtnExternal').classList.toggle('active', !isInternal);
  if (window.playTabAnim) window.playTabAnim(isInternal ? internalEl : externalEl);
  if (!isInternal) svcApp.extRender();
}

function extRenderStats() {
  const total = externalUnits.length;
  const sent = externalUnits.filter(u => u.status === 'sent').length;
  const process = externalUnits.filter(u => u.status === 'process').length;
  const returned = externalUnits.filter(u => u.status === 'returned').length;
  const done = externalUnits.filter(u => u.status === 'done').length;
  const totalBiaya = externalUnits.reduce((s, u) => s + Number(u.biaya || 0), 0);
  const late = externalUnits.filter(isOverdueExternal).length;

  const cards = [
    { label: 'Total unit eksternal', value: total },
    { label: 'Dikirim', value: sent },
    { label: 'Diproses eksternal', value: process },
    { label: 'Kembali dari eksternal', value: returned },
    { label: 'Selesai', value: done },
    { label: 'Total biaya', value: 'Rp ' + totalBiaya.toLocaleString('id-ID') },
    { label: 'Telat deadline', value: late }
  ];

  document.getElementById('svc_extStats').innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
    </div>
  `).join('');
}

function extRender() {
  extRenderStats();
  const search = document.getElementById('svc_extSearch').value.toLowerCase();
  const filterStatus = document.getElementById('svc_extFilterStatus').value;
  const filterKategori = document.getElementById('svc_extFilterKategori').value;

  const filtered = externalUnits.filter(u => {
    const perbaikanText = (u.perbaikan || []).join(' ').toLowerCase();
    const matchSearch = !search ||
      fullModel(u).toLowerCase().includes(search) ||
      (u.issue || '').toLowerCase().includes(search) ||
      perbaikanText.includes(search) ||
      (u.imei || '').toLowerCase().includes(search) ||
      (u.tujuan || '').toLowerCase().includes(search) ||
      (u.pic || '').toLowerCase().includes(search);
    const matchStatus = !filterStatus || u.status === filterStatus;
    const matchKategori = !filterKategori || (u.perbaikan || []).some(p => lookupKategori(p) === filterKategori);
    return matchSearch && matchStatus && matchKategori;
  });

  const sorted = sortRows(filtered, extCurrentSort.key, extCurrentSort.dir, 'ext');

  const tbody = document.getElementById('svc_extTbody');
  document.getElementById('svc_extEmptyMsg').style.display = sorted.length ? 'none' : 'block';

  tbody.innerHTML = sorted.map(u => {
    const list = u.perbaikan || [];
    const badgeClass = EXTERNAL_STATUS_BADGE_CLASS[u.status] || 'queue';
    const overdue = isOverdueExternal(u);
    return `
    <tr class="${overdue ? 'row-overdue' : ''}">
      <td>${fullModel(u)}</td>
      <td>${u.imei || '-'}</td>
      <td>${u.issue || '-'}</td>
      <td>${list.length ? list.join(', ') : '-'}</td>
      <td>${kategoriBadgesFor(list)}</td>
      <td>${u.tujuan || '-'}</td>
      <td>${formatDate(u.tglkeluar)}</td>
      <td>${formatDate(u.tglkembali)}</td>
      <td>${formatDate(u.deadline)}${overdue ? overdueBadge(u.deadline) : ''}</td>
      <td>${u.biaya ? 'Rp ' + Number(u.biaya).toLocaleString('id-ID') : '-'}</td>
      <td><span class="badge ${badgeClass}">${externalStatusLabel[u.status] || u.status}</span></td>
      <td>${u.catatan || '-'}</td>
      <td>${u.pic || '-'}</td>
      <td class="row-actions">
        <button onclick="svcApp.editExtUnit('${u.id}')">Edit</button>
        <button class="del" onclick="svcApp.deleteExtUnit('${u.id}')">Hapus</button>
        ${u.imei && window.jumpToDataUnit ? `<button onclick="window.jumpToDataUnit('${u.imei}')" title="Lihat di Data Unit">🔗</button>` : ''}
      </td>
    </tr>
  `;
  }).join('');

  updateSortIndicators('ext', extCurrentSort);
}

function setExtEditPerbaikan(values) {
  editExtPerbaikanValues = values.slice();
  document.getElementById('svc_fx_perbaikan_label').textContent = values.length ? values.join(', ') : 'Pilih perbaikan...';
  document.getElementById('svc_fx_kat_preview').innerHTML = kategoriBadgesFor(values);
}

function editExtUnit(id) {
  const u = externalUnits.find(x => x.id === id);
  if (!u) return;
  editingExtId = id;
  document.getElementById('svc_extModalTitle').textContent = 'Edit unit eksternal ' + id;
  document.getElementById('svc_fx_series').value = u.series;
  document.getElementById('svc_fx_capacity').value = u.capacity;
  document.getElementById('svc_fx_color').value = u.color;
  document.getElementById('svc_fx_imei').value = u.imei || '';
  document.getElementById('svc_fx_issue').value = u.issue || '';
  document.getElementById('svc_fx_tujuan').value = u.tujuan || '';
  document.getElementById('svc_fx_tglkeluar').value = u.tglkeluar || '';
  document.getElementById('svc_fx_tglkembali').value = u.tglkembali || '';
  document.getElementById('svc_fx_deadline').value = u.deadline || '';
  document.getElementById('svc_fx_biaya').value = u.biaya || '';
  document.getElementById('svc_fx_status').value = u.status;
  document.getElementById('svc_fx_catatan').value = u.catatan || '';
  document.getElementById('svc_fx_pic').value = u.pic || '';
  setExtEditPerbaikan(u.perbaikan || []);
  document.getElementById('svc_extModalOverlay').classList.add('open');
}

function closeExtModal() {
  document.getElementById('svc_extModalOverlay').classList.remove('open');
}

function saveExtUnit() {
  const series = document.getElementById('svc_fx_series').value.trim();
  const color = document.getElementById('svc_fx_color').value.trim();
  if (!series || !color) {
    alert('Series dan warna iPhone wajib diisi.');
    return;
  }
  const data = {
    series,
    capacity: document.getElementById('svc_fx_capacity').value,
    color,
    imei: document.getElementById('svc_fx_imei').value.trim(),
    issue: document.getElementById('svc_fx_issue').value.trim() || '-',
    perbaikan: editExtPerbaikanValues.slice(),
    tujuan: document.getElementById('svc_fx_tujuan').value.trim(),
    tglkeluar: document.getElementById('svc_fx_tglkeluar').value,
    tglkembali: document.getElementById('svc_fx_tglkembali').value,
    deadline: document.getElementById('svc_fx_deadline').value,
    biaya: Number(document.getElementById('svc_fx_biaya').value) || 0,
    status: document.getElementById('svc_fx_status').value,
    catatan: document.getElementById('svc_fx_catatan').value.trim(),
    pic: document.getElementById('svc_fx_pic').value.trim() || '-'
  };

  if (data.imei) {
    const dup = findActiveDuplicateImei(data.imei, editingExtId, externalUnits);
    if (dup) {
      const proceed = confirm('IMEI ' + data.imei + ' sudah tercatat di unit eksternal aktif ' + dup.id + ' (' + fullModel(dup) + '). Tetap simpan?');
      if (!proceed) return;
    }
  }

  const idx = externalUnits.findIndex(u => u.id === editingExtId);
  if (idx > -1) externalUnits[idx] = { ...externalUnits[idx], ...data };

  saveExternalDB();
  svcApp.closeExtModal();
  svcApp.extRender();
}

function deleteExtUnit(id) {
  if (!confirm('Hapus unit eksternal ' + id + '?')) return;
  externalUnits = externalUnits.filter(u => u.id !== id);
  saveExternalDB();
  svcApp.extRender();
}

function extBulkRowTemplate() {
  const today = new Date().toISOString().slice(0, 10);
  return `
    <tr>
      <td><input type="text" class="r-series" placeholder="iPhone 13 Pro"></td>
      <td>
        <select class="r-capacity">
          <option value="64GB">64GB</option>
          <option value="128GB" selected>128GB</option>
          <option value="256GB">256GB</option>
          <option value="512GB">512GB</option>
          <option value="1TB">1TB</option>
        </select>
      </td>
      <td><input type="text" class="r-color" placeholder="Graphite"></td>
      <td><input type="text" class="r-imei" placeholder="356874118643095"></td>
      <td><input type="text" class="r-issue" placeholder="Layar retak"></td>
      <td><button type="button" class="btn secondary picker-btn" onclick="svcApp.openPicker({type:'ext-bulk', rowEl:this.closest('tr')})"><span class="r-perbaikan-label">Pilih...</span></button></td>
      <td class="r-kat-cell">${kategoriBadge('')}</td>
      <td><input type="text" class="r-tujuan" placeholder="Servis Center Jakal"></td>
      <td><input type="date" class="r-tglkeluar" value="${today}"></td>
      <td><input type="date" class="r-tglkembali"></td>
      <td><input type="date" class="r-deadline"></td>
      <td><input type="number" class="r-biaya" placeholder="0"></td>
      <td>
        <select class="r-status">
          <option value="sent" selected>Dikirim</option>
          <option value="process">Diproses eksternal</option>
          <option value="returned">Kembali dari eksternal</option>
          <option value="done">Selesai</option>
        </select>
      </td>
      <td><input type="text" class="r-catatan" placeholder="-"></td>
      <td><input type="text" class="r-pic" placeholder="-"></td>
      <td><button class="del" onclick="this.closest('tr').remove()">Hapus</button></td>
    </tr>
  `;
}

function openExtAddModal() {
  document.getElementById('svc_extBulkBody').innerHTML = '';
  svcApp.addExtBulkRow();
  document.getElementById('svc_extAddModalOverlay').classList.add('open');
}

function addExtBulkRow() {
  const tbody = document.getElementById('svc_extBulkBody');
  tbody.insertAdjacentHTML('beforeend', extBulkRowTemplate());
  tbody.lastElementChild._perbaikan = [];
}

function closeExtAddModal() {
  document.getElementById('svc_extAddModalOverlay').classList.remove('open');
}

function saveExtBulk() {
  const rows = document.querySelectorAll('#svc_extBulkBody tr');
  let added = 0;
  const duplicateNotices = [];
  rows.forEach(row => {
    const series = row.querySelector('.r-series').value.trim();
    const color = row.querySelector('.r-color').value.trim();
    if (!series || !color) return;
    const imei = row.querySelector('.r-imei').value.trim();
    if (imei) {
      const dup = findActiveDuplicateImei(imei, null, externalUnits);
      if (dup) duplicateNotices.push(imei + ' (sudah ada di unit ' + dup.id + ')');
    }
    externalUnits.push({
      id: 'EXT-' + String(nextExtIdNum++).padStart(3, '0'),
      series,
      capacity: row.querySelector('.r-capacity').value,
      color,
      imei,
      issue: row.querySelector('.r-issue').value.trim() || '-',
      perbaikan: (row._perbaikan || []).slice(),
      tujuan: row.querySelector('.r-tujuan').value.trim(),
      tglkeluar: row.querySelector('.r-tglkeluar').value,
      tglkembali: row.querySelector('.r-tglkembali').value,
      deadline: row.querySelector('.r-deadline').value,
      biaya: Number(row.querySelector('.r-biaya').value) || 0,
      status: row.querySelector('.r-status').value,
      catatan: row.querySelector('.r-catatan').value.trim(),
      pic: row.querySelector('.r-pic').value.trim() || '-'
    });
    added++;
  });

  if (!added) {
    alert('Isi minimal satu baris dengan series dan warna.');
    return;
  }

  saveExternalDB();
  svcApp.closeExtAddModal();
  svcApp.extRender();

  if (duplicateNotices.length) {
    alert('Perhatian, IMEI berikut sudah tercatat di unit eksternal aktif lain:\n- ' + duplicateNotices.join('\n- '));
  }
}

const EXTERNAL_EXCEL_HEADERS = ['ID', 'SERIES', 'KAPASITAS', 'WARNA', 'IMEI', 'KERUSAKAN',
  'NAMA PERBAIKAN', 'KATEGORI', 'DIKIRIM KE', 'TGL KELUAR', 'TGL KEMBALI', 'DEADLINE',
  'BIAYA', 'STATUS', 'CATATAN', 'PIC'];

const EXTERNAL_STATUS_CODE_BY_LABEL = {};
Object.keys(externalStatusLabel).forEach(code => {
  EXTERNAL_STATUS_CODE_BY_LABEL[externalStatusLabel[code].toUpperCase()] = code;
});

function exportExtExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel belum siap dimuat, coba lagi sesaat lagi.');
    return;
  }
  const rows = [EXTERNAL_EXCEL_HEADERS];
  externalUnits.forEach(u => {
    rows.push([
      u.id,
      u.series,
      u.capacity,
      u.color,
      u.imei || '',
      u.issue || '',
      (u.perbaikan || []).join('; '),
      aggregateKategori(u.perbaikan),
      u.tujuan || '',
      u.tglkeluar || '',
      u.tglkembali || '',
      u.deadline || '',
      u.biaya || 0,
      externalStatusLabel[u.status] || u.status,
      u.catatan || '',
      u.pic || ''
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = EXTERNAL_EXCEL_HEADERS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Servis Eksternal');
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'servis_eksternal_iphone_' + stamp + '.xlsx');
}

function handleImportExtFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel belum siap dimuat, coba lagi sesaat lagi.');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (!rows.length) {
        alert('File kosong atau formatnya tidak dikenali.');
        return;
      }
      const header = rows[0].map(h => String(h || '').trim().toUpperCase());
      const colIndex = {};
      EXTERNAL_EXCEL_HEADERS.forEach(h => { colIndex[h] = header.indexOf(h); });

      let imported = 0;
      let maxNum = 0;
      const importedUnits = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r.length) continue;
        const get = (h) => {
          const idx = colIndex[h];
          return idx > -1 && r[idx] !== undefined ? String(r[idx]).trim() : '';
        };
        const series = get('SERIES');
        const color = get('WARNA');
        if (!series && !color) continue;

        let id = get('ID');
        const m = id.match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        if (!id) id = 'EXT-IMP-' + i;

        const perbaikanRaw = get('NAMA PERBAIKAN');
        const perbaikan = perbaikanRaw ? perbaikanRaw.split(/;\s*/).map(s => s.trim()).filter(Boolean) : [];

        const statusVal = get('STATUS').toUpperCase();
        const statusCode = EXTERNAL_STATUS_CODE_BY_LABEL[statusVal] ||
          (externalStatusLabel[statusVal.toLowerCase()] ? statusVal.toLowerCase() : 'sent');

        importedUnits.push({
          id,
          series,
          capacity: get('KAPASITAS'),
          color,
          imei: get('IMEI'),
          issue: get('KERUSAKAN') || '-',
          perbaikan,
          tujuan: get('DIKIRIM KE'),
          tglkeluar: get('TGL KELUAR'),
          tglkembali: get('TGL KEMBALI'),
          deadline: get('DEADLINE'),
          biaya: Number(get('BIAYA')) || 0,
          status: statusCode,
          catatan: get('CATATAN'),
          pic: get('PIC') || '-'
        });
        imported++;
      }

      if (!imported) {
        alert('Tidak ada baris yang bisa diimpor. Pastikan file memakai format hasil Export Excel dari dashboard ini.');
        event.target.value = '';
        return;
      }

      externalUnits = importedUnits;
      nextExtIdNum = Math.max(maxNum + 1, externalUnits.length + 1);
      saveExternalDB();
      svcApp.extRender();
      alert(imported + ' unit eksternal berhasil diimpor. Kategori otomatis dihitung ulang dari daftar standar.');
    } catch (err) {
      alert('Gagal membaca file Excel: ' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

// ---- Picker (multi-select) untuk nama perbaikan ----
let pickerTarget = null;
let pickerSelected = new Set();

function renderPickerList(filterText) {
  const list = document.getElementById('svc_pickerList');
  const f = (filterText || '').trim().toUpperCase();
  const items = f ? MASTER_KATEGORI.filter(r => r[0].toUpperCase().includes(f)) : MASTER_KATEGORI;
  const shown = items.slice(0, 200);
  list.innerHTML = shown.map(r => {
    const checked = pickerSelected.has(r[0]) ? 'checked' : '';
    const safe = r[0].replace(/"/g, '&quot;');
    return `<label class="picker-item">
      <input type="checkbox" value="${safe}" ${checked} onchange="svcApp.togglePickerItem(this)">
      <span class="name">${r[0]}</span>
      ${kategoriBadge(r[2])}
    </label>`;
  }).join('') || '<div style="padding:16px; text-align:center; color:var(--text-secondary); font-size:13px;">Tidak ditemukan.</div>';
  document.getElementById('svc_pickerCount').textContent =
    pickerSelected.size + ' dipilih' + (items.length > shown.length ? ' · menampilkan 200 dari ' + items.length + ' hasil, persempit pencarian untuk melihat lainnya' : '');
}

function togglePickerItem(cb) {
  if (cb.checked) pickerSelected.add(cb.value); else pickerSelected.delete(cb.value);
  document.getElementById('svc_pickerCount').textContent = pickerSelected.size + ' dipilih';
}

function filterPicker() {
  renderPickerList(document.getElementById('svc_pickerSearch').value);
}

function openPicker(target) {
  pickerTarget = target;
  let current = [];
  if (target.type === 'edit') current = editPerbaikanValues;
  else if (target.type === 'ext-edit') current = editExtPerbaikanValues;
  else if (target.rowEl) current = target.rowEl._perbaikan || [];
  pickerSelected = new Set(current);
  document.getElementById('svc_pickerSearch').value = '';
  renderPickerList('');
  document.getElementById('svc_pickerOverlay').classList.add('open');
}

function closePicker() {
  document.getElementById('svc_pickerOverlay').classList.remove('open');
  pickerTarget = null;
}

function confirmPicker() {
  const values = Array.from(pickerSelected);
  if (pickerTarget && pickerTarget.type === 'edit') {
    setEditPerbaikan(values);
  } else if (pickerTarget && pickerTarget.type === 'ext-edit') {
    setExtEditPerbaikan(values);
  } else if (pickerTarget && pickerTarget.rowEl) {
    const row = pickerTarget.rowEl;
    row._perbaikan = values;
    row.querySelector('.r-perbaikan-label').textContent = values.length ? values.join(', ') : 'Pilih...';
    row.querySelector('.r-kat-cell').innerHTML = kategoriBadgesFor(values);
  }
  svcApp.closePicker();
}

// ---- Picker (multi-select) untuk sparepart, berdasarkan IMEI ----
let sparepartPickerTarget = null;
let sparepartPickerSelected = new Set();

function availableSparepartsFor(currentImeis) {
  return sparepartInventory.filter(sp => sp.status === 'tersedia' || (currentImeis || []).includes(sp.imei));
}

function renderSparepartPickerList(filterText) {
  const list = document.getElementById('svc_sparepartPickerList');
  const f = (filterText || '').trim().toUpperCase();
  const current = (sparepartPickerTarget && sparepartPickerTarget.currentImeis) || [];
  let items = availableSparepartsFor(current);
  if (f) items = items.filter(sp => sp.imei.toUpperCase().includes(f) || sp.nama.toUpperCase().includes(f));
  list.innerHTML = items.length ? items.map(sp => {
    const checked = sparepartPickerSelected.has(sp.imei) ? 'checked' : '';
    const safeImei = sp.imei.replace(/"/g, '&quot;');
    return `<label class="picker-item">
      <input type="checkbox" value="${safeImei}" ${checked} onchange="svcApp.toggleSparepartPickerItem(this)">
      <span class="name">${sp.nama} <span style="color:var(--text-secondary); font-size:11px;">(${sp.imei}${sp.kompatibel ? ' &middot; ' + sp.kompatibel : ''})</span></span>
    </label>`;
  }).join('') : '<div style="padding:16px; text-align:center; color:var(--text-secondary); font-size:13px;">Tidak ada sparepart tersedia. Tambahkan dulu lewat "Kelola Sparepart".</div>';
  document.getElementById('svc_sparepartPickerCount').textContent = sparepartPickerSelected.size + ' dipilih';
}

function toggleSparepartPickerItem(cb) {
  if (cb.checked) sparepartPickerSelected.add(cb.value); else sparepartPickerSelected.delete(cb.value);
  document.getElementById('svc_sparepartPickerCount').textContent = sparepartPickerSelected.size + ' dipilih';
}

function filterSparepartPicker() {
  renderSparepartPickerList(document.getElementById('svc_sparepartPickerSearch').value);
}

function openSparepartPicker(target) {
  sparepartPickerTarget = target;
  let current = [];
  if (target.type === 'edit') current = editSparepartImeis;
  else if (target.type === 'bulk') current = target.rowEl._sparepartImeis || [];
  sparepartPickerTarget.currentImeis = current;
  sparepartPickerSelected = new Set(current);
  document.getElementById('svc_sparepartPickerSearch').value = '';
  renderSparepartPickerList('');
  document.getElementById('svc_sparepartPickerOverlay').classList.add('open');
}

function closeSparepartPicker() {
  document.getElementById('svc_sparepartPickerOverlay').classList.remove('open');
  sparepartPickerTarget = null;
}

function confirmSparepartPicker() {
  const values = Array.from(sparepartPickerSelected);
  if (sparepartPickerTarget && sparepartPickerTarget.type === 'edit') {
    editSparepartImeis = values;
    document.getElementById('svc_f_sparepart_label').textContent = sparepartLabel(values);
  } else if (sparepartPickerTarget && sparepartPickerTarget.type === 'bulk') {
    const row = sparepartPickerTarget.rowEl;
    row._sparepartImeis = values;
    row.querySelector('.r-sparepart-label').textContent = sparepartLabel(values);
  }
  svcApp.closeSparepartPicker();
}

// ---- Kelola database sparepart ----
function sparepartBulkRowTemplate() {
  const today = new Date().toISOString().slice(0, 10);
  return `
    <tr>
      <td><input type="text" class="sp-imei" placeholder="SP-000123"></td>
      <td><input type="text" class="sp-nama" placeholder="LCD 13 Pro OEM"></td>
      <td><input type="text" class="sp-kompatibel" placeholder="iPhone 13 Pro"></td>
      <td><input type="date" class="sp-tglmasuk" value="${today}"></td>
      <td><button class="del" onclick="this.closest('tr').remove()">Hapus</button></td>
    </tr>
  `;
}

function openSparepartModal() {
  document.getElementById('svc_sparepartBulkBody').innerHTML = '';
  svcApp.addSparepartBulkRow();
  svcApp.renderSparepartTable();
  document.getElementById('svc_sparepartModalOverlay').classList.add('open');
}

function addSparepartBulkRow() {
  document.getElementById('svc_sparepartBulkBody').insertAdjacentHTML('beforeend', sparepartBulkRowTemplate());
}

function closeSparepartModal() {
  document.getElementById('svc_sparepartModalOverlay').classList.remove('open');
}

function saveSparepartBulk() {
  const rows = document.querySelectorAll('#svc_sparepartBulkBody tr');
  let added = 0, skipped = 0;
  rows.forEach(row => {
    const imei = row.querySelector('.sp-imei').value.trim();
    const nama = row.querySelector('.sp-nama').value.trim();
    if (!imei || !nama) return;
    if (sparepartInventory.some(s => s.imei === imei)) { skipped++; return; }
    const kompatibel = row.querySelector('.sp-kompatibel').value.trim();
    let linkedSkuId = null;
    if (window.dashboardBridge) {
      linkedSkuId = window.dashboardBridge.findOrCreateSkuAndIncrement(nama, kompatibel);
    }
    sparepartInventory.push({
      imei,
      nama,
      kompatibel,
      tglMasuk: row.querySelector('.sp-tglmasuk').value,
      status: 'tersedia',
      usedByUnitId: null,
      usedByLabel: '',
      linkedSkuId
    });
    added++;
  });

  if (!added) {
    alert(skipped ? 'Semua IMEI di baris ini sudah ada di database (duplikat).' : 'Isi minimal satu baris dengan IMEI dan nama sparepart.');
    return;
  }

  saveSparepartDB();
  document.getElementById('svc_sparepartBulkBody').innerHTML = '';
  svcApp.addSparepartBulkRow();
  svcApp.renderSparepartTable();
  alert(added + ' sparepart baru ditambahkan ke database.' + (skipped ? ' (' + skipped + ' dilewati karena IMEI sudah ada)' : ''));
}

function renderSparepartTable() {
  const search = (document.getElementById('svc_sparepartSearch').value || '').toLowerCase();
  const filterStatus = document.getElementById('svc_sparepartFilterStatus').value;
  const filtered = sparepartInventory.filter(sp => {
    const matchSearch = !search ||
      sp.imei.toLowerCase().includes(search) ||
      sp.nama.toLowerCase().includes(search) ||
      (sp.kompatibel || '').toLowerCase().includes(search);
    const matchStatus = !filterStatus || sp.status === filterStatus;
    return matchSearch && matchStatus;
  });

  document.getElementById('svc_sparepartTableBody').innerHTML = filtered.map(sp => {
    const statusBadge = sp.status === 'terpakai'
      ? '<span class="badge kat-high">Terpakai' + (sp.usedByLabel ? ' &middot; ' + sp.usedByLabel : '') + '</span>'
      : '<span class="badge kat-low">Tersedia</span>';
    const actionBtn = sp.status === 'terpakai'
      ? `<button onclick="svcApp.releaseSparepart('${sp.imei}')">Lepas</button>`
      : `<button class="del" onclick="svcApp.deleteSparepart('${sp.imei}')">Hapus</button>`;
    return `<tr>
      <td>${sp.imei}</td>
      <td>${sp.nama}</td>
      <td>${sp.kompatibel || '-'}</td>
      <td>${formatDate(sp.tglMasuk)}</td>
      <td>${statusBadge}</td>
      <td class="row-actions">${actionBtn}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:20px;">Belum ada sparepart yang cocok.</td></tr>';
}

function deleteSparepart(imei) {
  const sp = findSparepart(imei);
  if (sp && sp.status === 'terpakai') {
    alert('Sparepart ini sedang terpakai di unit servis, lepas dulu sebelum dihapus.');
    return;
  }
  if (!confirm('Hapus sparepart ' + imei + ' dari database?')) return;
  if (sp && window.dashboardBridge) {
    const skuId = sp.linkedSkuId || window.dashboardBridge.findSkuId(sp.nama, sp.kompatibel);
    window.dashboardBridge.adjustQty(skuId, -1);
  }
  sparepartInventory = sparepartInventory.filter(s => s.imei !== imei);
  saveSparepartDB();
  svcApp.renderSparepartTable();
}

function releaseSparepart(imei) {
  if (!confirm('Lepas sparepart ' + imei + ' dari unit servis yang memakainya? (misalnya salah pilih atau servis dibatalkan)')) return;
  const sp = findSparepart(imei);
  if (sp) {
    sp.status = 'tersedia';
    sp.usedByUnitId = null;
    sp.usedByLabel = '';
    if (window.dashboardBridge) {
      const skuId = sp.linkedSkuId || window.dashboardBridge.findSkuId(sp.nama, sp.kompatibel);
      window.dashboardBridge.adjustQty(skuId, 1);
    }
  }
  saveSparepartDB();
  svcApp.renderSparepartTable();
}

function exportSparepartExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Modul Excel belum siap dimuat, coba lagi sesaat lagi.');
    return;
  }
  const headers = ['IMEI/SERIAL', 'NAMA SPAREPART', 'KOMPATIBEL', 'TGL MASUK', 'STATUS', 'DIPAKAI DI'];
  const rows = [headers];
  sparepartInventory.forEach(sp => {
    rows.push([sp.imei, sp.nama, sp.kompatibel || '', sp.tglMasuk || '', sp.status === 'terpakai' ? 'TERPAKAI' : 'TERSEDIA', sp.usedByLabel || '']);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sparepart');
  XLSX.writeFile(wb, 'database_sparepart_' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

document.getElementById('svc_today').textContent = new Date().toLocaleDateString('id-ID', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
});

async function bootstrapService(){
  try {
    const [u, sp, ext] = await Promise.all([
      fetch('/api/service/units').then(r => r.ok ? r.json() : []),
      fetch('/api/service/spareparts').then(r => r.ok ? r.json() : []),
      fetch('/api/service/external').then(r => r.ok ? r.json() : []),
    ]);
    units.length = 0; units.push(...u);
    sparepartInventory.length = 0; sparepartInventory.push(...sp);
    externalUnits.length = 0; externalUnits.push(...ext);
    nextIdNum = computeNextIdNum(units);
    nextExtIdNum = computeNextIdNum(externalUnits);
  } catch (e) { /* biarkan kosong kalau API belum siap */ }
  svcApp.render();
}
bootstrapService();

})();

