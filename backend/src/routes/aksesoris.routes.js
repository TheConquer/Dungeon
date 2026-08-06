const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const model = require('../models/aksesoris.model');
module.exports = makeCrudRouterWithImport(model, { notFoundMsg: 'Aksesoris tidak ditemukan', modul: 'Aksesoris' });
