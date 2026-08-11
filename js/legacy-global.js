// ============================================================
// legacy-global.js - callGASGet/Post GLOBAL
// ============================================================

function getSess() {
  try {
    var saved = localStorage.getItem('rt_user_session');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (parsed && parsed.token) return parsed;
    }
  } catch(e) {}
  return window.session || { token: '', role: 'Warga', nik: '', nama: '' };
}

window.callGASGet = async function(actionName, params = {}) {
  try {
    const session = getSess();
    const supabaseUrl = window.SUPABASE_URL || '';
    const supabaseKey = window.SUPABASE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return { status: 'error', message: 'Konfigurasi backend belum siap.' };
    }
    const db = supabase.createClient(supabaseUrl, supabaseKey);
    const token = session.token || '';

    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const limit = params.limit || 100;
      const offset = params.offset || 0;
      const { data, error } = await db.rpc('generic_select_secured', {
        p_table: sheetName,
        p_token: token,
        p_limit: limit,
        p_offset: offset
      });
      if (error || (data && data.status !== 'success')) {
        return { status: 'error', message: error?.message || data?.message || 'Gagal memuat data' };
      }
      const rows = data.data || [];
      let headers = [];
      if (rows.length > 0) {
        headers = Object.keys(rows[0]).map(h => h.toUpperCase());
      } else {
        const fallback = {
          'Warga': ['id','nama_lengkap','nama_panggilan','nik','no_kk','tempat_lahir','tanggal_lahir','jenis_kelamin','alamat','status_nikah','status_tinggal','pekerjaan','no_hp','foto_url'],
          'Iuran': ['id','nik','nama','no_kk','bulan','tahun','nominal','status','tanggal_bayar','diterima_oleh','bukti_transfer'],
          'Pengaduan': ['id','nama','nik','no_hp','jenis_aduan','keterangan','tanggal','foto_url','status','foto_penyelesaian'],
          'SuratPengantar': ['id','nama','nik','alamat','rt','jenis_surat','keterangan','status','keterangan_admin'],
          'Keuangan': ['id','tanggal','pemasukan','pengeluaran','keterangan','foto_url'],
          'Sumbangan': ['id','nama','tanggal','jenis_sumbangan','keterangan','nominal','bukti_transfer','status','nik'],
          'Aset': ['id','nama_barang','kondisi','jumlah','status_barang'],
          'Peminjaman': ['id','nama_peminjam','id_barang','nama_barang','jumlah_minta','acc','keterangan','catatan_rt','status','tanggal','nik','jumlah'],
          'Aspirasi': ['id','tanggal','isi_aspirasi','status','nama'],
          'Kelahiran': ['id','nama_bayi','tanggal_lahir','nama_ayah','nama_ibu','alamat','rt'],
          'Kematian': ['id','nama','nik','no_kk','tanggal_meninggal','rt','alamat','keterangan'],
          'PindahMasuk': ['id','nama','nik','no_kk','asal','alamat_baru','rt','tanggal_pindah','status_pindah'],
          'PindahKeluar': ['id','nama','nik','no_kk','alamat_tujuan','rt','rw','tanggal_pindah']
        };
        headers = fallback[sheetName] || ['id','data'];
      }
      const rowsArray = rows.map(row => headers.map(h => row[h.toLowerCase()] !== undefined ? row[h.toLowerCase()] : '-'));
      return { status: 'success', headers: headers, rows: rowsArray };
    }

    if (actionName === 'getIuranData') {
      const { data, error } = await db.rpc('generic_select_secured', { p_table: 'Iuran', p_token: token, p_limit: 200, p_offset: 0 });
      if (error || (data && data.status !== 'success')) {
        return { status: 'error', message: error?.message || data?.message || 'Gagal memuat iuran' };
      }
      const rows = data.data || [];
      const headers = ['ID','NIK','NAMA','NO_KK','BULAN','TAHUN','NOMINAL','STATUS','TANGGAL_BAYAR','DITERIMA_OLEH','BUKTI_TRANSFER'];
      const rowsArray = rows.map(row => headers.map(h => row[h.toLowerCase()] !== undefined ? row[h.toLowerCase()] : '-'));
      return { status: 'success', headers: headers, rows: rowsArray };
    }

    if (actionName === 'getDaftarBarangAset') {
      const { data, error } = await db.rpc('generic_select_secured', { p_table: 'Aset', p_token: token });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || 'Gagal memuat aset' };
      const list = (data.data || []).map(item => ({ id: item.id || '', nama: item.nama_barang || '', stok: parseInt(item.jumlah || item.stok || 0) }));
      return { status: 'success', data: list };
    }

    if (actionName === 'getRiwayatPeminjaman') {
      const { data, error } = await db.rpc('generic_select_secured', { p_table: 'Peminjaman', p_token: token });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || 'Gagal memuat peminjaman' };
      const list = (data.data || []).map(item => ({ idPinjam: item.id || '', namaPeminjam: item.nama_peminjam || '', namaBarang: item.nama_barang || '', jumlahMinta: parseInt(item.jumlah_minta || 0), jumlahAcc: parseInt(item.acc || 0), keterangan: item.keterangan || '', catatanRt: item.catatan_rt || '', status: item.status || 'Menunggu Verifikasi', nik: item.nik || '' }));
      return { status: 'success', data: list };
    }

    if (actionName === 'getDaftarWargaUntukIuran') {
      const { data, error } = await db.rpc('generic_select_secured', { p_table: 'Warga', p_token: token });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || 'Gagal memuat warga' };
      return { status: 'success', data: data.data || [] };
    }

    if (actionName === 'getInfoWarga') {
      const { data, error } = await db.rpc('generic_select_secured', { p_table: 'Pengaturan', p_token: token });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || 'Gagal memuat pengaturan' };
      const row = (data.data || []).find(r => (r.kunci || '').toLowerCase() === 'info_warga');
      return { status: 'success', data: row ? row.nilai || '' : '' };
    }

    if (actionName === 'getDashboardSummary') {
      const tables = ['Warga','Pengaduan','Keuangan','SuratPengantar','Sumbangan'];
      const results = await Promise.all(tables.map(t => db.rpc('generic_select_secured', { p_table: t, p_token: token })));
      const counts = results.map(r => (r.data && r.data.data) ? r.data.data.length : 0);
      return { status: 'success', role: session?.role || 'Warga', warga: counts[0], aduan: counts[1], keuangan: counts[2], surat: counts[3], sumbangan: counts[4] };
    }

    if (actionName.toLowerCase().includes('profil') || actionName === 'getProfileData') {
      const nikCari = params.nik || session?.nik || session?.nama;
      const { data, error } = await db.rpc('generic_select_secured', { p_table: 'Warga', p_token: token });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || 'Gagal memuat profil' };
      const wargaList = data.data || [];
      let myData = null, myKk = '';
      for (let w of wargaList) {
        let wNik = w.nik || '';
        if (wNik && wNik.toString().trim() === String(nikCari).trim()) { myData = w; myKk = w.no_kk || ''; break; }
      }
      if (!myData) return { status: 'error', message: 'Profil Anda belum terdaftar!' };
      const keluarga = wargaList.filter(w => { let wKk = w.no_kk || ''; let wNik = w.nik || ''; return wKk && wKk === myKk && wNik !== (myData.nik || ''); });
      const headers = Object.keys(myData).map(h => h.toUpperCase());
      return { status: 'success', pribadi: myData, keluarga: keluarga, headers: headers };
    }

    if (actionName === 'getNotifications') {
      const tables = ['Pengaduan','SuratPengantar','Peminjaman','Iuran','Sumbangan','Aspirasi','Bansos','Kelahiran','Kematian','PindahMasuk','PindahKeluar'];
      let notifs = [];
      for (const table of tables) {
        const { data, error } = await db.rpc('generic_select_secured', { p_table: table, p_token: token });
        if (error || !data || data.status !== 'success') continue;
        for (const row of (data.data || [])) {
          let nama = row.nama || row.nama_lengkap || row.nama_peminjam || row.pelapor || row.pemohon || '';
          let menu = table, pesan = '', rawDate = row.created_at || row.createdat || row.tanggal || '';
          if (table === 'Pengaduan') pesan = `Aduan dari ${nama}: ${row.status || 'Baru'}`;
          else if (table === 'SuratPengantar') pesan = `Surat dari ${nama}: ${row.status || 'Menunggu'}`;
          else if (table === 'Peminjaman') pesan = `Peminjaman ${row.nama_barang || ''} dari ${nama}`;
          else if (table === 'Iuran') pesan = `Iuran ${row.bulan || ''} ${row.tahun || ''} dari ${nama}`;
          else if (table === 'Sumbangan') pesan = `Sumbangan dari ${nama}`;
          else if (table === 'Aspirasi') pesan = `Aspirasi dari ${nama}`;
          else if (table === 'Bansos') pesan = `Bansos ${row.jenis_bansos || ''} untuk ${nama}`;
          else if (table === 'Kelahiran') pesan = `Kelahiran: ${row.nama_bayi || ''}`;
          else if (table === 'Kematian') pesan = `Kematian: ${nama}`;
          else if (table === 'PindahMasuk') pesan = `Pindah Masuk: ${nama}`;
          else if (table === 'PindahKeluar') pesan = `Pindah Keluar: ${nama}`;
          if (pesan) notifs.push({ id: row.id || 'notif-' + Date.now(), menu: menu, pesan: pesan, rawDate: rawDate || new Date().toISOString() });
        }
      }
      notifs.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      return { status: 'success', data: notifs.slice(0, 50) };
    }

    return { status: 'error', message: 'Aksi GET tidak dikenal: ' + actionName };
  } catch (err) {
    console.error('callGASGet Error:', err);
    return { status: 'error', message: err.message || 'Terjadi kesalahan' };
  }
};

