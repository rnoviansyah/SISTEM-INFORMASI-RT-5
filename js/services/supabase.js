// ============================================================
// services/supabase.js
// Layanan Supabase: wrapper RPC CRUD aman (generic_select/insert/update/
// delete_secured), upload storage, update stok aset. Dipisah dari app.js
// (refactor modul). Classic script — berbagi global scope.
// URUTAN LOAD di index.html WAJIB dijaga (setelah config & helpers).
// ============================================================

async function safeSupabaseSelect(tableName) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    let { data, error } = await db.rpc('generic_select_secured', {
      p_table: tableName,
      p_token: userToken
    });
    if (!error && data && data.status === 'success') {
      return { data: makeCaseInsensitive(data.data || []), error: null };
    }
    return { data: [], error: error || (data ? data.message : 'Gagal memuat data') };
  } catch(e) {
    return { data: [], error: e };
  }
}

async function safeSupabaseInsert(tableName, rows) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    let rowData = (rows && rows.length > 0) ? rows[0] : {};
    let { data, error } = await db.rpc('generic_insert_secured', {
      p_table: tableName,
      p_token: userToken,
      p_row: rowData
    });
    if (!error && data && data.status === 'success') {
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal insert') } };
  } catch(e) {
    return { error: e };
  }
}

async function safeSupabaseUpdate(tableName, payload, eqColumn, eqValue) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    payload = sanitizeFormData(tableName, payload);
    let { data, error } = await db.rpc('generic_update_secured', {
      p_table: tableName,
      p_token: userToken,
      p_id_col: String(eqColumn),
      p_id_val: String(eqValue),
      p_row: payload
    });
    if (!error && data && data.status === 'success') {
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal update') } };
  } catch(e) {
    return { error: e };
  }
}

async function safeSupabaseDelete(tableName, eqColumn, eqValue) {
  try {
    let userToken = (session && session.token) ? String(session.token).trim() : '';
    if (tableName.toLowerCase() === 'sessions') {
      let { error } = await db.rpc('delete_session_secured', { p_token: String(eqValue).trim() });
      return { error: error || null };
    }
    let { data, error } = await db.rpc('generic_delete_secured', {
      p_table: tableName,
      p_token: userToken,
      p_id_col: String(eqColumn),
      p_id_val: String(eqValue)
    });
    if (!error && data && data.status === 'success') {
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal delete') } };
  } catch(e) {
    return { error: e };
  }
}

async function uploadToSupabaseStorage(base64Data, folderName = 'warga') {
  // Audit hardening (patch v12): bucket rt-media PRIVAT — tidak ada lagi
  // upload/baca publik. Upload lewat RPC terautentikasi (upload_file_secured)
  // yang memvalidasi sesi + magic bytes + ukuran di SERVER; hasilnya berupa
  // dataURL yang disimpan langsung di kolom DB (sama seperti bukti_transfer).
  // Bila RPC v12 belum terpasang, fallback: simpan dataURL apa adanya.
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
    const fileName = `${folderName}/${Date.now()}_${Math.floor(Math.random()*1000)}.jpg`;
    const userToken = (session && session.token) ? String(session.token).trim() : '';
    const { data, error } = await db.rpc('upload_file_secured', {
      p_token: userToken,
      p_path: fileName,
      p_base64: base64Data,
      p_content_type: 'image/jpeg'
    });
    if (!error && data && data.status === 'success') {
      return base64Data; // tervalidasi server -> simpan dataURL di kolom
    }
    console.warn('Storage upload RPC gagal, fallback to Base64:', error || (data && data.message));
    return base64Data;
  } catch (err) {
    console.error('Failed upload to storage:', err);
    return base64Data;
  }
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
