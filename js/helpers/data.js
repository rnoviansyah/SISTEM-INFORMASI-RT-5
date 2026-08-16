// ============================================================
// helpers/data.js
// Helper pemrosesan data (tanpa dependensi DOM / Supabase).
// Dipisah dari app.js (refactor modul). Classic script — berbagi
// global scope dengan file JS lain. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

function isNumericColumn(kName) {
  if (!kName) return false;
  let kLower = String(kName).toLowerCase().replace(/_/g, '').trim();
  return ['nominal', 'tahun', 'rt', 'rw', 'jumlah', 'stok', 'qty', 'pemasukan', 'pengeluaran', 'acc', 'jumlahminta'].includes(kLower);
}

function sanitizeFormData(sheetName, formData) {
  if (!formData || typeof formData !== 'object') return formData;
  let cleanData = { ...formData };
  for (let k in cleanData) {
    if (typeof cleanData[k] === 'object' && cleanData[k] !== null && cleanData[k].base64) {
      cleanData[k] = cleanData[k].base64;
    }
    let kLower = String(k).toLowerCase().replace(/_/g, '').trim();
    let valStr = String(cleanData[k] !== null && cleanData[k] !== undefined ? cleanData[k] : '').trim();

    if (valStr === '') {
      if (['nohp', 'hp', 'telp', 'wa', 'acc'].includes(kLower)) {
        cleanData[k] = null;
      } else if (isNumericColumn(k)) {
        cleanData[k] = 0;
      }
    } else if (isNumericColumn(k)) {
      let numOnly = valStr.replace(/[^0-9.-]/g, '');
      cleanData[k] = (numOnly !== '' && !isNaN(Number(numOnly))) ? Number(numOnly) : 0;
    } else if (['nohp', 'acc'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      cleanData[k] = numOnly || null;
    } else if (['nik', 'nokk'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      if (numOnly) cleanData[k] = numOnly;
    }
  }
  return cleanData;
}

function caseInsensitiveObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  return new Proxy(obj, {
    get(target, prop) {
      if (typeof prop !== 'string' || prop in target || prop === 'then') return target[prop];
      const foundKey = Object.keys(target).find(k => k.toLowerCase() === prop.toLowerCase());
      return foundKey ? target[foundKey] : undefined;
    }
  });
}

function makeCaseInsensitive(data) {
  if (Array.isArray(data)) return data.map(item => caseInsensitiveObj(item));
  else if (data && typeof data === 'object') return caseInsensitiveObj(data);
  return data;
}

function cariNilaiKolom(row, keywords) {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);
  for (let kw of keywords) {
    let kwClean = kw.toLowerCase().replace(/_/g, ' ').trim();
    let exactKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').trim() === kwClean);
    if (exactKey && row[exactKey] !== null && row[exactKey] !== undefined && String(row[exactKey]).trim() !== '') {
      return String(row[exactKey]).trim();
    }
    let partialKey = keys.find(k => {
      let kClean = k.toLowerCase().replace(/_/g, ' ').trim();
      let matchesKw = kClean.includes(kwClean);
      if (kwClean.includes('nama') || kwClean.includes('barang')) {
        return matchesKw && !kClean.includes('foto') && !kClean.includes('gambar') && !kClean.includes('bukti') && !kClean.includes('keterangan');
      }
      return matchesKw;
    });
    if (partialKey && row[partialKey] !== null && row[partialKey] !== undefined && String(row[partialKey]).trim() !== '') {
      return String(row[partialKey]).trim();
    }
  }
  return '';
}

function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];
  }
  return url;
}

// Extract path file dari public URL Supabase Storage (rt-media). Contoh:
// https://xxx.supabase.co/storage/v1/object/public/rt-media/warga/123.jpg?t=...
// -> "warga/123.jpg" (atau null kalau bukan file storage milik kita)
function extractStoragePathFromUrl(url) {
  const s = String(url || '').trim();
  const marker = '/object/public/rt-media/';
  const idx = s.indexOf(marker);
  if (idx === -1) return null;
  let path = s.slice(idx + marker.length).split('?')[0];
  if (!path) return null;
  try { path = decodeURIComponent(path); } catch (e) {}
  return path;
}

function sortDataNewestFirst(dataList) {
  if (!Array.isArray(dataList) || dataList.length <= 1) return dataList || [];
  let list = [...dataList];
  let hasValidTimestamp = list.some(a => {
    if (!a) return false;
    let t = a.created_at || a.createdat || a.CREATED_AT || a.CREATEDAT;
    if (!t) return false;
    let d = new Date(t).getTime();
    return !isNaN(d) && d > 1000000;
  });
  if (hasValidTimestamp) {
    list.sort((a, b) => {
      let timeA = a ? (a.created_at || a.createdat || a.CREATED_AT || a.CREATEDAT || '') : '';
      let timeB = b ? (b.created_at || b.createdat || b.CREATED_AT || b.CREATEDAT || '') : '';
      let dateA = new Date(timeA).getTime();
      let dateB = new Date(timeB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;
      }
      return 0;
    });
    return list;
  }
  list.reverse();
  return list;
}

