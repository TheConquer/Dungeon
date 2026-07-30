const path = require('path');
const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' })); // backup/restore bisa berupa JSON besar

app.use('/api/units', require('./routes/units.routes'));
app.use('/api/dusbox', require('./routes/dusbox.routes'));
app.use('/api/aksesoris', require('./routes/aksesoris.routes'));
app.use('/api/sparepart', require('./routes/sparepart.routes'));
app.use('/api/retur-klaim', require('./routes/returKlaim.routes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/branch-requests', require('./routes/branchRequests.routes'));
app.use('/api/masters', require('./routes/masters.routes'));

app.use('/api/service/units', require('./routes/serviceUnits.routes'));
app.use('/api/service/spareparts', require('./routes/serviceSpareparts.routes'));
app.use('/api/service/external', require('./routes/serviceExternal.routes'));

app.use('/api/stickers', require('./routes/stickers.routes'));
app.use('/api/backup', require('./routes/backup.routes'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Frontend statis (satu Render Web Service melayani API + frontend)
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');
app.use(express.static(FRONTEND_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
