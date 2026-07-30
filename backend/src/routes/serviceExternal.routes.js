const express = require('express');
const { makeCrudRouter } = require('../utils/crudFactory');
const { asyncHandler } = require('../middleware/errorHandler');
const model = require('../models/serviceExternal.model');

const router = express.Router();

// Full resync (dipakai saveExternalDB() di frontend port)
router.put('/', asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  res.json(await model.bulkReplace(rows));
}));

router.use('/', makeCrudRouter(model, { notFoundMsg: 'Unit servis eksternal tidak ditemukan' }));

module.exports = router;
