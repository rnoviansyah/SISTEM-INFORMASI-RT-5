// Variable Global Core App
let session = { token: '', role: '', nik: '', nama: '', alamat: '', noHp: '' };
const noWaAdmin = '628973366667';
let currentActiveMenu = '';
let currentHeaders = [];
let currentRows = [];
let editingId = null;
let bootstrapModalInstance = null;
let bootstrapImageModalInstance = null;
let bootstrapNotifModalInstance = null;
let rawNotifData = [];
let notifTimer = null;
let lastInfoWargaText = '';

// Variable Notifikasi Realtime
let supabaseRealtimeChannel = null;
let lastNotifCount = 0;

// ==========================================================
// ==== KONFIGURASI DATABASE SUPABASE =======================
// ==========================================================
const SUPABASE_URL = 'https://kcuuylpqhxagcradfmon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXV5bHBxaHhhZ2NyYWRmbW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjI5NTEsImV4cCI6MjEwMTEzODk1MX0.kI7sP46AIOLsJKyAg4DWQTNhCWCh22PwFMDogXoUlyg';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- SAFE SUPABASE QUERY HELPERS ---
async function safeSupabaseSelect(tableName) {
  try {
    let { data, error } = await db.from(tableName).select('*');
    if (!error && data && data.length > 0) return { data: makeCaseInsensitive(data), error: null };

    let lowerName = tableName.toLowerCase();
    if (lowerName !== tableName) {
      let resLower = await db.from(lowerName).select('*');
      if (!resLower.error && resLower.data) return { data: makeCaseInsensitive(resLower.data), error: null };
    }

    let capName = tableName.charAt(0).toUpperCase() + tableName.slice(1).toLowerCase();
    if (capName !== tableName && capName !== lowerName) {
      let resCap = await db.from(capName).select('*');
      if (!resCap.error && resCap.data) return { data: makeCaseInsensitive(resCap.data), error: null };
    }

    return { data: makeCaseInsensitive(data || []), error: error };
  } catch(e) {
    return { data: [], error: e };
  }
}

async function safeSupabaseInsert(tableName, rows) {
  let { error } = await db.from(tableName).insert(rows);
  if (error) {
    let lowerName = tableName.toLowerCase();
    if (lowerName !== tableName) {
      let resLower = await db.from(lowerName).insert(rows);
      if (!resLower.error) return { error: null };
    }
  }
  return { error };
}

async function safeSupabaseUpdate(tableName, payload, eqColumn, eqValue) {
  let { error } = await db.from(tableName).update(payload).eq(eqColumn, eqValue);
  if (error) {
    let lowerName = tableName.toLowerCase();
    if (lowerName !== tableName) {
      let resLower = await db.from(lowerName).update(payload).eq(eqColumn, eqValue);
      if (!resLower.error) return { error: null };
    }
    let upperCol = eqColumn.toUpperCase();
    let resUpper = await db.from(tableName).update(payload).eq(upperCol, eqValue);
    if (!resUpper.error) return { error: null };
  }
  return { error };
}

async function safeSupabaseDelete(tableName, eqColumn, eqValue) {
  let { error } = await db.from(tableName).delete().eq(eqColumn, eqValue);
  if (error) {
    let lowerName = tableName.toLowerCase();
    if (lowerName !== tableName) {
      let resLower = await db.from(lowerName).delete().eq(eqColumn, eqValue);
      if (!resLower.error) return { error: null };
    }
    let upperCol = eqColumn.toUpperCase();
    let resUpper = await db.from(tableName).delete().eq(upperCol, eqValue);
    if (!resUpper.error) return { error: null };
  }
  return { error };
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

async function updateStokAset(namaAtauIdBarang, deltaStok) {
  if (!namaAtauIdBarang || deltaStok === 0) return;
  const { data: safeAset } = await safeSupabaseSelect('Aset');
  if (!safeAset || safeAset.length === 0) return;
  let targetAset = safeAset.find(a => {
    let bNama = cariNilaiKolom(a, ['nama_barang', 'nama_aset', 'nama', 'barang']);
    let bId = cariNilaiKolom(a, ['id', 'id_barang']);
    return (bNama && bNama.toLowerCase().trim() === String(namaAtauIdBarang).toLowerCase().trim()) ||
           (bId && bId.toLowerCase().trim() === String(namaAtauIdBarang).toLowerCase().trim());
  });
  if (!targetAset) return;
  let targetId = targetAset.id || targetAset.ID || cariNilaiKolom(targetAset, ['id']);
  let currentStok = parseInt(cariNilaiKolom(targetAset, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);
  let stokBaru = Math.max(0, currentStok + deltaStok);
  let keys = Object.keys(targetAset);
  let stockKey = keys.find(k => {
    let kClean = k.toLowerCase().replace(/_/g, ' ').trim();
    return kClean.includes('stok') || kClean.includes('jumlah') || kClean.includes('qty');
  }) || 'stok_tersedia';
  let updatePayload = {};
  updatePayload[stockKey] = stokBaru;
  let statusKey = keys.find(k => k.toLowerCase() === 'status');
  if (statusKey) updatePayload[statusKey] = stokBaru > 0 ? 'Tersedia' : 'Habis';
  await safeSupabaseUpdate('Aset', updatePayload, 'id', targetId);
}

function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];
  }
  return url;
}

// ==========================================================
// ==== HELPER FETCH POST (SUPABASE BRIDGE) =================
// ==========================================================
async function callGASPost(actionName, extraPayload = {}) {
  try {
    if (actionName === 'processLogin') {
      const uClean = extraPayload.username ? extraPayload.username.toString().trim() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';
      try {
        const { data, error } = await db.rpc('verify_user_login', { p_username: uClean, p_password: pClean });
        if (error) return { status: 'error', message: 'Gagal verifikasi server: ' + error.message };
        return data;
      } catch (err) {
        return { status: 'error', message: 'Gagal login: ' + err.message };
      }
    }

    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      let formData = { ...extraPayload.formData };
      if (!formData.id) formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      if (session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') formData['nik'] = session.nik;
      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) formData[k] = formData[k].base64;
      }
      const { error } = await safeSupabaseInsert(sheetName, [formData]);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id };
    }

    if (actionName === 'simpanPengajuanPeminjaman') {
      const payload = extraPayload.payload || {};
      let newId = 'PIN-' + Math.floor(1000 + Math.random() * 9000);
      let insertObj = {
        id: newId,
        nik: payload.nik || session.nik,
        nama_peminjam: payload.namaPeminjam || session.nama,
        id_barang: payload.idBarang,
        nama_barang: payload.namaBarang,
        jumlah: payload.jumlah,
        keterangan: payload.keterangan || '',
        status: 'Menunggu Verifikasi'
      };
      const { error } = await safeSupabaseInsert('Peminjaman', [insertObj]);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Pengajuan peminjaman berhasil dikirim!' };
    }

    if (actionName === 'verifikasiPeminjamanRT') {
      const idPinjam = extraPayload.idPinjam;
      const status = extraPayload.status;
      const qtyAcc = parseInt(extraPayload.qtyAcc) || 0;
      const catatanRt = extraPayload.catatanRt || '';
      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');
      const safePinjam = safePinjamList ? safePinjamList.find(p => String(p.id || cariNilaiKolom(p, ['id'])).trim() === String(idPinjam).trim()) : null;
      if (safePinjam && status === 'Disetujui' && qtyAcc > 0) {
        let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'nama_aset', 'barang', 'id_barang']);
        await updateStokAset(barangTarget, -qtyAcc);
      }
      const { error } = await safeSupabaseUpdate('Peminjaman', { status: status, acc: qtyAcc, catatan_rt: catatanRt }, 'id', idPinjam);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: `Peminjaman berhasil di-${status.toLowerCase()}!` };
    }

    if (actionName === 'prosesPengembalianAsetRT') {
      const idPinjam = extraPayload.idPinjam;
      const qtyKembali = parseInt(extraPayload.qtyKembali) || 0;
      const catatanRt = extraPayload.catatanRt || '';
      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');
      const safePinjam = safePinjamList ? safePinjamList.find(p => String(p.id || cariNilaiKolom(p, ['id'])).trim() === String(idPinjam).trim()) : null;
      if (safePinjam) {
        if (qtyKembali > 0) {
          let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'nama_aset', 'barang', 'id_barang']);
          await updateStokAset(barangTarget, qtyKembali);
        }
        let qtyAcc = parseInt(cariNilaiKolom(safePinjam, ['acc', 'jumlah_acc', 'qty_acc']) || safePinjam.acc || 0);
        let selisihHilang = qtyAcc - qtyKembali;
        let statusPengembalian = selisihHilang > 0 ? `Selesai (hilang ${selisihHilang})` : 'Selesai (Dikembalikan)';
        const { error } = await safeSupabaseUpdate('Peminjaman', { status: statusPengembalian, catatan_rt: catatanRt }, 'id', idPinjam);
        if (error) return { status: 'error', message: error.message };
        return { status: 'success', message: 'Pengembalian barang berhasil dicatat & stok telah diperbarui!' };
      }
      return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };
    }

    if (actionName === 'updateDataDiSheet') {
      const sheetName = extraPayload.sheetName;
      const id = extraPayload.id;
      let formData = { ...extraPayload.formData };
      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) formData[k] = formData[k].base64;
      }
      const { error } = await safeSupabaseUpdate(sheetName, formData, 'id', id);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil diperbarui!' };
    }

    if (actionName === 'hapusDataDariSheet') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' };
      const { error } = await safeSupabaseDelete(extraPayload.sheetName, 'id', extraPayload.id);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil dihapus!' };
    }

    if (actionName === 'simpanInfoWarga') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan memperbarui info warga!' };
      const { error } = await db.from('Pengaturan').upsert([{ kunci: 'info_warga', nilai: extraPayload.teksBaru }], { onConflict: 'kunci' });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }

    if (actionName === 'simpanPengaturanApp') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan memperbarui pengaturan!' };
      const { error } = await db.from('Pengaturan').upsert(extraPayload.settingsArray, { onConflict: 'kunci' });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Pengaturan aplikasi berhasil disimpan!' };
    }

    if (actionName === 'tambahUserWarga') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mengelola user!' };
      const { error } = await safeSupabaseInsert('Users', [extraPayload.userObj]);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
    }

    if (actionName === 'hapusUserAkun') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus user!' };
      const { error } = await safeSupabaseDelete('Users', 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil dihapus!' };
    }

    if (actionName === 'resetPasswordUser') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mereset password!' };
      const { error } = await safeSupabaseUpdate('Users', { password: extraPayload.newPassword }, 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Password user berhasil direset!' };
    }

    return { status: 'error', message: 'Aksi POST tidak dikenal' };
  } catch (err) {
    console.error('Fetch Error (POST):', err);
    return { status: 'error', message: 'Gagal terhubung ke Supabase: ' + err.message };
  }
}

