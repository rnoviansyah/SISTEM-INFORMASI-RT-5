// ============================================================
// legacy.js - Kompatibilitas untuk modul lama yang masih pake callGASGet/Post
// ============================================================

import { getDbInstance, safeSupabaseSelect, safeSupabaseInsert, safeSupabaseUpdate, safeSupabaseDelete } from './core/db.js';
import { getSession } from './core/session.js';
import { sanitizeFormData, compressImageFile, convertToImageLink, cariNilaiKolom } from './helpers/formHelper.js';
import { showUIToast } from './helpers/uiHelper.js';

// ============================================================
// callGASGet - Wrapper untuk GET (sekarang pake Supabase RPC)
// ============================================================
window.callGASGet = async function(actionName, params = {}) {
  try {
    const session = getSession();
    const db = getDbInstance();
    const token = session.token || '';

    // ============================================================
    // LOGIN (khusus)
    // ============================================================
    if (actionName === 'processLogin') {
      // Ini seharusnya dipanggil dari auth.js via callGASPost, tapi kita handle di sini juga
      const uClean = params.username ? params.username.toString().trim().toLowerCase() : '';
      const pClean = params.password ? params.password.toString().trim() : '';
      if (!uClean || !pClean) {
        return { status: 'error', message: 'Username / NIK dan Password tidak boleh kosong!' };
      }
      try {
        const { data, error } = await db.rpc('verify_user_login', {
          p_username: uClean,
          p_password: pClean
        });
        if (!error && data && data.status === 'success') {
          return data;
        }
      } catch (err) {
        console.warn('[Login] RPC Error:', err);
      }
      return { status: 'error', message: 'Username/NIK atau Password salah!' };
    }

    // ============================================================
    // getTableData - Ambil data tabel
    // ============================================================
    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const limit = params.limit || 100;
      const offset = params.offset || 0;
      const { data, error } = await safeSupabaseSelect(sheetName, token, limit, offset);
      if (error) {
        return { status: 'error', message: error.message || 'Gagal memuat data' };
      }
      // Konversi ke format headers + rows
      let rows = data || [];
      let headers = [];
      if (rows.length > 0) {
        headers = Object.keys(rows[0]).map(h => h.toUpperCase());
      } else {
        // Fallback headers
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
      // Konversi rows ke array of arrays
      const rowsArray = rows.map(row => headers.map(h => row[h.toLowerCase()] !== undefined ? row[h.toLowerCase()] : '-'));
      return { status: 'success', headers: headers, rows: rowsArray };
    }

    // ============================================================
    // getIuranData - Khusus Iuran
    // ============================================================
    if (actionName === 'getIuranData') {
      const { data, error } = await safeSupabaseSelect('Iuran', token, 200, 0);
      if (error) {
        return { status: 'error', message: error.message || 'Gagal memuat iuran' };
      }
      let rows = data || [];
      let headers = ['ID','NIK','NAMA','NO_KK','BULAN','TAHUN','NOMINAL','STATUS','TANGGAL_BAYAR','DITERIMA_OLEH','BUKTI_TRANSFER'];
      const rowsArray = rows.map(row => headers.map(h => row[h.toLowerCase()] !== undefined ? row[h.toLowerCase()] : '-'));
      return { status: 'success', headers: headers, rows: rowsArray };
    }

    // ============================================================
    // getDaftarBarangAset, getRiwayatPeminjaman, dll.
    // ============================================================
    if (actionName === 'getDaftarBarangAset') {
      const { data, error } = await safeSupabaseSelect('Aset', token);
      if (error) return { status: 'error', message: error.message };
      const list = (data || []).map(item => ({
        id: item.id || item.ID || '',
        nama: item.nama_barang || item.nama || '',
        stok: parseInt(item.jumlah || item.stok || 0)
      }));
      return { status: 'success', data: list };
    }

    if (actionName === 'getRiwayatPeminjaman') {
      const { data, error } = await safeSupabaseSelect('Peminjaman', token);
      if (error) return { status: 'error', message: error.message };
      const list = (data || []).map(item => ({
        idPinjam: item.id || '',
        namaPeminjam: item.nama_peminjam || '',
        namaBarang: item.nama_barang || '',
        jumlahMinta: parseInt(item.jumlah_minta || 0),
        jumlahAcc: parseInt(item.acc || 0),
        keterangan: item.keterangan || '',
        catatanRt: item.catatan_rt || '',
        status: item.status || 'Menunggu Verifikasi',
        nik: item.nik || ''
      }));
      return { status: 'success', data: list };
    }

    // ============================================================
    // getDaftarWargaUntukIuran
    // ============================================================
    if (actionName === 'getDaftarWargaUntukIuran') {
      const { data, error } = await safeSupabaseSelect('Warga', token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', data: data || [] };
    }

    // ============================================================
    // getInfoWarga
    // ============================================================
    if (actionName === 'getInfoWarga') {
      const { data, error } = await safeSupabaseSelect('Pengaturan', token);
      if (error) return { status: 'error', message: error.message };
      const row = (data || []).find(r => (r.kunci || '').toLowerCase() === 'info_warga');
      return { status: 'success', data: row ? row.nilai || '' : '' };
    }

    // ============================================================
    // getDashboardSummary
    // ============================================================
    if (actionName === 'getDashboardSummary') {
      const [wRes, aRes, kRes, sRes, sumRes] = await Promise.all([
        safeSupabaseSelect('Warga', token),
        safeSupabaseSelect('Pengaduan', token),
        safeSupabaseSelect('Keuangan', token),
        safeSupabaseSelect('SuratPengantar', token),
        safeSupabaseSelect('Sumbangan', token)
      ]);
      const role = session.role || 'Warga';
      return {
        status: 'success',
        role: role,
        warga: (wRes.data || []).length,
        aduan: (aRes.data || []).length,
        keuangan: (kRes.data || []).length,
        surat: (sRes.data || []).length,
        sumbangan: (sumRes.data || []).length
      };
    }

    // ============================================================
    // getProfileData
    // ============================================================
    if (actionName.toLowerCase().includes('profil') || actionName === 'getProfileData') {
      const nikCari = params.nik || session.nik || session.nama;
      const { data, error } = await safeSupabaseSelect('Warga', token);
      if (error) return { status: 'error', message: error.message };
      let myData = null;
      let myKk = '';
      for (let w of (data || [])) {
        let wNik = w.nik || w.NIK || '';
        if (wNik && wNik.toString().trim() === String(nikCari).trim()) {
          myData = w;
          myKk = w.no_kk || w.NO_KK || '';
          break;
        }
      }
      if (!myData) {
        return { status: 'error', message: 'Profil Anda belum terdaftar!' };
      }
      let keluarga = (data || []).filter(w => {
        let wKk = w.no_kk || w.NO_KK || '';
        let wNik = w.nik || w.NIK || '';
        return wKk && wKk === myKk && wNik !== (myData.nik || myData.NIK);
      });
      let headers = Object.keys(myData).map(h => h.toUpperCase());
      return { status: 'success', pribadi: myData, keluarga: keluarga, headers: headers };
    }

    // ============================================================
    // getNotifications
    // ============================================================
    if (actionName === 'getNotifications') {
      // Implementasi sederhana: kumpulkan dari berbagai tabel
      const tables = ['Pengaduan','SuratPengantar','Peminjaman','Iuran','Sumbangan','Aspirasi','Bansos','Kelahiran','Kematian','PindahMasuk','PindahKeluar'];
      let notifs = [];
      const userNik = session.nik || '';
      const userNama = (session.nama || '').toLowerCase();
      const userKk = (() => {
        // Coba cari KK dari data warga
        return ''; // Sederhanakan
      })();

      for (const table of tables) {
        const { data, error } = await safeSupabaseSelect(table, token);
        if (error || !data) continue;
        for (const row of data) {
          let nama = row.nama || row.nama_lengkap || row.nama_peminjam || row.pelapor || row.pemohon || '';
          let nik = row.nik || '';
          let menu = table;
          let pesan = '';
          let rawDate = row.created_at || row.createdat || row.tanggal || '';
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
          if (pesan) {
            notifs.push({
              id: row.id || 'notif-' + Date.now(),
              menu: menu,
              pesan: pesan,
              rawDate: rawDate || new Date().toISOString()
            });
          }
        }
      }
      // Sort by date
      notifs.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      return { status: 'success', data: notifs.slice(0, 50) };
    }

    // ============================================================
    // FALLBACK
    // ============================================================
    return { status: 'error', message: 'Aksi GET tidak dikenal: ' + actionName };

  } catch (err) {
    console.error('callGASGet Error:', err);
    return { status: 'error', message: err.message || 'Terjadi kesalahan' };
  }
};

// ============================================================
// callGASPost - Wrapper untuk POST
// ============================================================
window.callGASPost = async function(actionName, extraPayload = {}) {
  try {
    const session = getSession();
    const db = getDbInstance();
    const token = session.token || '';

    // ============================================================
    // processLogin
    // ============================================================
    if (actionName === 'processLogin') {
      const uClean = extraPayload.username ? extraPayload.username.toString().trim().toLowerCase() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';
      if (!uClean || !pClean) {
        return { status: 'error', message: 'Username / NIK dan Password tidak boleh kosong!' };
      }
      try {
        const { data, error } = await db.rpc('verify_user_login', {
          p_username: uClean,
          p_password: pClean
        });
        if (!error && data && data.status === 'success') {
          return data;
        }
        return { status: 'error', message: data?.message || 'Login gagal' };
      } catch (err) {
        console.warn('[Login] Error:', err);
        return { status: 'error', message: 'Terjadi kesalahan saat login' };
      }
    }

    // ============================================================
    // simpanDataKeSheet
    // ============================================================
    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      let formData = sanitizeFormData(sheetName, extraPayload.formData || {});
      if (!formData.id) formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      if (session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') {
        formData['nik'] = session.nik;
      }
      const { error } = await safeSupabaseInsert(sheetName, [formData], token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id };
    }

    // ============================================================
    // updateDataDiSheet
    // ============================================================
    if (actionName === 'updateDataDiSheet') {
      const sheetName = extraPayload.sheetName;
      const id = extraPayload.id;
      let formData = sanitizeFormData(sheetName, extraPayload.formData);
      const { error } = await safeSupabaseUpdate(sheetName, formData, 'id', id, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil diperbarui!' };
    }

    // ============================================================
    // hapusDataDariSheet
    // ============================================================
    if (actionName === 'hapusDataDariSheet') {
      const sheetName = extraPayload.sheetName;
      const targetId = extraPayload.id;
      const { error } = await safeSupabaseDelete(sheetName, 'id', targetId, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil dihapus!' };
    }

    // ============================================================
    // simpanPengajuanPeminjaman, verifikasiPeminjamanRT, dll.
    // ============================================================
    if (actionName === 'simpanPengajuanPeminjaman') {
      const payload = extraPayload.payload || {};
      let newId = 'PIN-' + Math.floor(1000 + Math.random() * 9000);
      const insertObj = {
        id: newId,
        nik: payload.nik || session.nik,
        nama_peminjam: payload.namaPeminjam || session.nama,
        id_barang: payload.idBarang || '',
        nama_barang: payload.namaBarang || '',
        jumlah: payload.jumlah || 1,
        keterangan: payload.keterangan || '',
        status: 'Menunggu Verifikasi'
      };
      const { error } = await safeSupabaseInsert('Peminjaman', [insertObj], token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Pengajuan peminjaman berhasil dikirim!' };
    }

    if (actionName === 'verifikasiPeminjamanRT') {
      const idPinjam = extraPayload.idPinjam;
      const status = extraPayload.status;
      const qtyAcc = parseInt(extraPayload.qtyAcc) || 0;
      const catatanRt = extraPayload.catatanRt || '';
      const updatePayload = { status, acc: qtyAcc, catatan_rt: catatanRt };
      const { error } = await safeSupabaseUpdate('Peminjaman', updatePayload, 'id', idPinjam, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: `Peminjaman berhasil di-${status.toLowerCase()}!` };
    }

    if (actionName === 'prosesPengembalianAsetRT') {
      const idPinjam = extraPayload.idPinjam;
      const qtyKembali = parseInt(extraPayload.qtyKembali) || 0;
      const catatanRt = extraPayload.catatanRt || '';
      // Ambil data peminjaman dulu
      const { data: pinjamData } = await safeSupabaseSelect('Peminjaman', token);
      const pinjamItem = (pinjamData || []).find(p => p.id === idPinjam);
      if (!pinjamItem) return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };
      const qtyAcc = parseInt(pinjamItem.acc || 0);
      const selisihHilang = qtyAcc - qtyKembali;
      let statusPengembalian = selisihHilang > 0 ? `Selesai (hilang ${selisihHilang})` : 'Selesai (Dikembalikan)';
      const updatePayload = { status: statusPengembalian, catatan_rt: catatanRt };
      const { error } = await safeSupabaseUpdate('Peminjaman', updatePayload, 'id', idPinjam, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Pengembalian barang berhasil dicatat!' };
    }

    // ============================================================
    // simpanPengaturanApp, simpanInfoWarga, tambahUserWarga, dll.
    // ============================================================
    if (actionName === 'simpanPengaturanApp') {
      const settingsArray = extraPayload.settingsArray || [];
      let errors = [];
      for (const s of settingsArray) {
        if (!s || !s.kunci) continue;
        const val = (s.nilai !== undefined && s.nilai !== null) ? String(s.nilai) : '';
        const { error } = await safeSupabaseUpdate('Pengaturan', { nilai: val }, 'kunci', s.kunci, token);
        if (error) {
          // Coba insert
          const { error: insErr } = await safeSupabaseInsert('Pengaturan', [{ kunci: s.kunci, nilai: val }], token);
          if (insErr) errors.push(`[${s.kunci}]: ${insErr.message}`);
        }
      }
      if (errors.length > 0) return { status: 'error', message: errors.join(', ') };
      return { status: 'success', message: 'Pengaturan berhasil disimpan!' };
    }

    if (actionName === 'simpanInfoWarga') {
      const textBaru = extraPayload.teksBaru || '';
      const { error } = await safeSupabaseUpdate('Pengaturan', { nilai: textBaru }, 'kunci', 'info_warga', token);
      if (error) {
        const { error: insErr } = await safeSupabaseInsert('Pengaturan', [{ kunci: 'info_warga', nilai: textBaru }], token);
        if (insErr) return { status: 'error', message: insErr.message };
      }
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }

    if (actionName === 'tambahUserWarga') {
      const userObj = { ...extraPayload.userObj };
      if (!userObj.id) userObj.id = Date.now();
      // Password akan di-hash otomatis oleh RPC
      const { error } = await safeSupabaseInsert('Users', [userObj], token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
    }

    if (actionName === 'hapusUserAkun') {
      const { error } = await safeSupabaseDelete('Users', 'username', extraPayload.username, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil dihapus!' };
    }

    if (actionName === 'resetPasswordUser') {
      const { error } = await safeSupabaseUpdate('Users', { password: extraPayload.newPassword }, 'username', extraPayload.username, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Password user berhasil direset!' };
    }

    if (actionName === 'editUserAkun') {
      const updatePayload = {
        username: extraPayload.username,
        nik: extraPayload.nik,
        role: extraPayload.role
      };
      if (extraPayload.password) {
        updatePayload.password = extraPayload.password;
      }
      const { error } = await safeSupabaseUpdate('Users', updatePayload, 'username', extraPayload.oldUsername, token);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data user berhasil diperbarui!' };
    }

    // ============================================================
    // FALLBACK
    // ============================================================
    return { status: 'error', message: 'Aksi POST tidak dikenal: ' + actionName };

  } catch (err) {
    console.error('callGASPost Error:', err);
    return { status: 'error', message: err.message || 'Terjadi kesalahan' };
  }
};

console.log('✅ Legacy compatibility layer loaded: callGASGet & callGASPost available.');