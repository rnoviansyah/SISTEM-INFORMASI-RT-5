// Variable Global Core App[span_2](start_span)[span_2](end_span)
let session = { token: '', role: '', nik: '', nama: '', alamat: '', noHp: '' };[span_3](start_span)[span_3](end_span)
const noWaAdmin = '628973366667';[span_4](start_span)[span_4](end_span)
let currentActiveMenu = '';[span_5](start_span)[span_5](end_span)
let currentHeaders = [];[span_6](start_span)[span_6](end_span)
let currentRows = [];[span_7](start_span)[span_7](end_span)
let editingId = null;[span_8](start_span)[span_8](end_span)
let bootstrapModalInstance = null;[span_9](start_span)[span_9](end_span)
let bootstrapImageModalInstance = null;[span_10](start_span)[span_10](end_span)
let bootstrapNotifModalInstance = null;[span_11](start_span)[span_11](end_span)
let rawNotifData = [];[span_12](start_span)[span_12](end_span)
let notifTimer = null;[span_13](start_span)[span_13](end_span)
let lastInfoWargaText = '';[span_14](start_span)[span_14](end_span)

// Variable Notifikasi Realtime[span_15](start_span)[span_15](end_span)
let supabaseRealtimeChannel = null;[span_16](start_span)[span_16](end_span)
let lastNotifCount = 0;[span_17](start_span)[span_17](end_span)

// ==========================================================
// ==== KONFIGURASI DATABASE SUPABASE =======================
// ==========================================================
const SUPABASE_URL = 'https://kcuuylpqhxagcradfmon.supabase.co';[span_18](start_span)[span_18](end_span)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXV5bHBxaHhhZ2NyYWRmbW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjI5NTEsImV4cCI6MjEwMTEzODk1MX0.kI7sP46AIOLsJKyAg4DWQTNhCWCh22PwFMDogXoUlyg';[span_19](start_span)[span_19](end_span)

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);[span_20](start_span)[span_20](end_span)

// --- SAFE SUPABASE QUERY HELPERS ---
async function safeSupabaseSelect(tableName) {[span_21](start_span)[span_21](end_span)
  try {
    if (tableName.toLowerCase() === 'warga') {[span_22](start_span)[span_22](end_span)
      let userToken = (session && session.token) ? String(session.token).trim() : '';[span_23](start_span)[span_23](end_span)
      let { data, error } = await db.rpc('get_warga_secured', { p_token: userToken });[span_24](start_span)[span_24](end_span)
      if (!error && data) return { data: makeCaseInsensitive(data), error: null };[span_25](start_span)[span_25](end_span)
    }

    let { data, error } = await db.from(tableName).select('*');[span_26](start_span)[span_26](end_span)
    if (!error && data) return { data: makeCaseInsensitive(data), error: null };[span_27](start_span)[span_27](end_span)

    let lowerName = tableName.toLowerCase();[span_28](start_span)[span_28](end_span)
    if (lowerName !== tableName) {[span_29](start_span)[span_29](end_span)
      let resLower = await db.from(lowerName).select('*');[span_30](start_span)[span_30](end_span)
      if (!resLower.error && resLower.data) return { data: makeCaseInsensitive(resLower.data), error: null };[span_31](start_span)[span_31](end_span)
    }

    let capName = tableName.charAt(0).toUpperCase() + tableName.slice(1).toLowerCase();[span_32](start_span)[span_32](end_span)
    if (capName !== tableName && capName !== lowerName) {[span_33](start_span)[span_33](end_span)
      let resCap = await db.from(capName).select('*');[span_34](start_span)[span_34](end_span)
      if (!resCap.error && resCap.data) return { data: makeCaseInsensitive(resCap.data), error: null };[span_35](start_span)[span_35](end_span)
    }

    return { data: makeCaseInsensitive(data || []), error: error };[span_36](start_span)[span_36](end_span)
  } catch(e) {
    return { data: [], error: e };[span_37](start_span)[span_37](end_span)
  }
}

async function safeSupabaseInsert(tableName, rows) {[span_38](start_span)[span_38](end_span)
  let { error } = await db.from(tableName).insert(rows);[span_39](start_span)[span_39](end_span)
  if (error) {
    let lowerName = tableName.toLowerCase();[span_40](start_span)[span_40](end_span)
    if (lowerName !== tableName) {[span_41](start_span)[span_41](end_span)
      let resLower = await db.from(lowerName).insert(rows);[span_42](start_span)[span_42](end_span)
      if (!resLower.error) return { error: null };[span_43](start_span)[span_43](end_span)
    }
  }
  return { error };[span_44](start_span)[span_44](end_span)
}

async function safeSupabaseUpdate(tableName, payload, eqColumn, eqValue) {[span_45](start_span)[span_45](end_span)
  if (tableName.toLowerCase() === 'warga' && String(session.role || '').toUpperCase() !== 'RT') {[span_46](start_span)[span_46](end_span)
    return { error: { message: 'Akses ditolak! Hanya RT yang diizinkan mengedit data warga.' } };[span_47](start_span)[span_47](end_span)
  }

  let { error } = await db.from(tableName).update(payload).eq(eqColumn, eqValue);[span_48](start_span)[span_48](end_span)
  if (error) {
    let lowerName = tableName.toLowerCase();[span_49](start_span)[span_49](end_span)
    if (lowerName !== tableName) {[span_50](start_span)[span_50](end_span)
      let resLower = await db.from(lowerName).update(payload).eq(eqColumn, eqValue);[span_51](start_span)[span_51](end_span)
      if (!resLower.error) return { error: null };[span_52](start_span)[span_52](end_span)
    }
    let upperCol = eqColumn.toUpperCase();[span_53](start_span)[span_53](end_span)
    let resUpper = await db.from(tableName).update(payload).eq(upperCol, eqValue);[span_54](start_span)[span_54](end_span)
    if (!resUpper.error) return { error: null };[span_55](start_span)[span_55](end_span)
  }
  return { error };[span_56](start_span)[span_56](end_span)
}

async function safeSupabaseDelete(tableName, eqColumn, eqValue) {[span_57](start_span)[span_57](end_span)
  if (String(session.role || '').toUpperCase() !== 'RT') {[span_58](start_span)[span_58](end_span)
    return { error: { message: 'Akses ditolak! Hanya RT yang diizinkan menghapus data.' } };[span_59](start_span)[span_59](end_span)
  }

  let { error } = await db.from(tableName).delete().eq(eqColumn, eqValue);[span_60](start_span)[span_60](end_span)
  if (error) {
    let lowerName = tableName.toLowerCase();[span_61](start_span)[span_61](end_span)
    if (lowerName !== tableName) {[span_62](start_span)[span_62](end_span)
      let resLower = await db.from(lowerName).delete().eq(eqColumn, eqValue);[span_63](start_span)[span_63](end_span)
      if (!resLower.error) return { error: null };[span_64](start_span)[span_64](end_span)
    }
    let upperCol = eqColumn.toUpperCase();[span_65](start_span)[span_65](end_span)
    let resUpper = await db.from(tableName).delete().eq(upperCol, eqValue);[span_66](start_span)[span_66](end_span)
    if (!resUpper.error) return { error: null };[span_67](start_span)[span_67](end_span)
  }
  return { error };[span_68](start_span)[span_68](end_span)
}

function caseInsensitiveObj(obj) {[span_69](start_span)[span_69](end_span)
  if (!obj || typeof obj !== 'object') return obj;[span_70](start_span)[span_70](end_span)
  return new Proxy(obj, {
    get(target, prop) {[span_71](start_span)[span_71](end_span)
      if (typeof prop !== 'string' || prop in target || prop === 'then') return target[prop];[span_72](start_span)[span_72](end_span)
      const foundKey = Object.keys(target).find(k => k.toLowerCase() === prop.toLowerCase());[span_73](start_span)[span_73](end_span)
      return foundKey ? target[foundKey] : undefined;[span_74](start_span)[span_74](end_span)
    }
  });
}

function makeCaseInsensitive(data) {[span_75](start_span)[span_75](end_span)
  if (Array.isArray(data)) return data.map(item => caseInsensitiveObj(item));[span_76](start_span)[span_76](end_span)
  else if (data && typeof data === 'object') return caseInsensitiveObj(data);[span_77](start_span)[span_77](end_span)
  return data;[span_78](start_span)[span_78](end_span)
}

function cariNilaiKolom(row, keywords) {[span_79](start_span)[span_79](end_span)
  if (!row || typeof row !== 'object') return '';[span_80](start_span)[span_80](end_span)
  const keys = Object.keys(row);[span_81](start_span)[span_81](end_span)
  for (let kw of keywords) {
    let kwClean = kw.toLowerCase().replace(/_/g, ' ').trim();[span_82](start_span)[span_82](end_span)
    let exactKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').trim() === kwClean);[span_83](start_span)[span_83](end_span)
    if (exactKey && row[exactKey] !== null && row[exactKey] !== undefined && String(row[exactKey]).trim() !== '') {[span_84](start_span)[span_84](end_span)
      return String(row[exactKey]).trim();[span_85](start_span)[span_85](end_span)
    }
    let partialKey = keys.find(k => {
      let kClean = k.toLowerCase().replace(/_/g, ' ').trim();[span_86](start_span)[span_86](end_span)
      let matchesKw = kClean.includes(kwClean);[span_87](start_span)[span_87](end_span)
      if (kwClean.includes('nama') || kwClean.includes('barang')) {[span_88](start_span)[span_88](end_span)
        return matchesKw && !kClean.includes('foto') && !kClean.includes('gambar') && !kClean.includes('bukti') && !kClean.includes('keterangan');[span_89](start_span)[span_89](end_span)
      }
      return matchesKw;[span_90](start_span)[span_90](end_span)
    });
    if (partialKey && row[partialKey] !== null && row[partialKey] !== undefined && String(row[partialKey]).trim() !== '') {[span_91](start_span)[span_91](end_span)
      return String(row[partialKey]).trim();[span_92](start_span)[span_92](end_span)
    }
  }
  return '';[span_93](start_span)[span_93](end_span)
}

async function updateStokAset(namaAtauIdBarang, deltaStok) {[span_94](start_span)[span_94](end_span)
  if (!namaAtauIdBarang || deltaStok === 0) return;[span_95](start_span)[span_95](end_span)
  const { data: safeAset } = await safeSupabaseSelect('Aset');[span_96](start_span)[span_96](end_span)
  if (!safeAset || safeAset.length === 0) return;[span_97](start_span)[span_97](end_span)
  let targetAset = safeAset.find(a => {
    let bNama = cariNilaiKolom(a, ['nama_barang', 'nama_aset', 'nama', 'barang']);[span_98](start_span)[span_98](end_span)
    let bId = cariNilaiKolom(a, ['id', 'id_barang']);[span_99](start_span)[span_99](end_span)
    return (bNama && bNama.toLowerCase().trim() === String(namaAtauIdBarang).toLowerCase().trim()) ||[span_100](start_span)[span_100](end_span)
           (bId && bId.toLowerCase().trim() === String(namaAtauIdBarang).toLowerCase().trim());[span_101](start_span)[span_101](end_span)
  });
  if (!targetAset) return;[span_102](start_span)[span_102](end_span)
  let targetId = targetAset.id || targetAset.ID || cariNilaiKolom(targetAset, ['id']);[span_103](start_span)[span_103](end_span)
  let currentStok = parseInt(cariNilaiKolom(targetAset, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);[span_104](start_span)[span_104](end_span)
  let stokBaru = Math.max(0, currentStok + deltaStok);[span_105](start_span)[span_105](end_span)
  let keys = Object.keys(targetAset);[span_106](start_span)[span_106](end_span)
  let stockKey = keys.find(k => {
    let kClean = k.toLowerCase().replace(/_/g, ' ').trim();[span_107](start_span)[span_107](end_span)
    return kClean.includes('stok') || kClean.includes('jumlah') || kClean.includes('qty');[span_108](start_span)[span_108](end_span)
  }) || 'stok_tersedia';[span_109](start_span)[span_109](end_span)
  let updatePayload = {};[span_110](start_span)[span_110](end_span)
  updatePayload[stockKey] = stokBaru;[span_111](start_span)[span_111](end_span)
  let statusKey = keys.find(k => k.toLowerCase() === 'status');[span_112](start_span)[span_112](end_span)
  if (statusKey) updatePayload[statusKey] = stokBaru > 0 ? 'Tersedia' : 'Habis';[span_113](start_span)[span_113](end_span)
  await safeSupabaseUpdate('Aset', updatePayload, 'id', targetId);[span_114](start_span)[span_114](end_span)
}

function convertToImageLink(url) {[span_115](start_span)[span_115](end_span)
  if (!url) return "";[span_116](start_span)[span_116](end_span)
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {[span_117](start_span)[span_117](end_span)
    var idMatch = url.match(/[-\w]{25,}/);[span_118](start_span)[span_118](end_span)
    if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];[span_119](start_span)[span_119](end_span)
  }
  return url;[span_120](start_span)[span_120](end_span)
}