// ==========================================================
// ==== HELPER FETCH GET (SUPABASE BRIDGE) ==================
// ==========================================================
async function callGASGet(actionName, params = {}) {
  try {
    if (actionName === 'getDaftarBarangAset') {
      const { data: safeAset } = await safeSupabaseSelect('Aset');
      if (!safeAset || safeAset.length === 0) return { status: 'success', data: [] };
      let listBarang = safeAset.map(item => {
        let bId = item.id || item.ID || cariNilaiKolom(item, ['id']);
        let bNama = cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'nama', 'barang']);
        let bStok = parseInt(cariNilaiKolom(item, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);
        return { id: bId || bNama, nama: bNama, stok: bStok };
      }).filter(b => b.nama);
      return { status: 'success', data: listBarang };
    }

    if (actionName === 'getRiwayatPeminjaman') {
      const { data: safeRiwayat } = await safeSupabaseSelect('Peminjaman');
      if (!safeRiwayat || safeRiwayat.length === 0) return { status: 'success', data: [] };
      let listRiwayat = safeRiwayat.map(item => ({
        idPinjam: item.id || cariNilaiKolom(item, ['id', 'id_pinjam']),
        namaPeminjam: cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']),
        namaBarang: cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']),
        jumlahMinta: parseInt(cariNilaiKolom(item, ['jumlah', 'qty', 'minta']) || 0),
        jumlahAcc: parseInt(cariNilaiKolom(item, ['acc', 'jumlah_acc', 'qty_acc']) || 0),
        keterangan: cariNilaiKolom(item, ['keterangan', 'ket_warga', 'keterangan_warga']),
        catatanRt: cariNilaiKolom(item, ['catatan_rt', 'lokasi', 'catatan']),
        status: cariNilaiKolom(item, ['status']) || 'Menunggu Verifikasi',
        nik: cariNilaiKolom(item, ['nik'])
      }));
      return { status: 'success', data: listRiwayat };
    }

    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const { data: safeData } = await safeSupabaseSelect(sheetName);
      if (!safeData || safeData.length === 0) return { status: 'success', headers: [], rows: [] };

      const headers = Object.keys(safeData[0]);
      const lowerHeaders = headers.map(h => h.toLowerCase().trim());
      const cleanRole = (session.role || 'warga').toLowerCase();
      let filteredData = safeData;

      if (cleanRole === 'warga' && session.nik) {
        let sheetLower = sheetName.toLowerCase();
        if (sheetLower === 'warga') {
          let userKk = '';
          const targetWarga = filteredData.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
            return wNik && wNik.toString().trim() === session.nik.toString().trim();
          });
          if (targetWarga) userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);
          const kkIdx = lowerHeaders.findIndex(h => h.includes('kk') || h.includes('no_kk'));
          let rows = filteredData.map(rowObj => {
            let rowArr = headers.map(h => rowObj[h] !== null && rowObj[h] !== undefined ? rowObj[h] : '');
            let rowKk = kkIdx > -1 ? String(rowObj[headers[kkIdx]] || '').trim() : '';
            if ((userKk && rowKk === userKk) || (cariNilaiKolom(rowObj, ['nik', 'ktp']) === session.nik)) {
              return rowArr;
            } else {
              return headers.map((h, idx) => {
                let hLower = h.toLowerCase().trim();
                if (['id','no','nama_lengkap','nama_panggilan','nama','jenis_kelamin','no_hp','foto_url','alamat'].includes(hLower)) return rowArr[idx];
                else return 'XXXXX';
              });
            }
          });
          return { status: 'success', headers: headers, rows: rows };
        } else if (!['keuangan','aset','peminjaman','sumbangan','aspirasi'].includes(sheetLower)) {
          filteredData = filteredData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
            return rNik && rNik.toString().trim() === session.nik.toString().trim();
          });
        }
      }

      if (!filteredData || filteredData.length === 0) return { status: 'success', headers: headers, rows: [] };
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }

    if (actionName === 'getIuranData') {
      const { data: safeData } = await safeSupabaseSelect('Iuran');
      if (!safeData || safeData.length === 0) return { status: 'success', headers: [], rows: [] };
      let filteredData = safeData;
      const cleanRole = (session.role || 'warga').toLowerCase();
      if (cleanRole !== 'rt' && session.nik) {
        let userKk = '';
        const { data: safeWarga } = await safeSupabaseSelect('Warga');
        if (safeWarga) {
          const targetWarga = safeWarga.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
            return wNik && wNik.toString().trim() === session.nik.toString().trim();
          });
          if (targetWarga) userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);
        }
        filteredData = filteredData.filter(row => {
          let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
          let rKk = cariNilaiKolom(row, ['kk', 'no_kk']);
          return (rNik && rNik.toString().trim() === session.nik.toString().trim()) || (userKk && rKk && rKk === userKk);
        });
      }
      if (filteredData.length === 0) {
        const headers = safeData.length > 0 ? Object.keys(safeData[0]) : ['ID','NIK','Nama','No_KK','Bulan','Tahun','Nominal','Status','Tanggal_Bayar','Diterima_Oleh','Bukti_Transfer'];
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = Object.keys(filteredData[0]);
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }

    // ==========================================================
    // ==== GET NOTIFICATIONS (REALTIME - KEBAL NAMA KOLOM) =====
    // ==========================================================
    if (actionName === 'getNotifications') {
      const cleanRole = (session.role || 'warga').toLowerCase();
      const userNik = (session.nik || '').toString().trim();
      let notifs = [];

      const [aRes, sRes, pRes, iRes, sumRes, aspRes] = await Promise.all([
        safeSupabaseSelect('Pengaduan'),
        safeSupabaseSelect('SuratPengantar'),
        safeSupabaseSelect('Peminjaman'),
        safeSupabaseSelect('Iuran'),
        safeSupabaseSelect('Sumbangan'),
        safeSupabaseSelect('Aspirasi')
      ]);

      const extractDate = (item) => item.created_at || item.createdat || item.timestamp || item.waktu || item.tanggal || item.tanggal_bayar || cariNilaiKolom(item, ['created_at', 'createdat', 'timestamp', 'waktu', 'tanggal', 'tanggal_bayar', 'tgl']) || null;

      if (cleanRole === 'rt') {
        // 1. Aduan Warga - semua masuk
        (aRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || 'Baru';
          let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Umum';
          let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pelapor']) || 'Warga';
          let id    = item.id || cariNilaiKolom(item, ['id']) || ('ADU-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'Pengaduan', pesan: `Aduan ${jenis} dari ${nama}: (${st})`, rawDate });
        });

        // 2. Surat Pengantar - yang belum/menunggu
        (sRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || '';
          let stL   = st.toLowerCase();
          if (stL.includes('belum') || stL.includes('menunggu') || stL.includes('baru') || !st) {
            let nama      = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pemohon']) || 'Warga';
            let jenisSurat= cariNilaiKolom(item, ['jenis_surat', 'keperluan', 'jenis']) || 'Surat';
            let id        = item.id || cariNilaiKolom(item, ['id']) || ('SRT-' + Math.random());
            let rawDate   = extractDate(item);
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Pengajuan ${jenisSurat} dari ${nama}`, rawDate });
          }
        });

        // 3. Peminjaman Aset - yang menunggu verifikasi
        (pRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('menunggu') || stL.includes('belum') || stL.includes('baru') || !st) {
            let nama  = cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']) || 'Warga';
            let barang= cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']) || 'Aset';
            let qty   = cariNilaiKolom(item, ['jumlah', 'qty']) || '1';
            let id    = item.id || cariNilaiKolom(item, ['id', 'id_pinjam']) || ('PIN-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Aset', pesan: `Pengajuan Pinjam ${barang} (${qty} unit) dari ${nama}`, rawDate });
          }
        });

        // 4. Iuran - yang perlu verifikasi RT
        (iRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('menunggu') || stL.includes('verifikasi')) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let bulan = cariNilaiKolom(item, ['bulan']) || '';
            let tahun = cariNilaiKolom(item, ['tahun']) || '';
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('IUR-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} ${tahun} dari ${nama} perlu verifikasi`, rawDate });
          }
        });

        // 5. Sumbangan - yang belum diverifikasi
        (sumRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('belum') || stL.includes('menunggu') || stL.includes('baru') || !st) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('SUM-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Sumbangan', pesan: `Sumbangan Baru dari ${nama} (${st || 'Belum diverifikasi'})`, rawDate });
          }
        });

        // 6. Aspirasi - yang baru/belum ditanggapi
        (aspRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('baru') || !st) {
            let isi = cariNilaiKolom(item, ['isi_aspirasi', 'isi', 'aspirasi', 'pesan', 'saran']) || 'Masukan baru';
            let id  = item.id || cariNilaiKolom(item, ['id']) || ('ASP-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Aspirasi', pesan: `Aspirasi Anonim: "${isi.length > 35 ? isi.substring(0, 35) + '...' : isi}"`, rawDate });
          }
        });

      } else {
        // ---- NOTIFIKASI WARGA ----
        (aRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st    = cariNilaiKolom(item, ['status']) || 'Diproses';
            let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Aduan';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Pengaduan', pesan: `Status Aduan ${jenis}: ${st}`, rawDate });
          }
        });
        (sRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st = cariNilaiKolom(item, ['status']) || 'Diproses';
            let id = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Surat Pengantar Anda: Status kini "${st}"`, rawDate });
          }
        });
        (pRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st     = cariNilaiKolom(item, ['status']) || 'Di-update';
            let barang = cariNilaiKolom(item, ['nama_barang','nama_aset','barang']) || 'Barang';
            let id     = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Aset', pesan: `Peminjaman ${barang}: ${st}`, rawDate });
          }
        });
        (iRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st    = cariNilaiKolom(item, ['status']) || '';
            let bulan = cariNilaiKolom(item, ['bulan']) || '';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            if (st.toLowerCase().includes('lunas')) {
              notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} telah LUNAS diverifikasi RT!`, rawDate });
            }
          }
        });
      }

      return { status: 'success', data: notifs };
    }

    if (actionName === 'getInfoWarga') {
      const { data: safeData } = await safeSupabaseSelect('Pengaturan');
      let target = safeData ? safeData.find(x => x.kunci === 'info_warga') : null;
      return { status: 'success', data: target ? target.nilai : '' };
    }

    if (actionName === 'getDashboardSummary') {
      const cleanRole = (session.role || 'warga').toLowerCase();
      if (cleanRole === 'rt') {
        const [wRes, aRes, kRes, sRes, sumRes] = await Promise.all([
          safeSupabaseSelect('Warga'), safeSupabaseSelect('Pengaduan'),
          safeSupabaseSelect('Keuangan'), safeSupabaseSelect('SuratPengantar'),
          safeSupabaseSelect('Sumbangan')
        ]);
        return {
          status: 'success', role: 'RT',
          warga:    wRes.data   ? wRes.data.length   : 0,
          aduan:    aRes.data   ? aRes.data.length   : 0,
          keuangan: kRes.data   ? kRes.data.length   : 0,
          surat:    sRes.data   ? sRes.data.length   : 0,
          sumbangan:sumRes.data ? sumRes.data.length : 0
        };
      } else {
        const countByNik = (safeData) => {
          if (!safeData) return 0;
          return safeData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
            return rNik && rNik.toString().trim() === session.nik.toString().trim();
          }).length;
        };
        const [aRes, sRes, sumRes] = await Promise.all([
          safeSupabaseSelect('Pengaduan'), safeSupabaseSelect('SuratPengantar'),
          safeSupabaseSelect('Sumbangan')
        ]);
        return { status: 'success', role: 'Warga', aduan: countByNik(aRes.data), surat: countByNik(sRes.data), sumbangan: countByNik(sumRes.data) };
      }
    }

    if (actionName === 'getDaftarWargaUntukIuran') {
      const { data: safeData } = await safeSupabaseSelect('Warga');
      return { status: 'success', data: safeData || [] };
    }

    if (actionName.toLowerCase().includes('profil') || actionName.toLowerCase().includes('profile')) {
      const nikCari = params.nik || session.nik || session.nama;
      const { data: safeWarga } = await safeSupabaseSelect('Warga');
      if (!safeWarga || safeWarga.length === 0) return { status: 'error', message: 'Data warga tidak ditemukan' };

      let myData = null, myKk = '';
      for (let w of safeWarga) {
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
        if (wNik && wNik.toString().trim() === String(nikCari).trim()) { myData = w; myKk = cariNilaiKolom(w, ['kk', 'no_kk']); break; }
      }
      if (!myData && nikCari) {
        myData = safeWarga.find(w => { let wNama = cariNilaiKolom(w, ['nama', 'name']); return wNama && wNama.toLowerCase().includes(String(nikCari).toLowerCase()); });
        if (myData) myKk = cariNilaiKolom(myData, ['kk', 'no_kk']);
      }
      if (!myData) return { status: 'error', message: 'Profil Anda belum terdaftar!' };

      let keluarga = myKk ? safeWarga.filter(w => {
        let wKk  = cariNilaiKolom(w, ['kk', 'no_kk']);
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
        return wKk && wKk === myKk && wNik !== cariNilaiKolom(myData, ['nik', 'ktp']);
      }) : [];

      const headers = Object.keys(myData);
      headers.forEach(h => {
        if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
          myData[h] = convertToImageLink(myData[h]);
          keluarga.forEach(m => { m[h] = convertToImageLink(m[h]); });
        }
      });
      return { status: 'success', pribadi: myData, keluarga, headers, data: myData, row: myData, user: myData };
    }

    if (actionName.toLowerCase().startsWith('get') && actionName.toLowerCase().endsWith('data')) {
      let rawName = actionName.replace(/^get/i, '').replace(/data$/i, '');
      let tableName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const { data: safeData } = await safeSupabaseSelect(tableName);
      if (safeData && safeData.length > 0) {
        const headers = Object.keys(safeData[0]);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', headers, rows, data: safeData };
      }
    }

    return { status: 'error', message: 'Aksi GET tidak dikenal: ' + actionName };
  } catch (err) {
    console.error('Fetch Error (GET):', err);
    return { status: 'error', message: 'Gagal memuat data Supabase: ' + err.message };
  }
}

