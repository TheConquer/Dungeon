const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireAuth } = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' })); // backup/restore bisa berupa JSON besar

app.set('trust proxy', 1); // Railway/Render ada di belakang reverse proxy

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret-ganti-di-produksi',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 hari
  },
}));

app.use('/api/auth', require('./routes/auth.routes'));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Semua /api/* selain /auth & /health wajib login dulu
app.use('/api', requireAuth);

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

// Frontend statis (satu Render/Railway service melayani API + frontend).
// index:false supaya kita bisa gate index.html di belakang login sendiri di bawah.
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');
app.use(express.static(FRONTEND_DIR, { index: false }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.session && req.session.authenticated) {
    return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
  res.redirect('/login.html');
});

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