// ==========================================================
// ==== HELPER FETCH POST (SUPABASE BRIDGE) =================
// ==========================================================
async function callGASPost(actionName, extraPayload = {}) {[span_121](start_span)[span_121](end_span)
  try {
    if (actionName === 'processLogin') {[span_122](start_span)[span_122](end_span)
      const uClean = extraPayload.username ? extraPayload.username.toString().trim().toLowerCase() : '';[span_123](start_span)[span_123](end_span)
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';[span_124](start_span)[span_124](end_span)

      if (!uClean || !pClean) {
        return { status: 'error', message: 'Username dan Password tidak boleh kosong!' };[span_125](start_span)[span_125](end_span)
      }

      try {
        const { data, error } = await db.rpc('verify_user_login', {
          p_username: uClean,[span_126](start_span)[span_126](end_span)
          p_password: pClean[span_127](start_span)[span_127](end_span)
        });

        if (error) {
          console.error('RPC Error:', error);[span_128](start_span)[span_128](end_span)
          return { status: 'error', message: 'Gagal verifikasi server: ' + error.message };[span_129](start_span)[span_129](end_span)
        }

        return data;[span_130](start_span)[span_130](end_span)
      } catch (err) {
        return { status: 'error', message: 'Gagal login: ' + err.message };[span_131](start_span)[span_131](end_span)
      }
    }

    if (actionName === 'simpanDataKeSheet') {[span_132](start_span)[span_132](end_span)
      const sheetName = extraPayload.sheetName;[span_133](start_span)[span_133](end_span)
      let formData = { ...extraPayload.formData };[span_134](start_span)[span_134](end_span)
      
      // Auto-generate ID jika belum ada untuk semua tabel
      if (!formData.id) {[span_135](start_span)[span_135](end_span)
        formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);[span_136](start_span)[span_136](end_span)
      }

      if (session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') formData['nik'] = session.nik;[span_137](start_span)[span_137](end_span)
      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) formData[k] = formData[k].base64;[span_138](start_span)[span_138](end_span)
      }
      const { error } = await safeSupabaseInsert(sheetName, [formData]);[span_139](start_span)[span_139](end_span)
      if (error) return { status: 'error', message: error.message };[span_140](start_span)[span_140](end_span)
      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id || formData.nik };[span_141](start_span)[span_141](end_span)
    }

    if (actionName === 'simpanPengajuanPeminjaman') {[span_142](start_span)[span_142](end_span)
      const payload = extraPayload.payload || {};[span_143](start_span)[span_143](end_span)
      let newId = 'PIN-' + Math.floor(1000 + Math.random() * 9000);[span_144](start_span)[span_144](end_span)
      let insertObj = {
        id: newId,[span_145](start_span)[span_145](end_span)
        nik: payload.nik || session.nik,[span_146](start_span)[span_146](end_span)
        nama_peminjam: payload.namaPeminjam || session.nama,[span_147](start_span)[span_147](end_span)
        id_barang: payload.idBarang,[span_148](start_span)[span_148](end_span)
        nama_barang: payload.namaBarang,[span_149](start_span)[span_149](end_span)
        jumlah: payload.jumlah,[span_150](start_span)[span_150](end_span)
        keterangan: payload.keterangan || '',[span_151](start_span)[span_151](end_span)
        status: 'Menunggu Verifikasi[span_152](start_span)'[span_152](end_span)
      };
      const { error } = await safeSupabaseInsert('Peminjaman', [insertObj]);[span_153](start_span)[span_153](end_span)
      if (error) return { status: 'error', message: error.message };[span_154](start_span)[span_154](end_span)
      return { status: 'success', message: 'Pengajuan peminjaman berhasil dikirim!' };[span_155](start_span)[span_155](end_span)
    }

    if (actionName === 'verifikasiPeminjamanRT') {[span_156](start_span)[span_156](end_span)
      const idPinjam = extraPayload.idPinjam;[span_157](start_span)[span_157](end_span)
      const status = extraPayload.status;[span_158](start_span)[span_158](end_span)
      const qtyAcc = parseInt(extraPayload.qtyAcc) || 0;[span_159](start_span)[span_159](end_span)
      const catatanRt = extraPayload.catatanRt || '';[span_160](start_span)[span_160](end_span)
      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');[span_161](start_span)[span_161](end_span)
      const safePinjam = safePinjamList ? safePinjamList.find(p => String(p.id || cariNilaiKolom(p, ['id'])).trim() === String(idPinjam).trim()) : null;[span_162](start_span)[span_162](end_span)
      if (safePinjam && status === 'Disetujui' && qtyAcc > 0) {
        let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'nama_aset', 'barang', 'id_barang']);[span_163](start_span)[span_163](end_span)
        await updateStokAset(barangTarget, -qtyAcc);[span_164](start_span)[span_164](end_span)
      }
      const { error } = await safeSupabaseUpdate('Peminjaman', { status: status, acc: qtyAcc, catatan_rt: catatanRt }, 'id', idPinjam);[span_165](start_span)[span_165](end_span)
      if (error) return { status: 'error', message: error.message };[span_166](start_span)[span_166](end_span)
      return { status: 'success', message: `Peminjaman berhasil di-${status.toLowerCase()}!` };[span_167](start_span)[span_167](end_span)
    }

    if (actionName === 'prosesPengembalianAsetRT') {[span_168](start_span)[span_168](end_span)
      const idPinjam = extraPayload.idPinjam;[span_169](start_span)[span_169](end_span)
      const qtyKembali = parseInt(extraPayload.qtyKembali) || 0;[span_170](start_span)[span_170](end_span)
      const catatanRt = extraPayload.catatanRt || '';[span_171](start_span)[span_171](end_span)
      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');[span_172](start_span)[span_172](end_span)
      const safePinjam = safePinjamList ? safePinjamList.find(p => String(p.id || cariNilaiKolom(p, ['id'])).trim() === String(idPinjam).trim()) : null;[span_173](start_span)[span_173](end_span)
      if (safePinjam) {
        if (qtyKembali > 0) {
          let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'nama_aset', 'barang', 'id_barang']);[span_174](start_span)[span_174](end_span)
          await updateStokAset(barangTarget, qtyKembali);[span_175](start_span)[span_175](end_span)
        }
        let qtyAcc = parseInt(cariNilaiKolom(safePinjam, ['acc', 'jumlah_acc', 'qty_acc']) || safePinjam.acc || 0);[span_176](start_span)[span_176](end_span)
        let selisihHilang = qtyAcc - qtyKembali;[span_177](start_span)[span_177](end_span)
        let statusPengembalian = selisihHilang > 0 ? `Selesai (hilang ${selisihHilang})` : 'Selesai (Dikembalikan)';[span_178](start_span)[span_178](end_span)
        const { error } = await safeSupabaseUpdate('Peminjaman', { status: statusPengembalian, catatan_rt: catatanRt }, 'id', idPinjam);[span_179](start_span)[span_179](end_span)
        if (error) return { status: 'error', message: error.message };[span_180](start_span)[span_180](end_span)
        return { status: 'success', message: 'Pengembalian barang berhasil dicatat & stok telah diperbarui!' };[span_181](start_span)[span_181](end_span)
      }
      return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };[span_182](start_span)[span_182](end_span)
    }

    // ==========================================================
    // ==== UPDATE DATA (PENCARIAN GANDA: NIK & ID) ============
    // ==========================================================
    if (actionName === 'updateDataDiSheet') {[span_183](start_span)[span_183](end_span)
      const sheetName = extraPayload.sheetName;[span_184](start_span)[span_184](end_span)
      const id = extraPayload.id;[span_185](start_span)[span_185](end_span)
      let formData = { ...extraPayload.formData };[span_186](start_span)[span_186](end_span)
      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) formData[k] = formData[k].base64;[span_187](start_span)[span_187](end_span)
      }

      if (!formData.id && id) {[span_188](start_span)[span_188](end_span)
        formData.id = id;[span_189](start_span)[span_189](end_span)
      }

      let resUpdate;[span_190](start_span)[span_190](end_span)
      if (sheetName.toLowerCase() === 'warga') {[span_191](start_span)[span_191](end_span)
        let targetNik = formData.nik || formData.NIK || id;[span_192](start_span)[span_192](end_span)
        resUpdate = await db.from(sheetName).update(formData).eq('nik', targetNik);[span_193](start_span)[span_193](end_span)
        if (resUpdate.error || !resUpdate.data) {
          resUpdate = await db.from(sheetName).update(formData).eq('id', id);[span_194](start_span)[span_194](end_span)
        }
      } else {
        resUpdate = await db.from(sheetName).update(formData).eq('id', id);[span_195](start_span)[span_195](end_span)
      }

      if (resUpdate.error) return { status: 'error', message: resUpdate.error.message };[span_196](start_span)[span_196](end_span)
      return { status: 'success', message: 'Data berhasil diperbarui!' };[span_197](start_span)[span_197](end_span)
    }

    // ==========================================================
    // ==== HAPUS DATA (PENCARIAN GANDA: NIK & ID) =============
    // ==========================================================
    if (actionName === 'hapusDataDariSheet') {[span_198](start_span)[span_198](end_span)
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' };[span_199](start_span)[span_199](end_span)
      const sheetName = extraPayload.sheetName;[span_200](start_span)[span_200](end_span)
      const id = extraPayload.id;[span_201](start_span)[span_201](end_span)

      let resDel;[span_202](start_span)[span_202](end_span)
      if (sheetName.toLowerCase() === 'warga') {[span_203](start_span)[span_203](end_span)
        resDel = await db.from(sheetName).delete().eq('nik', id);[span_204](start_span)[span_204](end_span)
        if (resDel.error) {
          resDel = await db.from(sheetName).delete().eq('id', id);[span_205](start_span)[span_205](end_span)
        }
      } else {
        resDel = await db.from(sheetName).delete().eq('id', id);[span_206](start_span)[span_206](end_span)
      }

      if (resDel.error) return { status: 'error', message: resDel.error.message };[span_207](start_span)[span_207](end_span)
      return { status: 'success', message: 'Data berhasil dihapus!' };[span_208](start_span)[span_208](end_span)
    }

    if (actionName === 'simpanInfoWarga') {[span_209](start_span)[span_209](end_span)
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan memperbarui info warga!' };[span_210](start_span)[span_210](end_span)
      const { error } = await db.from('Pengaturan').upsert([{ kunci: 'info_warga', nilai: extraPayload.teksBaru }], { onConflict: 'kunci' });[span_211](start_span)[span_211](end_span)
      if (error) return { status: 'error', message: error.message };[span_212](start_span)[span_212](end_span)
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };[span_213](start_span)[span_213](end_span)
    }

    if (actionName === 'simpanPengaturanApp') {[span_214](start_span)[span_214](end_span)
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan memperbarui pengaturan!' };[span_215](start_span)[span_215](end_span)
      const { error } = await db.from('Pengaturan').upsert(extraPayload.settingsArray, { onConflict: 'kunci' });[span_216](start_span)[span_216](end_span)
      if (error) return { status: 'error', message: error.message };[span_217](start_span)[span_217](end_span)
      return { status: 'success', message: 'Pengaturan aplikasi berhasil disimpan!' };[span_218](start_span)[span_218](end_span)
    }

    if (actionName === 'tambahUserWarga') {[span_219](start_span)[span_219](end_span)
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mengelola user!' };[span_220](start_span)[span_220](end_span)
      const { error } = await safeSupabaseInsert('Users', [extraPayload.userObj]);[span_221](start_span)[span_221](end_span)
      if (error) return { status: 'error', message: error.message };[span_222](start_span)[span_222](end_span)
      return { status: 'success', message: 'Akun user berhasil didaftarkan!' };[span_223](start_span)[span_223](end_span)
    }

    if (actionName === 'hapusUserAkun') {[span_224](start_span)[span_224](end_span)
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus user!' };[span_225](start_span)[span_225](end_span)
      const { error } = await safeSupabaseDelete('Users', 'username', extraPayload.username);[span_226](start_span)[span_226](end_span)
      if (error) return { status: 'error', message: error.message };[span_227](start_span)[span_227](end_span)
      return { status: 'success', message: 'Akun user berhasil dihapus!' };[span_228](start_span)[span_228](end_span)
    }

    if (actionName === 'resetPasswordUser') {[span_229](start_span)[span_229](end_span)
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan mereset password!' };[span_230](start_span)[span_230](end_span)
      const { error } = await safeSupabaseUpdate('Users', { password: extraPayload.newPassword }, 'username', extraPayload.username);[span_231](start_span)[span_231](end_span)
      if (error) return { status: 'error', message: error.message };[span_232](start_span)[span_232](end_span)
      return { status: 'success', message: 'Password user berhasil direset!' };[span_233](start_span)[span_233](end_span)
    }

    return { status: 'error', message: 'Aksi POST tidak dikenal' };[span_234](start_span)[span_234](end_span)
  } catch (err) {
    console.error('Fetch Error (POST):', err);[span_235](start_span)[span_235](end_span)
    return { status: 'error', message: 'Gagal terhubung ke Supabase: ' + err.message };[span_236](start_span)[span_236](end_span)
  }
}

// ==========================================================
function sortDataNewestFirst(dataList) {[span_237](start_span)[span_237](end_span)
  if (!Array.isArray(dataList) || dataList.length <= 1) return dataList || [];[span_238](start_span)[span_238](end_span)
  let list = [...dataList];[span_239](start_span)[span_239](end_span)

  let hasValidTimestamp = list.some(a => {
    if (!a) return false;[span_240](start_span)[span_240](end_span)
    let t = a.created_at || a.createdat || a.CREATED_AT || a.CREATEDAT;[span_241](start_span)[span_241](end_span)
    if (!t) return false;[span_242](start_span)[span_242](end_span)
    let d = new Date(t).getTime();[span_243](start_span)[span_243](end_span)
    return !isNaN(d) && d > 1000000;[span_244](start_span)[span_244](end_span)
  });

  if (hasValidTimestamp) {
    list.sort((a, b) => {
      let timeA = a ? (a.created_at || a.createdat || a.CREATED_AT || a.CREATEDAT || '') : '';[span_245](start_span)[span_245](end_span)
      let timeB = b ? (b.created_at || b.createdat || b.CREATED_AT || b.CREATEDAT || '') : '';[span_246](start_span)[span_246](end_span)
      let dateA = new Date(timeA).getTime();[span_247](start_span)[span_247](end_span)
      let dateB = new Date(timeB).getTime();[span_248](start_span)[span_248](end_span)
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;[span_249](start_span)[span_249](end_span)
      }
      return 0;[span_250](start_span)[span_250](end_span)
    });
    return list;[span_251](start_span)[span_251](end_span)
  }

  list.reverse();[span_252](start_span)[span_252](end_span)
  return list;[span_253](start_span)[span_253](end_span)
}

function sensorPhoneNumber(hp) {[span_254](start_span)[span_254](end_span)
  if (!hp || hp === '-' || hp === 'XXXXX') return '****';[span_255](start_span)[span_255](end_span)
  let str = String(hp).trim();[span_256](start_span)[span_256](end_span)
  if (str.length <= 4) return '****';[span_257](start_span)[span_257](end_span)
  let start = str.substring(0, 4);[span_258](start_span)[span_258](end_span)
  let end = str.substring(str.length - 3);[span_259](start_span)[span_259](end_span)
  let middleLen = str.length - 7;[span_260](start_span)[span_260](end_span)
  if (middleLen <= 0) middleLen = 3;[span_261](start_span)[span_261](end_span)
  return start + '*'.repeat(middleLen) + end;[span_262](start_span)[span_262](end_span)
}

window.sensorPhoneNumber = sensorPhoneNumber;[span_263](start_span)[span_263](end_span)