// ==========================================================
// ==== NOTIFIKASI REALTIME (SOUND, WEBSOCKET, PUSH) ========
// ==========================================================
function playNotifSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}

function triggerNativeBrowserNotif(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: 'https://file.aiquickdraw.com/imgcompressed/img/compressed_517f8d7424520a05c902d8a1c25e1ab6.webp' });
    } catch(e) {}
  }
}

function initRealtimeNotif() {
  if (!db || !session.token) return;
  if (supabaseRealtimeChannel) db.removeChannel(supabaseRealtimeChannel);
  supabaseRealtimeChannel = db
    .channel('rt-realtime-notif')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      console.log('⚡ Realtime Update Diterima:', payload.table);
      fetchNotifikasi(true);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('🟢 Supabase Realtime Listener Active!');
    });
}

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

async function fetchNotifikasi(isRealtimeTrigger = false) {
  if (!session.token) return;
  const res = await callGASGet('getNotifications');
  if (res && res.status === 'success') {
    rawNotifData = res.data || [];

    let savedTimestamps = JSON.parse(localStorage.getItem('rt_notif_times_' + session.nik) || '{}');
    let now = new Date();

    rawNotifData.forEach(item => {
      let notifDate = null;
      if (item.rawDate) {
        notifDate = parseTanggalKeDate(item.rawDate);
      }
      if ((!notifDate || isNaN(notifDate.getTime())) && savedTimestamps[item.id]) {
        let savedDate = new Date(savedTimestamps[item.id]);
        if (!isNaN(savedDate.getTime())) notifDate = savedDate;
      }
      if (!notifDate || isNaN(notifDate.getTime())) {
        notifDate = new Date();
        savedTimestamps[item.id] = notifDate.toISOString();
      } else {
        savedTimestamps[item.id] = notifDate.toISOString();
      }

      item.timestampMs = notifDate.getTime();
      let isHariIni = notifDate.toDateString() === now.toDateString();
      let jamStr = notifDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';
      item.waktuTampil = isHariIni ? jamStr : (notifDate.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + jamStr);
    });

    localStorage.setItem('rt_notif_times_' + session.nik, JSON.stringify(savedTimestamps));

    // Urutkan notifikasi dari TERBARU ke TERLAMA (Newest first)
    rawNotifData.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));

    let unreadCount = rawNotifData.length;
    if (isRealtimeTrigger && unreadCount > lastNotifCount && lastNotifCount !== 0) {
      playNotifSound();
      let notifTerbaru = rawNotifData[0];
      if (notifTerbaru) triggerNativeBrowserNotif(`SI RT 05 - ${notifTerbaru.menu}`, notifTerbaru.pesan);
    }
    lastNotifCount = unreadCount;

    let readCount = parseInt(localStorage.getItem('rt_notif_read_count_' + session.nik) || '0');
    if (rawNotifData.length < readCount) { readCount = 0; localStorage.setItem('rt_notif_read_count_' + session.nik, '0'); }
    let actualUnread = rawNotifData.length - readCount;

    document.querySelectorAll('.notif-badge').forEach(badge => {
      if (actualUnread > 0) {
        badge.innerText = actualUnread;
        badge.style.display = 'inline-block';
        badge.classList.add('animate-pulse');
      } else {
        badge.style.display = 'none';
        badge.classList.remove('animate-pulse');
      }
    });
  }
}

