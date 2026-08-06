const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const model = require('../models/returKlaim.model');
module.exports = makeCrudRouterWithImport(model, { notFoundMsg: 'Data retur/klaim tidak ditemukan', modul: 'Retur & Klaim' });