function sensorPhoneNumber(hp) {
  if (!hp || hp === '-' || hp === 'XXXXX') return '****';
  let str = String(hp).trim();
  if (str.length <= 4) return '****';
  let start = str.substring(0, 4);
  let end = str.substring(str.length - 3);
  let middleLen = str.length - 7;
  if (middleLen <= 0) middleLen = 3;
  return start + '*'.repeat(middleLen) + end;
}
window.sensorPhoneNumber = sensorPhoneNumber;

function parseTanggalKeDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  let str = String(dateVal).trim();
  if (!str || str === '-') return null;
  let d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  let parts = str.split(/[\/\-\s:]/);
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    let hour = parts.length >= 4 ? parseInt(parts[3], 10) : 0;
    let min = parts.length >= 5 ? parseInt(parts[4], 10) : 0;
    if (year < 100) year += 2000;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      let d2 = new Date(year, month, day, hour, min);
      if (!isNaN(d2.getTime())) return d2;
    }
  }
  return null;
}

// Generator TUNGGAL format WIB untuk kolom tanggal yang disimpan
// (DD/MM/YYYY HH:mm WIB). Temuan audit: tiap modul menulis pakai rumus
// toLocaleDateString/toLocaleTimeString sendiri-sendiri. Dengan helper ini
// semua penulisan baru memakai format yang SAMA dan zona Asia/Jakarta yang
// konsisten (bukan zona perangkat). Bisa dipakai juga untuk konversi
// tanggal ISO -> tampilan.
function formatWIBDateTime(dateLike) {
  let d = (dateLike instanceof Date) ? dateLike : (dateLike ? new Date(dateLike) : new Date());
  if (isNaN(d.getTime())) return '';
  let tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' });
  // hour12: false -> SELALU 24 jam (di HP dengan pengaturan jam 12 jam, toLocaleTimeString
  // tanpa hour12 bisa menulis 15:17 sebagai "03:17" tanpa AM/PM lalu tersimpan ke DB).
  let jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta', hour12: false }).replace('.', ':');
  return tgl + ' ' + jam + ' WIB';
}
window.formatWIBDateTime = formatWIBDateTime;

// Konversi nilai tanggal APAPUN yang masuk DB ke tampilan WIB 24 jam
// (DD/MM/YYYY HH:mm WIB) UNTUK DITAMPILKAN — nilai DB TIDAK diubah.
// Menangani format yang selama ini campur aduk (temuan audit "standardisasi tanggal"):
//   1. ISO 8601 dengan zona waktu (timestamptz dari server, mis. verified_at
//      "2026-08-14T08:14:56.159051+00:00" / "...Z") -> dikonversi ke WIB (+7).
//   2. "YYYY-MM-DD HH:mm" / "YYYY-MM-DDTHH:mm" tanpa zona (nilai lama) -> dianggap
//      sudah WIB, hanya dinormalisasi formatnya (TIDAK digeser jam-nya).
//   3. "DD/MM/YYYY ..." (sudah format Indonesia) atau teks lain -> dikembalikan apa adanya.
function formatTanggalWIBDisplay(value) {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  if (str === '' || str === '-') return str || '-';
  // Sudah berformat Indonesia (DD/MM/YYYY[ ...]) — biarkan utuh.
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) return str;
  // ISO 8601 dengan penanda zona waktu eksplisit (UTC / +offset / Z): konversi ke WIB.
  if (/^\d{4}-\d{2}-\d{2}T/.test(str) && /(Z|[+-]\d{2}:?\d{2})$/i.test(str)) {
    let d = new Date(str);
    if (!isNaN(d.getTime())) return formatWIBDateTime(d);
  }
  // YYYY-MM-DD[ T]HH:mm(:ss)? tanpa zona — nilai legacy yang sudah WIB.
  // Dibangun via Date.UTC(hh-7) supaya interpretasinya konsisten "waktu WIB"
  // di SEMUA perangkat (bukan jam lokal perangkat), lalu diformat Asia/Jakarta
  // sehingga jam TIDAK digeser.
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    let d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0)));
    if (!isNaN(d.getTime())) return formatWIBDateTime(d);
  }
  return str;
}
window.formatTanggalWIBDisplay = formatTanggalWIBDisplay;

