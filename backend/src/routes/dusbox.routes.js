const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const model = require('../models/dusbox.model');
module.exports = makeCrudRouterWithImport(model, { notFoundMsg: 'Dusbox tidak ditemukan' });
