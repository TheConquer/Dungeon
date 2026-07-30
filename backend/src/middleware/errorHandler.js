function notFound(req, res) {
  res.status(404).json({ error: `Route tidak ditemukan: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  console.error(err);
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Data dengan ID/kode unik tersebut sudah ada.' });
  }
  if (err.code === '23503') {
    return res.status(409).json({ error: 'Data ini masih dipakai/direferensikan data lain, atau referensinya tidak ditemukan.' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Nilai tidak valid untuk salah satu kolom (melanggar CHECK constraint).' });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Terjadi kesalahan pada server.' });
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { notFound, errorHandler, asyncHandler, HttpError };
