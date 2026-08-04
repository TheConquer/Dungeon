const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const model = require('../models/stockTransaksi.model');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await model.list());
}));

router.post('/', asyncHandler(async (req, res) => {
  const row = await model.create(req.body);
  res.status(201).json(row);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await model.remove(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