// ==========================================================
// ==== HELPER FETCH GET (SUPABASE BRIDGE) ==================
// ==========================================================
async function callGASGet(actionName, params = {}) {[span_264](start_span)[span_264](end_span)
  try {
    if (actionName === 'getDaftarBarangAset') {[span_265](start_span)[span_265](end_span)
      const { data: safeAset } = await safeSupabaseSelect('Aset');[span_266](start_span)[span_266](end_span)
      if (!safeAset || safeAset.length === 0) return { status: 'success', data: [] };[span_267](start_span)[span_267](end_span)
      let listBarang = safeAset.map(item => {
        let bId = item.id || item.ID || cariNilaiKolom(item, ['id']);[span_268](start_span)[span_268](end_span)
        let bNama = cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'nama', 'barang']);[span_269](start_span)[span_269](end_span)
        let bStok = parseInt(cariNilaiKolom(item, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);[span_270](start_span)[span_270](end_span)
        return { id: bId || bNama, nama: bNama, stok: bStok };[span_271](start_span)[span_271](end_span)
      }).filter(b => b.nama);[span_272](start_span)[span_272](end_span)
      return { status: 'success', data: listBarang };[span_273](start_span)[span_273](end_span)
    }

    if (actionName === 'getRiwayatPeminjaman') {[span_274](start_span)[span_274](end_span)
      const { data: safeRiwayat } = await safeSupabaseSelect('Peminjaman');[span_275](start_span)[span_275](end_span)
      if (!safeRiwayat || safeRiwayat.length === 0) return { status: 'success', data: [] };[span_276](start_span)[span_276](end_span)
      let listRiwayat = safeRiwayat.map(item => ({
        idPinjam: item.id || cariNilaiKolom(item, ['id', 'id_pinjam']),[span_277](start_span)[span_277](end_span)
        namaPeminjam: cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']),[span_278](start_span)[span_278](end_span)
        namaBarang: cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']),[span_279](start_span)[span_279](end_span)
        jumlahMinta: parseInt(cariNilaiKolom(item, ['jumlah', 'qty', 'minta']) || 0),[span_280](start_span)[span_280](end_span)
        jumlahAcc: parseInt(cariNilaiKolom(item, ['acc', 'jumlah_acc', 'qty_acc']) || 0),[span_281](start_span)[span_281](end_span)
        keterangan: cariNilaiKolom(item, ['keterangan', 'ket_warga', 'keterangan_warga']),[span_282](start_span)[span_282](end_span)
        catatanRt: cariNilaiKolom(item, ['catatan_rt', 'lokasi', 'catatan']),[span_283](start_span)[span_283](end_span)
        status: cariNilaiKolom(item, ['status']) || 'Menunggu Verifikasi',[span_284](start_span)[span_284](end_span)
        nik: cariNilaiKolom(item, ['nik'])[span_285](start_span)[span_285](end_span)
      }));
      let sortedRiwayat = sortDataNewestFirst(listRiwayat);[span_286](start_span)[span_286](end_span)
      return { status: 'success', data: sortedRiwayat };[span_287](start_span)[span_287](end_span)
    }

    if (actionName === 'getTableData') {[span_288](start_span)[span_288](end_span)
      const sheetName = params.sheetName;[span_289](start_span)[span_289](end_span)
      const { data: safeData } = await safeSupabaseSelect(sheetName);[span_290](start_span)[span_290](end_span)
      if (!safeData || safeData.length === 0) return { status: 'success', headers: [], rows: [] };[span_291](start_span)[span_291](end_span)

      const headers = Object.keys(safeData[0]);[span_292](start_span)[span_292](end_span)
      let sortedFiltered = sortDataNewestFirst(safeData);[span_293](start_span)[span_293](end_span)
      const rows = sortedFiltered.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));[span_294](start_span)[span_294](end_span)
      return { status: 'success', headers: headers, rows: rows };[span_295](start_span)[span_295](end_span)
    }

    if (actionName === 'getIuranData') {[span_296](start_span)[span_296](end_span)
      const { data: safeData } = await safeSupabaseSelect('Iuran');[span_297](start_span)[span_297](end_span)
      if (!safeData || safeData.length === 0) return { status: 'success', headers: [], rows: [] };[span_298](start_span)[span_298](end_span)
      let filteredData = safeData;[span_299](start_span)[span_299](end_span)
      const cleanRole = (session.role || 'warga').toLowerCase();[span_300](start_span)[span_300](end_span)
      if (cleanRole !== 'rt' && session.nik) {
        let userKk = '';[span_301](start_span)[span_301](end_span)
        const { data: safeWarga } = await safeSupabaseSelect('Warga');[span_302](start_span)[span_302](end_span)
        if (safeWarga) {
          const targetWarga = safeWarga.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);[span_303](start_span)[span_303](end_span)
            return wNik && wNik.toString().trim() === session.nik.toString().trim();[span_304](start_span)[span_304](end_span)
          });
          if (targetWarga) userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);[span_305](start_span)[span_305](end_span)
        }
        filteredData = filteredData.filter(row => {
          let rNik = cariNilaiKolom(row, ['nik', 'ktp']);[span_306](start_span)[span_306](end_span)
          let rKk = cariNilaiKolom(row, ['kk', 'no_kk']);[span_307](start_span)[span_307](end_span)
          return (rNik && rNik.toString().trim() === session.nik.toString().trim()) || (userKk && rKk && rKk === userKk);[span_308](start_span)[span_308](end_span)
        });
      }
      if (filteredData.length === 0) {
        const headers = safeData.length > 0 ? Object.keys(safeData[0]) : ['ID','NIK','Nama','No_KK','Bulan','Tahun','Nominal','Status','Tanggal_Bayar','Diterima_Oleh','Bukti_Transfer'];[span_309](start_span)[span_309](end_span)
        return { status: 'success', headers: headers, rows: [] };[span_310](start_span)[span_310](end_span)
      }
      const headers = Object.keys(filteredData[0]);[span_311](start_span)[span_311](end_span)
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));[span_312](start_span)[span_312](end_span)
      return { status: 'success', headers: headers, rows: rows };[span_313](start_span)[span_313](end_span)
    }

    if (actionName === 'getNotifications') {[span_314](start_span)[span_314](end_span)
      const cleanRole = (session.role || 'warga').toLowerCase();[span_315](start_span)[span_315](end_span)
      const userNik = (session.nik || '').toString().trim();[span_316](start_span)[span_316](end_span)
      let notifs = [];[span_317](start_span)[span_317](end_span)

      const [aRes, sRes, pRes, iRes, sumRes, aspRes] = await Promise.all([
        safeSupabaseSelect('Pengaduan'),[span_318](start_span)[span_318](end_span)
        safeSupabaseSelect('SuratPengantar'),[span_319](start_span)[span_319](end_span)
        safeSupabaseSelect('Peminjaman'),[span_320](start_span)[span_320](end_span)
        safeSupabaseSelect('Iuran'),[span_321](start_span)[span_321](end_span)
        safeSupabaseSelect('Sumbangan'),[span_322](start_span)[span_322](end_span)
        safeSupabaseSelect('Aspirasi')[span_323](start_span)[span_323](end_span)
      ]);

      const extractDate = (item) => item.created_at || item.createdat || item.timestamp || item.waktu || item.tanggal || item.tanggal_bayar || cariNilaiKolom(item, ['created_at', 'createdat', 'timestamp', 'waktu', 'tanggal', 'tanggal_bayar', 'tgl']) || null;[span_324](start_span)[span_324](end_span)

      if (cleanRole === 'rt') {
        (aRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || 'Baru';[span_325](start_span)[span_325](end_span)
          let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Umum';[span_326](start_span)[span_326](end_span)
          let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pelapor']) || 'Warga';[span_327](start_span)[span_327](end_span)
          let id    = item.id || cariNilaiKolom(item, ['id']) || ('ADU-' + Math.random());[span_328](start_span)[span_328](end_span)
          let rawDate = extractDate(item);[span_329](start_span)[span_329](end_span)
          notifs.push({ id, menu: 'Pengaduan', pesan: `Aduan ${jenis} dari ${nama}: (${st})`, rawDate });[span_330](start_span)[span_330](end_span)
        });

        (sRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || '';[span_331](start_span)[span_331](end_span)
          let stL   = st.toLowerCase();[span_332](start_span)[span_332](end_span)
          if (stL.includes('belum') || stL.includes('menunggu') || stL.includes('baru') || !st) {
            let nama      = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pemohon']) || 'Warga';[span_333](start_span)[span_333](end_span)
            let jenisSurat= cariNilaiKolom(item, ['jenis_surat', 'keperluan', 'jenis']) || 'Surat';[span_334](start_span)[span_334](end_span)
            let id        = item.id || cariNilaiKolom(item, ['id']) || ('SRT-' + Math.random());[span_335](start_span)[span_335](end_span)
            let rawDate   = extractDate(item);[span_336](start_span)[span_336](end_span)
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Pengajuan ${jenisSurat} dari ${nama}`, rawDate });[span_337](start_span)[span_337](end_span)
          }
        });

        (pRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';[span_338](start_span)[span_338](end_span)
          let stL = st.toLowerCase();[span_339](start_span)[span_339](end_span)
          if (stL.includes('menunggu') || stL.includes('belum') || stL.includes('baru') || !st) {
            let nama  = cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']) || 'Warga';[span_340](start_span)[span_340](end_span)
            let barang= cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']) || 'Aset';[span_341](start_span)[span_341](end_span)
            let qty   = cariNilaiKolom(item, ['jumlah', 'qty']) || '1';[span_342](start_span)[span_342](end_span)
            let id    = item.id || cariNilaiKolom(item, ['id', 'id_pinjam']) || ('PIN-' + Math.random());[span_343](start_span)[span_343](end_span)
            let rawDate = extractDate(item);[span_344](start_span)[span_344](end_span)
            notifs.push({ id, menu: 'Aset', pesan: `Pengajuan Pinjam ${barang} (${qty} unit) dari ${nama}`, rawDate });[span_345](start_span)[span_345](end_span)
          }
        });

        (iRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';[span_346](start_span)[span_346](end_span)
          let stL = st.toLowerCase();[span_347](start_span)[span_347](end_span)
          if (stL.includes('menunggu') || stL.includes('verifikasi')) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';[span_348](start_span)[span_348](end_span)
            let bulan = cariNilaiKolom(item, ['bulan']) || '';[span_349](start_span)[span_349](end_span)
            let tahun = cariNilaiKolom(item, ['tahun']) || '';[span_350](start_span)[span_350](end_span)
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('IUR-' + Math.random());[span_351](start_span)[span_351](end_span)
            let rawDate = extractDate(item);[span_352](start_span)[span_352](end_span)
            notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} ${tahun} dari ${nama} perlu verifikasi`, rawDate });[span_353](start_span)[span_353](end_span)
          }
        });

        (sumRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';[span_354](start_span)[span_354](end_span)
          let stL = st.toLowerCase();[span_355](start_span)[span_355](end_span)
          if (stL.includes('belum') || stL.includes('menunggu') || stL.includes('baru') || !st) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';[span_356](start_span)[span_356](end_span)
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('SUM-' + Math.random());[span_357](start_span)[span_357](end_span)
            let rawDate = extractDate(item);[span_358](start_span)[span_358](end_span)
            notifs.push({ id, menu: 'Sumbangan', pesan: `Sumbangan Baru dari ${nama} (${st || 'Belum diverifikasi'})`, rawDate });[span_359](start_span)[span_359](end_span)
          }
        });

        (aspRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';[span_360](start_span)[span_360](end_span)
          let stL = st.toLowerCase();[span_361](start_span)[span_361](end_span)
          if (stL.includes('baru') || !st) {
            let isi = cariNilaiKolom(item, ['isi_aspirasi', 'isi', 'aspirasi', 'pesan', 'saran']) || 'Masukan baru';[span_362](start_span)[span_362](end_span)
            let id  = item.id || cariNilaiKolom(item, ['id']) || ('ASP-' + Math.random());[span_363](start_span)[span_363](end_span)
            let rawDate = extractDate(item);[span_364](start_span)[span_364](end_span)
            notifs.push({ id, menu: 'Aspirasi', pesan: `Aspirasi Anonim: "${isi.length > 35 ? isi.substring(0, 35) + '...' : isi}"`, rawDate });[span_365](start_span)[span_365](end_span)
          }
        });

      } else {
        (aRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st    = cariNilaiKolom(item, ['status']) || 'Diproses';[span_366](start_span)[span_366](end_span)
            let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Aduan';[span_367](start_span)[span_367](end_span)
            let id    = item.id || cariNilaiKolom(item, ['id']);[span_368](start_span)[span_368](end_span)
            let rawDate = extractDate(item);[span_369](start_span)[span_369](end_span)
            notifs.push({ id, menu: 'Pengaduan', pesan: `Status Aduan ${jenis}: ${st}`, rawDate });[span_370](start_span)[span_370](end_span)
          }
        });
        (sRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st = cariNilaiKolom(item, ['status']) || 'Diproses';[span_371](start_span)[span_371](end_span)
            let id = item.id || cariNilaiKolom(item, ['id']);[span_372](start_span)[span_372](end_span)
            let rawDate = extractDate(item);[span_373](start_span)[span_373](end_span)
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Surat Pengantar Anda: Status kini "${st}"`, rawDate });[span_374](start_span)[span_374](end_span)
          }
        });
        (pRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st     = cariNilaiKolom(item, ['status']) || 'Di-update';[span_375](start_span)[span_375](end_span)
            let barang = cariNilaiKolom(item, ['nama_barang','nama_aset','barang']) || 'Barang';[span_376](start_span)[span_376](end_span)
            let id     = item.id || cariNilaiKolom(item, ['id']);[span_377](start_span)[span_377](end_span)
            let rawDate = extractDate(item);[span_378](start_span)[span_378](end_span)
            notifs.push({ id, menu: 'Aset', pesan: `Peminjaman ${barang}: ${st}`, rawDate });[span_379](start_span)[span_379](end_span)
          }
        });
        (iRes.data || []).forEach(item => {
          if (cariNilaiKolom(item, ['nik','ktp']).trim() === userNik) {
            let st    = cariNilaiKolom(item, ['status']) || '';[span_380](start_span)[span_380](end_span)
            let bulan = cariNilaiKolom(item, ['bulan']) || '';[span_381](start_span)[span_381](end_span)
            let id    = item.id || cariNilaiKolom(item, ['id']);[span_382](start_span)[span_382](end_span)
            let rawDate = extractDate(item);[span_383](start_span)[span_383](end_span)
            if (st.toLowerCase().includes('lunas')) {
              notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} telah LUNAS diverifikasi RT!`, rawDate });[span_384](start_span)[span_384](end_span)
            }
          }
        });
      }

      return { status: 'success', data: notifs };[span_385](start_span)[span_385](end_span)
    }

    if (actionName === 'getInfoWarga') {[span_386](start_span)[span_386](end_span)
      const { data: safeData } = await safeSupabaseSelect('Pengaturan');[span_387](start_span)[span_387](end_span)
      let target = safeData ? safeData.find(x => x.kunci === 'info_warga') : null;[span_388](start_span)[span_388](end_span)
      return { status: 'success', data: target ? target.nilai : '' };[span_389](start_span)[span_389](end_span)
    }

    if (actionName === 'getDashboardSummary') {[span_390](start_span)[span_390](end_span)
      const cleanRole = (session.role || 'warga').toLowerCase();[span_391](start_span)[span_391](end_span)
      if (cleanRole === 'rt') {
        const [wRes, aRes, kRes, sRes, sumRes] = await Promise.all([
          safeSupabaseSelect('Warga'), safeSupabaseSelect('Pengaduan'),[span_392](start_span)[span_392](end_span)
          safeSupabaseSelect('Keuangan'), safeSupabaseSelect('SuratPengantar'),[span_393](start_span)[span_393](end_span)
          safeSupabaseSelect('Sumbangan')[span_394](start_span)[span_394](end_span)
        ]);
        return {
          status: 'success', role: 'RT',[span_395](start_span)[span_395](end_span)
          warga:    wRes.data   ? wRes.data.length   : 0,[span_396](start_span)[span_396](end_span)
          aduan:    aRes.data   ? aRes.data.length   : 0,[span_397](start_span)[span_397](end_span)
          keuangan: kRes.data   ? kRes.data.length   : 0,[span_398](start_span)[span_398](end_span)
          surat:    sRes.data   ? sRes.data.length   : 0,[span_399](start_span)[span_399](end_span)
          sumbangan:sumRes.data ? sumRes.data.length : 0[span_400](start_span)[span_400](end_span)
        };
      } else {
        const countByNik = (safeData) => {
          if (!safeData) return 0;[span_401](start_span)[span_401](end_span)
          return safeData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);[span_402](start_span)[span_402](end_span)
            return rNik && rNik.toString().trim() === session.nik.toString().trim();[span_403](start_span)[span_403](end_span)
          }).length;
        };
        const [aRes, sRes, sumRes] = await Promise.all([
          safeSupabaseSelect('Pengaduan'), safeSupabaseSelect('SuratPengantar'),[span_404](start_span)[span_404](end_span)
          safeSupabaseSelect('Sumbangan')[span_405](start_span)[span_405](end_span)
        ]);
        return { status: 'success', role: 'Warga', aduan: countByNik(aRes.data), surat: countByNik(sRes.data), sumbangan: countByNik(sumRes.data) };[span_406](start_span)[span_406](end_span)
      }
    }

    if (actionName === 'getDaftarWargaUntukIuran') {[span_407](start_span)[span_407](end_span)
      const { data: safeData } = await safeSupabaseSelect('Warga');[span_408](start_span)[span_408](end_span)
      return { status: 'success', data: safeData || [] };[span_409](start_span)[span_409](end_span)
    }

    if (actionName.toLowerCase().includes('profil') || actionName.toLowerCase().includes('profile')) {[span_410](start_span)[span_410](end_span)
      const nikCari = params.nik || session.nik || session.nama;[span_411](start_span)[span_411](end_span)
      const { data: safeWarga } = await safeSupabaseSelect('Warga');[span_412](start_span)[span_412](end_span)
      if (!safeWarga || safeWarga.length === 0) return { status: 'error', message: 'Data warga tidak ditemukan' };[span_413](start_span)[span_413](end_span)

      let myData = null, myKk = '';[span_414](start_span)[span_414](end_span)
      for (let w of safeWarga) {
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);[span_415](start_span)[span_415](end_span)
        if (wNik && wNik.toString().trim() === String(nikCari).trim()) { myData = w; myKk = cariNilaiKolom(w, ['kk', 'no_kk']); break; }[span_416](start_span)[span_416](end_span)
      }
      if (!myData && nikCari) {
        myData = safeWarga.find(w => { let wNama = cariNilaiKolom(w, ['nama', 'name']); return wNama && wNama.toLowerCase().includes(String(nikCari).toLowerCase()); });[span_417](start_span)[span_417](end_span)
        if (myData) myKk = cariNilaiKolom(myData, ['kk', 'no_kk']);[span_418](start_span)[span_418](end_span)
      }
      if (!myData) return { status: 'error', message: 'Profil Anda belum terdaftar!' };[span_419](start_span)[span_419](end_span)

      let keluarga = myKk ? safeWarga.filter(w => {
        let wKk  = cariNilaiKolom(w, ['kk', 'no_kk']);[span_420](start_span)[span_420](end_span)
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);[span_421](start_span)[span_421](end_span)
        return wKk && wKk === myKk && wNik !== cariNilaiKolom(myData, ['nik', 'ktp']);[span_422](start_span)[span_422](end_span)
      }) : [];

      const headers = Object.keys(myData);[span_423](start_span)[span_423](end_span)
      headers.forEach(h => {
        if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
          myData[h] = convertToImageLink(myData[h]);[span_424](start_span)[span_424](end_span)
          keluarga.forEach(m => { m[h] = convertToImageLink(m[h]); });[span_425](start_span)[span_425](end_span)
        }
      });
      return { status: 'success', pribadi: myData, keluarga, headers, data: myData, row: myData, user: myData };[span_426](start_span)[span_426](end_span)
    }

    if (actionName.toLowerCase().startsWith('get') && actionName.toLowerCase().endsWith('data')) {[span_427](start_span)[span_427](end_span)
      let rawName = actionName.replace(/^get/i, '').replace(/data$/i, '');[span_428](start_span)[span_428](end_span)
      let tableName = rawName.charAt(0).toUpperCase() + rawName.slice(1);[span_429](start_span)[span_429](end_span)
      const { data: safeData } = await safeSupabaseSelect(tableName);[span_430](start_span)[span_430](end_span)
      if (safeData && safeData.length > 0) {
        const headers = Object.keys(safeData[0]);[span_431](start_span)[span_431](end_span)
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));[span_432](start_span)[span_432](end_span)
        return { status: 'success', headers, rows, data: safeData };[span_433](start_span)[span_433](end_span)
      }
    }

    return { status: 'error', message: 'Aksi GET tidak dikenal: ' + actionName };[span_434](start_span)[span_434](end_span)
  } catch (err) {
    console.error('Fetch Error (GET):', err);[span_435](start_span)[span_435](end_span)
    return { status: 'error', message: 'Gagal memuat data Supabase: ' + err.message };[span_436](start_span)[span_436](end_span)
  }
}

