const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const model = require('../models/customer.model');
module.exports = makeCrudRouterWithImport(model, { notFoundMsg: 'Customer tidak ditemukan' });
