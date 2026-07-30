const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const model = require('../models/branchRequest.model');
module.exports = makeCrudRouterWithImport(model, { notFoundMsg: 'Permintaan unit tidak ditemukan' });