function bukaModalNotifikasi() {
  let listEl = document.getElementById('notifList');
  if (!rawNotifData || rawNotifData.length === 0) {
    listEl.innerHTML = '<div class="alert alert-light text-center my-3 text-muted"><i class="bi bi-bell-slash fs-4 d-block mb-2"></i>Tidak ada notifikasi baru saat ini.</div>';
  } else {
    let html = '<div class="list-group list-group-flush">';
    rawNotifData.forEach(item => {
      let waktu = item.waktuTampil || 'Baru saja';
      html += `
        <div class="list-group-item list-group-item-action py-3 px-2 border-bottom" style="cursor:pointer;" onclick="bukaNotifTarget('${item.menu}')">
          <div class="d-flex w-100 justify-content-between align-items-center mb-1">
            <span class="badge bg-primary">${item.menu}</span>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${waktu}</small>
          </div>
          <p class="mb-0 text-dark small">${item.pesan}</p>
        </div>`;
    });
    html += '</div>';
    listEl.innerHTML = html;
  }

  document.querySelectorAll('.notif-badge').forEach(badge => {
    badge.style.display = 'none';
    badge.innerText = '0';
    badge.classList.remove('animate-pulse');
  });
  localStorage.setItem('rt_notif_read_count_' + session.nik, rawNotifData.length);

  if (!bootstrapNotifModalInstance) bootstrapNotifModalInstance = new bootstrap.Modal(document.getElementById('notifModal'));
  bootstrapNotifModalInstance.show();
}

function bukaNotifTarget(menuName) {
  if (bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();
  loadMenu(menuName);
}

// ==========================================================
// ==== AUTHENTICATION & SESSION ============================
// ==========================================================
async function doLogin() {
  try {
    var u = document.getElementById('username').value;
    var p = document.getElementById('password').value;
    if (!u || !p) { document.getElementById('login-msg').innerHTML = "Isi username dan password dulu!"; return; }
    document.getElementById('login-msg').innerHTML = "Memeriksa ke database...";

    const res = await callGASPost('processLogin', { username: u, password: p });
    if (res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();
      session.token  = res.token  || '';
      session.role   = (roleClean === 'rt') ? 'RT' : 'Warga';
      session.nik    = res.nik    ? res.nik.toString().trim()    : '';
      session.nama   = res.nama   ? res.nama.toString().trim()   : '';
      session.alamat = res.alamat ? res.alamat.toString().trim() : '';
      session.noHp   = res.noHp   ? res.noHp.toString().trim()   : '';
      localStorage.setItem('rt_user_session', JSON.stringify(session));
      applySessionUI();
    } else {
      document.getElementById('login-msg').innerHTML = res ? res.message : 'Login gagal!';
    }
  } catch (error) {
    alert("Browser JS Error: " + error.message);
  }
}

function applySessionUI() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  document.getElementById('mob-header').classList.add('show-nav');
  document.getElementById('mob-nav').classList.add('show-nav');

  if (session.role === 'Warga') {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.rt-only').forEach(el => {
      if (el.classList.contains('bottom-nav-item')) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'block';
      }
    });
  }

  loadMenu('Dashboard');
  requestNotifPermission();
  initRealtimeNotif();
  fetchNotifikasi();

  if (notifTimer) clearInterval(notifTimer);
  notifTimer = setInterval(async function() {
    if (session.token && document.visibilityState === "visible") {
      fetchNotifikasi();
      if (currentActiveMenu === 'Dashboard' && typeof muatInfoWargaRealtime === 'function') {
        let isModalOpen = document.body.classList.contains('modal-open') || document.querySelector('.modal.show') || document.querySelector('#modal-kelola-aset:not(.hidden)');
        if (!isModalOpen) muatInfoWargaRealtime();
      }
    }
  }, 15000);
}

function doLogout() {
  if (confirm('Apakah Anda yakin ingin logout?')) {
    if (notifTimer) clearInterval(notifTimer);
    if (supabaseRealtimeChannel && db) db.removeChannel(supabaseRealtimeChannel);
    document.getElementById('mob-header').classList.remove('show-nav');
    document.getElementById('mob-nav').classList.remove('show-nav');
    localStorage.removeItem('rt_user_session');
    location.reload();
  }
}

function checkExistingSession() {
  let savedSession = localStorage.getItem('rt_user_session');
  if (savedSession) {
    try {
      session = JSON.parse(savedSession);
      if (session && session.role) applySessionUI();
    } catch(e) {
      localStorage.removeItem('rt_user_session');
    }
  }
}

function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if (dEl) dEl.classList.add('active-menu');
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if (mEl) mEl.classList.add('active');
}

