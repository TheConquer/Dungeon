const { makeCrudRouterWithImport } = require('../utils/crudFactory');
const model = require('../models/purchaseOrder.model');
module.exports = makeCrudRouterWithImport(model, { notFoundMsg: 'Purchase Order tidak ditemukan' });
