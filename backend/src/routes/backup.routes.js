const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { buildBackupObject, restoreFromBackup } = require('../models/backup.model');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const backup = await buildBackupObject();
  res.setHeader('Content-Disposition', `attachment; filename="backup-dashboard-iphone-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(backup);
}));

router.post('/restore', asyncHandler(async (req, res) => {
  const result = await restoreFromBackup(req.body);
  res.json(result);
}));

module.exports = router;