// ==========================================================
// ==== NAVIGASI MENU =======================================
// ==========================================================
async function loadMenu(menu) {
  currentActiveMenu = menu;
  syncActiveNav(menu);
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : (menu === 'Profil' ? 'Profil Saya' : menu);
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";

  // ✅ SWITCH TUNGGAL - TIDAK DUPLIKAT
  switch(menu) {
    case 'Dashboard':    if (typeof loadDashboardView   === 'function') { loadDashboardView();   return; } break;
    case 'Profil':       if (typeof loadProfilView       === 'function') { loadProfilView();       return; } break;
    case 'Warga':        if (typeof loadWargaView        === 'function') { loadWargaView();        return; } break;
    case 'Kelahiran':    if (typeof loadKelahiranView    === 'function') { loadKelahiranView();    return; } break;
    case 'Kematian':     if (typeof loadKematianView     === 'function') { loadKematianView();     return; } break;
    case 'PindahMasuk':  if (typeof loadPindahMasukView  === 'function') { loadPindahMasukView();  return; } break;
    case 'PindahKeluar': if (typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;
    case 'Pengaturan':   if (session.role === 'RT') { renderPengaturanRTView(); return; } break;
  }

  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data dari server...</small></div>';

  const res = await callGASGet('getTableData', { sheetName: menu });
  if (res && res.status === 'success') {
    currentHeaders = res.headers || [];
    currentRows    = res.rows    || [];
    renderTable(res, menu);
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data dari server.</div>';
  }
}

// ==========================================================
// ==== RENDER TABLE ========================================
// ==========================================================
function renderTable(data, menu) {
  let html = '';
  let bolehTambah = session.role === 'RT' || (session.role === 'Warga' && ['Pengaduan','SuratPengantar','Sumbangan','Aset','Peminjaman','Aspirasi'].includes(menu));
  if (bolehTambah) {
    let labelTombol = session.role === 'RT' ? '+ Tambah Data Baru' : (menu === 'Aspirasi' ? '+ Tulis Aspirasi Anonim' : '+ Buat Pengajuan / Form Baru');
    html += `<button class="btn btn-success fw-bold mb-3 shadow-sm px-3 py-2" onclick="bukaModalForm()"><i class="bi bi-plus-circle me-2"></i>${labelTombol}</button>`;
  }

  if (!data || !data.rows || data.rows.length === 0) {
    html += '<div class="alert alert-light border text-muted mt-2"><i class="bi bi-folder-x me-2"></i>Belum ada data.</div>';
    document.getElementById('main-content').innerHTML = html;
    return;
  }

  html += '<div class="card card-custom"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="dataTable">';
  html += '<thead class="table-light"><tr>';
  data.headers.forEach(h => html += `<th class="py-3 text-secondary" style="font-size:0.85rem;">${h.toUpperCase()}</th>`);
  html += '<th class="py-3 text-secondary text-center">AKSI</th></tr></thead><tbody>';

  [...data.rows].reverse().forEach(row => {
    html += '<tr>';
    row.forEach((val, idx) => {
      let headName = data.headers[idx].toLowerCase();
      if (headName.includes('foto') || headName.includes('bukti')) {
        let directUrl = convertToImageLink(val);
        html += `<td>${val && val !== '***Rahasia***' ? `<img src="${directUrl}" class="img-table" onclick="bukaPopUpFoto('${val}')">` : '-'}</td>`;
      } else {
        html += `<td>${val}</td>`;
      }
    });
    html += `<td class="text-center">${getTombolAksi(menu, row, data.headers)}</td></tr>`;
  });
  html += '</tbody></table></div></div>';
  document.getElementById('main-content').innerHTML = html;
}

function bukaPopUpFoto(urlImg) {
  document.getElementById('modalPreviewImg').src = convertToImageLink(urlImg);
  if (!bootstrapImageModalInstance) bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  bootstrapImageModalInstance.show();
}

async function bukaModalForm() {
  editingId = null;
  document.getElementById('formModalTitle').innerText = "Form Input: " + currentActiveMenu;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  await generateFormInputs(null);
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  bootstrapModalInstance.show();
}

async function bukaModalEdit(id) {
  editingId = id;
  document.getElementById('formModalTitle').innerText = "Edit Data: " + currentActiveMenu;
  document.getElementById('btn-hapus-modal').style.display = session.role === 'RT' ? 'inline-block' : 'none';
  let rowData = currentRows.find(r => r[0] === id);
  await generateFormInputs(rowData);
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  bootstrapModalInstance.show();
}

async function generateFormInputs(rowData) {
  let formBody = document.getElementById('dynamicForm');
  formBody.innerHTML = '';

  if (session.role === 'Warga' && !rowData && (!session.alamat || !session.nama) && session.nik) {
    try {
      const { data: safeWarga } = await safeSupabaseSelect('Warga');
      if (safeWarga) {
        let myW = safeWarga.find(w => String(cariNilaiKolom(w, ['nik', 'ktp'])).trim() === String(session.nik).trim());
        if (myW) {
          session.alamat = session.alamat || cariNilaiKolom(myW, ['alamat', 'alamat_rumah']) || '';
          session.nama   = session.nama   || cariNilaiKolom(myW, ['nama_lengkap', 'nama']) || '';
          localStorage.setItem('rt_user_session', JSON.stringify(session));
        }
      }
    } catch(e) {}
  }

  for (let idx = 0; idx < currentHeaders.length; idx++) {
    let h = currentHeaders[idx];
    if (['id','no','saldo'].includes(h.toLowerCase())) continue;
    let nameLower = h.toLowerCase().trim();
    let labelText = h.replace('_', ' ').toUpperCase();
    let val = rowData ? rowData[idx] : "";
    if ((nameLower === 'status' || nameLower.includes('penyelesaian') || nameLower.includes('admin')) && (session.role !== 'RT' || !rowData)) continue;
    if (session.role === 'Warga' && !rowData) {
      if (nameLower === 'nik') val = session.nik;
      if (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama')) val = session.nama;
      if (nameLower.includes('alamat')) val = session.alamat;
      if (['no_hp','hp','telp','wa'].includes(nameLower)) val = session.noHp;
    }
    if (val && nameLower.includes('tanggal') && val.includes('/')) {
      let parts = val.split('/');
      if (parts.length === 3) val = parts[2] + '-' + parts[1] + '-' + parts[0];
    }

    let inputHtml = '';
    if (nameLower === 'status' && ['Pengaduan','SuratPengantar','Sumbangan'].includes(currentActiveMenu)) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="Belum di verifikasi" ${val==='Belum di verifikasi'?'selected':''}>Belum di verifikasi</option>
        <option value="Sedang ditindak lanjuti" ${val==='Sedang ditindak lanjuti'?'selected':''}>Sedang ditindak lanjuti</option>
        <option value="selesai" ${val==='selesai'?'selected':''}>selesai</option>
        <option value="di tolak" ${val==='di tolak'?'selected':''}>di tolak</option>
        <option value="diterima" ${val==='diterima'?'selected':''}>diterima</option>
      </select>`;
    } else if (nameLower === 'jenis_aduan' || (currentActiveMenu === 'Pengaduan' && nameLower.includes('jenis'))) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Jenis Aduan --</option>
        <option value="KEAMANAN" ${val.toUpperCase()==='KEAMANAN'?'selected':''}>KEAMANAN</option>
        <option value="KEBERSIHAN" ${val.toUpperCase()==='KEBERSIHAN'?'selected':''}>KEBERSIHAN</option>
        <option value="LAMPU JALAN" ${val.toUpperCase()==='LAMPU JALAN'?'selected':''}>LAMPU JALAN</option>
        <option value="JALANAN" ${val.toUpperCase()==='JALANAN'?'selected':''}>JALANAN</option>
        <option value="LAINNYA" ${val.toUpperCase()==='LAINNYA'?'selected':''}>LAINNYA</option>
      </select>`;
    } else if (nameLower.includes('tanggal')) {
      inputHtml = `<input type="date" class="form-control dynamic-input" data-key="${h}" value="${val}">`;
    } else if (nameLower === 'jenis_kelamin') {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Jenis Kelamin --</option>
        <option value="LAKI-LAKI" ${['LAKI-LAKI','LAKI LAKI'].includes(val.toUpperCase())?'selected':''}>LAKI-LAKI</option>
        <option value="PEREMPUAN" ${val.toUpperCase()==='PEREMPUAN'?'selected':''}>PEREMPUAN</option>
      </select>`;
    } else if (nameLower === 'status_nikah' || (nameLower === 'status' && currentActiveMenu === 'Warga')) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Status Nikah --</option>
        <option value="MENIKAH" ${val.toUpperCase()==='MENIKAH'?'selected':''}>MENIKAH</option>
        <option value="BELUM MENIKAH" ${['BELUM MENIKAH','BELUM'].includes(val.toUpperCase())?'selected':''}>BELUM MENIKAH</option>
      </select>`;
    } else if (nameLower === 'status_tinggal' || nameLower === 'status_pindah') {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Status Tinggal --</option>
        <option value="TETAP" ${val.toUpperCase()==='TETAP'?'selected':''}>TETAP</option>
        <option value="KONTRAK" ${val.toUpperCase()==='KONTRAK'?'selected':''}>KONTRAK</option>
      </select>`;
    } else if (nameLower.includes('foto') || nameLower.includes('bukti')) {
      let imgDirect = convertToImageLink(val);
      let isValidVal = val && val !== 'EMPTY' && val !== 'NULL' && val !== '-' && !val.includes('***');
      inputHtml = `
        ${isValidVal ? `<div class="mb-2"><img src="${imgDirect}" class="rounded border shadow-sm mb-2" style="max-height:110px;object-fit:cover;" onclick="bukaPopUpFoto('${val}')"></div>` : ''}
        <div class="card p-2 bg-light border-0">
          <div class="mb-2">
            <label class="form-label text-[10px] text-gray-500 font-bold mb-1">1. Upload Foto (Galeri / Kamera HP):</label>
            <input type="file" class="form-control form-control-sm dynamic-file-input" data-key="${h}" accept="image/*">
          </div>
          <div>
            <label class="form-label text-[10px] text-gray-500 font-bold mb-1">2. Atau Tempel Link URL Foto (https://...):</label>
            <input type="text" class="form-control form-control-sm dynamic-input-photo" data-key="${h}" value="${isValidVal && !val.startsWith('data:') ? val : ''}" placeholder="https://...">
          </div>
        </div>`;
    } else {
      let isReadonly = (session.role === 'Warga' && !rowData && (nameLower === 'nik' || nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama') || nameLower.includes('alamat'))) ? 'readonly style="background-color:#f1f5f9;cursor:not-allowed;"' : '';
      inputHtml = `<input type="text" class="form-control dynamic-input" data-key="${h}" value="${val}" placeholder="Masukkan ${labelText.toLowerCase()}..." ${isReadonly}>`;
    }
    formBody.innerHTML += `<div class="mb-3"><label class="form-label small text-secondary fw-bold">${labelText}</label>${inputHtml}</div>`;
  }
}

function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
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

function submitFormBaru(e) {
  if (e) e.preventDefault();
  let payload = {};
  document.querySelectorAll('.dynamic-input').forEach(inp => { payload[inp.getAttribute('data-key')] = inp.value; });
  document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary mb-2"></div><br><b>Memproses & mengompres foto...</b></div>';

  let filePromises = [];
  document.querySelectorAll('.dynamic-file-input').forEach(fileInp => {
    let key = fileInp.getAttribute('data-key');
    let file = fileInp.files[0];
    if (file) {
      filePromises.push(compressImageFile(file).then(compressedUrl => {
        payload[key] = compressedUrl;
      }));
    }
  });

  document.querySelectorAll('.dynamic-input-photo').forEach(photoInp => {
    let key = photoInp.getAttribute('data-key');
    let val = photoInp.value.trim();
    if (!payload[key] && val) {
      payload[key] = val;
    }
  });

  Promise.all(filePromises).then(async () => {
    if (editingId) {
      for (let k in payload) {
        if ((k.toLowerCase().includes('foto') || k.toLowerCase().includes('bukti')) && !payload[k]) {
          delete payload[k];
        }
      }
      const res = await callGASPost('updateDataDiSheet', { sheetName: currentActiveMenu, id: editingId, formData: payload });
      if (res && res.status === 'success') { bootstrapModalInstance.hide(); alert(res.message); loadMenu(currentActiveMenu); fetchNotifikasi(); }
      else { alert('Gagal memperbarui: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }
    } else {
      const res = await callGASPost('simpanDataKeSheet', { sheetName: currentActiveMenu, formData: payload });
      if (res && res.status === 'success') {
        bootstrapModalInstance.hide(); alert('Data Berhasil Disimpan!');
        if (session.role === 'Warga') {
          if (currentActiveMenu === 'Pengaduan'      && typeof waKirimLaporan         === 'function') waKirimLaporan('aduan', res.id);
          if (currentActiveMenu === 'SuratPengantar' && typeof waKirimLaporan         === 'function') waKirimLaporan('surat', res.id);
          if (currentActiveMenu === 'Sumbangan'      && typeof waVerifikasiSumbangan  === 'function') waVerifikasiSumbangan(res.id);
        }
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else { alert('Gagal menyimpan: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }
    }
  }).catch(err => { alert('Gagal membaca file foto: ' + err.message); loadMenu(currentActiveMenu); });
}

async function hapusDataAktif() {
  if (!editingId) return;
  if (confirm('Hapus data ini secara permanen dari database?')) {
    document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><b class="text-danger">Menghapus data...</b></div>';
    const res = await callGASPost('hapusDataDariSheet', { sheetName: currentActiveMenu, id: editingId });
    if (res && res.status === 'success') { bootstrapModalInstance.hide(); alert('Data Berhasil Dihapus!'); loadMenu(currentActiveMenu); fetchNotifikasi(); }
    else { alert('Gagal menghapus: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }
  }
}

function getTombolAksi(menu, row, headers) {
  let id = row[0];
  let lowerHeaders = headers.map(h => h.toLowerCase().trim());
  let noHpIdx = lowerHeaders.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';
  if (session.role === 'RT') {
    let btn = `<button class="btn btn-sm btn-outline-primary m-1 fw-bold" onclick="bukaModalEdit('${id}')">Edit/Status</button>`;
    if (['Pengaduan','SuratPengantar'].includes(menu)) btn += `<button class="btn btn-sm btn-success m-1 fw-bold" onclick="waKirimLaporanKeWarga('${id}','${noHpWarga}')"><i class="bi bi-whatsapp me-1"></i>Laporan</button>`;
    return btn;
  }
  if (session.role === 'Warga') {
    if (menu === 'Pengaduan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('aduan','${id}')"><i class="bi bi-whatsapp me-1"></i>WA Lapor</button>`;
    if (menu === 'SuratPengantar') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('surat','${id}')"><i class="bi bi-whatsapp me-1"></i>WA Surat</button>`;
    if (menu === 'Keuangan')       return `<button class="btn btn-sm btn-danger fw-bold" onclick="waLaporMasalahKeuangan('${id}')">Laporkan</button>`;
    if (menu === 'Sumbangan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waVerifikasiSumbangan('${id}')"><i class="bi bi-whatsapp me-1"></i>Verifikasi</button>`;
  }
  return '-';
}

function bukaWa(nomor, text) {
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(text)}`, '_blank');
}

function filterTable() {
  let input = document.getElementById("searchInput").value.toUpperCase().trim();
  document.querySelectorAll("#dataTable tbody tr").forEach(row => { row.style.display = row.innerText.toUpperCase().includes(input) ? "" : "none"; });
  document.querySelectorAll(".quick-action-item").forEach(item => { item.style.display = item.innerText.toUpperCase().includes(input) ? "flex" : "none"; });
}

// ==========================================================
// ==== MODUL PENGATURAN RT & SISTEM (THEME, QRIS, USERS) ===
// ==========================================================
let appSettings = {
  app_title: 'SISTEM INFORMASI RT 05',
  app_subtitle: 'AMAN, BERSIH, MODERN, TRANSPARAN DAN EFISIEN',
  app_logo: 'https://file.aiquickdraw.com/imgcompressed/img/compressed_517f8d7424520a05c902d8a1c25e1ab6.webp',
  app_theme: 'blue',
  payment_rekening: JSON.stringify([
    { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },
    { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }
  ]),
  payment_qris_string: '00020101021126570011ID.DANA.WWW011893600915311093669202091109366920303UKE51440014ID.CO.QRIS.WWW0215ID10210624013640303UKE5204899953033605802ID5909SHN GROUP6010Kab. Bogor6105163206304BAFC',
  payment_qris_name: 'SHN GROUP / RT 05',
  payment_qris: '',
  info_warga: ''
};

async function loadAppSettings() {
  try {
    const { data: settingsData } = await safeSupabaseSelect('Pengaturan');
    if (settingsData && settingsData.length > 0) {
      settingsData.forEach(row => {
        let k = row.kunci || cariNilaiKolom(row, ['kunci', 'key']);
        let v = row.nilai !== null && row.nilai !== undefined ? row.nilai : cariNilaiKolom(row, ['nilai', 'value']);
        if (k) appSettings[k] = v;
      });
    }

    if (appSettings.app_title) {
      ['login-app-title', 'mob-app-title', 'sidebar-app-title'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.innerText = appSettings.app_title;
      });
    }
    if (appSettings.app_subtitle) {
      ['login-app-subtitle', 'mob-app-subtitle'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.innerHTML = `<small>${appSettings.app_subtitle}</small>`;
      });
    }
    if (appSettings.app_logo) {
      document.querySelectorAll('.app-logo-img').forEach(img => {
        img.src = appSettings.app_logo;
      });
    }

    applyTheme(appSettings.app_theme || 'blue');
    renderHeaderRekeningInfo();
  } catch(e) {
    console.error('Gagal memuat pengaturan:', e);
  }
}

function applyTheme(themeName) {
  document.body.classList.remove('theme-blue', 'theme-emerald', 'theme-indigo', 'theme-purple', 'theme-dark');
  document.body.classList.add('theme-' + (themeName || 'blue'));
  if (themeName === 'dark') {
    document.body.style.backgroundColor = '#0f172a';
    document.body.style.color = '#f8fafc';
  } else {
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
}

function renderHeaderRekeningInfo() {
  let rekEl = document.getElementById('rek-info');
  if (!rekEl) return;

  let list = [];
  try { list = JSON.parse(appSettings.payment_rekening || '[]'); } catch(e) {}
  if (!Array.isArray(list) || list.length === 0) {
    rekEl.style.display = 'none';
    return;
  }

  let html = `<h5 class="fw-bold text-primary mb-2"><i class="bi bi-info-circle-fill me-2"></i>Info Rekening & Pembayaran</h5><p class="mb-1 text-secondary">`;
  list.forEach((r, idx) => {
    let b = r.bank || 'Bank';
    let n = r.no || '-';
    html += `<strong>${b}:</strong> ${n} <button class="btn-salin-inline" onclick="copySingleRek('${n}')">(salin)</button> ${idx < list.length - 1 ? '| ' : ''}`;
  });
  if (list.length > 0 && list[0].an) {
    html += `<span class="ms-2 badge bg-light text-dark">a.n ${list[0].an}</span>`;
  }
  if (appSettings.payment_qris) {
    html += `<button onclick="bukaPopUpFoto('${appSettings.payment_qris}')" class="btn btn-sm btn-outline-primary ms-3 font-bold py-0"><i class="bi bi-qr-code me-1"></i>Lihat QRIS</button>`;
  }
  html += `</p>`;
  rekEl.innerHTML = html;
}

function switchSettingTab(tabName) {
  document.querySelectorAll('.setting-tab-panel').forEach(p => p.classList.add('d-none'));
  document.querySelectorAll('#settingTabs .nav-link').forEach(b => b.classList.remove('active'));

  let panel = document.getElementById('tab-content-' + tabName);
  let btn = document.getElementById('tab-' + tabName + '-btn');
  if (panel) panel.classList.remove('d-none');
  if (btn) btn.classList.add('active');
}

function selectThemeOption(themeName) {
  document.getElementById('set-app-theme').value = themeName;
  applyTheme(themeName);
}

function tambahBarisRekening() {
  let container = document.getElementById('container-rekening-list');
  if (!container) return;
  let div = document.createElement('div');
  div.className = 'row g-2 align-items-center border p-2 rounded bg-light row-rek-item';
  div.innerHTML = `
    <div class="col-md-3">
      <input type="text" class="form-control form-control-sm inp-rek-bank" placeholder="Nama Bank/Wallet" required>
    </div>
    <div class="col-md-4">
      <input type="text" class="form-control form-control-sm inp-rek-no" placeholder="Nomor Rekening/HP" required>
    </div>
    <div class="col-md-4">
      <input type="text" class="form-control form-control-sm inp-rek-an" placeholder="a.n. Nama Pemilik" required>
    </div>
    <div class="col-md-1 text-center">
      <button type="button" class="btn btn-sm btn-danger px-2" onclick="this.closest('.row-rek-item').remove()"><i class="bi bi-trash"></i></button>
    </div>`;
  container.appendChild(div);
}

async function simpanIdentitasDanTema(e) {
  e.preventDefault();
  let title = document.getElementById('set-app-title').value;
  let subtitle = document.getElementById('set-app-subtitle').value;
  let logo = document.getElementById('set-app-logo').value;
  let theme = document.getElementById('set-app-theme').value;

  let settingsArray = [
    { kunci: 'app_title', nilai: title },
    { kunci: 'app_subtitle', nilai: subtitle },
    { kunci: 'app_logo', nilai: logo },
    { kunci: 'app_theme', nilai: theme }
  ];

  const res = await callGASPost('simpanPengaturanApp', { settingsArray });
  if (res && res.status === 'success') {
    alert('Identitas & Tema berhasil diperbarui!');
    await loadAppSettings();
  } else {
    alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));
  }
}

async function simpanRekeningDanQRIS(e) {
  e.preventDefault();
  let qrisString = document.getElementById('set-payment-qris-string').value;
  let qrisName   = document.getElementById('set-payment-qris-name').value;
  let qrisUrl    = document.getElementById('set-payment-qris').value;

  let rekList = [];
  document.querySelectorAll('.row-rek-item').forEach(row => {
    let b = row.querySelector('.inp-rek-bank').value.trim();
    let n = row.querySelector('.inp-rek-no').value.trim();
    let a = row.querySelector('.inp-rek-an').value.trim();
    if (b && n) rekList.push({ bank: b, no: n, an: a });
  });

  let settingsArray = [
    { kunci: 'payment_qris_string', nilai: qrisString },
    { kunci: 'payment_qris_name', nilai: qrisName },
    { kunci: 'payment_qris', nilai: qrisUrl },
    { kunci: 'payment_rekening', nilai: JSON.stringify(rekList) }
  ];

  const res = await callGASPost('simpanPengaturanApp', { settingsArray });
  if (res && res.status === 'success') {
    alert('Rekening & Pengaturan QRIS Dinamis berhasil disimpan!');
    await loadAppSettings();
  } else {
    alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));
  }
}

async function simpanUserBaru(e) {
  e.preventDefault();
  let username = document.getElementById('reg-username').value.trim();
  let nik = document.getElementById('reg-nik').value.trim();
  let password = document.getElementById('reg-password').value.trim();
  let role = document.getElementById('reg-role').value;

  if (!username || !password) {
    alert('Username dan Password wajib diisi!');
    return;
  }

  let userObj = {
    username: username,
    nik: nik || username,
    password: password,
    role: role
  };

  const res = await callGASPost('tambahUserWarga', { userObj });
  if (res && res.status === 'success') {
    alert(`Akun ${username} (${role}) berhasil didaftarkan!`);
    renderPengaturanRTView();
  } else {
    alert('Gagal mendaftarkan user: ' + (res ? res.message : 'Error'));
  }
}

async function resetPasswordUser(username) {
  let newPass = prompt(`Masukkan password baru untuk akun '${username}':`);
  if (!newPass) return;
  const res = await callGASPost('resetPasswordUser', { username: username, newPassword: newPass.trim() });
  if (res && res.status === 'success') {
    alert(`Password untuk '${username}' berhasil diubah!`);
  } else {
    alert('Gagal reset password: ' + (res ? res.message : 'Error'));
  }
}

async function hapusUserAkun(username) {
  if (confirm(`Apakah Anda yakin ingin menghapus akun user '${username}' dari database?`)) {
    const res = await callGASPost('hapusUserAkun', { username: username });
    if (res && res.status === 'success') {
      alert(`Akun '${username}' berhasil dihapus!`);
      renderPengaturanRTView();
    } else {
      alert('Gagal menghapus user: ' + (res ? res.message : 'Error'));
    }
  }
}

async function simpanPengumumanWarga(e) {
  e.preventDefault();
  let teks = document.getElementById('set-info-warga').value;
  const res = await callGASPost('simpanInfoWarga', { teksBaru: teks });
  if (res && res.status === 'success') {
    alert('Pengumuman warga berhasil disimpan!');
    await loadAppSettings();
  } else {
    alert('Gagal menyimpan pengumuman: ' + (res ? res.message : 'Error'));
  }
}

async function renderPengaturanRTView() {
  if (session.role !== 'RT') return;
  document.getElementById('page-title').innerText = 'Pengaturan RT & Sistem';
  document.getElementById('main-content').innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <br><small class="text-muted mt-2 d-block">Memuat pengaturan sistem...</small>
    </div>`;

  await loadAppSettings();
  let usersList = [];
  try {
    const { data: usersData } = await safeSupabaseSelect('Users');
    usersList = usersData || [];
  } catch(e) {}

  let currentRek = [];
  try { currentRek = JSON.parse(appSettings.payment_rekening || '[]'); } catch(e) {}

  let html = `
    <div class="p-1 font-sans">
      <div class="card shadow-sm border-0 rounded-3 mb-4">
        <div class="card-header bg-white border-bottom py-3">
          <ul class="nav nav-pills card-header-pills gap-2" id="settingTabs" role="tablist">
            <li class="nav-item">
              <button class="nav-link active fw-bold text-xs" id="tab-tema-btn" onclick="switchSettingTab('tema')">
                <i class="bi bi-palette-fill me-1"></i> Identitas & Tema
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-rekening-btn" onclick="switchSettingTab('rekening')">
                <i class="bi bi-qr-code-scan me-1"></i> QRIS & Rekening
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-users-btn" onclick="switchSettingTab('users')">
                <i class="bi bi-person-lines-fill me-1"></i> Manajemen Akun Warga
              </button>
            </li>
            <li class="nav-item">
              <button class="nav-link fw-bold text-xs" id="tab-info-btn" onclick="switchSettingTab('info')">
                <i class="bi bi-megaphone-fill me-1"></i> Pengumuman Warga
              </button>
            </li>
          </ul>
        </div>

        <div class="card-body p-4">
          <!-- TAB 1: IDENTITAS & TEMA -->
          <div id="tab-content-tema" class="setting-tab-panel">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-sliders me-2"></i>Pengaturan Identitas & Tema Aplikasi</h5>
            <form onsubmit="simpanIdentitasDanTema(event)">
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">NAMA / JUDUL RT</label>
                <input type="text" id="set-app-title" class="form-control" value="${appSettings.app_title || ''}" placeholder="Contoh: SISTEM INFORMASI RT 05" required>
              </div>
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">SLOGAN / SUBTITLE</label>
                <input type="text" id="set-app-subtitle" class="form-control" value="${appSettings.app_subtitle || ''}" placeholder="Contoh: AMAN, BERSIH, MODERN, TRANSPARAN DAN EFISIEN">
              </div>
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">URL LOGO RT (Link Gambar/Foto)</label>
                <input type="text" id="set-app-logo" class="form-control" value="${appSettings.app_logo || ''}" placeholder="https://...">
                <small class="text-muted">Tempelkan URL foto logo RT. Jika diisi, logo aplikasi di login dan header akan langsung berubah.</small>
              </div>
              <div class="mb-4">
                <label class="form-label font-semibold text-xs text-gray-700">TEMA WARNA APLIKASI</label>
                <div class="row g-2">
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='blue'?'border-primary bg-primary-subtle':''}" onclick="selectThemeOption('blue')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#2563eb;"></div>
                      <small class="fw-bold d-block">Biru Klasik</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='emerald'?'border-success bg-success-subtle':''}" onclick="selectThemeOption('emerald')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#059669;"></div>
                      <small class="fw-bold d-block">Hijau Emerald</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='indigo'?'border-info bg-info-subtle':''}" onclick="selectThemeOption('indigo')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#4f46e5;"></div>
                      <small class="fw-bold d-block">Indigo Modern</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='purple'?'border-warning bg-warning-subtle':''}" onclick="selectThemeOption('purple')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#9333ea;"></div>
                      <small class="fw-bold d-block">Purple Royal</small>
                    </div>
                  </div>
                  <div class="col-6 col-md-2">
                    <div class="p-3 border rounded text-center cursor-pointer ${appSettings.app_theme==='dark'?'border-dark bg-dark text-white':''}" onclick="selectThemeOption('dark')">
                      <div class="rounded-circle mx-auto mb-2" style="width:30px;height:30px;background:#1e293b;"></div>
                      <small class="fw-bold d-block">Dark Mode</small>
                    </div>
                  </div>
                </div>
                <input type="hidden" id="set-app-theme" value="${appSettings.app_theme || 'blue'}">
              </div>
              <button type="submit" class="btn btn-primary fw-bold px-4 py-2"><i class="bi bi-check-circle me-1"></i>Simpan Identitas & Tema</button>
            </form>
          </div>

          <!-- TAB 2: REKENING & QRIS -->
          <div id="tab-content-rekening" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-wallet2 me-2"></i>Pengaturan QRIS Dinamis & Rekening Pembayaran</h5>
            <form onsubmit="simpanRekeningDanQRIS(event)">
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">BASE PAYLOAD QRIS STATIS RT (Payload Kode QRIS DANA/BRI/NMID)</label>
                <textarea id="set-payment-qris-string" rows="3" class="form-control font-mono text-xs mb-1" placeholder="Contoh: 00020101021126570011ID.DANA.WWW...">${appSettings.payment_qris_string || ''}</textarea>
                <small class="text-muted d-block mb-3">*Sistem akan secara otomatis menyisipkan nominal tagihan (seperti Rp 50.000) secara **DINAMIS** dan mengalkulasi ulang checksum CRC16 QRIS saat warga melakukan pembayaran.</small>
              </div>

              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">NAMA MERCHANT / SHIFT KODE QRIS</label>
                <input type="text" id="set-payment-qris-name" class="form-control form-control-sm" value="${appSettings.payment_qris_name || ''}" placeholder="Contoh: SHN GROUP / RT 05">
              </div>

              <div class="mb-4">
                <label class="form-label font-semibold text-xs text-gray-700">URL FOTO QRIS STATIS (OPSIONAL / Gambar Cadangan)</label>
                <input type="text" id="set-payment-qris" class="form-control mb-2" value="${appSettings.payment_qris || ''}" placeholder="https://... (URL foto QRIS cadangan jika ada)">
                ${appSettings.payment_qris ? `<div class="mb-2"><img src="${appSettings.payment_qris}" class="rounded border p-1" style="max-height:100px;" onclick="bukaPopUpFoto('${appSettings.payment_qris}')"><small class="d-block text-muted">Klik untuk pratinjau</small></div>` : ''}
              </div>

              <div class="mb-3 border-t pt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label font-semibold text-xs text-gray-700 mb-0">DAFTAR REKENING BANK / E-WALLET</label>
                  <button type="button" class="btn btn-sm btn-outline-success font-bold" onclick="tambahBarisRekening()"><i class="bi bi-plus-lg me-1"></i>Tambah Rekening</button>
                </div>
                <div id="container-rekening-list" class="space-y-2">`;

  if (currentRek.length === 0) {
    currentRek = [
      { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },
      { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }
    ];
  }

  currentRek.forEach((r) => {
    html += `
      <div class="row g-2 align-items-center border p-2 rounded bg-light row-rek-item">
        <div class="col-md-3">
          <input type="text" class="form-control form-control-sm inp-rek-bank" value="${r.bank || ''}" placeholder="Nama Bank/Wallet" required>
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control form-control-sm inp-rek-no" value="${r.no || ''}" placeholder="Nomor Rekening/HP" required>
        </div>
        <div class="col-md-4">
          <input type="text" class="form-control form-control-sm inp-rek-an" value="${r.an || ''}" placeholder="a.n. Nama Pemilik" required>
        </div>
        <div class="col-md-1 text-center">
          <button type="button" class="btn btn-sm btn-danger px-2" onclick="this.closest('.row-rek-item').remove()"><i class="bi bi-trash"></i></button>
        </div>
      </div>`;
  });

  html += `
                </div>
              </div>
              <button type="submit" class="btn btn-primary fw-bold px-4 py-2 mt-3"><i class="bi bi-check-circle me-1"></i>Simpan Rekening & QRIS</button>
            </form>
          </div>

          <!-- TAB 3: MANAJEMEN AKUN WARGA -->
          <div id="tab-content-users" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-person-plus-fill me-2"></i>Registrasi & Manajemen Akun Login Warga</h5>
            
            <div class="card border p-3 bg-light rounded-3 mb-4">
              <h6 class="fw-bold text-dark mb-2"><i class="bi bi-person-plus me-1 text-success"></i>Tambah / Daftarkan Akun Warga Baru</h6>
              <form onsubmit="simpanUserBaru(event)" class="row g-2">
                <div class="col-md-3">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">Username / NIK</label>
                  <input type="text" id="reg-username" class="form-control form-control-sm" placeholder="Username / NIK Warga" required>
                </div>
                <div class="col-md-3">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">NIK Warga (Opsional)</label>
                  <input type="text" id="reg-nik" class="form-control form-control-sm" placeholder="Sesuai KTP Warga">
                </div>
                <div class="col-md-3">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">Password</label>
                  <input type="password" id="reg-password" class="form-control form-control-sm" placeholder="Password Login" required>
                </div>
                <div class="col-md-2">
                  <label class="form-label text-[10px] font-bold text-muted uppercase">Role User</label>
                  <select id="reg-role" class="form-select form-select-sm">
                    <option value="Warga">Warga</option>
                    <option value="RT">RT / Admin</option>
                  </select>
                </div>
                <div class="col-md-1 d-flex align-items-end">
                  <button type="submit" class="btn btn-sm btn-success w-100 fw-bold">Daftar</button>
                </div>
              </form>
            </div>

            <h6 class="fw-bold text-gray-700 mb-2">Daftar Akun User Terdaftar (${usersList.length})</h6>
            <div class="table-responsive border rounded-3 bg-white">
              <table class="table table-hover text-xs mb-0 align-middle">
                <thead class="table-light text-uppercase">
                  <tr>
                    <th class="p-2">No</th>
                    <th class="p-2">Username</th>
                    <th class="p-2">NIK</th>
                    <th class="p-2">Role</th>
                    <th class="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>`;

  if (usersList.length === 0) {
    html += `<tr><td colspan="5" class="text-center p-3 text-muted">Belum ada akun di tabel Users.</td></tr>`;
  } else {
    usersList.forEach((u, idx) => {
      let uName = u.username || u.name || '-';
      let uNik  = u.nik || '-';
      let uRole = u.role || 'Warga';
      html += `
        <tr>
          <td class="p-2 text-center text-muted">${idx + 1}</td>
          <td class="p-2 font-bold">${uName}</td>
          <td class="p-2 font-mono">${uNik}</td>
          <td class="p-2"><span class="badge ${uRole.toUpperCase()==='RT'?'bg-primary':'bg-secondary'}">${uRole}</span></td>
          <td class="p-2 text-center">
            <button onclick="resetPasswordUser('${uName}')" class="btn btn-sm btn-outline-warning text-[10px] py-0 px-2 fw-bold me-1" title="Reset Password"><i class="bi bi-key me-1"></i>Reset Pass</button>
            <button onclick="hapusUserAkun('${uName}')" class="btn btn-sm btn-outline-danger text-[10px] py-0 px-2 fw-bold" title="Hapus Akun"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`;
    });
  }

  html += `
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 4: PENGUMUMAN WARGA -->
          <div id="tab-content-info" class="setting-tab-panel d-none">
            <h5 class="fw-bold text-primary mb-3"><i class="bi bi-megaphone me-2"></i>Pengumuman & Running Text Dashboard</h5>
            <form onsubmit="simpanPengumumanWarga(event)">
              <div class="mb-3">
                <label class="form-label font-semibold text-xs text-gray-700">TEKS PENGUMUMAN UNTUK WARGA</label>
                <textarea id="set-info-warga" rows="5" class="form-control" placeholder="Tuliskan pengumuman penting yang akan tampil di dashboard warga...">${appSettings.info_warga || ''}</textarea>
              </div>
              <button type="submit" class="btn btn-primary fw-bold px-4 py-2"><i class="bi bi-check-circle me-1"></i>Simpan Pengumuman</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('main-content').innerHTML = html;
}

// ==========================================================
// ==== DOM READY ===========================================
// ==========================================================
document.addEventListener("DOMContentLoaded", function() {
  loadAppSettings();
  checkExistingSession();
  document.addEventListener('submit', e => e.preventDefault());
  window.copySingleRek = function(nomor) {
    navigator.clipboard.writeText(nomor)
      .then(() => alert("Nomor " + nomor + " berhasil disalin!"))
      .catch(err => alert("Gagal menyalin: " + err));
  };
});

document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible" && session.token) fetchNotifikasi();
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA SW terdaftar!', reg))
      .catch(err => console.log('PWA SW gagal:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btnInstall = document.getElementById('btn-install-pwa');
  if (btnInstall) btnInstall.style.display = 'block';
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(c => { if (c.outcome === 'accepted') console.log('PWA Installed!'); deferredPrompt = null; });
  }
}

// ==========================================================
// ==== EASTER EGG ==========================================
// ==========================================================
console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");
console.log("%cMending bayar iuran RT 05 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");

document.addEventListener('contextmenu', e => { e.preventDefault(); alert('MAU NGAPAIN LU? 🤨\nGak ada harta karun di sini!'); });
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key)) || (e.ctrlKey && ['U','u'].includes(e.key))) {
    e.preventDefault();
    alert('MAU NGAPAIN LU? 🤨\nKepo banget mau buka Inspect Element!');
  }
});
