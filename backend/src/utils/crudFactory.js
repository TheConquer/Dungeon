const express = require('express');
const { asyncHandler, HttpError } = require('../middleware/errorHandler');

// Model contract: list(), getById(id), create(data), update(id, data), remove(id)
function makeCrudRouter(model, { idParam = 'id', notFoundMsg = 'Data tidak ditemukan' } = {}) {
  const router = express.Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await model.list(req.query));
  }));

  router.get(`/:${idParam}`, asyncHandler(async (req, res) => {
    const row = await model.getById(req.params[idParam]);
    if (!row) throw new HttpError(404, notFoundMsg);
    res.json(row);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const row = await model.create(req.body);
    res.status(201).json(row);
  }));

  router.put(`/:${idParam}`, asyncHandler(async (req, res) => {
    const row = await model.update(req.params[idParam], req.body);
    if (!row) throw new HttpError(404, notFoundMsg);
    res.json(row);
  }));

  router.delete(`/:${idParam}`, asyncHandler(async (req, res) => {
    await model.remove(req.params[idParam]);
    res.status(204).end();
  }));

  return router;
}

// Sama seperti makeCrudRouter, plus POST /import untuk model yang punya bulkReplace(rows).
function makeCrudRouterWithImport(model, opts = {}) {
  const router = makeCrudRouter(model, opts);
  router.post('/import', asyncHandler(async (req, res) => {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    res.json(await model.bulkReplace(rows));
  }));
  return router;
}

module.exports = { makeCrudRouter, makeCrudRouterWithImport };