// ==========================================================
// ==== NOTIFIKASI REALTIME (SOUND, WEBSOCKET, PUSH) ========
// ==========================================================
function playNotifSound() {[span_437](start_span)[span_437](end_span)
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();[span_438](start_span)[span_438](end_span)
    const osc = audioCtx.createOscillator();[span_439](start_span)[span_439](end_span)
    const gain = audioCtx.createGain();[span_440](start_span)[span_440](end_span)
    osc.type = 'sine';[span_441](start_span)[span_441](end_span)
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);[span_442](start_span)[span_442](end_span)
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);[span_443](start_span)[span_443](end_span)
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);[span_444](start_span)[span_444](end_span)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);[span_445](start_span)[span_445](end_span)
    osc.connect(gain);[span_446](start_span)[span_446](end_span)
    gain.connect(audioCtx.destination);[span_447](start_span)[span_447](end_span)
    osc.start();[span_448](start_span)[span_448](end_span)
    osc.stop(audioCtx.currentTime + 0.3);[span_449](start_span)[span_449](end_span)
  } catch (e) {}
}

function requestNotifPermission() {[span_450](start_span)[span_450](end_span)
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();[span_451](start_span)[span_451](end_span)
}

function triggerNativeBrowserNotif(title, body) {[span_452](start_span)[span_452](end_span)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: 'https://file.aiquickdraw.com/imgcompressed/img/compressed_517f8d7424520a05c902d8a1c25e1ab6.webp' });[span_453](start_span)[span_453](end_span)
    } catch(e) {}
  }
}

function initRealtimeNotif() {[span_454](start_span)[span_454](end_span)
  if (!db || !session.token) return;[span_455](start_span)[span_455](end_span)
  if (supabaseRealtimeChannel) db.removeChannel(supabaseRealtimeChannel);[span_456](start_span)[span_456](end_span)
  supabaseRealtimeChannel = db
    .channel('rt-realtime-notif')[span_457](start_span)[span_457](end_span)
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {[span_458](start_span)[span_458](end_span)
      console.log('⚡ Realtime Update Diterima:', payload.table);[span_459](start_span)[span_459](end_span)
      fetchNotifikasi(true);[span_460](start_span)[span_460](end_span)
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') console.log('🟢 Supabase Realtime Listener Active!');[span_461](start_span)[span_461](end_span)
    });
}

function parseTanggalKeDate(dateVal) {[span_462](start_span)[span_462](end_span)
  if (!dateVal) return null;[span_463](start_span)[span_463](end_span)
  if (dateVal instanceof Date) return dateVal;[span_464](start_span)[span_464](end_span)
  let str = String(dateVal).trim();[span_465](start_span)[span_465](end_span)
  if (!str || str === '-') return null;[span_466](start_span)[span_466](end_span)

  let d = new Date(str);[span_467](start_span)[span_467](end_span)
  if (!isNaN(d.getTime())) return d;[span_468](start_span)[span_468](end_span)

  let parts = str.split(/[\/\-\s:]/);[span_469](start_span)[span_469](end_span)
  if (parts.length >= 3) {
    let day = parseInt(parts[0], 10);[span_470](start_span)[span_470](end_span)
    let month = parseInt(parts[1], 10) - 1;[span_471](start_span)[span_471](end_span)
    let year = parseInt(parts[2], 10);[span_472](start_span)[span_472](end_span)
    let hour = parts.length >= 4 ? parseInt(parts[3], 10) : 0;[span_473](start_span)[span_473](end_span)
    let min = parts.length >= 5 ? parseInt(parts[4], 10) : 0;[span_474](start_span)[span_474](end_span)
    if (year < 100) year += 2000;[span_475](start_span)[span_475](end_span)
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      let d2 = new Date(year, month, day, hour, min);[span_476](start_span)[span_476](end_span)
      if (!isNaN(d2.getTime())) return d2;[span_477](start_span)[span_477](end_span)
    }
  }
  return null;[span_478](start_span)[span_478](end_span)
}

async function fetchNotifikasi(isRealtimeTrigger = false) {[span_479](start_span)[span_479](end_span)
  if (!session.token) return;[span_480](start_span)[span_480](end_span)
  const res = await callGASGet('getNotifications');[span_481](start_span)[span_481](end_span)
  if (res && res.status === 'success') {
    rawNotifData = res.data || [];[span_482](start_span)[span_482](end_span)

    let savedTimestamps = JSON.parse(localStorage.getItem('rt_notif_times_' + session.nik) || '{}');[span_483](start_span)[span_483](end_span)
    let now = new Date();[span_484](start_span)[span_484](end_span)

    rawNotifData.forEach(item => {
      let notifDate = null;[span_485](start_span)[span_485](end_span)
      if (item.rawDate) {
        notifDate = parseTanggalKeDate(item.rawDate);[span_486](start_span)[span_486](end_span)
      }
      if ((!notifDate || isNaN(notifDate.getTime())) && savedTimestamps[item.id]) {
        let savedDate = new Date(savedTimestamps[item.id]);[span_487](start_span)[span_487](end_span)
        if (!isNaN(savedDate.getTime())) notifDate = savedDate;[span_488](start_span)[span_488](end_span)
      }
      if (!notifDate || isNaN(notifDate.getTime())) {
        notifDate = new Date();[span_489](start_span)[span_489](end_span)
        savedTimestamps[item.id] = notifDate.toISOString();[span_490](start_span)[span_490](end_span)
      } else {
        savedTimestamps[item.id] = notifDate.toISOString();[span_491](start_span)[span_491](end_span)
      }

      item.timestampMs = notifDate.getTime();[span_492](start_span)[span_492](end_span)
      let isHariIni = notifDate.toDateString() === now.toDateString();[span_493](start_span)[span_493](end_span)
      let jamStr = notifDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';[span_494](start_span)[span_494](end_span)
      item.waktuTampil = isHariIni ? jamStr : (notifDate.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + jamStr);[span_495](start_span)[span_495](end_span)
    });

    localStorage.setItem('rt_notif_times_' + session.nik, JSON.stringify(savedTimestamps));[span_496](start_span)[span_496](end_span)

    rawNotifData.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));[span_497](start_span)[span_497](end_span)

    let unreadCount = rawNotifData.length;[span_498](start_span)[span_498](end_span)
    if (isRealtimeTrigger && unreadCount > lastNotifCount && lastNotifCount !== 0) {
      playNotifSound();[span_499](start_span)[span_499](end_span)
      let notifTerbaru = rawNotifData[0];[span_500](start_span)[span_500](end_span)
      if (notifTerbaru) triggerNativeBrowserNotif(`SI RT 05 - ${notifTerbaru.menu}`, notifTerbaru.pesan);[span_501](start_span)[span_501](end_span)
    }
    lastNotifCount = unreadCount;[span_502](start_span)[span_502](end_span)

    let readCount = parseInt(localStorage.getItem('rt_notif_read_count_' + session.nik) || '0');[span_503](start_span)[span_503](end_span)
    if (rawNotifData.length < readCount) { readCount = 0; localStorage.setItem('rt_notif_read_count_' + session.nik, '0'); }[span_504](start_span)[span_504](end_span)
    let actualUnread = rawNotifData.length - readCount;[span_505](start_span)[span_505](end_span)

    document.querySelectorAll('.notif-badge').forEach(badge => {
      if (actualUnread > 0) {
        badge.innerText = actualUnread;[span_506](start_span)[span_506](end_span)
        badge.style.display = 'inline-block';[span_507](start_span)[span_507](end_span)
        badge.classList.add('animate-pulse');[span_508](start_span)[span_508](end_span)
      } else {
        badge.style.display = 'none';[span_509](start_span)[span_509](end_span)
        badge.classList.remove('animate-pulse');[span_510](start_span)[span_510](end_span)
      }
    });
  }
}

function bukaModalNotifikasi() {[span_511](start_span)[span_511](end_span)
  let listEl = document.getElementById('notifList');[span_512](start_span)[span_512](end_span)
  if (!rawNotifData || rawNotifData.length === 0) {
    listEl.innerHTML = '<div class="alert alert-light text-center my-3 text-muted"><i class="bi bi-bell-slash fs-4 d-block mb-2"></i>Tidak ada notifikasi baru saat ini.</div>';[span_513](start_span)[span_513](end_span)
  } else {
    let html = '<div class="list-group list-group-flush">';[span_514](start_span)[span_514](end_span)
    rawNotifData.forEach(item => {
      let waktu = item.waktuTampil || 'Baru saja';[span_515](start_span)[span_515](end_span)
      html += `
        <div class="list-group-item list-group-item-action py-3 px-2 border-bottom" style="cursor:pointer;" onclick="bukaNotifTarget('${item.menu}')">
          <div class="d-flex w-100 justify-content-between align-items-center mb-1">
            <span class="badge bg-primary">${item.menu}</span>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${waktu}</small>
          </div>
          <p class="mb-0 text-dark small">${item.pesan}</p>
        </div>`;[span_516](start_span)[span_516](end_span)
    });
    html += '</div>';[span_517](start_span)[span_517](end_span)
    listEl.innerHTML = html;[span_518](start_span)[span_518](end_span)
  }

  document.querySelectorAll('.notif-badge').forEach(badge => {
    badge.style.display = 'none';[span_519](start_span)[span_519](end_span)
    badge.innerText = '0';[span_520](start_span)[span_520](end_span)
    badge.classList.remove('animate-pulse');[span_521](start_span)[span_521](end_span)
  });
  localStorage.setItem('rt_notif_read_count_' + session.nik, rawNotifData.length);[span_522](start_span)[span_522](end_span)

  if (!bootstrapNotifModalInstance) bootstrapNotifModalInstance = new bootstrap.Modal(document.getElementById('notifModal'));[span_523](start_span)[span_523](end_span)
  bootstrapNotifModalInstance.show();[span_524](start_span)[span_524](end_span)
}

