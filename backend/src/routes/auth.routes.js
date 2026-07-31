const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkCredentials } = require('../middleware/auth');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi.' });
  }
  if (!checkCredentials(username, password)) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }
  req.session.authenticated = true;
  req.session.username = username;
  res.json({ ok: true, username });
}));

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/status', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated), username: req.session?.username || null });
});

module.exports = router;
