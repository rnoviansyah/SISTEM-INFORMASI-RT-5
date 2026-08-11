// ============================================================
// formHelper.js - Generate Form Inputs & Helpers (LENGKAP)
// ============================================================

// ============================================================
// 1. Helper: cari nilai dari object berdasarkan keyword
// ============================================================
export function cariNilaiKolom(row, keywords) {
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

// ============================================================
// 2. Sanitasi Form Data
// ============================================================
export function sanitizeFormData(sheetName, formData) {
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
      } else if (['nominal', 'tahun', 'rt', 'rw', 'jumlah', 'stok', 'qty', 'pemasukan', 'pengeluaran', 'saldo', 'acc'].includes(kLower)) {
        cleanData[k] = 0;
      }
    } else if (['nominal', 'tahun', 'rt', 'rw', 'jumlah', 'stok', 'qty', 'pemasukan', 'pengeluaran', 'saldo', 'acc'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9.-]/g, '');
      cleanData[k] = (numOnly !== '' && !isNaN(Number(numOnly))) ? Number(numOnly) : 0;
    } else if (['nohp', 'hp', 'telp', 'wa', 'acc'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      cleanData[k] = numOnly || null;
    } else if (['nik', 'nokk', 'no_kk'].includes(kLower)) {
      let numOnly = valStr.replace(/[^0-9]/g, '');
      if (numOnly) cleanData[k] = numOnly;
    }
  }
  return cleanData;
}

// ============================================================
// 3. Validasi Form
// ============================================================
export function validateDynamicForm(menu, payload, session) {
  const requiredFields = {
    'Warga': ['nama_lengkap', 'nik'],
    'Iuran': ['bulan', 'tahun', 'nominal'],
    'Pengaduan': ['jenis_aduan', 'keterangan'],
    'SuratPengantar': ['jenis_surat'],
    'Keuangan': ['keterangan']
  };
  const fields = requiredFields[menu] || [];
  for (let field of fields) {
    if (!payload[field] || payload[field].trim() === '') {
      return { valid: false, message: `Field ${field} wajib diisi!` };
    }
  }
  return { valid: true };
}

// ============================================================
// 4. Convert Google Drive link ke image
// ============================================================
export function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];
  }
  return url;
}

// ============================================================
// 5. Compress Image File ke Base64
// ============================================================
export function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      let img = new Image();
      img.onload = function() {
        let canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================================
// 6. Extract path dari Supabase Storage URL
// ============================================================
export function extractStoragePathFromUrl(url) {
  const s = String(url || '').trim();
  const marker = '/object/public/rt-media/';
  const idx = s.indexOf(marker);
  if (idx === -1) return null;
  let path = s.slice(idx + marker.length).split('?')[0];
  if (!path) return null;
  try { path = decodeURIComponent(path); } catch (e) {}
  return path;
}

// ============================================================
// 7. Cek apakah kolom bertipe numerik
// ============================================================
export function isNumericColumn(kName) {
  if (!kName) return false;
  let kLower = String(kName).toLowerCase().replace(/_/g, '').trim();
  return ['nominal', 'tahun', 'rt', 'rw', 'jumlah', 'stok', 'qty', 'pemasukan', 'pengeluaran', 'saldo', 'acc', 'jumlahminta'].includes(kLower);
}

console.log('✅ formHelper.js loaded, exports: cariNilaiKolom, sanitizeFormData, validateDynamicForm, convertToImageLink, compressImageFile, extractStoragePathFromUrl, isNumericColumn');