function bukaNotifTarget(menuName) {[span_525](start_span)[span_525](end_span)
  if (bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();[span_526](start_span)[span_526](end_span)
  loadMenu(menuName);[span_527](start_span)[span_527](end_span)
}

// ==========================================================
// ==== AUTHENTICATION & SESSION ============================
// ==========================================================
async function saveSessionToDatabase(token, nik, role) {[span_528](start_span)[span_528](end_span)
  if (!token || !nik) return;[span_529](start_span)[span_529](end_span)
  let timeStr = new Date().toLocaleString('id-ID');[span_530](start_span)[span_530](end_span)
  let res = await safeSupabaseInsert('Sessions', [{
    token: token,[span_531](start_span)[span_531](end_span)
    nik: nik,[span_532](start_span)[span_532](end_span)
    role: role || 'Warga',[span_533](start_span)[span_533](end_span)
    createdat: timeStr[span_534](start_span)[span_534](end_span)
  }]);

  if (res && res.error) {
    await safeSupabaseInsert('Sessions', [{
      token: token,[span_535](start_span)[span_535](end_span)
      nik: nik,[span_536](start_span)[span_536](end_span)
      role: role || 'Warga[span_537](start_span)'[span_537](end_span)
    }]);
  }
}

async function doLogin(e) {[span_538](start_span)[span_538](end_span)
  if (e) e.preventDefault();[span_539](start_span)[span_539](end_span)
  try {
    var uInput = document.getElementById('username');[span_540](start_span)[span_540](end_span)
    var pInput = document.getElementById('password');[span_541](start_span)[span_541](end_span)
    var msgEl = document.getElementById('login-msg');[span_542](start_span)[span_542](end_span)

    var u = uInput ? uInput.value.trim() : '';[span_543](start_span)[span_543](end_span)
    var p = pInput ? pInput.value.trim() : '';[span_544](start_span)[span_544](end_span)

    if (!u || !p) {
      if (msgEl) msgEl.innerHTML = "Isi username dan password dulu!";[span_545](start_span)[span_545](end_span)
      else alert("Isi username dan password dulu!");[span_546](start_span)[span_546](end_span)
      return;
    }
    if (msgEl) msgEl.innerHTML = "Memeriksa ke database...";[span_547](start_span)[span_547](end_span)

    const res = await callGASPost('processLogin', { username: u, password: p });[span_548](start_span)[span_548](end_span)
    if (res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();[span_549](start_span)[span_549](end_span)
      let sessionToken = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);[span_550](start_span)[span_550](end_span)
      session.token     = sessionToken;[span_551](start_span)[span_551](end_span)
      session.loginTime = Date.now();[span_552](start_span)[span_552](end_span)
      session.role      = (roleClean === 'rt') ? 'RT' : 'Warga';[span_553](start_span)[span_553](end_span)
      session.nik       = res.nik    ? res.nik.toString().trim()    : (res.username || u);[span_554](start_span)[span_554](end_span)
      session.nama      = res.nama   ? res.nama.toString().trim()   : '';[span_555](start_span)[span_555](end_span)
      session.alamat    = res.alamat ? res.alamat.toString().trim() : '';[span_556](start_span)[span_556](end_span)
      session.noHp      = res.noHp   ? res.noHp.toString().trim()   : '';[span_557](start_span)[span_557](end_span)
      localStorage.setItem('rt_user_session', JSON.stringify(session));[span_558](start_span)[span_558](end_span)

      await saveSessionToDatabase(sessionToken, session.nik, session.role);[span_559](start_span)[span_559](end_span)
      applySessionUI();[span_560](start_span)[span_560](end_span)
    } else {
      if (msgEl) msgEl.innerHTML = res ? res.message : 'Login gagal!';[span_561](start_span)[span_561](end_span)
      else alert(res ? res.message : 'Login gagal!');[span_562](start_span)[span_562](end_span)
    }
  } catch (error) {
    alert("Browser JS Error: " + error.message);[span_563](start_span)[span_563](end_span)
  }
}

window.doLogin = doLogin;[span_564](start_span)[span_564](end_span)
window.processLogin = doLogin;[span_565](start_span)[span_565](end_span)

async function verifySessionToken() {[span_566](start_span)[span_566](end_span)
  if (!session || !session.token) return true;[span_567](start_span)[span_567](end_span)
  
  if (session.loginTime && (Date.now() - session.loginTime < 5000)) {
    return true;[span_568](start_span)[span_568](end_span)
  }

  try {
    const { data: sessData, error } = await safeSupabaseSelect('Sessions');[span_569](start_span)[span_569](end_span)
    if (error || !sessData || sessData.length === 0) return true;[span_570](start_span)[span_570](end_span)

    let match = sessData.find(s => {
      let sTok = s.token || s.TOKEN || '';[span_571](start_span)[span_571](end_span)
      return String(sTok).trim() === String(session.token).trim();[span_572](start_span)[span_572](end_span)
    });

    if (!match) {
      if (notifTimer) clearInterval(notifTimer);[span_573](start_span)[span_573](end_span)
      localStorage.removeItem('rt_user_session');[span_574](start_span)[span_574](end_span)
      alert('Sesi login Anda telah dihentikan/dibatalkan oleh RT. Silakan login kembali.');[span_575](start_span)[span_575](end_span)
      location.reload();[span_576](start_span)[span_576](end_span)
      return false;[span_577](start_span)[span_577](end_span)
    }
    return true;[span_578](start_span)[span_578](end_span)
  } catch(e) {
    return true;[span_579](start_span)[span_579](end_span)
  }
}

function applySessionUI() {[span_580](start_span)[span_580](end_span)
  document.getElementById('login-container').style.display = 'none';[span_581](start_span)[span_581](end_span)
  document.getElementById('app-container').style.display = 'block';[span_582](start_span)[span_582](end_span)
  document.getElementById('mob-header').classList.add('show-nav');[span_583](start_span)[span_583](end_span)
  document.getElementById('mob-nav').classList.add('show-nav');[span_584](start_span)[span_584](end_span)

  if (session.role === 'Warga') {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'none');[span_585](start_span)[span_585](end_span)
  } else {
    document.querySelectorAll('.rt-only').forEach(el => {
      if (el.classList.contains('bottom-nav-item')) {
        el.style.display = 'flex';[span_586](start_span)[span_586](end_span)
      } else {
        el.style.display = 'block';[span_587](start_span)[span_587](end_span)
      }
    });
  }

  loadMenu('Dashboard');[span_588](start_span)[span_588](end_span)
  requestNotifPermission();[span_589](start_span)[span_589](end_span)
  initRealtimeNotif();[span_590](start_span)[span_590](end_span)
  fetchNotifikasi();[span_591](start_span)[span_591](end_span)
  verifySessionToken();[span_592](start_span)[span_592](end_span)

  if (notifTimer) clearInterval(notifTimer);[span_593](start_span)[span_593](end_span)
  notifTimer = setInterval(async function() {
    if (session.token && document.visibilityState === "visible") {
      fetchNotifikasi();[span_594](start_span)[span_594](end_span)
      verifySessionToken();[span_595](start_span)[span_595](end_span)
      if (currentActiveMenu === 'Dashboard' && typeof muatInfoWargaRealtime === 'function') {
        let isModalOpen = document.body.classList.contains('modal-open') || document.querySelector('.modal.show') || document.querySelector('#modal-kelola-aset:not(.hidden)');[span_596](start_span)[span_596](end_span)
        if (!isModalOpen) muatInfoWargaRealtime();[span_597](start_span)[span_597](end_span)
      }
    }
  }, 15000);
}

async function doLogout() {[span_598](start_span)[span_598](end_span)
  if (confirm('Apakah Anda yakin ingin logout?')) {
    if (session.token) {
      try { await safeSupabaseDelete('Sessions', 'token', session.token); } catch(e) {}[span_599](start_span)[span_599](end_span)
    }
    if (notifTimer) clearInterval(notifTimer);[span_600](start_span)[span_600](end_span)
    if (supabaseRealtimeChannel && db) db.removeChannel(supabaseRealtimeChannel);[span_601](start_span)[span_601](end_span)
    document.getElementById('mob-header').classList.remove('show-nav');[span_602](start_span)[span_602](end_span)
    document.getElementById('mob-nav').classList.remove('show-nav');[span_603](start_span)[span_603](end_span)
    localStorage.removeItem('rt_user_session');[span_604](start_span)[span_604](end_span)
    location.reload();[span_605](start_span)[span_605](end_span)
  }
}

async function checkExistingSession() {[span_606](start_span)[span_606](end_span)
  let savedSession = localStorage.getItem('rt_user_session');[span_607](start_span)[span_607](end_span)
  if (savedSession) {
    try {
      session = JSON.parse(savedSession);[span_608](start_span)[span_608](end_span)
      if (session && session.role) {
        applySessionUI();[span_609](start_span)[span_609](end_span)
        verifySessionToken();[span_610](start_span)[span_610](end_span)
      }
    } catch(e) {
      localStorage.removeItem('rt_user_session');[span_611](start_span)[span_611](end_span)
    }
  }
}

function syncActiveNav(menu) {[span_612](start_span)[span_612](end_span)
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));[span_613](start_span)[span_613](end_span)
  var dEl = document.getElementById('dmenu-' + menu);[span_614](start_span)[span_614](end_span)
  if (dEl) dEl.classList.add('active-menu');[span_615](start_span)[span_615](end_span)
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));[span_616](start_span)[span_616](end_span)
  var mEl = document.getElementById('mmenu-' + menu);[span_617](start_span)[span_617](end_span)
  if (mEl) mEl.classList.add('active');[span_618](start_span)[span_618](end_span)
}

// ==========================================================
// ==== NAVIGASI MENU =======================================
// ==========================================================
async function loadMenu(menu) {[span_619](start_span)[span_619](end_span)
  currentActiveMenu = menu;[span_620](start_span)[span_620](end_span)
  syncActiveNav(menu);[span_621](start_span)[span_621](end_span)
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : (menu === 'Profil' ? 'Profil Saya' : menu);[span_622](start_span)[span_622](end_span)
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';[span_623](start_span)[span_623](end_span)
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";[span_624](start_span)[span_624](end_span)

  switch(menu) {
    case 'Dashboard':    if (typeof loadDashboardView   === 'function') { loadDashboardView();   return; } break;[span_625](start_span)[span_625](end_span)
    case 'Profil':       if (typeof loadProfilView       === 'function') { loadProfilView();       return; } break;[span_626](start_span)[span_626](end_span)
    case 'Warga':        if (typeof loadWargaView        === 'function') { loadWargaView();        return; } break;[span_627](start_span)[span_627](end_span)
    case 'Kelahiran':    if (typeof loadKelahiranView    === 'function') { loadKelahiranView();    return; } break;[span_628](start_span)[span_628](end_span)
    case 'Kematian':     if (typeof loadKematianView     === 'function') { loadKematianView();     return; } break;[span_629](start_span)[span_629](end_span)
    case 'PindahMasuk':  if (typeof loadPindahMasukView  === 'function') { loadPindahMasukView();  return; } break;[span_630](start_span)[span_630](end_span)
    case 'PindahKeluar': if (typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;[span_631](start_span)[span_631](end_span)
    case 'Pengaturan':
    case 'PengaturanRT':
      if (String(session.role || '').toUpperCase() === 'RT') {
        renderPengaturanRTView();[span_632](start_span)[span_632](end_span)
      } else {
        document.getElementById('main-content').innerHTML = `
          <div class="card p-4 text-center border-0 shadow-sm rounded-3 my-4">
            <i class="bi bi-shield-lock text-primary display-4 mb-2"></i>
            <h5 class="fw-bold text-gray-800">Pengaturan RT & Sistem</h5>
            <p class="text-muted text-xs">Menu ini khusus untuk RT / Admin untuk mengelola identitas aplikasi, QRIS dinamis, dan akun warga.</p>
          </div>`;[span_633](start_span)[span_633](end_span)
      }
      return;[span_634](start_span)[span_634](end_span)
  }

  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data dari server...</small></div>';[span_635](start_span)[span_635](end_span)

  const res = await callGASGet('getTableData', { sheetName: menu });[span_636](start_span)[span_636](end_span)
  if (res && res.status === 'success') {
    currentHeaders = res.headers || [];[span_637](start_span)[span_637](end_span)
    currentRows    = res.rows    || [];[span_638](start_span)[span_638](end_span)
    renderTable(res, menu);[span_639](start_span)[span_639](end_span)
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data dari server.</div>';[span_640](start_span)[span_640](end_span)
  }
}

// ==========================================================
// ==== RENDER TABLE ========================================
// ==========================================================
function renderTable(data, menu) {[span_641](start_span)[span_641](end_span)
  let html = '';[span_642](start_span)[span_642](end_span)
  let bolehTambah = session.role === 'RT' || (session.role === 'Warga' && ['Pengaduan','SuratPengantar','Sumbangan','Aset','Peminjaman','Aspirasi'].includes(menu));[span_643](start_span)[span_643](end_span)
  if (bolehTambah) {
    let labelTombol = session.role === 'RT' ? '+ Tambah Data Baru' : (menu === 'Aspirasi' ? '+ Tulis Aspirasi Anonim' : '+ Buat Pengajuan / Form Baru');[span_644](start_span)[span_644](end_span)
    html += `<button class="btn btn-success fw-bold mb-3 shadow-sm px-3 py-2" onclick="bukaModalForm()"><i class="bi bi-plus-circle me-2"></i>${labelTombol}</button>`;[span_645](start_span)[span_645](end_span)
  }

  if (!data || !data.rows || data.rows.length === 0) {
    html += '<div class="alert alert-light border text-muted mt-2"><i class="bi bi-folder-x me-2"></i>Belum ada data.</div>';[span_646](start_span)[span_646](end_span)
    document.getElementById('main-content').innerHTML = html;[span_647](start_span)[span_647](end_span)
    return;
  }

  html += '<div class="card card-custom"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="dataTable">';[span_648](start_span)[span_648](end_span)
  html += '<thead class="table-light"><tr>';[span_649](start_span)[span_649](end_span)
  data.headers.forEach(h => html += `<th class="py-3 text-secondary" style="font-size:0.85rem;">${h.toUpperCase()}</th>`);[span_650](start_span)[span_650](end_span)
  html += '<th class="py-3 text-secondary text-center">AKSI</th></tr></thead><tbody>';[span_651](start_span)[span_651](end_span)

  data.rows.forEach(row => {
    html += '<tr>';[span_652](start_span)[span_652](end_span)
    row.forEach((val, idx) => {
      let headName = data.headers[idx].toLowerCase();[span_653](start_span)[span_653](end_span)
      if (headName.includes('foto') || headName.includes('bukti')) {
        let directUrl = convertToImageLink(val);[span_654](start_span)[span_654](end_span)
        html += `<td>${val && val !== '***Rahasia***' ? `<img src="${directUrl}" class="img-table" onclick="bukaPopUpFoto('${val}')">` : '-'}</td>`;[span_655](start_span)[span_655](end_span)
      } else {
        html += `<td>${val}</td>`;[span_656](start_span)[span_656](end_span)
      }
    });
    html += `<td class="text-center">${getTombolAksi(menu, row, data.headers)}</td></tr>`;[span_657](start_span)[span_657](end_span)
  });
  html += '</tbody></table></div></div>';[span_658](start_span)[span_658](end_span)
  document.getElementById('main-content').innerHTML = html;[span_659](start_span)[span_659](end_span)
}

function bukaPopUpFoto(urlImg) {[span_660](start_span)[span_660](end_span)
  document.getElementById('modalPreviewImg').src = convertToImageLink(urlImg);[span_661](start_span)[span_661](end_span)
  if (!bootstrapImageModalInstance) bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));[span_662](start_span)[span_662](end_span)
  bootstrapImageModalInstance.show();[span_663](start_span)[span_663](end_span)
}

