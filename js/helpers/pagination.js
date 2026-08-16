// ============================================================
// helpers/pagination.js
// PAGINATION GENERIK — dipakai semua tabel/list menu supaya data
// tidak dirender sekaligus banyak (performa + UI tetap ringan).
//
// Cara pakai (classic script — berbagi global scope):
//   1. Render halaman:  const pageRows = Pagination.slice(key, allRows);
//      lalu render pageRows saja (nomor urut global = (page-1)*PAGE_SIZE + i + 1).
//   2. Render kontrol:  Pagination.render(document.getElementById('...'), key, allRows.length, function(){ renderLagi(); });
//   3. Saat pencarian berubah:  Pagination.reset(key); lalu render ulang.
//      (Pagination.go dipanggil otomatis lewat onclick dari kontrol.)
// URUTAN LOAD di index.html: setelah helpers/data.js & helpers/ui.js.
// ============================================================

const Pagination = {
  // Jumlah baris per halaman
  PAGE_SIZE: 25,

  // state[key] = { page: n }
  state: {},
  // callbacks[key] = function(page) — dipanggil saat user pindah halaman
  callbacks: {},

  // Reset ke halaman 1 (dipakai saat pencarian berubah / data dimuat ulang)
  reset: function(key) {
    delete this.state[key];
  },

  page: function(key) {
    const s = this.state[key];
    return s && Number.isFinite(s.page) ? s.page : 1;
  },

  totalPages: function(total) {
    return Math.max(1, Math.ceil((total || 0) / this.PAGE_SIZE));
  },

  clampPage: function(key, total) {
    let p = this.page(key);
    const max = this.totalPages(total);
    if (p > max) {
      p = max;
      this.state[key] = { page: p };
    }
    return p;
  },

  // Potongan baris untuk halaman aktif (meng-clamp otomatis jika halaman melewati batas)
  slice: function(key, rows) {
    if (!Array.isArray(rows) || rows.length === 0) return rows || [];
    const p = this.clampPage(key, rows.length);
    const start = (p - 1) * this.PAGE_SIZE;
    return rows.slice(start, start + this.PAGE_SIZE);
  },

  // Render kontrol pagination ke dalam container (Bootstrap + Tailwind, konsisten dgn aplikasi).
  // Kontrol SELALU tampil (termasuk saat data hanya 1 halaman) supaya pengguna melihat
  // "Halaman 1" + tombol ‹ › — bukan hanya teks ringkasan.
  render: function(container, key, total, cb) {
    if (typeof cb === 'function') this.callbacks[key] = cb;
    if (!container) return;
    if (!total) {
      container.innerHTML = '';
      return;
    }
    const max = this.totalPages(total);
    const page = this.clampPage(key, total);
    const start = (page - 1) * this.PAGE_SIZE + 1;
    const end = Math.min(page * this.PAGE_SIZE, total);

    const item = (p, label, active, disabled) => {
      const cls = ['page-item'];
      if (active) cls.push('active');
      if (disabled) cls.push('disabled');
      const click = (disabled || active) ? '' : ` onclick="Pagination.go('${key}', ${p}, ${total})"`;
      return `<li class="${cls.join(' ')}"><a class="page-link" href="javascript:void(0)"${click}>${label}</a></li>`;
    };

    // Jendela nomor halaman (maksimal 5 tombol angka)
    const win = 2;
    let from = Math.max(1, page - win);
    let to = Math.min(max, page + win);
    if (page - win <= 1) to = Math.min(max, from + win * 2);
    if (page + win >= max) from = Math.max(1, to - win * 2);

    let nums = '';
    for (let p = from; p <= to; p++) nums += item(p, p, p === page, false);

    container.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-2 pt-2 pb-1 mt-1 border-top">
        <span class="text-[11px] text-gray-500 fw-semibold">Menampilkan ${start}–${end} dari ${total} data</span>
        <nav aria-label="Paginasi"><ul class="pagination pagination-sm mb-0">
          ${item(page - 1, '&laquo;', false, page <= 1)}
          ${nums}
          ${item(page + 1, '&raquo;', false, page >= max)}
        </ul></nav>
      </div>`;
  },

  // Dipanggil dari onclick kontrol pagination
  go: function(key, page, total) {
    const max = this.totalPages(total);
    let p = Math.min(Math.max(1, page), max);
    this.state[key] = { page: p };
    const cb = this.callbacks[key];
    if (typeof cb === 'function') cb(p);
  }
};
window.Pagination = Pagination;