// Kolom yang isinya timestamp sistem (diisi server) — dipakai renderer tabel/detail
// untuk memformat tampilan WIB. Nilai non-timestamp di kolom ini dibiarkan apa adanya.
const TIMESTAMP_DISPLAY_COLS = ['verified_at', 'created_at', 'createdat', 'updated_at', 'timestamp', 'diambil_pada', 'waktu'];
window.TIMESTAMP_DISPLAY_COLS = TIMESTAMP_DISPLAY_COLS;

// Normalisasi label status untuk TAMPILAN (nilai DB TIDAK diubah — patch v13).
// Data lama & alur lama memakai "Baru" sebagai status awal; kanoniknya sekarang
// "Belum di verifikasi". Semua sinonim pending diseragamkan agar badge tabel,
// modal detail, dan dropdown Edit konsisten. Nilai lain dikembalikan apa adanya.
function normalizeStatusDisplay(status) {
  let s = String(status === null || status === undefined ? '' : status).trim();
  let lower = s.toLowerCase();
  if (lower === '' || lower === 'baru' || lower === 'belum diverifikasi' || lower === 'diajukan' || lower === 'pending') {
    return 'Belum di verifikasi';
  }
  if (lower === 'menunggu verifikasi') {
    return 'Menunggu Verifikasi';
  }
  return s;
}
window.normalizeStatusDisplay = normalizeStatusDisplay;

// ID unik dengan randomness kriptografis (temuan audit: Math.random 4 digit
// = ruang hanya 9000 kombinasi + tanpa PRIMARY KEY -> risiko tabrakan & update
// salah baris). Dipakai semua pembuatan id data (prefix tetap biar tetap terbaca
// di UI, mis. PIN-xxxx, KAS-xxxx). Fallback otomatis bila crypto tidak ada.
function generateSecureId(prefix) {
  var bytes = new Uint8Array(8);
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
  } catch (e) {
    for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
  return (prefix || 'ID') + '-' + hex;
}
window.generateSecureId = generateSecureId;

// Header kanonik untuk tabel data: gabungan FALLBACK_HEADERS + kolom tambahan,
// tanpa kolom teknis (created_at, saldo, dll.)
function canonicalTableHeaders(sheetName, sampleRow) {
  const rowKeys = (sampleRow && typeof sampleRow === 'object') ? Object.keys(sampleRow) : [];
  const base = FALLBACK_HEADERS[sheetName] || [];
  const known = base.filter(k => rowKeys.indexOf(k) > -1);
  const extra = rowKeys.filter(k => base.indexOf(k) === -1 && HIDDEN_TABLE_COLS.indexOf(String(k).toLowerCase()) === -1);
  return known.concat(extra);
}

// ============================================================
// Escape HTML — WAJIB untuk SEMUA data user yang disisipkan ke
// innerHTML (anti-XSS). Dimuat PERTAMA (sebelum renderer mana pun)
// sehingga tersedia sebagai global untuk semua modul menu.
//   escHtml     : teks di dalam tag HTML (sel <td>, <p>, dll)
//   escHtmlAttr : nilai atribut HTML (data-id, src, dsb.)
//   escJsStr    : argumen string di dalam handler onclick inline
//                 (escape HTML utk atribut + backslash utk string JS)
// ============================================================
function escHtml(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escHtmlAttr(s) {
  return escHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escJsStr(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// Validasi file GAMBAR via magic bytes (v3.38)
// Cek isi file, bukan ekstensi/MIME klaim — file PDF/doc yang
// di-rename jadi .jpg/.png TIDAK lolos. Format yang diterima:
// JPEG, PNG, WebP, GIF, BMP (semua bisa dirender browser).
// ============================================================
function isValidImageFile(file) {
  return new Promise(function(resolve) {
    if (!file || typeof file.slice !== 'function') { resolve(false); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      var arr = new Uint8Array(e.target.result);
      var len = arr.length;
      var ok = false;
      if (len >= 3 && arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
        ok = true; // JPEG
      } else if (len >= 8 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47
        && arr[4] === 0x0D && arr[5] === 0x0A && arr[6] === 0x1A && arr[7] === 0x0A) {
        ok = true; // PNG
      } else if (len >= 12 && arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46
        && arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50) {
        ok = true; // WebP (RIFF....WEBP)
      } else if (len >= 6 && arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) {
        ok = true; // GIF
      } else if (len >= 2 && arr[0] === 0x42 && arr[1] === 0x4D) {
        ok = true; // BMP
      }
      resolve(ok);
    };
    reader.onerror = function() { resolve(false); };
    try { reader.readAsArrayBuffer(file.slice(0, 16)); } catch (err) { resolve(false); }
  });
}