async function bukaModalForm() {[span_664](start_span)[span_664](end_span)
  editingId = null;[span_665](start_span)[span_665](end_span)
  document.getElementById('formModalTitle').innerText = "Form Input: " + currentActiveMenu;[span_666](start_span)[span_666](end_span)
  document.getElementById('btn-hapus-modal').style.display = 'none';[span_667](start_span)[span_667](end_span)
  await generateFormInputs(null);[span_668](start_span)[span_668](end_span)
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));[span_669](start_span)[span_669](end_span)
  bootstrapModalInstance.show();[span_670](start_span)[span_670](end_span)
}

async function bukaModalEdit(id) {[span_671](start_span)[span_671](end_span)
  editingId = id;[span_672](start_span)[span_672](end_span)
  document.getElementById('formModalTitle').innerText = "Edit Data: " + currentActiveMenu;[span_673](start_span)[span_673](end_span)
  document.getElementById('btn-hapus-modal').style.display = session.role === 'RT' ? 'inline-block' : 'none';[span_674](start_span)[span_674](end_span)

  let rowData = (currentRows || []).find(r => {
    if (!r) return false;[span_675](start_span)[span_675](end_span)
    if (Array.isArray(r)) {
      return r.some(val => val !== null && val !== undefined && String(val).trim() === String(id).trim());[span_676](start_span)[span_676](end_span)
    } else if (typeof r === 'object') {
      return Object.values(r).some(val => val !== null && val !== undefined && String(val).trim() === String(id).trim());[span_677](start_span)[span_677](end_span)
    }
    return false;[span_678](start_span)[span_678](end_span)
  });

  await generateFormInputs(rowData);[span_679](start_span)[span_679](end_span)
  if (!bootstrapModalInstance) bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));[span_680](start_span)[span_680](end_span)
  bootstrapModalInstance.show();[span_681](start_span)[span_681](end_span)
}

async function generateFormInputs(rowData) {[span_682](start_span)[span_682](end_span)
  let formBody = document.getElementById('dynamicForm');[span_683](start_span)[span_683](end_span)
  formBody.innerHTML = '';[span_684](start_span)[span_684](end_span)

  if (session.role === 'Warga' && !rowData && (!session.alamat || !session.nama) && session.nik) {
    try {
      const { data: safeWarga } = await safeSupabaseSelect('Warga');[span_685](start_span)[span_685](end_span)
      if (safeWarga) {
        let myW = safeWarga.find(w => String(cariNilaiKolom(w, ['nik', 'ktp'])).trim() === String(session.nik).trim());[span_686](start_span)[span_686](end_span)
        if (myW) {
          session.alamat = session.alamat || cariNilaiKolom(myW, ['alamat', 'alamat_rumah']) || '';[span_687](start_span)[span_687](end_span)
          session.nama   = session.nama   || cariNilaiKolom(myW, ['nama_lengkap', 'nama']) || '';[span_688](start_span)[span_688](end_span)
          localStorage.setItem('rt_user_session', JSON.stringify(session));[span_689](start_span)[span_689](end_span)
        }
      }
    } catch(e) {}
  }

  for (let idx = 0; idx < currentHeaders.length; idx++) {
    let h = currentHeaders[idx];[span_690](start_span)[span_690](end_span)
    if (['id','no','saldo'].includes(h.toLowerCase())) continue;[span_691](start_span)[span_691](end_span)
    let nameLower = h.toLowerCase().trim();[span_692](start_span)[span_692](end_span)
    let labelText = h.replace('_', ' ').toUpperCase();[span_693](start_span)[span_693](end_span)
    let val = rowData ? rowData[idx] : "";[span_694](start_span)[span_694](end_span)
    if ((nameLower === 'status' || nameLower.includes('penyelesaian') || nameLower.includes('admin')) && (session.role !== 'RT' || !rowData)) continue;[span_695](start_span)[span_695](end_span)
    if (session.role === 'Warga' && !rowData) {
      if (nameLower === 'nik') val = session.nik;[span_696](start_span)[span_696](end_span)
      if (nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama')) val = session.nama;[span_697](start_span)[span_697](end_span)
      if (nameLower.includes('alamat')) val = session.alamat;[span_698](start_span)[span_698](end_span)
      if (['no_hp','hp','telp','wa'].includes(nameLower)) val = session.noHp;[span_699](start_span)[span_699](end_span)
    }
    if (val && nameLower.includes('tanggal') && val.includes('/')) {
      let parts = val.split('/');[span_700](start_span)[span_700](end_span)
      if (parts.length === 3) val = parts[2] + '-' + parts[1] + '-' + parts[0];[span_701](start_span)[span_701](end_span)
    }

    let inputHtml = '';[span_702](start_span)[span_702](end_span)
    if (nameLower === 'status' && ['Pengaduan','SuratPengantar','Sumbangan'].includes(currentActiveMenu)) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="Belum di verifikasi" ${val==='Belum di verifikasi'?'selected':''}>Belum di verifikasi</option>
        <option value="Sedang ditindak lanjuti" ${val==='Sedang ditindak lanjuti'?'selected':''}>Sedang ditindak lanjuti</option>
        <option value="selesai" ${val==='selesai'?'selected':''}>selesai</option>
        <option value="di tolak" ${val==='di tolak'?'selected':''}>di tolak</option>
        <option value="diterima" ${val==='diterima'?'selected':''}>diterima</option>
      </select>`;[span_703](start_span)[span_703](end_span)
    } else if (nameLower === 'jenis_aduan' || (currentActiveMenu === 'Pengaduan' && nameLower.includes('jenis'))) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Jenis Aduan --</option>
        <option value="KEAMANAN" ${val.toUpperCase()==='KEAMANAN'?'selected':''}>KEAMANAN</option>
        <option value="KEBERSIHAN" ${val.toUpperCase()==='KEBERSIHAN'?'selected':''}>KEBERSIHAN</option>
        <option value="LAMPU JALAN" ${val.toUpperCase()==='LAMPU JALAN'?'selected':''}>LAMPU JALAN</option>
        <option value="JALANAN" ${val.toUpperCase()==='JALANAN'?'selected':''}>JALANAN</option>
        <option value="LAINNYA" ${val.toUpperCase()==='LAINNYA'?'selected':''}>LAINNYA</option>
      </select>`;[span_704](start_span)[span_704](end_span)
    } else if (nameLower.includes('tanggal')) {
      inputHtml = `<input type="date" class="form-control dynamic-input" data-key="${h}" value="${val}">`;[span_705](start_span)[span_705](end_span)
    } else if (nameLower === 'jenis_kelamin') {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Jenis Kelamin --</option>
        <option value="LAKI-LAKI" ${['LAKI-LAKI','LAKI LAKI'].includes(val.toUpperCase())?'selected':''}>LAKI-LAKI</option>
        <option value="PEREMPUAN" ${val.toUpperCase()==='PEREMPUAN'?'selected':''}>PEREMPUAN</option>
      </select>`;[span_706](start_span)[span_706](end_span)
    } else if (nameLower === 'status_nikah') {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Status Nikah --</option>
        <option value="MENIKAH" ${val.toUpperCase()==='MENIKAH'?'selected':''}>MENIKAH</option>
        <option value="BELUM MENIKAH" ${['BELUM MENIKAH','BELUM'].includes(val.toUpperCase())?'selected':''}>BELUM MENIKAH</option>
      </select>`;[span_707](start_span)[span_707](end_span)
    } else if (nameLower === 'status_tinggal' || nameLower === 'status_huni' || nameLower === 'status_pindah' || (nameLower === 'status' && currentActiveMenu === 'Warga')) {
      inputHtml = `<select class="form-select dynamic-input" data-key="${h}">
        <option value="">-- Pilih Status Tinggal --</option>
        <option value="TETAP" ${val.toUpperCase()==='TETAP'?'selected':''}>TETAP</option>
        <option value="DOMISILI" ${['DOMISILI','KONTRAK'].includes(val.toUpperCase())?'selected':''}>DOMISILI</option>
      </select>`;[span_708](start_span)[span_708](end_span)
    } else if (nameLower.includes('foto') || nameLower.includes('bukti')) {
      let imgDirect = convertToImageLink(val);[span_709](start_span)[span_709](end_span)
      let isValidVal = val && val !== 'EMPTY' && val !== 'NULL' && val !== '-' && !val.includes('***');[span_710](start_span)[span_710](end_span)
      inputHtml = `
        ${isValidVal ? `<div class="mb-2"><img src="${imgDirect}" class="rounded border shadow-sm mb-2" style="max-height:110px;object-fit:cover;" onclick="bukaPopUpFoto('${val}')"><small class="d-block text-muted text-[10px]">Foto saat ini</small></div>` : ''}
        <div class="p-2 border rounded bg-white">
          <label class="form-label text-xs font-bold text-gray-700 mb-1 block"><i class="bi bi-camera-fill me-1 text-primary"></i>Upload Foto (Galeri / Kamera HP):</label>
          <input type="file" class="form-control form-control-sm dynamic-file-input" data-key="${h}" accept="image/*">
          <small class="text-muted text-[10px] d-block mt-1">*Pilih file foto dari HP/Kamera Anda.</small>
        </div>`;[span_711](start_span)[span_711](end_span)
    } else {
      let isReadonly = (session.role === 'Warga' && !rowData && (nameLower === 'nik' || nameLower === 'nama' || nameLower === 'nama_lengkap' || nameLower.includes('nama') || nameLower.includes('alamat'))) ? 'readonly style="background-color:#f1f5f9;cursor:not-allowed;"' : '';[span_712](start_span)[span_712](end_span)
      inputHtml = `<input type="text" class="form-control dynamic-input" data-key="${h}" value="${val}" placeholder="Masukkan ${labelText.toLowerCase()}..." ${isReadonly}>`;[span_713](start_span)[span_713](end_span)
    }
    formBody.innerHTML += `<div class="mb-3"><label class="form-label small text-secondary fw-bold">${labelText}</label>${inputHtml}</div>`;[span_714](start_span)[span_714](end_span)
  }
}

function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {[span_715](start_span)[span_715](end_span)
  return new Promise((resolve, reject) => {
    let reader = new FileReader();[span_716](start_span)[span_716](end_span)
    reader.onload = function(e) {
      let img = new Image();[span_717](start_span)[span_717](end_span)
      img.onload = function() {
        let canvas = document.createElement('canvas');[span_718](start_span)[span_718](end_span)
        let width = img.width;[span_719](start_span)[span_719](end_span)
        let height = img.height;[span_720](start_span)[span_720](end_span)

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);[span_721](start_span)[span_721](end_span)
            width = maxWidth;[span_722](start_span)[span_722](end_span)
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);[span_723](start_span)[span_723](end_span)
            height = maxHeight;[span_724](start_span)[span_724](end_span)
          }
        }

        canvas.width = width;[span_725](start_span)[span_725](end_span)
        canvas.height = height;[span_726](start_span)[span_726](end_span)
        let ctx = canvas.getContext('2d');[span_727](start_span)[span_727](end_span)
        ctx.drawImage(img, 0, 0, width, height);[span_728](start_span)[span_728](end_span)
        resolve(canvas.toDataURL('image/jpeg', quality));[span_729](start_span)[span_729](end_span)
      };
      img.onerror = () => resolve(e.target.result);[span_730](start_span)[span_730](end_span)
      img.src = e.target.result;[span_731](start_span)[span_731](end_span)
    };
    reader.onerror = reject;[span_732](start_span)[span_732](end_span)
    reader.readAsDataURL(file);[span_733](start_span)[span_733](end_span)
  });
}

