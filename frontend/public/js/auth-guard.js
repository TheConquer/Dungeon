// Dimuat SEBELUM dashboard.js/service.js/sticker.js. Menangkap setiap 401 dari API mana pun
// (artinya session login sudah habis/tidak valid) dan langsung arahkan ke halaman login,
// supaya tidak ada satupun fetch call di 3 script lain yang perlu tahu soal ini satu-satu.
(function () {
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args).then((res) => {
      if (res.status === 401 && !String(args[0]).includes('/api/auth/')) {
        window.location.href = '/login.html';
      }
      return res;
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnLogout');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try { await originalFetch('/api/auth/logout', { method: 'POST' }); } catch (e) {}
      window.location.href = '/login.html';
    });
  });
})();
