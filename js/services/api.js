// ============================================================
// services/api.js
// Dispatcher aksi POST/GET aplikasi (callRpcPost / callRpcGet).
// Dipisah dari app.js (refactor modul). Classic script — berbagi
// global scope. URUTAN LOAD di index.html WAJIB dijaga
// (setelah config, helpers, dan services/supabase).
// ============================================================

async function callRpcPost(actionName, extraPayload = {}) {
  try {
    if (actionName === 'processLogin') {
      // LOGIN via RPC — password diverifikasi di SERVER (bcrypt, security_patch_v6).
      // security_patch_v11: login_secured membuat token sesi DI SERVER
      // (gen_random_uuid — bukan Math.random browser) dan langsung menyimpan
      // sesi; frontend cukup memakai res.token. Bila v11 belum dijalankan,
      // fallback otomatis ke verify_user_login (alur lama: token dibuat klien).
      const uClean = extraPayload.username ? extraPayload.username.toString().trim().toLowerCase() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';
      if (!uClean || !pClean) {
        return { status: 'error', message: 'Username / NIK dan Password tidak boleh kosong!' };
      }
      // Helper: panggil RPC login & kembalikan data/error mentah.
      const runLoginRpc = async (rpcName) => {
        try {
          const res = await db.rpc(rpcName, { p_username: uClean, p_password: pClean });
          return { data: res.data, error: res.error };
        } catch (err) {
          return { data: null, error: err };
        }
      };
      const isRpcMissing = (error) => error && /could not find the function|function .* does not exist/i.test(String(error.message || ''));

      // 1) Alur baru (v11): token dibuat server. Fungsi tidak ada -> lanjut fallback.
      let rpcRes = await runLoginRpc('login_secured');
      if (!isRpcMissing(rpcRes.error) && (rpcRes.error || rpcRes.data)) {
        if (!rpcRes.error && rpcRes.data && rpcRes.data.status === 'success') {
          return rpcRes.data; // punya .token — sesi sudah disimpan di server
        }
        if (rpcRes.data && rpcRes.data.message) {
          return { status: 'error', message: rpcRes.data.message };
        }
        if (rpcRes.error) {
          console.warn('[Login] RPC login_secured error:', rpcRes.error);
          return {
            status: 'error',
            message: "Login gagal: RPC login_secured tidak berjalan. Jalankan security_patch_v11 (atau v6/v6c) di SQL Editor Supabase, lalu: NOTIFY pgrst, 'reload schema';"
          };
        }
      }

      // 2) Fallback (DB lama): verify_user_login — token tetap dibuat klien.
      rpcRes = await runLoginRpc('verify_user_login');
      if (!rpcRes.error && rpcRes.data && rpcRes.data.status === 'success') {
        return rpcRes.data;
      }
      // Tampilkan pesan ASLI dari RPC (mis. 'Password salah.' / 'Akun tidak ditemukan.')
      // supaya penyebab login gagal terlihat, bukan pesan generik yang menyesatkan.
      if (rpcRes.data && rpcRes.data.message) {
        return { status: 'error', message: rpcRes.data.message };
      }
      if (rpcRes.error) {
        console.warn('[Login] RPC verify_user_login error:', rpcRes.error);
        return {
          status: 'error',
          message: "Login gagal: RPC verify_user_login tidak berjalan. Jalankan security_patch_v6 (atau v6c) di SQL Editor Supabase, lalu: NOTIFY pgrst, 'reload schema';"
        };
      }
      return { status: 'error', message: 'Username/NIK atau Password salah!' };
    }
    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      if (['Warga', 'Users', 'Pengaturan', 'Keuangan', 'Aset'].includes(sheetName)) {
        if (!(await isVerifiedRT())) {
          return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
        }
      }
      let formData = sanitizeFormData(sheetName, extraPayload.formData || {});
      if (!formData.id) formData.id = generateSecureId(sheetName.substring(0,3).toUpperCase());
      if (session.role !== 'RT' && sheetName !== 'Iuran' && sheetName !== 'Aspirasi') formData['nik'] = session.nik;
      const { error } = await safeSupabaseInsert(sheetName, [formData]);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id };
    }
    if (actionName === 'simpanPengajuanPeminjaman') {
      const payload = extraPayload.payload || {};
      let newId = generateSecureId('PIN');
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
      if (!(await isVerifiedRT())) return { status: 'error', message: 'Akses ditolak!' };
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
      if (!(await isVerifiedRT())) return { status: 'error', message: 'Akses ditolak!' };
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
      let lowerSheet = sheetName ? sheetName.toLowerCase() : '';
      if (['users', 'pengaturan', 'keuangan'].includes(lowerSheet)) {
        if (!(await isVerifiedRT())) {
          return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
        }
      }
      const id = extraPayload.id;
      let formData = sanitizeFormData(sheetName, extraPayload.formData);
      let resUpdate = await safeSupabaseUpdate(sheetName, formData, 'id', id);
      if (resUpdate.error && sheetName.toLowerCase() === 'warga') {
        let targetNik = editingNik || id;
        resUpdate = await safeSupabaseUpdate(sheetName, formData, 'nik', targetNik);
      }
      if (resUpdate.error) return { status: 'error', message: resUpdate.error.message };
      return { status: 'success', message: 'Data berhasil diperbarui!' };
    }
    if (actionName === 'hapusDataDariSheet') {
      if (!(await isVerifiedRT())) return { status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' };
      const sheetName = extraPayload.sheetName;
      const targetId  = extraPayload.id;
      let { error } = await safeSupabaseDelete(sheetName, 'id', targetId);
      if (error && sheetName.toLowerCase() === 'warga' && editingNik) {
        let res2 = await safeSupabaseDelete(sheetName, 'nik', editingNik);
        if (!res2.error) error = null;
      }
      if (error) return { status: 'error', message: 'Gagal menghapus: ' + error.message };
      return { status: 'success', message: 'Data berhasil dihapus!' };
    }
    if (['hapusUserAkun', 'resetPasswordUser', 'editUserAkun', 'tambahUserWarga', 'simpanPengaturanApp', 'simpanInfoWarga'].includes(actionName)) {
      if (!(await isVerifiedRT())) {
        return { status: 'error', message: 'Akses ditolak! Sesi Anda bukan RT terverifikasi di database.' };
      }
    }
    if (actionName === 'simpanInfoWarga') {
      let textBaru = extraPayload.teksBaru || '';
      appSettings.info_warga = textBaru;
      try {
        localStorage.setItem('rt_app_settings_cache', JSON.stringify(appSettings));
      } catch(e) {}
      let resUpd = await safeSupabaseUpdate('Pengaturan', { nilai: textBaru }, 'kunci', 'info_warga');
      if (resUpd.error) {
        let resIns = await safeSupabaseInsert('Pengaturan', [{ kunci: 'info_warga', nilai: textBaru }]);
        if (resIns.error) return { status: 'error', message: resIns.error.message };
      }
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }
    if (actionName === 'simpanPengaturanApp') {
      let errArr = [];
      for (let s of (extraPayload.settingsArray || [])) {
        if (!s || !s.kunci) continue;
        let val = (s.nilai !== undefined && s.nilai !== null) ? String(s.nilai) : '';
        let resUpd = await safeSupabaseUpdate('Pengaturan', { nilai: val }, 'kunci', s.kunci);
        if (resUpd.error) {
          let resIns = await safeSupabaseInsert('Pengaturan', [{ kunci: s.kunci, nilai: val }]);
          if (resIns.error) errArr.push(`[${s.kunci}]: ` + resIns.error.message);
        }
      }
      if (errArr.length > 0) return { status: 'error', message: errArr.join(', ') };
      await loadAppSettings();
      return { status: 'success', message: 'Pengaturan aplikasi berhasil disimpan!' };
    }
    if (actionName === 'tambahUserWarga') {
      // Password TIDAK di-hash di sisi klien — trigger bcrypt di database
      // (trg_users_hash_password) yang me-hash otomatis saat INSERT.
      let uObj = { ...extraPayload.userObj };
      if (!uObj.id) uObj.id = generateSecureId('USR');
      let { error } = await safeSupabaseInsert('Users', [uObj]);
      if (error) {
        delete uObj.id;
        let resFallback = await safeSupabaseInsert('Users', [uObj]);
        if (!resFallback.error) return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
        return { status: 'error', message: error.message };
      }
      return { status: 'success', message: 'Akun user berhasil didaftarkan!' };
    }
    if (actionName === 'hapusUserAkun') {
      const { error } = await safeSupabaseDelete('Users', 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Akun user berhasil dihapus!' };
    }
    if (actionName === 'resetPasswordUser') {
      // Password baru di-hash otomatis oleh trigger bcrypt di database.
      const { error } = await safeSupabaseUpdate('Users', { password: extraPayload.newPassword }, 'username', extraPayload.username);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Password user berhasil direset!' };
    }
    if (actionName === 'editUserAkun') {
      let updatePayload = {
        username: extraPayload.username,
        nik: extraPayload.nik,
        role: extraPayload.role
      };
      if (extraPayload.password) {
        updatePayload.password = extraPayload.password;
      }
      const { error } = await safeSupabaseUpdate('Users', updatePayload, 'username', extraPayload.oldUsername);
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Data user berhasil diperbarui!' };
    }
    return { status: 'error', message: 'Aksi POST tidak dikenal' };
  } catch (err) {
    console.error('Fetch Error (POST):', err);
    return { status: 'error', message: 'Gagal terhubung ke Supabase: ' + err.message };
  }
}