function submitFormBaru(e) {[span_734](start_span)[span_734](end_span)
  if (e) e.preventDefault();[span_735](start_span)[span_735](end_span)
  let payload = {};[span_736](start_span)[span_736](end_span)

  document.querySelectorAll('.dynamic-input').forEach(inp => { payload[inp.getAttribute('data-key')] = inp.value; });[span_737](start_span)[span_737](end_span)

  let filePromises = [];[span_738](start_span)[span_738](end_span)
  document.querySelectorAll('.dynamic-file-input').forEach(fileInp => {
    let key = fileInp.getAttribute('data-key');[span_739](start_span)[span_739](end_span)
    let file = fileInp.files[0];[span_740](start_span)[span_740](end_span)
    if (file) {
      filePromises.push(compressImageFile(file).then(compressedUrl => {
        payload[key] = compressedUrl;[span_741](start_span)[span_741](end_span)
      }));
    }
  });

  document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary mb-2"></div><br><b>Memproses & mengompres foto...</b></div>';[span_742](start_span)[span_742](end_span)

  Promise.all(filePromises).then(async () => {
    if (editingId) {
      for (let k in payload) {
        if ((k.toLowerCase().includes('foto') || k.toLowerCase().includes('bukti')) && !payload[k]) {
          delete payload[k];[span_743](start_span)[span_743](end_span)
        }
      }
      const res = await callGASPost('updateDataDiSheet', { sheetName: currentActiveMenu, id: editingId, formData: payload });[span_744](start_span)[span_744](end_span)
      if (res && res.status === 'success') { bootstrapModalInstance.hide(); alert(res.message); loadMenu(currentActiveMenu); fetchNotifikasi(); }[span_745](start_span)[span_745](end_span)
      else { alert('Gagal memperbarui: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }[span_746](start_span)[span_746](end_span)
    } else {
      const res = await callGASPost('simpanDataKeSheet', { sheetName: currentActiveMenu, formData: payload });[span_747](start_span)[span_747](end_span)
      if (res && res.status === 'success') {
        bootstrapModalInstance.hide(); alert('Data Berhasil Disimpan!');[span_748](start_span)[span_748](end_span)
        if (session.role === 'Warga') {
          if (currentActiveMenu === 'Pengaduan'      && typeof waKirimLaporan         === 'function') waKirimLaporan('aduan', res.id);[span_749](start_span)[span_749](end_span)
          if (currentActiveMenu === 'SuratPengantar' && typeof waKirimLaporan         === 'function') waKirimLaporan('surat', res.id);[span_750](start_span)[span_750](end_span)
          if (currentActiveMenu === 'Sumbangan'      && typeof waVerifikasiSumbangan  === 'function') waVerifikasiSumbangan(res.id);[span_751](start_span)[span_751](end_span)
        }
        loadMenu(currentActiveMenu);[span_752](start_span)[span_752](end_span)
        fetchNotifikasi();[span_753](start_span)[span_753](end_span)
      } else { alert('Gagal menyimpan: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }[span_754](start_span)[span_754](end_span)
    }
  }).catch(err => { alert('Gagal membaca file foto: ' + err.message); loadMenu(currentActiveMenu); });[span_755](start_span)[span_755](end_span)
}

async function hapusDataAktif() {[span_756](start_span)[span_756](end_span)
  if (!editingId) return;[span_757](start_span)[span_757](end_span)
  if (confirm('Hapus data ini secara permanen dari database?')) {
    document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><b class="text-danger">Menghapus data...</b></div>';[span_758](start_span)[span_758](end_span)
    const res = await callGASPost('hapusDataDariSheet', { sheetName: currentActiveMenu, id: editingId });[span_759](start_span)[span_759](end_span)
    if (res && res.status === 'success') { bootstrapModalInstance.hide(); alert('Data Berhasil Dihapus!'); loadMenu(currentActiveMenu); fetchNotifikasi(); }[span_760](start_span)[span_760](end_span)
    else { alert('Gagal menghapus: ' + (res ? res.message : 'Error')); loadMenu(currentActiveMenu); }[span_761](start_span)[span_761](end_span)
  }
}

function getTombolAksi(menu, row, headers) {[span_762](start_span)[span_762](end_span)
  let lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());[span_763](start_span)[span_763](end_span)
  
  let idIdx = lowerHeaders.indexOf('id');[span_764](start_span)[span_764](end_span)
  if (idIdx === -1) idIdx = lowerHeaders.findIndex(h => h.includes('id'));[span_765](start_span)[span_765](end_span)
  if (idIdx === -1) idIdx = lowerHeaders.findIndex(h => h.includes('nik') || h.includes('ktp'));[span_766](start_span)[span_766](end_span)
  if (idIdx === -1) idIdx = 0;[span_767](start_span)[span_767](end_span)

  let realId = row[idIdx];[span_768](start_span)[span_768](end_span)

  let noHpIdx = lowerHeaders.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));[span_769](start_span)[span_769](end_span)
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';[span_770](start_span)[span_770](end_span)

  if (session.role === 'RT') {
    let btn = `<button class="btn btn-sm btn-outline-primary m-1 fw-bold" onclick="bukaModalEdit('${realId}')">Edit/Status</button>`;[span_771](start_span)[span_771](end_span)
    if (['Pengaduan','SuratPengantar'].includes(menu)) btn += `<button class="btn btn-sm btn-success m-1 fw-bold" onclick="waKirimLaporanKeWarga('${realId}','${noHpWarga}')"><i class="bi bi-whatsapp me-1"></i>Laporan</button>`;[span_772](start_span)[span_772](end_span)
    return btn;
  }

  if (session.role === 'Warga') {
    if (menu === 'Pengaduan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('aduan','${realId}')"><i class="bi bi-whatsapp me-1"></i>WA Lapor</button>`;[span_773](start_span)[span_773](end_span)
    if (menu === 'SuratPengantar') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('surat','${realId}')"><i class="bi bi-whatsapp me-1"></i>WA Surat</button>`;[span_774](start_span)[span_774](end_span)
    if (menu === 'Keuangan')       return `<button class="btn btn-sm btn-danger fw-bold" onclick="waLaporMasalahKeuangan('${realId}')">Laporkan</button>`;[span_775](start_span)[span_775](end_span)
    if (menu === 'Sumbangan')      return `<button class="btn btn-sm btn-success fw-bold" onclick="waVerifikasiSumbangan('${realId}')"><i class="bi bi-whatsapp me-1"></i>Verifikasi</button>`;[span_776](start_span)[span_776](end_span)
  }
  return '-';[span_777](start_span)[span_777](end_span)
}

function bukaWa(nomor, text) {[span_778](start_span)[span_778](end_span)
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(text)}`, '_blank');[span_779](start_span)[span_779](end_span)
}

function filterTable() {[span_780](start_span)[span_780](end_span)
  let searchInput = document.getElementById("searchInput");[span_781](start_span)[span_781](end_span)
  if (!searchInput) return;[span_782](start_span)[span_782](end_span)
  let input = searchInput.value.toLowerCase().trim();[span_783](start_span)[span_783](end_span)

  if (typeof filterDataWarga === 'function' && currentActiveMenu === 'Warga') { filterDataWarga(); return; }[span_784](start_span)[span_784](end_span)
  if (typeof filterDataSumbangan === 'function' && currentActiveMenu === 'Sumbangan') { filterDataSumbangan(); return; }[span_785](start_span)[span_785](end_span)
  if (typeof filterDataPengaduan === 'function' && currentActiveMenu === 'Pengaduan') { filterDataPengaduan(); return; }[span_786](start_span)[span_786](end_span)
  if (typeof filterDataSurat === 'function' && currentActiveMenu === 'SuratPengantar') { filterDataSurat(); return; }[span_787](start_span)[span_787](end_span)
  if (typeof filterTabelKas === 'function' && currentActiveMenu === 'Keuangan') { filterTabelKas(); return; }[span_788](start_span)[span_788](end_span)
  if (typeof filterDataPindahMasuk === 'function' && currentActiveMenu === 'PindahMasuk') { filterDataPindahMasuk(); return; }[span_789](start_span)[span_789](end_span)
  if (typeof filterDataPindahKeluar === 'function' && currentActiveMenu === 'PindahKeluar') { filterDataPindahKeluar(); return; }[span_790](start_span)[span_790](end_span)
  if (typeof filterDataKelahiran === 'function' && currentActiveMenu === 'Kelahiran') { filterDataKelahiran(); return; }[span_791](start_span)[span_791](end_span)
  if (typeof filterDataKematian === 'function' && currentActiveMenu === 'Kematian') { filterDataKematian(); return; }[span_792](start_span)[span_792](end_span)

  let rows = document.querySelectorAll("#main-content table tbody tr");[span_793](start_span)[span_793](end_span)
  rows.forEach(row => {
    let text = row.innerText.toLowerCase();[span_794](start_span)[span_794](end_span)
    row.style.display = text.includes(input) ? "" : "none";[span_795](start_span)[span_795](end_span)
  });

  let iuranItems = document.querySelectorAll("#list-bulan-iuran > div");[span_796](start_span)[span_796](end_span)
  iuranItems.forEach(card => {
    let text = card.innerText.toLowerCase();[span_797](start_span)[span_797](end_span)
    card.style.display = text.includes(input) ? "" : "none";[span_798](start_span)[span_798](end_span)
  });

  document.querySelectorAll(".quick-action-item").forEach(item => {
    let text = item.innerText.toLowerCase();[span_799](start_span)[span_799](end_span)
    item.style.display = text.includes(input) ? "flex" : "none";[span_800](start_span)[span_800](end_span)
  });
}

// ==========================================================
// ==== MODUL PENGATURAN RT & SISTEM (THEME, QRIS, USERS) ===
// ==========================================================
let appSettings = {
  app_title: 'SISTEM INFORMASI RT 05',[span_801](start_span)[span_801](end_span)
  app_subtitle: 'AMAN, BERSIH, MODERN, TRANSPARAN DAN EFISIEN',[span_802](start_span)[span_802](end_span)
  app_logo: 'https://file.aiquickdraw.com/imgcompressed/img/compressed_517f8d7424520a05c902d8a1c25e1ab6.webp',[span_803](start_span)[span_803](end_span)
  app_theme: 'blue',[span_804](start_span)[span_804](end_span)
  payment_rekening: JSON.stringify([
    { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },[span_805](start_span)[span_805](end_span)
    { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }[span_806](start_span)[span_806](end_span)
  ]),
  payment_qris_string: '00020101021126570011ID.DANA.WWW011893600915311093669202091109366920303UKE51440014ID.CO.QRIS.WWW0215ID10210624013640303UKE5204899953033605802ID5909SHN GROUP6010Kab. Bogor6105163206304BAFC',[span_807](start_span)[span_807](end_span)
  payment_qris_name: 'SHN GROUP / RT 05',[span_808](start_span)[span_808](end_span)
  payment_qris: '',[span_809](start_span)[span_809](end_span)
  info_warga: '[span_810](start_span)'[span_810](end_span)
};

async function loadAppSettings() {[span_811](start_span)[span_811](end_span)
  try {
    const { data: settingsData } = await safeSupabaseSelect('Pengaturan');[span_812](start_span)[span_812](end_span)
    if (settingsData && settingsData.length > 0) {
      settingsData.forEach(row => {
        let k = row.kunci || cariNilaiKolom(row, ['kunci', 'key']);[span_813](start_span)[span_813](end_span)
        let v = row.nilai !== null && row.nilai !== undefined ? row.nilai : cariNilaiKolom(row, ['nilai', 'value']);[span_814](start_span)[span_814](end_span)
        if (k) appSettings[k] = v;[span_815](start_span)[span_815](end_span)
      });
    }

    if (appSettings.app_title) {
      ['login-app-title', 'mob-app-title', 'sidebar-app-title'].forEach(id => {
        let el = document.getElementById(id);[span_816](start_span)[span_816](end_span)
        if (el) el.innerText = appSettings.app_title;[span_817](start_span)[span_817](end_span)
      });
    }
    if (appSettings.app_subtitle) {
      ['login-app-subtitle', 'mob-app-subtitle'].forEach(id => {
        let el = document.getElementById(id);[span_818](start_span)[span_818](end_span)
        if (el) el.innerHTML = `<small>${appSettings.app_subtitle}</small>`;[span_819](start_span)[span_819](end_span)
      });
    }
    if (appSettings.app_logo) {
      document.querySelectorAll('.app-logo-img').forEach(img => {
        img.src = appSettings.app_logo;[span_820](start_span)[span_820](end_span)
      });
    }

    applyTheme(appSettings.app_theme || 'blue');[span_821](start_span)[span_821](end_span)
    renderHeaderRekeningInfo();[span_822](start_span)[span_822](end_span)
  } catch(e) {
    console.error('Gagal memuat pengaturan:', e);[span_823](start_span)[span_823](end_span)
  }
}

function applyTheme(themeName) {[span_824](start_span)[span_824](end_span)
  document.body.classList.remove('theme-blue', 'theme-emerald', 'theme-indigo', 'theme-purple', 'theme-dark');[span_825](start_span)[span_825](end_span)
  document.body.classList.add('theme-' + (themeName || 'blue'));[span_826](start_span)[span_826](end_span)
  if (themeName === 'dark') {
    document.body.style.backgroundColor = '#0f172a';[span_827](start_span)[span_827](end_span)
    document.body.style.color = '#f8fafc';[span_828](start_span)[span_828](end_span)
  } else {
    document.body.style.backgroundColor = '';[span_829](start_span)[span_829](end_span)
    document.body.style.color = '';[span_830](start_span)[span_830](end_span)
  }
}

function renderHeaderRekeningInfo() {[span_831](start_span)[span_831](end_span)
  let rekEl = document.getElementById('rek-info');[span_832](start_span)[span_832](end_span)
  if (!rekEl) return;[span_833](start_span)[span_833](end_span)

  let list = [];[span_834](start_span)[span_834](end_span)
  try { list = JSON.parse(appSettings.payment_rekening || '[]'); } catch(e) {}[span_835](start_span)[span_835](end_span)
  if (!Array.isArray(list) || list.length === 0) {
    rekEl.style.display = 'none';[span_836](start_span)[span_836](end_span)
    return;
  }

  let html = `<h5 class="fw-bold text-primary mb-2"><i class="bi bi-info-circle-fill me-2"></i>Info Rekening & Pembayaran</h5><p class="mb-1 text-secondary">`;[span_837](start_span)[span_837](end_span)
  list.forEach((r, idx) => {
    let b = r.bank || 'Bank';[span_838](start_span)[span_838](end_span)
    let n = r.no || '-';[span_839](start_span)[span_839](end_span)
    html += `<strong>${b}:</strong> ${n} <button class="btn-salin-inline" onclick="copySingleRek('${n}')">(salin)</button> ${idx < list.length - 1 ? '| ' : ''}`;[span_840](start_span)[span_840](end_span)
  });
  if (list.length > 0 && list[0].an) {
    html += `<span class="ms-2 badge bg-light text-dark">a.n ${list[0].an}</span>`;[span_841](start_span)[span_841](end_span)
  }
  if (appSettings.payment_qris) {
    html += `<button onclick="bukaPopUpFoto('${appSettings.payment_qris}')" class="btn btn-sm btn-outline-primary ms-3 font-bold py-0"><i class="bi bi-qr-code me-1"></i>Lihat QRIS</button>`;[span_842](start_span)[span_842](end_span)
  }
  html += `</p>`;[span_843](start_span)[span_843](end_span)
  rekEl.innerHTML = html;[span_844](start_span)[span_844](end_span)
}

function switchSettingTab(tabName) {[span_845](start_span)[span_845](end_span)
  document.querySelectorAll('.setting-tab-panel').forEach(p => p.classList.add('d-none'));[span_846](start_span)[span_846](end_span)
  document.querySelectorAll('#settingTabs .nav-link').forEach(b => b.classList.remove('active'));[span_847](start_span)[span_847](end_span)

  let panel = document.getElementById('tab-content-' + tabName);[span_848](start_span)[span_848](end_span)
  let btn = document.getElementById('tab-' + tabName + '-btn');[span_849](start_span)[span_849](end_span)
  if (panel) panel.classList.remove('d-none');[span_850](start_span)[span_850](end_span)
  if (btn) btn.classList.add('active');[span_851](start_span)[span_851](end_span)
}

function selectThemeOption(themeName) {[span_852](start_span)[span_852](end_span)
  document.getElementById('set-app-theme').value = themeName;[span_853](start_span)[span_853](end_span)
  applyTheme(themeName);[span_854](start_span)[span_854](end_span)
}

function tambahBarisRekening() {[span_855](start_span)[span_855](end_span)
  let container = document.getElementById('container-rekening-list');[span_856](start_span)[span_856](end_span)
  if (!container) return;[span_857](start_span)[span_857](end_span)
  let div = document.createElement('div');[span_858](start_span)[span_858](end_span)
  div.className = 'row g-2 align-items-center border p-2 rounded bg-light row-rek-item';[span_859](start_span)[span_859](end_span)
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
    </div>`;[span_860](start_span)[span_860](end_span)
  container.appendChild(div);
}

async function simpanIdentitasDanTema(e) {[span_861](start_span)[span_861](end_span)
  e.preventDefault();[span_862](start_span)[span_862](end_span)
  let title = document.getElementById('set-app-title').value;[span_863](start_span)[span_863](end_span)
  let subtitle = document.getElementById('set-app-subtitle').value;[span_864](start_span)[span_864](end_span)
  let logo = document.getElementById('set-app-logo').value;[span_865](start_span)[span_865](end_span)
  let theme = document.getElementById('set-app-theme').value;[span_866](start_span)[span_866](end_span)

  let settingsArray = [
    { kunci: 'app_title', nilai: title },[span_867](start_span)[span_867](end_span)
    { kunci: 'app_subtitle', nilai: subtitle },[span_868](start_span)[span_868](end_span)
    { kunci: 'app_logo', nilai: logo },[span_869](start_span)[span_869](end_span)
    { kunci: 'app_theme', nilai: theme }[span_870](start_span)[span_870](end_span)
  ];

  const res = await callGASPost('simpanPengaturanApp', { settingsArray });[span_871](start_span)[span_871](end_span)
  if (res && res.status === 'success') {
    alert('Identitas & Tema berhasil diperbarui!');[span_872](start_span)[span_872](end_span)
    await loadAppSettings();[span_873](start_span)[span_873](end_span)
  } else {
    alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));[span_874](start_span)[span_874](end_span)
  }
}

