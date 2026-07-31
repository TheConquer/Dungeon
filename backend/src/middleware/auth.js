// Auth sederhana: satu username+password bersama untuk seluruh tim (bukan akun per-orang),
// sesuai skala bisnis reseller kecil ini. Session disimpan di memory server (express-session
// default) — cukup untuk 1 instance Railway; kalau container restart/redeploy, semua yang
// login harus login ulang (trade-off yang wajar untuk aplikasi internal seukuran ini).

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  return res.status(401).json({ error: 'Belum login. Silakan login dulu.' });
}

function checkCredentials(username, password) {
  const validUser = process.env.APP_USERNAME;
  const validPass = process.env.APP_PASSWORD;
  if (!validUser || !validPass) {
    throw new Error('APP_USERNAME/APP_PASSWORD belum di-set di server (lihat backend/.env.example).');
  }
  return username === validUser && password === validPass;
}

module.exports = { requireAuth, checkCredentials };
