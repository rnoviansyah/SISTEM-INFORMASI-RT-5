// ============================================================
// table_renderer.js
// TABLE RENDERER GENERIK — satu mesin render tabel + modal detail
// untuk semua menu yang sebelumnya punya renderXXXCustom duplikat
// (kelahiran, kematian, pindah_masuk, pindah_keluar, pengaduan,
//  sumbangan, surat pengantar).
//
// Setiap menu cukup mendeklarasikan KONFIGURASI (judul, ikon, kolom,
// tombol aksi per peran, dll.) — tidak perlu menulis ulang render,
// filter, dan modal detail yang sama. Classic script — berbagi global
// scope. URUTAN LOAD di index.html: setelah table.js (dipakai dari
// renderTable/filterTable), sebelum modul menu.
// ============================================================

const TableRenderer = {
  _state: { menu: '', rows: [], headers: [] },
  _modalInjected: false,
  // Mode pagination server-side (patch v8): baris di _state.rows = SATU halaman
  _serverMode: false,
  _serverTotal: 0,
  _serverSearch: '',
  _serverSearchTimer: null,

  // ----------------------------------------------------------
  // KONFIGURASI PER MENU
  // ----------------------------------------------------------
  configs: {
    'Kelahiran': {
      title: 'Data Kelahiran RT 5',
      icon: 'bi-gender-ambiguous',
      addButton: { label: '+ Tambah Kelahiran Baru', role: 'RT' },
      columns: null, // semua kolom
      search: 'id+nama',
      emptyText: 'Tidak ada data kelahiran yang cocok.',
      noDataText: 'Belum ada data kelahiran.',
      detail: { title: 'Rincian Data Kelahiran', photoLabel: 'Lampiran Foto / Bukti:', hideFields: ['no'], photoIcon: 'bi-image' },
      detailActions: function(role, id, row, headers) {
        if (role === 'RT') return `<button onclick="TableRenderer.tutupDetail(); bukaModalEdit('${escHtmlAttr(id)}');" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
        return '';
      }
    },
    'Kematian': {
      title: 'Data Kematian RT 5',
      icon: 'bi-heartbreak-fill',
      addButton: { label: '+ Tambah Kematian Baru', role: 'RT' },
      columns: null,
      search: 'id+nama',
      emptyText: 'Tidak ada data kematian yang cocok.',
      noDataText: 'Belum ada data kematian.',
      detail: { title: 'Rincian Data Kematian', photoLabel: 'Lampiran Foto / Bukti:', hideFields: ['no'], photoIcon: 'bi-image' },
      detailActions: function(role, id, row, headers) {
        if (role === 'RT') return `<button onclick="TableRenderer.tutupDetail(); bukaModalEdit('${escHtmlAttr(id)}');" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
        return '';
      }
    },
    'PindahMasuk': {
      title: 'Data Pindah Masuk RT 5',
      icon: 'bi-box-arrow-in-right',
      addButton: { label: '+ Tambah Pindah Masuk Baru', role: 'RT' },
      columns: null,
      search: 'id+nama',
      emptyText: 'Tidak ada data pindah masuk yang cocok.',
      noDataText: 'Belum ada data pindah masuk.',
      detail: { title: 'Rincian Pindah Masuk', photoLabel: 'Lampiran Foto / Bukti:', hideFields: ['no'], photoIcon: 'bi-image' },
      detailActions: function(role, id, row, headers) {
        if (role === 'RT') return `<button onclick="TableRenderer.tutupDetail(); bukaModalEdit('${escHtmlAttr(id)}');" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
        return '';
      }
    },
    'PindahKeluar': {
      title: 'Data Pindah Keluar RT 5',
      icon: 'bi-box-arrow-left',
      addButton: { label: '+ Tambah Pindah Keluar Baru', role: 'RT' },
      columns: null,
      search: 'id+nama',
      emptyText: 'Tidak ada data pindah keluar yang cocok.',
      noDataText: 'Belum ada data pindah keluar.',
      detail: { title: 'Rincian Pindah Keluar', photoLabel: 'Lampiran Foto / Bukti:', hideFields: ['no'], photoIcon: 'bi-image' },
      detailActions: function(role, id, row, headers) {
        if (role === 'RT') return `<button onclick="TableRenderer.tutupDetail(); bukaModalEdit('${escHtmlAttr(id)}');" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Edit Data</button>`;
        return '';
      }
    },
    'Pengaduan': {
      title: 'Daftar Pengaduan Warga',
      icon: 'bi-chat-square-text-fill',
      addButton: { label: '+ Buat Pengaduan Baru', role: 'Warga' },
      columns: ['id', 'tanggal', 'nama', 'jenis_aduan', 'status'],
      search: 'all',
      emptyText: 'Tidak ada data aduan.',
      noDataText: 'Belum ada data aduan.',
      statusBadge: { selesaiWords: ['selesai'] },
      detail: { title: 'Rincian Pengaduan', photoLabel: 'Bukti Lampiran Foto Pengaduan:', hideFields: ['id', 'no'], photoIcon: 'bi-image' },
      actionButtons: function(role, id) {
        if (role === 'RT') return `<button onclick="event.stopPropagation(); bukaModalEdit('${escHtmlAttr(id)}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`;
        return `<button onclick="event.stopPropagation(); waKirimLaporan('aduan', '${escHtmlAttr(id)}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button>`;
      },
      detailActions: function(role, id, row, headers) {
        if (role === 'RT') {
          let noHp = getRowCol(row, headers, ['hp', 'wa', 'telp', 'nomor']);
          return `
            <button onclick="bukaModalEdit('${escHtmlAttr(id)}'); TableRenderer.tutupDetail();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2">Edit / Ubah Status</button>
            <button onclick="waKirimLaporanKeWarga('${escHtmlAttr(id)}', '${escHtmlAttr(noHp)}'); TableRenderer.tutupDetail();" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim Laporan (WA)</button>`;
        }
        return `<button onclick="waKirimLaporan('aduan', '${escHtmlAttr(id)}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim via WhatsApp</button>`;
      }
    },
    'Sumbangan': {
      title: 'Daftar Sumbangan',
      icon: 'bi-gift-fill',
      addButton: { label: '+ Buat Sumbangan Baru', role: 'Warga' },
      columns: ['id', 'tanggal', 'nama', 'status'],
      search: 'all',
      emptyText: 'Tidak ada data sumbangan.',
      noDataText: 'Belum ada data sumbangan.',
      statusBadge: { selesaiWords: ['diterima', 'selesai', 'lunas', 'acc', 'terverifikasi'] },
      detail: { title: 'Rincian Sumbangan', photoLabel: 'Bukti Foto Transfer Sumbangan:', hideFields: ['nik', 'id', 'no'], photoIcon: 'bi-receipt' },
      actionButtons: function(role, id) {
        if (role === 'RT') return `<button onclick="event.stopPropagation(); bukaModalEdit('${escHtmlAttr(id)}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`;
        return `<button onclick="event.stopPropagation(); waVerifikasiSumbangan('${escHtmlAttr(id)}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button>`;
      },
      detailActions: function(role, id, row, headers) {
        if (role === 'RT') {
          return `
            <div class="grid grid-cols-2 gap-2">
              <button onclick="verifikasiSumbanganRT('${escHtmlAttr(id)}', 'Diterima')" class="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1">
                <i class="bi bi-check-circle-fill"></i> Terima
              </button>
              <button onclick="bukaModalEdit('${escHtmlAttr(id)}'); TableRenderer.tutupDetail();" class="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">
                Edit Data
              </button>
            </div>`;
        }
        return `<button onclick="waVerifikasiSumbangan('${escHtmlAttr(id)}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Verifikasi via WhatsApp</button>`;
      }
    },
    'SuratPengantar': {
      title: 'Daftar Surat Pengantar',
      icon: 'bi-file-earmark-text-fill',
      addButton: { label: '+ Buat Surat Baru', role: 'Warga' },
      columns: ['id', 'tanggal', 'nama', 'status'],
      search: 'all',
      emptyText: 'Tidak ada data surat pengantar.',
      noDataText: 'Belum ada data surat pengantar.',
      statusBadge: { selesaiWords: ['selesai', 'diterima'] },
      detail: { title: 'Rincian Surat Pengantar', photoLabel: 'Bukti Lampiran Foto Surat:', hideFields: ['id', 'no'], photoIcon: 'bi-file-image' },
      // Nilai keterangan surat bisa berisi JSON / "Jenis|{...}" -> format khusus
      formatDetailValue: function(headerLower, val) {
        let valStr = String(val || '-');
        if (valStr.includes('|')) {
          let parts = valStr.split('|');
          let mainText = parts[0];
          let jsonPart = parts.slice(1).join('|');
          try {
            let parsed = JSON.parse(jsonPart);
            return `<b>${escHtml(mainText)}</b>` + Object.entries(parsed).map(([k, v]) => `<div class="mt-0.5 text-[11px]"><span class="text-gray-500 font-bold">${escHtml(k.replace(/_/g, ' ').toUpperCase())}:</span> ${escHtml(String(v))}</div>`).join('');
          } catch(e) {
            return escHtml(mainText);
          }
        } else if (valStr.trim().startsWith('{') && valStr.trim().endsWith('}')) {
          try {
            let parsed = JSON.parse(valStr);
            return Object.entries(parsed).map(([k, v]) => `<div class="mt-0.5 text-[11px]"><span class="text-gray-500 font-bold">${escHtml(k.replace(/_/g, ' ').toUpperCase())}:</span> ${escHtml(String(v))}</div>`).join('');
          } catch(e) {}
        }
        return escHtml(valStr);
      },
      actionButtons: function(role, id) {
        let cetak = `<button onclick="event.stopPropagation(); cetakPDFSuratPengantar('${escHtmlAttr(id)}')" class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-[11px] font-bold border border-indigo-200" title="Cetak PDF"><i class="bi bi-printer"></i></button>`;
        if (role === 'RT') {
          return `<div class="flex gap-1 justify-center">${cetak}<button onclick="event.stopPropagation(); bukaModalEdit('${escHtmlAttr(id)}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button></div>`;
        }
        return `<div class="flex gap-1 justify-center">${cetak}<button onclick="event.stopPropagation(); waKirimLaporan('surat', '${escHtmlAttr(id)}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button></div>`;
      },
      detailActions: function(role, id, row, headers) {
        let cetak = `<button onclick="cetakPDFSuratPengantar('${escHtmlAttr(id)}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2"><i class="bi bi-printer-fill me-1"></i> Cetak PDF Surat</button>`;
        if (role === 'RT') {
          let noHp = getRowCol(row, headers, ['hp', 'wa', 'telp', 'nomor']);
          return `${cetak}
            <button onclick="bukaModalEdit('${escHtmlAttr(id)}'); TableRenderer.tutupDetail();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2">Edit / Ubah Status</button>
            <button onclick="waKirimLaporanKeWarga('${escHtmlAttr(id)}', '${escHtmlAttr(noHp)}'); TableRenderer.tutupDetail();" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim Laporan (WA)</button>`;
        }
        return `${cetak}<button onclick="waKirimLaporan('surat', '${escHtmlAttr(id)}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim via WhatsApp</button>`;
      }
    }
  },

  // ----------------------------------------------------------
  // API PUBLIK
  // ----------------------------------------------------------
  render: function(menu, data, opts) {
    let cfg = this.configs[menu];
    if (!cfg) return false;
    this._state.menu = menu;
    this._state.rows = (data && data.rows) || [];
    this._state.headers = ((data && data.headers) || []).map(h => String(h || '').trim());
    this._state.search = '';
    this._serverMode = !!(opts && opts.server);
    this._serverTotal = (data && data.total) || this._state.rows.length;
    this._serverSearch = (opts && opts.search) || '';
    // Mode klien: menu baru dimuat -> mulai dari halaman 1.
    // Mode server: halaman dipertahankan (Pagination.go yang memindahkan halaman).
    if (!this._serverMode && typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset(menu);
    this._ensureModal();

    let role = session && session.role;
    let addBtnHtml = '';
    if (cfg.addButton) {
      let showAdd = (cfg.addButton.role === 'all') || (cfg.addButton.role === role);
      if (showAdd) {
        addBtnHtml = `<button onclick="bukaModalForm()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">${cfg.addButton.label}</button>`;
      }
    }

    let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base text-gray-800"><i class="bi ${cfg.icon} me-2 text-primary"></i>${cfg.title}</h2>
        ${addBtnHtml}
      </div>
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                ${this._headerCells(cfg).map(h => `<th class="p-3">${h}</th>`).join('')}
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="table-renderer-body"></tbody>
          </table>
        </div>
        <div id="table-renderer-pagination" class="px-3 py-1"></div>
      </div>
    </div>`;

    document.getElementById('main-content').innerHTML = html;
    this.filter(menu);
    let searchInp = document.getElementById('searchInput');
    if (searchInp) {
      searchInp.onkeyup = function() { TableRenderer.filter(menu); };
    }
    return true;
  },

  filter: function(menu) {
    let cfg = this.configs[menu];
    let tbody = document.getElementById('table-renderer-body');
    if (!cfg || !tbody) return;
    // Mode server-side: baris sudah 1 halaman dari server, pencarian dikirim ke server
    if (this._serverMode) { this._serverFilter(menu); return; }
    let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
    let headers = this._state.headers.map(h => h.toLowerCase().trim());
    let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;

    // Pencarian berubah -> kembali ke halaman 1
    if (typeof Pagination !== 'undefined' && this._state.search !== searchVal) {
      this._state.search = searchVal;
      Pagination.reset(menu);
    }

    let visibleCols = this._visibleColumns(cfg);
    let filtered = this._state.rows.filter(row => {
      if (!searchVal) return true;
      if (cfg.search === 'id+nama') {
        let namaIdx = headers.findIndex(h => h.includes('nama'));
        let rowId = String((row[idIdx] || '')).toLowerCase();
        let namaText = String((namaIdx > -1 && row[namaIdx]) ? row[namaIdx] : '').toLowerCase();
        return rowId.includes(searchVal) || namaText.includes(searchVal);
      }
      return row.some(val => String(val || '').toLowerCase().includes(searchVal));
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${visibleCols.length + 2}" class="text-center p-4 text-gray-400">${this._state.rows.length === 0 ? (cfg.noDataText || cfg.emptyText) : cfg.emptyText}</td></tr>`;
      if (typeof Pagination !== 'undefined' && Pagination.render) {
        Pagination.render(document.getElementById('table-renderer-pagination'), menu, filtered.length, function() { TableRenderer.filter(menu); });
      }
      return;
    }

    // Pagination: render hanya baris halaman aktif (data asli tetap utuh di _state.rows)
    let pageRows = (typeof Pagination !== 'undefined' && Pagination.slice)
      ? Pagination.slice(menu, filtered)
      : filtered;
    let pageStart = (typeof Pagination !== 'undefined') ? (Pagination.page(menu) - 1) * Pagination.PAGE_SIZE : 0;

    let role = session && session.role;
    pageRows.forEach((r, i) => {
      let globalIdx = pageStart + i + 1;
      tbody.innerHTML += this._rowHtml(cfg, r, globalIdx, role, headers, visibleCols, menu);
    });
    // Kontrol pagination
    if (typeof Pagination !== 'undefined' && Pagination.render) {
      Pagination.render(document.getElementById('table-renderer-pagination'), menu, filtered.length, function() { TableRenderer.filter(menu); });
    }
  },

  // Baris tabel menjadi <tr>...</tr> (dipakai mode klien & server)
  _rowHtml: function(cfg, r, globalIdx, role, headers, visibleCols, menu) {
    let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
    let rowId = r[idIdx];
    let rowHtml = `<tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="TableRenderer.showDetail('${menu}', '${escHtmlAttr(rowId)}')">`;
    rowHtml += `<td class="p-3 text-center text-gray-400">${globalIdx}</td>`;
    visibleCols.forEach(col => {
      let colIdx = headers.indexOf(col);
      let val = (colIdx > -1) ? r[colIdx] : '';
      let headName = headers[colIdx] || '';
      if (cfg.statusBadge && col === 'status') {
        let statusVal = String(val || 'Belum di verifikasi');
        let lower = statusVal.toLowerCase();
        let isDone = cfg.statusBadge.selesaiWords.some(w => lower.includes(w));
        // Patch v13: nilai lama "Baru"/NULL ditampilkan sebagai "Belum di verifikasi"
        statusVal = (typeof normalizeStatusDisplay === 'function') ? normalizeStatusDisplay(statusVal) : statusVal;
        let badgeColor = isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
        rowHtml += `<td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${escHtml(statusVal)}</span></td>`;
      } else if (headName.includes('foto') || headName.includes('bukti')) {
        rowHtml += `<td class="p-3">${val && val !== '***Rahasia***' ? `<img src="${escHtmlAttr(convertToImageLink(val))}" class="w-10 h-10 object-cover rounded-lg border shadow-sm" onclick="event.stopPropagation(); bukaPopUpFoto('${escHtmlAttr(val)}')">` : '-'}</td>`;
      } else if (col === 'id') {
        rowHtml += `<td class="p-3 text-[10px] font-mono text-gray-600">${escHtml(val || '-')}</td>`;
      } else {
        rowHtml += `<td class="p-3 font-medium text-gray-800">${escHtml(val || '-')}</td>`;
      }
    });
    let btnAksi = '-';
    if (cfg.actionButtons) {
      btnAksi = cfg.actionButtons(role, rowId, r, headers);
    } else {
      // default: RT bisa edit
      btnAksi = (role === 'RT')
        ? `<button onclick="event.stopPropagation(); bukaModalEdit('${escHtmlAttr(rowId)}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>`
        : `<span class="text-gray-400 text-[10px]">-</span>`;
    }
    rowHtml += `<td class="p-3 text-center">${btnAksi}</td></tr>`;
    return rowHtml;
  },

  // ---- Mode server-side: filter dikirim ke server (debounce) ----
  _serverFilter: function(menu) {
    let cfg = this.configs[menu];
    let tbody = document.getElementById('table-renderer-body');
    if (!cfg || !tbody) return;
    let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
    // Pencarian berubah -> kembali ke halaman 1 + fetch ulang (debounce ke server)
    if (searchVal !== this._serverSearch) {
      this._serverSearch = searchVal;
      if (typeof Pagination !== 'undefined' && Pagination.reset) Pagination.reset(menu);
      if (this._serverSearchTimer) clearTimeout(this._serverSearchTimer);
      let self = this;
      this._serverSearchTimer = setTimeout(function() {
        self._serverSearchTimer = null;
        if (typeof loadGenericMenuServer === 'function') {
          loadGenericMenuServer(menu, 1, self._serverSearch);
        }
      }, 350);
    }
    this._renderServerRows(menu, cfg, tbody);
  },

  // Render baris halaman aktif (sudah 1 halaman dari server) + kontrol pagination
  _renderServerRows: function(menu, cfg, tbody) {
    let headers = this._state.headers.map(h => h.toLowerCase().trim());
    let rows = this._state.rows || [];
    let visibleCols = this._visibleColumns(cfg);
    let page = (typeof Pagination !== 'undefined') ? Pagination.page(menu) : 1;
    let total = this._serverTotal || rows.length;
    let role = session && session.role;
    let self = this;

    let renderControls = function() {
      if (typeof Pagination !== 'undefined' && Pagination.render) {
        Pagination.render(document.getElementById('table-renderer-pagination'), menu, total, function(p) {
          if (typeof loadGenericMenuServer === 'function') loadGenericMenuServer(menu, p, TableRenderer._serverSearch);
        });
      }
    };

    tbody.innerHTML = '';
    if (rows.length === 0) {
      let msg = self._serverSearch ? (cfg.emptyText || cfg.noDataText) : (cfg.noDataText || cfg.emptyText);
      tbody.innerHTML = `<tr><td colspan="${visibleCols.length + 2}" class="text-center p-4 text-gray-400">${msg}</td></tr>`;
      renderControls();
      return;
    }

    rows.forEach((r, i) => {
      let globalIdx = (page - 1) * ((typeof Pagination !== 'undefined') ? Pagination.PAGE_SIZE : 25) + i + 1;
      tbody.innerHTML += self._rowHtml(cfg, r, globalIdx, role, headers, visibleCols, menu);
    });
    renderControls();
  },

  showDetail: function(menu, id) {
    let cfg = this.configs[menu];
    let headers = this._state.headers;
    let lowerHeaders = headers.map(h => h.toLowerCase().trim());
    let idIdx = lowerHeaders.indexOf('id') > -1 ? lowerHeaders.indexOf('id') : 0;
    let row = this._state.rows.find(r => String(r[idIdx] || '') === String(id || ''));
    if (!row || !cfg) return;
    this._state.menu = menu;

    document.getElementById('table-renderer-detail-title').innerText = cfg.detail.title;

    // Foto / bukti — kolom foto UTAMA (foto_url/bukti_*) + kolom foto TAMBAHAN
    // (mis. foto_penyelesaian di Pengaduan & ttd_pemohon di Surat) yang sebelumnya
    // TIDAK pernah ditampilkan di rincian — warga tidak bisa melihat bukti
    // penyelesaian dari RT. Kini semua kolom foto dirender sebagai gambar.
    let photoIdxList = [];
    lowerHeaders.forEach((h, idx) => {
      // Kolom berisi gambar: foto/bukti/gambar/ttd/tanda_tangan (mis. foto_url,
      // foto_penyelesaian, ttd_pemohon). 'penyelesaian' saja TIDAK dihitung karena
      // bisa jadi kolom teks (mis. keterangan_penyelesaian).
      if (h.includes('foto') || h.includes('bukti') || h.includes('gambar')
        || h.includes('ttd') || h.includes('tanda_tangan')) {
        photoIdxList.push(idx);
      }
    });
    let photoBlock = (label, url) => {
      let direct = (typeof convertToImageLink === 'function') ? convertToImageLink(url) : url;
      let has = (url && String(url).trim() !== '' && String(url).toUpperCase() !== 'EMPTY' && String(url).toUpperCase() !== 'NULL' && url !== '-' && url !== '***Rahasia***');
      return `
      <div class="text-center mb-3 p-3 bg-gray-50 rounded-2xl border shadow-sm">
        <p class="text-[10px] text-gray-400 font-bold uppercase mb-2">${label}</p>
        ${has
          ? `<img src="${escHtmlAttr(direct)}" onclick="bukaPopUpFoto('${escHtmlAttr(url)}')" class="w-32 h-32 object-cover mx-auto rounded-2xl border shadow cursor-pointer hover:opacity-90 transition">
             <small class="text-[9px] text-blue-600 block mt-1.5 font-bold"><i class="bi bi-zoom-in me-1"></i>Klik foto untuk memperbesar</small>`
          : `<div class="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner"><i class="bi ${cfg.detail.photoIcon}"></i></div>
             <small class="text-[10px] text-gray-400 block mt-1">Belum ada lampiran foto</small>`
        }
      </div>`;
    };
    let fotoIdx = photoIdxList.length > 0 ? photoIdxList[0] : -1;
    let imgHtml = photoBlock(cfg.detail.photoLabel, fotoIdx > -1 ? (row[fotoIdx] || '') : '');
    // Foto tambahan (foto_penyelesaian, ttd, dll.) — ditampilkan setelah foto utama.
    photoIdxList.slice(1).forEach(pidx => {
      imgHtml += photoBlock(String(headers[pidx] || 'Lampiran').replace(/_/g, ' '), row[pidx] || '');
    });

    let detailHtml = imgHtml;
    headers.forEach((h, idx) => {
      let hLower = h.toLowerCase().trim();
      // Kolom gambar dirender sebagai blok foto (di atas), bukan teks mentah.
      if (hLower.includes('foto') || hLower.includes('bukti') || hLower.includes('gambar')
        || hLower.includes('ttd') || hLower.includes('tanda_tangan')) return;
      if ((cfg.detail.hideFields || ['no']).indexOf(hLower) > -1) return;
      let val = row[idx];
      let rawStr = String(val === null || val === undefined ? '' : val).trim();
      let isTimeCol = (typeof TIMESTAMP_DISPLAY_COLS !== 'undefined' && TIMESTAMP_DISPLAY_COLS.indexOf(hLower) > -1);
      let looksTimestamp = /^\d{4}-\d{2}-\d{2}[T ]/.test(rawStr) && rawStr.indexOf(':') > -1;
      let formattedVal;
      if (isTimeCol || looksTimestamp) {
        // Timestamp (mis. verified_at/created_at dari server = timestamptz UTC) →
        // tampilkan sebagai DD/MM/YYYY HH:mm WIB (24 jam, UTC+7), bukan string ISO mentah.
        formattedVal = escHtml((typeof formatTanggalWIBDisplay === 'function') ? formatTanggalWIBDisplay(val) : String(val || '-'));
      } else if (cfg.formatDetailValue) {
        formattedVal = cfg.formatDetailValue(hLower, val);
      } else {
        let displayVal = String(val || '-');
        // Patch v13: status lama "Baru" ditampilkan sebagai "Belum di verifikasi"
        if (hLower === 'status' && typeof normalizeStatusDisplay === 'function') {
          displayVal = normalizeStatusDisplay(displayVal);
        }
        formattedVal = escHtml(displayVal);
      }
      detailHtml += `
        <div class="border-b pb-1">
          <p class="text-[10px] text-gray-400 font-bold uppercase">${escHtml(h.replace(/_/g, ' '))}</p>
          <p class="font-semibold text-gray-800">${formattedVal}</p>
        </div>`;
    });

    document.getElementById('table-renderer-detail-body').innerHTML = detailHtml;
    let actionHtml = (cfg.detailActions) ? cfg.detailActions(session && session.role, String(id), row, lowerHeaders) : '';
    document.getElementById('table-renderer-detail-actions').innerHTML = actionHtml;
    document.getElementById('table-renderer-detail-modal').classList.remove('hidden');
  },

  tutupDetail: function() {
    let modal = document.getElementById('table-renderer-detail-modal');
    if (modal) modal.classList.add('hidden');
  },

  // ----------------------------------------------------------
  // INTERNAL
  // ----------------------------------------------------------
  _visibleColumns: function(cfg) {
    let headers = this._state.headers.map(h => h.toLowerCase().trim());
    if (!cfg.columns) return headers;
    let cols = [];
    cfg.columns.forEach(c => {
      let idx = headers.indexOf(c);
      if (idx > -1 && cols.indexOf(c) === -1) cols.push(c);
    });
    return cols;
  },

  _headerCells: function(cfg) {
    let headers = this._state.headers;
    let lower = headers.map(h => h.toLowerCase().trim());
    let cols = this._visibleColumns(cfg);
    return cols.map(c => {
      let idx = lower.indexOf(c);
      return idx > -1 ? headers[idx].toUpperCase() : c.toUpperCase();
    });
  },

  _ensureModal: function() {
    if (this._modalInjected) return;
    this._modalInjected = true;
    let div = document.createElement('div');
    div.innerHTML = `
      <div id="table-renderer-detail-modal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative font-sans max-h-[85vh] flex flex-col">
          <button onclick="TableRenderer.tutupDetail()" class="absolute top-4 right-4 z-50 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
          <div class="mb-3 border-b pb-2 pe-8 shrink-0">
            <h3 class="font-bold text-gray-800 text-sm pe-6" id="table-renderer-detail-title">Rincian Data</h3>
          </div>
          <div id="table-renderer-detail-body" class="mb-4 space-y-2 text-xs overflow-y-auto pe-1 flex-1 min-h-0"></div>
          <div id="table-renderer-detail-actions" class="space-y-2 mb-2 shrink-0"></div>
          <button onclick="TableRenderer.tutupDetail()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition shrink-0">Tutup</button>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
  }
};
window.TableRenderer = TableRenderer;

// ----------------------------------------------------------
// Helper kecil (lokal — tidak bentrok dengan global lain).
// escHtml/escHtmlAttr/escJsStr kini didefinisikan di helpers/data.js
// (dimuat pertama) — jangan didefinisikan ulang di sini.
// ----------------------------------------------------------
// Ambil nilai kolom dari baris array berdasarkan substring header
function getRowCol(row, lowerHeaders, keywords) {
  if (!row || !lowerHeaders) return '';
  for (let kw of keywords) {
    let idx = lowerHeaders.findIndex(h => h.includes(kw));
    if (idx > -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
      return row[idx];
    }
  }
  return '';
}