async function simpanRekeningDanQRIS(e) {[span_875](start_span)[span_875](end_span)
  e.preventDefault();[span_876](start_span)[span_876](end_span)
  let qrisString = document.getElementById('set-payment-qris-string').value;[span_877](start_span)[span_877](end_span)
  let qrisName   = document.getElementById('set-payment-qris-name').value;[span_878](start_span)[span_878](end_span)
  let qrisUrl    = document.getElementById('set-payment-qris').value;[span_879](start_span)[span_879](end_span)

  let rekList = [];[span_880](start_span)[span_880](end_span)
  document.querySelectorAll('.row-rek-item').forEach(row => {
    let b = row.querySelector('.inp-rek-bank').value.trim();[span_881](start_span)[span_881](end_span)
    let n = row.querySelector('.inp-rek-no').value.trim();[span_882](start_span)[span_882](end_span)
    let a = row.querySelector('.inp-rek-an').value.trim();[span_883](start_span)[span_883](end_span)
    if (b && n) rekList.push({ bank: b, no: n, an: a });[span_884](start_span)[span_884](end_span)
  });

  let settingsArray = [
    { kunci: 'payment_qris_string', nilai: qrisString },[span_885](start_span)[span_885](end_span)
    { kunci: 'payment_qris_name', nilai: qrisName },[span_886](start_span)[span_886](end_span)
    { kunci: 'payment_qris', nilai: qrisUrl },[span_887](start_span)[span_887](end_span)
    { kunci: 'payment_rekening', nilai: JSON.stringify(rekList) }[span_888](start_span)[span_888](end_span)
  ];

  const res = await callGASPost('simpanPengaturanApp', { settingsArray });[span_889](start_span)[span_889](end_span)
  if (res && res.status === 'success') {
    alert('Rekening & Pengaturan QRIS Dinamis berhasil disimpan!');[span_890](start_span)[span_890](end_span)
    await loadAppSettings();[span_891](start_span)[span_891](end_span)
  } else {
    alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));[span_892](start_span)[span_892](end_span)
  }
}

async function simpanUserBaru(e) {[span_893](start_span)[span_893](end_span)
  e.preventDefault();[span_894](start_span)[span_894](end_span)
  let username = document.getElementById('reg-username').value.trim();[span_895](start_span)[span_895](end_span)
  let nik = document.getElementById('reg-nik').value.trim();[span_896](start_span)[span_896](end_span)
  let password = document.getElementById('reg-password').value.trim();[span_897](start_span)[span_897](end_span)
  let role = document.getElementById('reg-role').value;[span_898](start_span)[span_898](end_span)

  if (!username || !password) {
    alert('Username dan Password wajib diisi!');[span_899](start_span)[span_899](end_span)
    return;
  }

  let userObj = {
    username: username,[span_900](start_span)[span_900](end_span)
    nik: nik || username,[span_901](start_span)[span_901](end_span)
    password: password,[span_902](start_span)[span_902](end_span)
    role: role[span_903](start_span)[span_903](end_span)
  };

  const res = await callGASPost('tambahUserWarga', { userObj });[span_904](start_span)[span_904](end_span)
  if (res && res.status === 'success') {
    alert(`Akun ${username} (${role}) berhasil didaftarkan!`);[span_905](start_span)[span_905](end_span)
    renderPengaturanRTView();[span_906](start_span)[span_906](end_span)
  } else {
    alert('Gagal mendaftarkan user: ' + (res ? res.message : 'Error'));[span_907](start_span)[span_907](end_span)
  }
}

async function resetPasswordUser(username) {[span_908](start_span)[span_908](end_span)
  let newPass = prompt(`Masukkan password baru untuk akun '${username}':`);[span_909](start_span)[span_909](end_span)
  if (!newPass) return;[span_910](start_span)[span_910](end_span)
  const res = await callGASPost('resetPasswordUser', { username: username, newPassword: newPass.trim() });[span_911](start_span)[span_911](end_span)
  if (res && res.status === 'success') {
    alert(`Password untuk '${username}' berhasil diubah!`);[span_912](start_span)[span_912](end_span)
  } else {
    alert('Gagal reset password: ' + (res ? res.message : 'Error'));[span_913](start_span)[span_913](end_span)
  }
}

async function hapusUserAkun(username) {[span_914](start_span)[span_914](end_span)
  if (confirm(`Apakah Anda yakin ingin menghapus akun user '${username}' secara permanen dari database?`)) {
    const res = await callGASPost('hapusUserAkun', { username: username });[span_915](start_span)[span_915](end_span)
    if (res && res.status === 'success') {
      try { await safeSupabaseDelete('Sessions', 'nik', username); } catch(e) {}[span_916](start_span)[span_916](end_span)
      alert(`Akun '${username}' dan seluruh sesi login aktifnya berhasil dihapus permanen!`);[span_917](start_span)[span_917](end_span)
      renderPengaturanRTView();[span_918](start_span)[span_918](end_span)
    } else {
      alert('Gagal menghapus user: ' + (res ? res.message : 'Error'));[span_919](start_span)[span_919](end_span)
    }
  }
}

async function simpanPengumumanWarga(e) {[span_920](start_span)[span_920](end_span)
  e.preventDefault();[span_921](start_span)[span_921](end_span)
  let teks = document.getElementById('set-info-warga').value;[span_922](start_span)[span_922](end_span)
  const res = await callGASPost('simpanInfoWarga', { teksBaru: teks });[span_923](start_span)[span_923](end_span)
  if (res && res.status === 'success') {
    alert('Pengumuman warga berhasil disimpan!');[span_924](start_span)[span_924](end_span)
    await loadAppSettings();[span_925](start_span)[span_925](end_span)
  } else {
    alert('Gagal menyimpan pengumuman: ' + (res ? res.message : 'Error'));[span_926](start_span)[span_926](end_span)
  }
}

async function hapusSesiLogin(token) {[span_927](start_span)[span_927](end_span)
  if (!token) return;[span_928](start_span)[span_928](end_span)
  if (confirm('Putuskan sesi login ini? Warga yang menggunakan akun ini akan langsung di-logout otomatis dari aplikasinya.')) {
    const { error } = await safeSupabaseDelete('Sessions', 'token', token);[span_929](start_span)[span_929](end_span)
    if (!error) {
      alert('Sesi login berhasil dihentikan/dibatalkan!');[span_930](start_span)[span_930](end_span)
      renderPengaturanRTView();[span_931](start_span)[span_931](end_span)
    } else {
      alert('Gagal menghapus sesi: ' + (error ? error.message : 'Error'));[span_932](start_span)[span_932](end_span)
    }
  }
}

async function renderPengaturanRTView() {[span_933](start_span)[span_933](end_span)
  if (session.role !== 'RT') return;[span_934](start_span)[span_934](end_span)
  document.getElementById('page-title').innerText = 'Pengaturan RT & Sistem';[span_935](start_span)[span_935](end_span)
  document.getElementById('main-content').innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <br><small class="text-muted mt-2 d-block">Memuat pengaturan sistem...</small>
    </div>`;[span_936](start_span)[span_936](end_span)

  await loadAppSettings();[span_937](start_span)[span_937](end_span)
  let usersList = [];[span_938](start_span)[span_938](end_span)
  try {
    const { data: usersData } = await safeSupabaseSelect('Users');[span_939](start_span)[span_939](end_span)
    usersList = usersData || [];[span_940](start_span)[span_940](end_span)
  } catch(e) {}

  let sessionsList = [];[span_941](start_span)[span_941](end_span)
  try {
    const { data: sessData } = await safeSupabaseSelect('Sessions');[span_942](start_span)[span_942](end_span)
    sessionsList = sessData || [];[span_943](start_span)[span_943](end_span)
  } catch(e) {}

  let currentRek = [];[span_944](start_span)[span_944](end_span)
  try { currentRek = JSON.parse(appSettings.payment_rekening || '[]'); } catch(e) {}[span_945](start_span)[span_945](end_span)

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
              <button class="nav-link fw-bold text-xs" id="tab-sesi-btn" onclick="switchSettingTab('sesi')">
                <i class="bi bi-shield-lock-fill me-1"></i> Sesi Login Aktif (${sessionsList.length})
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
      { bank: 'DANA', no: '08973366667', an: 'RIZKY NOVIANSYAH' },[span_946](start_span)[span_946](end_span)
      { bank: 'BRI', no: '231313', an: 'RIZKY NOVIANSYAH' }[span_947](start_span)[span_947](end_span)
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
      let uName = u.username || u.name || '-';[span_948](start_span)[span_948](end_span)
      let uNik  = u.nik || '-';[span_949](start_span)[span_949](end_span)
      let uRole = u.role || 'Warga';[span_950](start_span)[span_950](end_span)
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

          <!-- TAB 5: MANAJEMEN SESI LOGIN WARGA -->
          <div id="tab-content-sesi" class="setting-tab-panel d-none">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 class="fw-bold text-primary mb-1"><i class="bi bi-shield-lock-fill me-2"></i>Daftar Sesi Login Aktif Warga</h5>
                <p class="text-xs text-muted mb-0">Manajemen sesi terpusat di database. Jika warga pindah atau dicabut aksesnya, klik <b>Putuskan Sesi</b> untuk membekukan akunnya secara seketika.</p>
              </div>
              <button onclick="renderPengaturanRTView()" class="btn btn-sm btn-outline-primary fw-bold text-xs"><i class="bi bi-arrow-clockwise me-1"></i>Refresh Sesi</button>
            </div>

            <div class="table-responsive border rounded-3 bg-white">
              <table class="table table-hover text-xs mb-0 align-middle">
                <thead class="table-light text-uppercase">
                  <tr>
                    <th class="p-2 text-center">No</th>
                    <th class="p-2 text-center">Status</th>
                    <th class="p-2">NIK / Username</th>
                    <th class="p-2">Role</th>
                    <th class="p-2">Waktu Login</th>
                    <th class="p-2">Token Sesi</th>
                    <th class="p-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>`;

  if (sessionsList.length === 0) {
    html += `<tr><td colspan="7" class="text-center p-4 text-muted">Belum ada sesi login aktif terverifikasi di database.</td></tr>`;
  } else {
    sessionsList.forEach((s, idx) => {
      let sNik = s.nik || s.NIK || '-';[span_951](start_span)[span_951](end_span)
      let sRole = s.role || s.ROLE || 'Warga';[span_952](start_span)[span_952](end_span)
      let sTime = s.createdat || s.CREATEDAT || s.created_at || '-';[span_953](start_span)[span_953](end_span)
      let sToken = s.token || s.TOKEN || '';[span_954](start_span)[span_954](end_span)
      let sTokenShort = sToken ? (sToken.substring(0, 16) + '...') : '-';[span_955](start_span)[span_955](end_span)

      html += `
        <tr>
          <td class="p-2 text-center text-muted">${idx + 1}</td>
          <td class="p-2 text-center"><span class="badge bg-success-subtle text-success border border-success fw-bold">AKTIF</span></td>
          <td class="p-2 font-bold font-mono">${sNik}</td>
          <td class="p-2"><span class="badge ${sRole.toUpperCase()==='RT'?'bg-primary':'bg-secondary'}">${sRole}</span></td>
          <td class="p-2 text-muted">${sTime}</td>
          <td class="p-2 font-mono text-[10px] text-gray-500">${sTokenShort}</td>
          <td class="p-2 text-center">
            <button onclick="hapusSesiLogin('${sToken}')" class="btn btn-sm btn-outline-danger text-[10px] py-1 px-2.5 fw-bold" title="Putuskan Sesi">
              <i class="bi bi-person-x-fill me-1"></i>Putuskan Sesi
            </button>
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
  loadAppSettings();[span_956](start_span)[span_956](end_span)
  checkExistingSession();[span_957](start_span)[span_957](end_span)
  document.addEventListener('submit', e => e.preventDefault());[span_958](start_span)[span_958](end_span)

  const btnMasuk = document.getElementById('btn-masuk');[span_959](start_span)[span_959](end_span)
  if (btnMasuk) {
    btnMasuk.addEventListener('click', function(e) {
      doLogin(e);[span_960](start_span)[span_960](end_span)
    });
  }

  window.copySingleRek = function(nomor) {
    navigator.clipboard.writeText(nomor)
      .then(() => alert("Nomor " + nomor + " berhasil disalin!"))[span_961](start_span)[span_961](end_span)
      .catch(err => alert("Gagal menyalin: " + err));[span_962](start_span)[span_962](end_span)
  };
});

document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible" && session.token) fetchNotifikasi();[span_963](start_span)[span_963](end_span)
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')[span_964](start_span)[span_964](end_span)
      .then(reg => console.log('PWA SW terdaftar!', reg))[span_965](start_span)[span_965](end_span)
      .catch(err => console.log('PWA SW gagal:', err));[span_966](start_span)[span_966](end_span)
  });
}

let deferredPrompt;[span_967](start_span)[span_967](end_span)
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();[span_968](start_span)[span_968](end_span)
  deferredPrompt = e;[span_969](start_span)[span_969](end_span)
  const btnInstall = document.getElementById('btn-install-pwa');[span_970](start_span)[span_970](end_span)
  if (btnInstall) btnInstall.style.display = 'block';[span_971](start_span)[span_971](end_span)
});

function installPWA() {[span_972](start_span)[span_972](end_span)
  if (deferredPrompt) {
    deferredPrompt.prompt();[span_973](start_span)[span_973](end_span)
    deferredPrompt.userChoice.then(c => { if (c.outcome === 'accepted') console.log('PWA Installed!'); deferredPrompt = null; });[span_974](start_span)[span_974](end_span)
  }
}

console.log("%cMAU NGAPAIN LU? 🤨", "color:#ef4444;font-size:38px;font-weight:900;padding:10px;");[span_975](start_span)[span_975](end_span)
console.log("%cMending bayar iuran RT 05 daripada ngintipin console 🤣", "color:#2563eb;font-size:14px;font-weight:bold;");[span_976](start_span)[span_976](end_span)

document.addEventListener('contextmenu', e => { e.preventDefault(); alert('MAU NGAPAIN LU? 🤨\nGak ada harta karun di sini!'); });[span_977](start_span)[span_977](end_span)
document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key)) || (e.ctrlKey && ['U','u'].includes(e.key))) {
    e.preventDefault();[span_978](start_span)[span_978](end_span)
    alert('MAU NGAPAIN LU? 🤨\nKepo banget mau buka Inspect Element!');[span_979](start_span)[span_979](end_span)
  }
});