async function callRpcGet(actionName, params = {}) {
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
      let sortedRiwayat = sortDataNewestFirst(listRiwayat);
      return { status: 'success', data: sortedRiwayat };
    }
    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const { data: safeData } = await safeSupabaseSelect(sheetName);
      if (!safeData || safeData.length === 0) {
        let fallbackH = FALLBACK_HEADERS[sheetName] || FALLBACK_HEADERS['Warga'];
        return { status: 'success', headers: fallbackH, rows: [] };
      }
      let filteredData = safeData;
      let userRoleValidated = await getValidUserRole();
      if (userRoleValidated !== 'RT') {
        let userNik = (session.nik || '').toString().trim();
        let userNama = (session.nama || '').toString().trim().toLowerCase();
        if (['Pengaduan', 'SuratPengantar', 'Peminjaman', 'Sumbangan'].includes(sheetName)) {
          filteredData = filteredData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp', 'no_ktp']).trim();
            let rNama = cariNilaiKolom(row, ['nama', 'nama_lengkap', 'nama_peminjam', 'pelapor', 'pemohon']).toLowerCase().trim();
            let matchNik = userNik && rNik && rNik === userNik;
            let matchNama = userNama && rNama && (rNama === userNama || rNama.includes(userNama) || userNama.includes(rNama));
            return matchNik || matchNama;
          });
        }
      }
      if (filteredData.length === 0) {
        const headers = canonicalTableHeaders(sheetName, safeData[0]);
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = canonicalTableHeaders(sheetName, filteredData[0]);
      let sortedFiltered = sortDataNewestFirst(filteredData);
      const rows = sortedFiltered.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }
    if (actionName === 'getTablePage') {
      // PAGINATION SERVER-SIDE (security_patch_v8): RPC get_table_page_secured
      // mengembalikan SATU halaman (LIMIT/OFFSET) + total. Bila RPC belum
      // terpasang di Supabase, fallback ke mode lama (fetch semua + slice klien)
      // supaya aplikasi tidak pernah rusak sebelum patch v8 dijalankan.
      const sheetName = params.sheetName;
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 25));
      const search = String(params.search || '').trim();
      const filter = (params.filter && typeof params.filter === 'object') ? params.filter : {};
      let data, error;
      try {
        const res = await db.rpc('get_table_page_secured', {
          p_token: session.token,
          p_table: sheetName,
          p_page: page,
          p_page_size: pageSize,
          p_search: search,
          p_filter: filter
        });
        data = res.data;
        error = res.error;
      } catch (e) {
        return { status: 'fallback' };
      }
      if (error && String(error.message || '').toLowerCase().indexOf('could not find the function') !== -1) {
        return { status: 'fallback' };
      }
      if (error) return { status: 'error', message: error.message };
      if (data && data.status === 'success') {
        const safeData = data.data || [];
        const headers = safeData.length > 0
          ? canonicalTableHeaders(sheetName, safeData[0])
          : (FALLBACK_HEADERS[sheetName] || FALLBACK_HEADERS['Warga']);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', headers: headers, rows: rows, total: data.total || safeData.length };
      }
      if (data && data.message) return { status: 'error', message: data.message };
      return { status: 'fallback' };
    }
    if (actionName === 'getWargaPage') {
      // PAGINATION SERVER-SIDE WARGA (patch v9): mode 'tabel' = baris per halaman;
      // mode 'rumah' = grup per alamat. Fallback otomatis ke mode lama bila RPC belum ada.
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 25));
      const search = String(params.search || '').trim();
      const mode = params.mode === 'rumah' ? 'rumah' : 'tabel';
      let data, error;
      try {
        const res = await db.rpc('get_warga_page_secured', {
          p_token: session.token, p_mode: mode, p_page: page, p_page_size: pageSize,
          p_search: search, p_status: String(params.status || '')
        });
        data = res.data; error = res.error;
      } catch (e) { return { status: 'fallback' }; }
      if (error && String(error.message || '').toLowerCase().indexOf('could not find the function') !== -1) return { status: 'fallback' };
      if (error) return { status: 'error', message: error.message };
      if (data && data.status === 'success') {
        if (mode === 'rumah') {
          return { status: 'success', mode: 'rumah', rumah: data.data || [], total: data.total || 0 };
        }
        const safeData = data.data || [];
        const headers = safeData.length > 0 ? canonicalTableHeaders('Warga', safeData[0]) : (FALLBACK_HEADERS['Warga'] || []);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', mode: 'tabel', headers, rows, total: data.total || safeData.length };
      }
      if (data && data.message) return { status: 'error', message: data.message };
      return { status: 'fallback' };
    }
    if (actionName === 'getWargaRumahDetail') {
      // Penghuni satu alamat (modal detail rumah) — patch v9.
      const alamat = String(params.alamat || '').trim();
      if (!alamat) return { status: 'error', message: 'Alamat tidak valid.' };
      try {
        const res = await db.rpc('get_warga_rumah_detail_secured', { p_token: session.token, p_alamat: alamat });
        if (res.error && String(res.error.message || '').toLowerCase().indexOf('could not find the function') !== -1) return { status: 'fallback' };
        if (res.error) return { status: 'error', message: res.error.message };
        if (res.data && res.data.status === 'success') {
          const safeData = res.data.data || [];
          const headers = safeData.length > 0 ? canonicalTableHeaders('Warga', safeData[0]) : (FALLBACK_HEADERS['Warga'] || []);
          const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
          return { status: 'success', headers, rows };
        }
      } catch (e) {}
      return { status: 'fallback' };
    }
    if (actionName === 'getIuranPage') {
      // PAGINATION SERVER-SIDE IURAN (patch v9): halaman baris + agregasi banner.
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 25));
      const search = String(params.search || '').trim();
      let data, error;
      try {
        const res = await db.rpc('get_iuran_page_secured', {
          p_token: session.token, p_page: page, p_page_size: pageSize, p_search: search
        });
        data = res.data; error = res.error;
      } catch (e) { return { status: 'fallback' }; }
      if (error && String(error.message || '').toLowerCase().indexOf('could not find the function') !== -1) return { status: 'fallback' };
      if (error) return { status: 'error', message: error.message };
      if (data && data.status === 'success') {
        const safeData = data.data || [];
        const headers = safeData.length > 0 ? canonicalTableHeaders('Iuran', safeData[0]) : (FALLBACK_HEADERS['Iuran'] || []);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', headers, rows, total: data.total || safeData.length, summary: data.summary || null };
      }
      if (data && data.message) return { status: 'error', message: data.message };
      return { status: 'fallback' };
    }
    if (actionName === 'getBansosPage') {
      // PAGINATION SERVER-SIDE BANSOS (patch v9, khusus RT): auto-kedaluwarsa di server
      // + hitungan status header. Baris dikembalikan sebagai OBJEK (render klien objek).
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 25));
      const search = String(params.search || '').trim();
      let data, error;
      try {
        const res = await db.rpc('get_bansos_page_secured', {
          p_token: session.token, p_page: page, p_page_size: pageSize, p_search: search
        });
        data = res.data; error = res.error;
      } catch (e) { return { status: 'fallback' }; }
      if (error && String(error.message || '').toLowerCase().indexOf('could not find the function') !== -1) return { status: 'fallback' };
      if (error) return { status: 'error', message: error.message };
      if (data && data.status === 'success') {
        return { status: 'success', rows: data.data || [], total: data.total || 0, counts: data.counts || null };
      }
      if (data && data.message) return { status: 'error', message: data.message };
      return { status: 'fallback' };
    }
    if (actionName === 'getKeuanganPage') {
      // PAGINATION SERVER-SIDE KEUANGAN (patch v9): UNION Keuangan + Sumbangan disetujui,
      // filter periode + urutan + ringkasan kas di server.
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 25));
      const search = String(params.search || '').trim();
      let data, error;
      try {
        const res = await db.rpc('get_keuangan_page_secured', {
          p_token: session.token, p_page: page, p_page_size: pageSize, p_search: search,
          p_periode: String(params.periode || 'all'),
          p_date_from: String(params.dateFrom || ''),
          p_date_to: String(params.dateTo || ''),
          p_order: String(params.order || 'newest')
        });
        data = res.data; error = res.error;
      } catch (e) { return { status: 'fallback' }; }
      if (error && String(error.message || '').toLowerCase().indexOf('could not find the function') !== -1) return { status: 'fallback' };
      if (error) return { status: 'error', message: error.message };
      if (data && data.status === 'success') {
        const safeData = data.data || [];
        const headers = safeData.length > 0 ? canonicalTableHeaders('Keuangan', safeData[0]) : (FALLBACK_HEADERS['Keuangan'] || []);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', headers, rows, total: data.total || safeData.length, summary: data.summary || null };
      }
      if (data && data.message) return { status: 'error', message: data.message };
      return { status: 'fallback' };
    }
    if (actionName === 'getAsetPage') {
      // PAGINATION SERVER-SIDE ASET (patch v9): tab 'stok' (tabel Aset) / 'riwayat' (Peminjaman).
      const tab = params.tab === 'riwayat' ? 'riwayat' : 'stok';
      const page = Math.max(1, parseInt(params.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(params.pageSize, 10) || 25));
      const search = String(params.search || '').trim();
      let data, error;
      try {
        const res = await db.rpc('get_aset_page_secured', {
          p_token: session.token, p_tab: tab, p_page: page, p_page_size: pageSize, p_search: search
        });
        data = res.data; error = res.error;
      } catch (e) { return { status: 'fallback' }; }
      if (error && String(error.message || '').toLowerCase().indexOf('could not find the function') !== -1) return { status: 'fallback' };
      if (error) return { status: 'error', message: error.message };
      if (data && data.status === 'success') {
        const safeData = data.data || [];
        if (tab === 'riwayat') {
          // Samakan bentuk dengan getRiwayatPeminjaman lama (idPinjam, namaPeminjam, dst.)
          const mapped = safeData.map(item => ({
            idPinjam: item.id || cariNilaiKolom(item, ['id', 'id_pinjam']),
            namaPeminjam: cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']),
            namaBarang: cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']),
            jumlahMinta: parseInt(cariNilaiKolom(item, ['jumlah_minta', 'jumlah', 'qty', 'minta']) || 0),
            jumlahAcc: parseInt(cariNilaiKolom(item, ['acc', 'jumlah_acc', 'qty_acc']) || 0),
            keterangan: cariNilaiKolom(item, ['keterangan', 'ket_warga', 'keterangan_warga']),
            catatanRt: cariNilaiKolom(item, ['catatan_rt', 'lokasi', 'catatan']),
            status: cariNilaiKolom(item, ['status']) || 'Menunggu Verifikasi',
            nik: cariNilaiKolom(item, ['nik'])
          }));
          return { status: 'success', tab: 'riwayat', data: mapped, total: data.total || safeData.length };
        }
        const headers = safeData.length > 0 ? canonicalTableHeaders('Aset', safeData[0]) : (FALLBACK_HEADERS['Aset'] || []);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', tab: 'stok', headers, rows, total: data.total || safeData.length };
      }
      if (data && data.message) return { status: 'error', message: data.message };
      return { status: 'fallback' };
    }
    if (actionName === 'getIuranData') {
      const { data: safeData } = await safeSupabaseSelect('Iuran');
      if (!safeData || safeData.length === 0) return { status: 'success', headers: [], rows: [] };
      let filteredData = safeData;
      let isRT = await isVerifiedRT();
      if (!isRT && session.nik) {
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
        const headers = safeData.length > 0 ? canonicalTableHeaders('Iuran', safeData[0]) : FALLBACK_HEADERS['Iuran'];
        return { status: 'success', headers: headers, rows: [] };
      }
      const headers = canonicalTableHeaders('Iuran', filteredData[0]);
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }
    if (actionName === 'getNotifications') {
      // Audit hardening (patch v12): notifikasi dihitung DI SERVER
      // (get_notifications_secured — LIMIT + filter peran/pemilik), tidak lagi
      // mengunduh SEMUA baris 11 tabel ke browser. Bila RPC v12 belum terpasang,
      // fallback otomatis ke perhitungan lama di klien (blok di bawah).
      if (session && session.token) {
        try {
          const notifRes = await db.rpc('get_notifications_secured', { p_token: String(session.token).trim() });
          if (!notifRes.error && notifRes.data && notifRes.data.status === 'success') {
            return { status: 'success', data: notifRes.data.data || [] };
          }
        } catch (e) {}
      }
      const cleanRole = (await getValidUserRole()).toLowerCase();
      const userNik = (session.nik || '').toString().trim();
      const userNama = (session.nama || '').toString().toLowerCase().trim();
      let notifs = [];
      const [aRes, sRes, pRes, iRes, sumRes, aspRes, bRes, kRes, mRes, pmRes, pkRes] = await Promise.all([
        safeSupabaseSelect('Pengaduan'),
        safeSupabaseSelect('SuratPengantar'),
        safeSupabaseSelect('Peminjaman'),
        safeSupabaseSelect('Iuran'),
        safeSupabaseSelect('Sumbangan'),
        safeSupabaseSelect('Aspirasi'),
        safeSupabaseSelect('Bansos'),
        safeSupabaseSelect('Kelahiran'),
        safeSupabaseSelect('Kematian'),
        safeSupabaseSelect('PindahMasuk'),
        safeSupabaseSelect('PindahKeluar')
      ]);
      const extractDate = (item, preferKeys) => {
        if (!item || typeof item !== 'object') return null;
        const commonKeys = ['created_at', 'createdat', 'updated_at', 'timestamp', 'waktu', 'tanggal', 'tanggal_bayar', 'tanggal_pindah', 'tanggal_lahir', 'tanggal_meninggal', 'tgl', 'date', 'datetime'];
        const keys = [...(preferKeys || []), ...commonKeys];
        for (let k of keys) {
          let v = item[k] || item[k.toUpperCase()];
          if (v) { let d = new Date(v); if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return v; }
        }
        for (let key of Object.keys(item)) {
          let v = item[key];
          if (!v || typeof v !== 'string' || v.length < 6) continue;
          let d = new Date(v);
          if (!isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) return v;
        }
        return null;
      };
      // Pencocokan milik sendiri: NIK / No.KK keluarga / nama (konsisten untuk semua menu)
      const matchUser = (row, namaKeys) => {
        let itemNik  = cariNilaiKolom(row, ['nik', 'ktp']).trim();
        let itemKk   = cariNilaiKolom(row, ['kk', 'no_kk']).trim();
        let itemNama = cariNilaiKolom(row, namaKeys).toLowerCase().trim();
        if (userNik && itemNik && itemNik === userNik) return true;
        if (userKk && itemKk && itemKk === userKk) return true;
        return !!(userNama && itemNama && (itemNama === userNama || itemNama.includes(userNama) || userNama.includes(itemNama)));
      };
      // Status yang berarti "belum diproses RT" -> warga TIDAK dapat notifikasi (muncul setelah RT verifikasi)
      const statusBelum = (st) => {
        let s = String(st || '').toLowerCase().trim();
        return !s || s.includes('belum') || s.includes('menunggu') || s.includes('baru') || s.includes('pending');
      };
      // Waktu notifikasi Bansos: utamakan "diambil_pada" (saat RT verifikasi, format dd/mm/yyyy hh:mm WIB)
      // jika status sudah diambil; selain itu pakai created_at/verified_at.
      const extractBansosNotifDate = (item) => {
        let st = String(cariNilaiKolom(item, ['status']) || '').toLowerCase();
        let taken = String(cariNilaiKolom(item, ['diambil_pada']) || '').trim();
        if (st.includes('sudah') && taken && taken !== '-' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(taken)) {
          return taken; // "10/08/2026 01:05 WIB" -> diparse oleh parseTanggalKeDate
        }
        return extractDate(item, ['verified_at']);
      };
      // No.KK pengguna — agar keluarga (no_kk sama) ikut mendapat notifikasi
      let userKk = '';
      try {
        const { data: wargaAll } = await safeSupabaseSelect('Warga');
        if (wargaAll) {
          const targetWarga = wargaAll.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
            return wNik && wNik.toString().trim() === userNik;
          });
          if (targetWarga) userKk = (cariNilaiKolom(targetWarga, ['kk', 'no_kk']) || '').toString().trim();
        }
      } catch(e) {}
      if (cleanRole === 'rt') {
        (aRes.data || []).forEach(item => {
          let st    = cariNilaiKolom(item, ['status']) || 'Baru';
          let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Umum';
          let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap', 'pelapor']) || 'Warga';
          let id    = item.id || cariNilaiKolom(item, ['id']) || ('ADU-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'Pengaduan', pesan: `Aduan ${jenis} dari ${nama}: (${st})`, rawDate });
        });
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
        (bRes.data || []).forEach(item => {
          let st  = cariNilaiKolom(item, ['status']) || '';
          let stL = st.toLowerCase();
          if (stL.includes('belum') || stL.includes('kedaluwarsa') || stL.includes('menunggu') || !st) {
            let nama  = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let jenis = cariNilaiKolom(item, ['jenis_bansos', 'jenis']) || 'Bansos';
            let id    = item.id || cariNilaiKolom(item, ['id']) || ('BAN-' + Math.random());
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Bansos', pesan: `Bansos ${jenis} untuk ${nama}: ${st || 'Belum Diambil'}`, rawDate });
          }
        });
        (kRes.data || []).forEach(item => {
          let namaBayi = cariNilaiKolom(item, ['nama_bayi', 'nama']) || 'anak baru';
          let id       = item.id || cariNilaiKolom(item, ['id']) || ('KLH-' + Math.random());
          let rawDate  = extractDate(item);
          notifs.push({ id, menu: 'Kelahiran', pesan: `Kelahiran baru: ${namaBayi}`, rawDate });
        });
        (mRes.data || []).forEach(item => {
          let nama   = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
          let id     = item.id || cariNilaiKolom(item, ['id']) || ('KMT-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'Kematian', pesan: `Kematian baru: ${nama}`, rawDate });
        });
        (pmRes.data || []).forEach(item => {
          let nama   = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
          let asal   = cariNilaiKolom(item, ['asal']) || '-';
          let id     = item.id || cariNilaiKolom(item, ['id']) || ('PMS-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'PindahMasuk', pesan: `Pindah masuk: ${nama} dari ${asal}`, rawDate });
        });
        (pkRes.data || []).forEach(item => {
          let nama   = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
          let tujuan = cariNilaiKolom(item, ['alamat_tujuan', 'tujuan']) || '-';
          let id     = item.id || cariNilaiKolom(item, ['id']) || ('PKL-' + Math.random());
          let rawDate = extractDate(item);
          notifs.push({ id, menu: 'PindahKeluar', pesan: `Pindah keluar: ${nama} ke ${tujuan}`, rawDate });
        });
      } else {
        (aRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap', 'pelapor'])) {
            let st    = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diproses RT -> jangan notifikasi
            let jenis = cariNilaiKolom(item, ['jenis_aduan', 'jenis']) || 'Aduan';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Pengaduan', pesan: `Status Aduan ${jenis}: ${st}`, rawDate });
          }
        });
        (sRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap', 'pemohon'])) {
            let st = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diproses RT -> jangan notifikasi
            let id = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'SuratPengantar', pesan: `Surat Pengantar Anda: Status kini "${st}"`, rawDate });
          }
        });
        (pRes.data || []).forEach(item => {
          if (matchUser(item, ['nama_peminjam', 'nama', 'peminjam'])) {
            let st     = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diproses RT -> jangan notifikasi
            let barang = cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']) || 'Barang';
            let id     = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Aset', pesan: `Peminjaman ${barang}: ${st}`, rawDate });
          }
        });
        (iRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let st    = cariNilaiKolom(item, ['status']) || '';
            let bulan = cariNilaiKolom(item, ['bulan']) || '';
            let id    = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            // FIX: Jangan sampai status "Belum Lunas" terdeteksi sebagai lunas
            // ("belum lunas" mengandung kata "lunas"). Notifikasi LUNAS hanya
            // muncul jika status benar-benar lunas.
            let stLower = st.toLowerCase();
            let isLunas = stLower === 'lunas' || (stLower.includes('lunas') && !stLower.includes('belum'));
            if (isLunas) {
              notifs.push({ id, menu: 'Iuran', pesan: `Iuran ${bulan} telah LUNAS diverifikasi RT!`, rawDate });
            }
          }
        });
        (sumRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let st      = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum diverifikasi RT -> jangan notifikasi
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Sumbangan', pesan: `Sumbangan Anda: ${st}`, rawDate });
          }
        });
        (aspRes.data || []).forEach(item => {
          if (matchUser(item, ['nama'])) {
            let st      = cariNilaiKolom(item, ['status']) || '';
            if (statusBelum(st)) return; // belum direspon RT -> jangan notifikasi
            let isi     = cariNilaiKolom(item, ['isi_aspirasi', 'isi', 'aspirasi', 'pesan', 'saran']) || 'Masukan baru';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item, ['verified_at']);
            notifs.push({ id, menu: 'Aspirasi', pesan: `Aspirasi Anda: ${st}`, rawDate });
          }
        });
        (bRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let st      = cariNilaiKolom(item, ['status']) || '';
            let jenis   = cariNilaiKolom(item, ['jenis_bansos', 'jenis']) || 'Bansos';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractBansosNotifDate(item);
            notifs.push({ id, menu: 'Bansos', pesan: `Bansos Anda (${jenis}): ${st || 'Belum Diambil'}`, rawDate });
          }
        });
        (kRes.data || []).forEach(item => {
          if (matchUser(item, ['nama_bayi', 'nama_ayah', 'nama_ibu', 'nama'])) {
            let namaBayi = cariNilaiKolom(item, ['nama_bayi', 'nama']) || 'anak baru';
            let id       = item.id || cariNilaiKolom(item, ['id']);
            let rawDate  = extractDate(item);
            notifs.push({ id, menu: 'Kelahiran', pesan: `Kelahiran: ${namaBayi}`, rawDate });
          }
        });
        (mRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let nama    = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'Kematian', pesan: `Kematian: ${nama}`, rawDate });
          }
        });
        (pmRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let nama    = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let asal    = cariNilaiKolom(item, ['asal']) || '-';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'PindahMasuk', pesan: `Pindah masuk: ${nama} dari ${asal}`, rawDate });
          }
        });
        (pkRes.data || []).forEach(item => {
          if (matchUser(item, ['nama', 'nama_lengkap'])) {
            let nama    = cariNilaiKolom(item, ['nama', 'nama_lengkap']) || 'Warga';
            let tujuan  = cariNilaiKolom(item, ['alamat_tujuan', 'tujuan']) || '-';
            let id      = item.id || cariNilaiKolom(item, ['id']);
            let rawDate = extractDate(item);
            notifs.push({ id, menu: 'PindahKeluar', pesan: `Pindah keluar: ${nama} ke ${tujuan}`, rawDate });
          }
        });
      }
      return { status: 'success', data: notifs };
    }
    if (actionName === 'getInfoWarga') {
      const { data: safeData } = await safeSupabaseSelect('Pengaturan');
      let target = safeData ? safeData.find(x => {
        let k = x.kunci || cariNilaiKolom(x, ['kunci', 'key']);
        return k && k.toString().toLowerCase().trim() === 'info_warga';
      }) : null;
      let val = target ? (target.nilai !== null && target.nilai !== undefined ? target.nilai : cariNilaiKolom(target, ['nilai', 'value'])) : '';
      if (val) {
        appSettings.info_warga = val;
        try {
          localStorage.setItem('rt_app_settings_cache', JSON.stringify(appSettings));
        } catch(e) {}
      }
      return { status: 'success', data: val || appSettings.info_warga || '' };
    }
    if (actionName === 'getDashboardSummary') {
      const cleanRole = (await getValidUserRole()).toLowerCase();
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
      const headers = canonicalTableHeaders('Warga', myData);
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
        const headers = canonicalTableHeaders(tableName, safeData[0]);
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