window.callGASPost = async function(actionName, extraPayload = {}) {
  try {
    const session = getSess();
    const supabaseUrl = window.SUPABASE_URL || '';
    const supabaseKey = window.SUPABASE_KEY || '';
    if (!supabaseUrl || !supabaseKey) {
      return { status: 'error', message: 'Konfigurasi backend belum siap.' };
    }
    const db = supabase.createClient(supabaseUrl, supabaseKey);
    const token = session.token || '';

    if (actionName === 'processLogin') {
      const uClean = extraPayload.username ? extraPayload.username.toString().trim().toLowerCase() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';
      if (!uClean || !pClean) return { status: 'error', message: 'Username / NIK dan Password tidak boleh kosong!' };
      try {
        const { data, error } = await db.rpc('verify_user_login', { p_username: uClean, p_password: pClean });
        if (!error && data && data.status === 'success') return data;
        return { status: 'error', message: data?.message || 'Login gagal' };
      } catch (err) { return { status: 'error', message: 'Terjadi kesalahan saat login' }; }
    }

    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      let formData = extraPayload.formData || {};
      if (!formData.id) formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      if (session && session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') formData['nik'] = session.nik || '';
      const { data, error } = await db.rpc('generic_insert_secured', { p_table: sheetName, p_token: token, p_row: formData });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal menyimpan' };
      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id };
    }

    if (actionName === 'updateDataDiSheet') {
      const sheetName = extraPayload.sheetName, id = extraPayload.id, formData = extraPayload.formData || {};
      const { data, error } = await db.rpc('generic_update_secured', { p_table: sheetName, p_token: token, p_id_col: 'id', p_id_val: String(id), p_row: formData });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal update' };
      return { status: 'success', message: 'Data berhasil diperbarui!' };
    }

    if (actionName === 'hapusDataDariSheet') {
      const sheetName = extraPayload.sheetName, targetId = extraPayload.id;
      const { data, error } = await db.rpc('generic_delete_secured', { p_table: sheetName, p_token: token, p_id_col: 'id', p_id_val: String(targetId) });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal hapus' };
      return { status: 'success', message: 'Data berhasil dihapus!' };
    }

    if (actionName === 'simpanPengajuanPeminjaman') {
      const payload = extraPayload.payload || {};
      const newId = 'PIN-' + Math.floor(1000 + Math.random() * 9000);
      const insertObj = { id: newId, nik: payload.nik || session?.nik || '', nama_peminjam: payload.namaPeminjam || session?.nama || '', id_barang: payload.idBarang || '', nama_barang: payload.namaBarang || '', jumlah: payload.jumlah || 1, keterangan: payload.keterangan || '', status: 'Menunggu Verifikasi' };
      const { data, error } = await db.rpc('generic_insert_secured', { p_table: 'Peminjaman', p_token: token, p_row: insertObj });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal simpan peminjaman' };
      return { status: 'success', message: 'Pengajuan peminjaman berhasil dikirim!' };
    }

    if (actionName === 'verifikasiPeminjamanRT') {
      const idPinjam = extraPayload.idPinjam, status = extraPayload.status, qtyAcc = parseInt(extraPayload.qtyAcc) || 0, catatanRt = extraPayload.catatanRt || '';
      const updatePayload = { status, acc: qtyAcc, catatan_rt: catatanRt };
      const { data, error } = await db.rpc('generic_update_secured', { p_table: 'Peminjaman', p_token: token, p_id_col: 'id', p_id_val: String(idPinjam), p_row: updatePayload });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal verifikasi' };
      return { status: 'success', message: `Peminjaman berhasil di-${status.toLowerCase()}!` };
    }

    if (actionName === 'prosesPengembalianAsetRT') {
      const idPinjam = extraPayload.idPinjam, qtyKembali = parseInt(extraPayload.qtyKembali) || 0, catatanRt = extraPayload.catatanRt || '';
      const { data: pinjamData } = await db.rpc('generic_select_secured', { p_table: 'Peminjaman', p_token: token });
      const pinjamItem = (pinjamData?.data || []).find(p => p.id === idPinjam);
      if (!pinjamItem) return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };
      const qtyAcc = parseInt(pinjamItem.acc || 0);
      const selisihHilang = qtyAcc - qtyKembali;
      const statusPengembalian = selisihHilang > 0 ? `Selesai (hilang ${selisihHilang})` : 'Selesai (Dikembalikan)';
      const updatePayload = { status: statusPengembalian, catatan_rt: catatanRt };
      const { data, error } = await db.rpc('generic_update_secured', { p_table: 'Peminjaman', p_token: token, p_id_col: 'id', p_id_val: String(idPinjam), p_row: updatePayload });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal proses pengembalian' };
      return { status: 'success', message: 'Pengembalian barang berhasil dicatat!' };
    }

    if (actionName === 'simpanPengaturanApp') {
      const settingsArray = extraPayload.settingsArray || [];
      let errors = [];
      for (const s of settingsArray) {
        if (!s || !s.kunci) continue;
        const val = (s.nilai !== undefined && s.nilai !== null) ? String(s.nilai) : '';
        const { error } = await db.rpc('generic_update_secured', { p_table: 'Pengaturan', p_token: token, p_id_col: 'kunci', p_id_val: s.kunci, p_row: { nilai: val } });
        if (error) {
          const { error: insErr } = await db.rpc('generic_insert_secured', { p_table: 'Pengaturan', p_token: token, p_row: { kunci: s.kunci, nilai: val } });
          if (insErr) errors.push(`[${s.kunci}]: ${insErr.message}`);
        }
      }
      if (errors.length > 0) return { status: 'error', message: errors.join(', ') };
      return { status: 'success', message: 'Pengaturan berhasil disimpan!' };
    }

    if (actionName === 'simpanInfoWarga') {
      const textBaru = extraPayload.teksBaru || '';
      const { error } = await db.rpc('generic_update_secured', { p_table: 'Pengaturan', p_token: token, p_id_col: 'kunci', p_id_val: 'info_warga', p_row: { nilai: textBaru } });
      if (error) {
        const { error: insErr } = await db.rpc('generic_insert_secured', { p_table: 'Pengaturan', p_token: token, p_row: { kunci: 'info_warga', nilai: textBaru } });
        if (insErr) return { status: 'error', message: insErr.message };
      }
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }

    if (actionName === 'tambahUserWarga') {
      const userObj = { ...extraPayload.userObj };
      if (!userObj.id) userObj.id = Date.now();
      const { data, error } = await db.rpc('generic_insert_secured', { p_table: 'Users', p_token: token, p_row: userObj });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal tambah user' };
      return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
    }

    if (actionName === 'hapusUserAkun') {
      const { data, error } = await db.rpc('generic_delete_secured', { p_table: 'Users', p_token: token, p_id_col: 'username', p_id_val: extraPayload.username });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal hapus user' };
      return { status: 'success', message: 'Akun user berhasil dihapus!' };
    }

    if (actionName === 'resetPasswordUser') {
      const { data, error } = await db.rpc('generic_update_secured', { p_table: 'Users', p_token: token, p_id_col: 'username', p_id_val: extraPayload.username, p_row: { password: extraPayload.newPassword } });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal reset password' };
      return { status: 'success', message: 'Password user berhasil direset!' };
    }

    if (actionName === 'editUserAkun') {
      const updatePayload = { username: extraPayload.username, nik: extraPayload.nik, role: extraPayload.role };
      if (extraPayload.password) updatePayload.password = extraPayload.password;
      const { data, error } = await db.rpc('generic_update_secured', { p_table: 'Users', p_token: token, p_id_col: 'username', p_id_val: extraPayload.oldUsername, p_row: updatePayload });
      if (error || (data && data.status !== 'success')) return { status: 'error', message: error?.message || data?.message || 'Gagal edit user' };
      return { status: 'success', message: 'Data user berhasil diperbarui!' };
    }

    return { status: 'error', message: 'Aksi POST tidak dikenal: ' + actionName };
  } catch (err) {
    console.error('callGASPost Error:', err);
    return { status: 'error', message: err.message || 'Terjadi kesalahan' };
  }
};

console.log('✅ callGASGet & callGASPost tersedia di window (global)');