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

// ==========================================================
// ==== KONFIGURASI DATABASE SUPABASE =======================
// ==========================================================
const SUPABASE_URL = 'https://kcuuylpqhxagcradfmon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdXV5bHBxaHhhZ2NyYWRmbW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NjI5NTEsImV4cCI6MjEwMTEzODk1MX0.kI7sP46AIOLsJKyAg4DWQTNhCWCh22PwFMDogXoUlyg'; // API Key (anon public)

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- SAFE SUPABASE QUERY HELPERS (KEBAL NAMA TABEL BESAR/KECIL) ---
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
  }
  return { error };
}

// Helper Case-Insensitive Objek Supabase
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
  if (Array.isArray(data)) {
    return data.map(item => caseInsensitiveObj(item));
  } else if (data && typeof data === 'object') {
    return caseInsensitiveObj(data);
  }
  return data;
}

// Helper Universal Cari Data Warga & Barang (Kebal Nama Kolom, Spasi/Underscore, & Bebas Bentrok Kolom Foto)
function cariNilaiKolom(row, keywords) {
  if (!row || typeof row !== 'object') return '';
  const keys = Object.keys(row);

  for (let kw of keywords) {
    let kwClean = kw.toLowerCase().replace(/_/g, ' ').trim();

    // 1. Exact Match (abaikan perbedaan _ vs spasi & huruf besar/kecil)
    let exactKey = keys.find(k => k.toLowerCase().replace(/_/g, ' ').trim() === kwClean);
    if (exactKey && row[exactKey] !== null && row[exactKey] !== undefined && String(row[exactKey]).trim() !== '') {
      return String(row[exactKey]).trim();
    }

    // 2. Partial Match (Abaikan kolom foto/gambar/bukti/keterangan jika mencari nama/barang)
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

// Helper Konversi URL Google Drive ke Direct Image LH3
function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) {
      return "https://lh3.googleusercontent.com/d/" + idMatch[0];
    }
  }
  return url;
}

// --- HELPER FETCH POST (SUPABASE BRIDGE) ---
async function callGASPost(actionName, extraPayload = {}) {
  try {
    // 1. Process Login (Pencocokan Universal Akun Warga & RT)
    if (actionName === 'processLogin') {
      const uClean = extraPayload.username ? extraPayload.username.toString().trim() : '';
      const pClean = extraPayload.password ? extraPayload.password.toString().trim() : '';

      try {
        const { data: safeUsers, error } = await safeSupabaseSelect('Users');

        if (error || !safeUsers || safeUsers.length === 0) {
          return { status: 'error', message: 'Username / NIK tidak ditemukan!' };
        }

        const user = safeUsers.find(x => {
          let uName = String(x.username || '').toLowerCase().trim();
          let uNik = String(cariNilaiKolom(x, ['nik', 'ktp']) || '').trim();
          return uName === uClean.toLowerCase() || uNik === uClean;
        });

        if (!user) {
          return { status: 'error', message: 'Username / NIK tidak ditemukan!' };
        }

        let pass = user.password || user.pass || user.pwd || '';
        if (String(pass).trim() !== pClean) {
          return { status: 'error', message: 'Password salah!' };
        }

        let namaLengkap = '';
        let alamatLengkap = '';
        let noHpLengkap = '';
        let nikUser = cariNilaiKolom(user, ['nik', 'ktp']) || uClean;

        const roleClean = (user.role || '').toString().trim().toLowerCase();

        if (roleClean === 'rt' || uClean.toLowerCase() === 'adminrt') {
          namaLengkap = 'Administrator RT 05';
          alamatLengkap = 'Wilayah RT 05';
          noHpLengkap = noWaAdmin;
        } else {
          const { data: safeWarga } = await safeSupabaseSelect('Warga');
          
          if (safeWarga && safeWarga.length > 0) {
            let matchedWarga = safeWarga.find(w => {
              let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
              return wNik && wNik === nikUser;
            });

            if (!matchedWarga) {
              matchedWarga = safeWarga.find(w => {
                let wNama = cariNilaiKolom(w, ['nama', 'name']);
                return wNama && wNama.toLowerCase().includes(uClean.toLowerCase());
              });
            }

            if (matchedWarga) {
              namaLengkap = cariNilaiKolom(matchedWarga, ['nama', 'name']);
              alamatLengkap = cariNilaiKolom(matchedWarga, ['alamat', 'address']);
              noHpLengkap = cariNilaiKolom(matchedWarga, ['hp', 'wa', 'telp', 'phone']);
              nikUser = cariNilaiKolom(matchedWarga, ['nik', 'ktp']) || nikUser;
            }
          }
        }

        if (!namaLengkap) {
          namaLengkap = uClean || 'Warga';
        }

        return {
          status: 'success',
          token: 'token-' + (uClean || Date.now()),
          role: (roleClean === 'rt' || uClean.toLowerCase() === 'adminrt') ? 'RT' : 'Warga',
          nik: nikUser,
          nama: namaLengkap,
          alamat: alamatLengkap,
          noHp: noHpLengkap
        };
      } catch (err) {
        return { status: 'error', message: 'Gagal login: ' + err.message };
      }
    }

    // 2. Simpan Data Baru Generic
    if (actionName === 'simpanDataKeSheet') {
      const sheetName = extraPayload.sheetName;
      let formData = { ...extraPayload.formData };

      if (!formData.id) {
        formData.id = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      }

      if (session.role !== 'RT' && sheetName !== 'Iuran') {
        formData['nik'] = session.nik;
      }

      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) {
          formData[k] = formData[k].base64;
        }
      }

      const { error } = await safeSupabaseInsert(sheetName, [formData]);
      if (error) return { status: 'error', message: error.message };

      return { status: 'success', message: 'Data berhasil disimpan!', id: formData.id };
    }

    // 3. Simpan Form Peminjaman khusus Aset (Dari Modal aset.js)
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

    // 4. Verifikasi Peminjaman oleh RT (Setujui / Tolak + Potong Stok)
    if (actionName === 'verifikasiPeminjamanRT') {
      const idPinjam = extraPayload.idPinjam;
      const status = extraPayload.status; // 'Disetujui' / 'Ditolak'
      const qtyAcc = parseInt(extraPayload.qtyAcc) || 0;
      const catatanRt = extraPayload.catatanRt || '';

      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');
      const safePinjam = safePinjamList ? safePinjamList.find(p => (p.id || cariNilaiKolom(p, ['id'])) === idPinjam) : null;

      if (safePinjam && status === 'Disetujui' && qtyAcc > 0) {
        let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'barang', 'id_barang']);

        const { data: safeAset } = await safeSupabaseSelect('Aset');

        let targetAset = safeAset ? safeAset.find(a => {
          let bNama = cariNilaiKolom(a, ['nama_barang', 'nama_aset', 'nama', 'barang']);
          let bId = cariNilaiKolom(a, ['id']);
          return (bNama && bNama.toLowerCase() === barangTarget.toLowerCase()) || (bId && bId === safePinjam.id_barang);
        }) : null;

        if (targetAset) {
          let targetId = targetAset.id || targetAset.ID;
          let currentStok = parseInt(cariNilaiKolom(targetAset, ['stok_tersedia', 'stok', 'jumlah']) || 0);
          let stokBaru = Math.max(0, currentStok - qtyAcc);
          let statusAsetBaru = stokBaru > 0 ? 'Tersedia' : 'Habis';

          await safeSupabaseUpdate('Aset', {
            stok_tersedia: stokBaru,
            status: statusAsetBaru
          }, 'id', targetId);
        }
      }

      const { error } = await safeSupabaseUpdate('Peminjaman', {
        status: status,
        acc: qtyAcc,
        catatan_rt: catatanRt
      }, 'id', idPinjam);

      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: `Peminjaman berhasil di-${status.toLowerCase()}!` };
    }

    // 5. Proses Pengembalian Barang Aset RT (Tambah Stok Kembali)
    if (actionName === 'prosesPengembalianAsetRT') {
      const idPinjam = extraPayload.idPinjam;
      const qtyKembali = parseInt(extraPayload.qtyKembali) || 0;
      const catatanRt = extraPayload.catatanRt || '';

      const { data: safePinjamList } = await safeSupabaseSelect('Peminjaman');
      const safePinjam = safePinjamList ? safePinjamList.find(p => (p.id || cariNilaiKolom(p, ['id'])) === idPinjam) : null;

      if (safePinjam && qtyKembali > 0) {
        let barangTarget = cariNilaiKolom(safePinjam, ['nama_barang', 'barang', 'id_barang']);

        const { data: safeAset } = await safeSupabaseSelect('Aset');

        let targetAset = safeAset ? safeAset.find(a => {
          let bNama = cariNilaiKolom(a, ['nama_barang', 'nama_aset', 'nama', 'barang']);
          let bId = cariNilaiKolom(a, ['id']);
          return (bNama && bNama.toLowerCase() === barangTarget.toLowerCase()) || (bId && bId === safePinjam.id_barang);
        }) : null;

        if (targetAset) {
          let targetId = targetAset.id || targetAset.ID;
          let currentStok = parseInt(cariNilaiKolom(targetAset, ['stok_tersedia', 'stok', 'jumlah']) || 0);
          let stokBaru = currentStok + qtyKembali;

          await safeSupabaseUpdate('Aset', {
            stok_tersedia: stokBaru,
            status: 'Tersedia'
          }, 'id', targetId);
        }
      }

      const { error } = await safeSupabaseUpdate('Peminjaman', {
        status: 'Selesai (Dikembalikan)',
        catatan_rt: catatanRt
      }, 'id', idPinjam);

      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Pengembalian barang berhasil dicatat & stok telah diperbarui!' };
    }

    // 6. Update Data Generic
    if (actionName === 'updateDataDiSheet') {
      const sheetName = extraPayload.sheetName;
      const id = extraPayload.id;
      let formData = { ...extraPayload.formData };

      for (let k in formData) {
        if (typeof formData[k] === 'object' && formData[k] !== null && formData[k].base64) {
          formData[k] = formData[k].base64;
        }
      }

      const { error } = await safeSupabaseUpdate(sheetName, formData, 'id', id);
      if (error) return { status: 'error', message: error.message };

      return { status: 'success', message: 'Data berhasil diperbarui!' };
    }

    // 7. Hapus Data
    if (actionName === 'hapusDataDariSheet') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' };
      const sheetName = extraPayload.sheetName;
      const id = extraPayload.id;

      const { error } = await safeSupabaseDelete(sheetName, 'id', id);
      if (error) return { status: 'error', message: error.message };

      return { status: 'success', message: 'Data berhasil dihapus!' };
    }

    // 8. Simpan Info Warga
    if (actionName === 'simpanInfoWarga') {
      if (session.role !== 'RT') return { status: 'error', message: 'Hanya RT yang diizinkan memperbarui info warga!' };
      const teksBaru = extraPayload.teksBaru;
      const { error } = await db.from('Pengaturan').upsert([{ kunci: 'info_warga', nilai: teksBaru }], { onConflict: 'kunci' });
      if (error) return { status: 'error', message: error.message };
      return { status: 'success', message: 'Informasi warga berhasil diperbarui!' };
    }

    return { status: 'error', message: 'Aksi POST tidak dikenal' };
  } catch (err) {
    console.error('Fetch Error (POST):', err);
    return { status: 'error', message: 'Gagal terhubung ke Supabase: ' + err.message };
  }
}

// --- HELPER FETCH GET (SUPABASE BRIDGE) ---
async function callGASGet(actionName, params = {}) {
  try {
    // 1. Get Daftar Barang Aset (Khusus untuk Form Peminjaman di aset.js)
    if (actionName === 'getDaftarBarangAset') {
      const { data: safeAset } = await safeSupabaseSelect('Aset');

      if (!safeAset || safeAset.length === 0) {
        return { status: 'success', data: [] };
      }

      let listBarang = safeAset.map(item => {
        let bId = item.id || item.ID || cariNilaiKolom(item, ['id']);
        let bNama = cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'nama', 'barang']);
        let bStok = parseInt(cariNilaiKolom(item, ['stok_tersedia', 'jumlah', 'stok', 'stock', 'qty']) || 0);
        return { id: bId || bNama, nama: bNama, stok: bStok };
      }).filter(b => b.nama);

      return { status: 'success', data: listBarang };
    }

    // 2. Get Riwayat Peminjaman (Khusus Tabel Riwayat di aset.js)
    if (actionName === 'getRiwayatPeminjaman') {
      const { data: safeRiwayat } = await safeSupabaseSelect('Peminjaman');

      if (!safeRiwayat || safeRiwayat.length === 0) {
        return { status: 'success', data: [] };
      }

      let listRiwayat = safeRiwayat.map(item => {
        return {
          idPinjam: item.id || cariNilaiKolom(item, ['id', 'id_pinjam']),
          namaPeminjam: cariNilaiKolom(item, ['nama_peminjam', 'nama', 'peminjam']),
          namaBarang: cariNilaiKolom(item, ['nama_barang', 'nama_aset', 'barang']),
          jumlahMinta: parseInt(cariNilaiKolom(item, ['jumlah', 'qty', 'minta']) || 0),
          jumlahAcc: parseInt(cariNilaiKolom(item, ['acc', 'jumlah_acc', 'qty_acc']) || 0),
          keterangan: cariNilaiKolom(item, ['keterangan', 'ket_warga', 'keterangan_warga']),
          catatanRt: cariNilaiKolom(item, ['catatan_rt', 'lokasi', 'catatan']),
          status: cariNilaiKolom(item, ['status']) || 'Menunggu Verifikasi',
          nik: cariNilaiKolom(item, ['nik'])
        };
      });

      const cleanRole = (session.role || 'warga').toLowerCase();
      if (cleanRole !== 'rt' && session.nik) {
        listRiwayat = listRiwayat.filter(r => {
          let rNik = (r.nik || '').toString().trim();
          let sNik = (session.nik || '').toString().trim();
          let rNama = (r.namaPeminjam || '').toLowerCase().trim();
          let sNama = (session.nama || '').toLowerCase().trim();
          return (rNik && rNik === sNik) || (rNama && sNama && rNama.includes(sNama));
        });
      }

      return { status: 'success', data: listRiwayat };
    }

    // 3. Get Table Data standard
    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const { data: safeData } = await safeSupabaseSelect(sheetName);
      
      if (!safeData || safeData.length === 0) {
        return { status: 'success', headers: [], rows: [] };
      }

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
          if (targetWarga) {
            userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);
          }

          const kkIdx = lowerHeaders.findIndex(h => h.includes('kk') || h.includes('no_kk'));

          let rows = filteredData.map(rowObj => {
            let rowArr = headers.map(h => rowObj[h] !== null && rowObj[h] !== undefined ? rowObj[h] : '');
            let rowKk = kkIdx > -1 ? String(rowObj[headers[kkIdx]] || '').trim() : '';

            if ((userKk && rowKk === userKk) || (cariNilaiKolom(rowObj, ['nik', 'ktp']) === session.nik)) {
              return rowArr;
            } else {
              return headers.map((h, idx) => {
                let hLower = h.toLowerCase().trim();
                if (['no', 'nama_lengkap', 'nama_panggilan', 'nama', 'jenis_kelamin', 'no_hp', 'foto_url', 'alamat'].includes(hLower)) {
                  return rowArr[idx];
                } else {
                  return 'XXXXX';
                }
              });
            }
          });

          return { status: 'success', headers: headers, rows: rows };
        } else if (['keuangan', 'aset', 'peminjaman', 'sumbangan', 'aspirasi'].includes(sheetLower)) {
          // Menu publik transparan
        } else {
          filteredData = filteredData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
            return rNik && rNik.toString().trim() === session.nik.toString().trim();
          });
        }
      }

      if (!filteredData || filteredData.length === 0) {
        return { status: 'success', headers: headers, rows: [] };
      }

      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }

    // 4. Get Iuran Data
    if (actionName === 'getIuranData') {
      const { data: safeData } = await safeSupabaseSelect('Iuran');
      if (!safeData || safeData.length === 0) {
        return { status: 'success', headers: [], rows: [] };
      }

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
          if (targetWarga) {
            userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);
          }
        }

        filteredData = filteredData.filter(row => {
          let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
          let rKk = cariNilaiKolom(row, ['kk', 'no_kk']);
          return (rNik && rNik.toString().trim() === session.nik.toString().trim()) || (userKk && rKk && rKk === userKk);
        });
      }

      if (filteredData.length === 0) {
        const headers = safeData.length > 0 ? Object.keys(safeData[0]) : ['ID', 'NIK', 'Nama', 'No_KK', 'Bulan', 'Tahun', 'Nominal', 'Status', 'Tanggal_Bayar', 'Diterima_Oleh', 'Bukti_Transfer'];
        return { status: 'success', headers: headers, rows: [] };
      }

      const headers = Object.keys(filteredData[0]);
      const rows = filteredData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }

    // 5. Get Notifications
    if (actionName === 'getNotifications') {
      const { data: safeData } = await safeSupabaseSelect('Pengaduan');
      
      const cleanRole = (session.role || 'warga').toLowerCase();
      let filtered = safeData || [];
      if (cleanRole !== 'rt') {
        filtered = filtered.filter(item => {
          let rNik = cariNilaiKolom(item, ['nik']);
          return rNik && rNik.toString().trim() === session.nik.toString().trim();
        });
      }

      let notifs = filtered.slice(0, 5).map(item => ({
        id: item.id || 'NOTIF-' + Math.random(),
        menu: 'Pengaduan',
        pesan: `Laporan Aduan (${item.jenis_aduan || 'Umum'}): ${item.status || 'Baru'}`
      }));
      return { status: 'success', data: notifs };
    }

    // 6. Get Info Warga
    if (actionName === 'getInfoWarga') {
      const { data: safeData } = await safeSupabaseSelect('Pengaturan');
      let target = safeData ? safeData.find(x => x.kunci === 'info_warga') : null;
      return { status: 'success', data: target ? target.nilai : '' };
    }

    // 7. Get Dashboard Summary
    if (actionName === 'getDashboardSummary') {
      const cleanRole = (session.role || 'warga').toLowerCase();
      if (cleanRole === 'rt') {
        const { data: wList } = await safeSupabaseSelect('Warga');
        const { data: aList } = await safeSupabaseSelect('Pengaduan');
        const { data: kList } = await safeSupabaseSelect('Keuangan');
        const { data: sList } = await safeSupabaseSelect('SuratPengantar');
        const { data: sumList } = await safeSupabaseSelect('Sumbangan');

        return {
          status: 'success',
          role: 'RT',
          warga: wList.length,
          aduan: aList.length,
          keuangan: kList.length,
          surat: sList.length,
          sumbangan: sumList.length
        };
      } else {
        const countByNik = async (tableName) => {
          const { data: safeData } = await safeSupabaseSelect(tableName);
          if (!safeData) return 0;
          return safeData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
            return rNik && rNik.toString().trim() === session.nik.toString().trim();
          }).length;
        };

        const aduanCount = await countByNik('Pengaduan');
        const suratCount = await countByNik('SuratPengantar');
        const sumbanganCount = await countByNik('Sumbangan');

        return {
          status: 'success',
          role: 'Warga',
          aduan: aduanCount,
          surat: suratCount,
          sumbangan: sumbanganCount
        };
      }
    }

    // 8. Get Daftar Warga untuk Form Iuran RT
    if (actionName === 'getDaftarWargaUntukIuran') {
      const { data: safeData } = await safeSupabaseSelect('Warga');
      return { status: 'success', data: safeData || [] };
    }

    // 9. Get Profile Data
    if (actionName.toLowerCase().includes('profil') || actionName.toLowerCase().includes('profile')) {
      const nikCari = params.nik || session.nik || session.nama;
      const { data: safeWarga } = await safeSupabaseSelect('Warga');

      if (!safeWarga || safeWarga.length === 0) {
        return { status: 'error', message: 'Data warga tidak ditemukan' };
      }

      let myData = null;
      let myKk = '';

      for (let w of safeWarga) {
        let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
        if (wNik && wNik.toString().trim() === String(nikCari).trim()) {
          myData = w;
          myKk = cariNilaiKolom(w, ['kk', 'no_kk']);
          break;
        }
      }

      if (!myData && nikCari) {
        myData = safeWarga.find(w => {
          let wNama = cariNilaiKolom(w, ['nama', 'name']);
          return wNama && wNama.toLowerCase().includes(String(nikCari).toLowerCase());
        });
        if (myData) {
          myKk = cariNilaiKolom(myData, ['kk', 'no_kk']);
        }
      }

      if (!myData) {
        return { status: 'error', message: 'Profil Anda belum terdaftar!' };
      }

      let keluarga = [];
      if (myKk) {
        keluarga = safeWarga.filter(w => {
          let wKk = cariNilaiKolom(w, ['kk', 'no_kk']);
          let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
          let targetNik = cariNilaiKolom(myData, ['nik', 'ktp']);
          return wKk && wKk === myKk && wNik !== targetNik;
        });
      }

      const headers = Object.keys(myData);
      headers.forEach(h => {
        if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
          myData[h] = convertToImageLink(myData[h]);
          keluarga.forEach(m => { m[h] = convertToImageLink(m[h]); });
        }
      });

      return {
        status: 'success',
        pribadi: myData,
        keluarga: keluarga,
        headers: headers,
        data: myData,
        row: myData,
        user: myData
      };
    }

    // 10. Smart Dynamic Getter
    if (actionName.toLowerCase().startsWith('get') && actionName.toLowerCase().endsWith('data')) {
      let rawName = actionName.replace(/^get/i, '').replace(/data$/i, '');
      let tableName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      
      const { data: safeData } = await safeSupabaseSelect(tableName);
      if (safeData && safeData.length > 0) {
        const headers = Object.keys(safeData[0]);
        const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        return { status: 'success', headers: headers, rows: rows, data: safeData };
      }
    }

    return { status: 'error', message: 'Aksi GET tidak dikenal: ' + actionName };
  } catch (err) {
    console.error('Fetch Error (GET):', err);
    return { status: 'error', message: 'Gagal memuat data Supabase: ' + err.message };
  }
}

// --- FUNGSI AUTHENTICATION & SESSION ---
async function doLogin() {
  try {
    var u = document.getElementById('username').value;
    var p = document.getElementById('password').value;
    
    if(!u || !p) {
      document.getElementById('login-msg').innerHTML = "Isi username dan password dulu bro!";
      return;
    }
    
    document.getElementById('login-msg').innerHTML = "Memeriksa ke database...";
    
    const res = await callGASPost('processLogin', { username: u, password: p });

    if(res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();
      session.token = res.token || '';
      session.role = (roleClean === 'rt') ? 'RT' : 'Warga';
      session.nik = res.nik ? res.nik.toString().trim() : '';
      session.nama = res.nama ? res.nama.toString().trim() : '';
      session.alamat = res.alamat ? res.alamat.toString().trim() : '';
      session.noHp = res.noHp ? res.noHp.toString().trim() : '';

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

  if(session.role === 'Warga') {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'none');
  } else {
    document.querySelectorAll('.rt-only').forEach(el => el.style.display = 'block');
  }
  
  loadMenu('Dashboard');
  fetchNotifikasi();

  if (notifTimer) clearInterval(notifTimer);
  notifTimer = setInterval(async function() {
    if (session.token && document.visibilityState === "visible") {
      fetchNotifikasi();

      if (currentActiveMenu === 'Dashboard' && typeof loadDashboardView === 'function') {
        const res = await callGASGet('getInfoWarga');
        if (res && res.status === 'success') {
          let currentText = res.data || '';
          if (currentText !== lastInfoWargaText) {
            lastInfoWargaText = currentText;
            loadDashboardView();
            console.log("📢 Info Warga diperbarui di server, me-refresh dashboard...");
          }
        }
      }
    }
  }, 5000);
}

function doLogout() {
  if (confirm('Apakah lu yakin ingin logout?')) {
    if (notifTimer) clearInterval(notifTimer);
    
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
      if (session && session.role) {
        applySessionUI();
      }
    } catch(e) {
      localStorage.removeItem('rt_user_session');
    }
  }
}

// --- FUNGSI NOTIFIKASI ---
async function fetchNotifikasi() {
  if (!session.token) return;
  const res = await callGASGet('getNotifications');
  
  if(res && res.status === 'success') {
    rawNotifData = res.data || [];
    
    let savedTimestamps = JSON.parse(localStorage.getItem('rt_notif_times_' + session.nik) || '{}');
    let now = new Date();

    rawNotifData.forEach(item => {
      let rawTime = savedTimestamps[item.id];
      let notifDate = rawTime ? new Date(rawTime) : null;

      if (!notifDate || isNaN(notifDate.getTime())) {
        notifDate = new Date();
        savedTimestamps[item.id] = notifDate.toISOString();
      }

      let isHariIni = notifDate.toDateString() === now.toDateString();
      let jamStr = notifDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':') + ' WIB';

      if (isHariIni) {
        item.waktuTampil = jamStr;
      } else {
        let tglStr = notifDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        item.waktuTampil = tglStr + ' ' + jamStr;
      }
    });

    localStorage.setItem('rt_notif_times_' + session.nik, JSON.stringify(savedTimestamps));

    let badges = document.querySelectorAll('.notif-badge');
    let readCount = parseInt(localStorage.getItem('rt_notif_read_count_' + session.nik) || '0');
    
    if (rawNotifData.length < readCount) {
      readCount = 0;
      localStorage.setItem('rt_notif_read_count_' + session.nik, '0');
    }

    let unreadCount = rawNotifData.length - readCount;

    badges.forEach(badge => {
      if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
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
    let notifTerbaru = rawNotifData;

    notifTerbaru.forEach(item => {
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

  let badges = document.querySelectorAll('.notif-badge');
  badges.forEach(badge => {
    badge.style.display = 'none';
    badge.innerText = '0';
  });
  
  localStorage.setItem('rt_notif_read_count_' + session.nik, rawNotifData.length);

  if(!bootstrapNotifModalInstance) {
    bootstrapNotifModalInstance = new bootstrap.Modal(document.getElementById('notifModal'));
  }
  bootstrapNotifModalInstance.show();
}

function bukaNotifTarget(menuName) {
  if(bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();
  loadMenu(menuName);
}

function syncActiveNav(menu) {
  document.querySelectorAll('.sidebar a').forEach(el => el.classList.remove('active-menu'));
  var dEl = document.getElementById('dmenu-' + menu);
  if(dEl) dEl.classList.add('active-menu');
  
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  var mEl = document.getElementById('mmenu-' + menu);
  if(mEl) mEl.classList.add('active');
}

// --- FUNGSI NAVIGASI MENU ---
async function loadMenu(menu) {
  currentActiveMenu = menu;
  syncActiveNav(menu);
  document.getElementById('page-title').innerText = menu === 'Dashboard' ? 'Dashboard Utama' : (menu === 'Profil' ? 'Profil Saya' : menu);
  document.getElementById('rek-info').style.display = (menu === 'Sumbangan') ? 'block' : 'none';
  if (document.getElementById('searchInput')) document.getElementById('searchInput').value = "";

  switch(menu) {
    case 'Dashboard': if(typeof loadDashboardView === 'function') loadDashboardView(); return;
    case 'Profil': if(typeof loadProfilView === 'function') loadProfilView(); return;
    case 'Warga': if(typeof loadWargaView === 'function') { loadWargaView(); return; } break;
    case 'Kelahiran': if(typeof loadKelahiranView === 'function') { loadKelahiranView(); return; } break;
    case 'Kematian': if(typeof loadKematianView === 'function') { loadKematianView(); return; } break;
    case 'PindahMasuk': if(typeof loadPindahMasukView === 'function') { loadPindahMasukView(); return; } break;
    case 'PindahKeluar': if(typeof loadPindahKeluarView === 'function') { loadPindahKeluarView(); return; } break;
  }

  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data dari server...</small></div>';

  const res = await callGASGet('getTableData', { sheetName: menu });
  if (res && res.status === 'success') {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    renderTable(res, menu);
  } else {
    document.getElementById('main-content').innerHTML = '<div class="alert alert-danger text-center my-3">Gagal memuat data dari server.</div>';
  }
}

function renderTable(data, menu) {
  let html = '';
  
  let bolehTambah = false;
  if (session.role === 'RT') bolehTambah = true; 
  if (session.role === 'Warga' && ['Pengaduan', 'SuratPengantar', 'Sumbangan', 'Aset', 'Peminjaman', 'Aspirasi'].includes(menu)) bolehTambah = true;
  
  if (bolehTambah) {
    let labelTombol = session.role === 'RT' ? '+ Tambah Data Baru' : '+ Buat Pengajuan / Form Baru';
    if (menu === 'Aspirasi') {
      labelTombol = '+ Tulis Aspirasi Anonim';
    }
    html += `<button class="btn btn-success fw-bold mb-3 shadow-sm px-3 py-2" onclick="bukaModalForm()"><i class="bi bi-plus-circle me-2"></i>${labelTombol}</button>`;
  }

  if(!data || !data.rows || data.rows.length === 0) {
    html += '<div class="alert alert-light border text-muted mt-2"><i class="bi bi-folder-x me-2"></i>Belum ada baris data di dalam sheet ini.</div>';
    document.getElementById('main-content').innerHTML = html;
    return;
  }

  html += '<div class="card card-custom"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="dataTable">';
  html += '<thead class="table-light"><tr>';
  data.headers.forEach(h => html += `<th class="py-3 text-secondary" style="font-size: 0.85rem; letter-spacing: 0.5px;">${h.toUpperCase()}</th>`);
  html += '<th class="py-3 text-secondary text-center" style="font-size: 0.85rem;">AKSI</th></tr></thead><tbody>';

  let reversedRows = [...data.rows].reverse();
  reversedRows.forEach(row => {
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
  var directUrl = convertToImageLink(urlImg);
  document.getElementById('modalPreviewImg').src = directUrl;
  if(!bootstrapImageModalInstance) {
    bootstrapImageModalInstance = new bootstrap.Modal(document.getElementById('imageModal'));
  }
  bootstrapImageModalInstance.show();
}

async function bukaModalForm() {
  editingId = null;
  document.getElementById('formModalTitle').innerText = "Form Input Menu: " + currentActiveMenu;
  document.getElementById('btn-hapus-modal').style.display = 'none';
  await generateFormInputs(null);
  
  if(!bootstrapModalInstance) {
    bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  }
  bootstrapModalInstance.show();
}

async function bukaModalEdit(id) {
  editingId = id;
  document.getElementById('formModalTitle').innerText = "Edit / Ubah Status Data: " + currentActiveMenu;
  
  if (session.role === 'RT') {
    document.getElementById('btn-hapus-modal').style.display = 'inline-block';
  } else {
    document.getElementById('btn-hapus-modal').style.display = 'none';
  }
  
  let rowData = currentRows.find(r => r[0] === id);
  await generateFormInputs(rowData);
  
  if(!bootstrapModalInstance) {
    bootstrapModalInstance = new bootstrap.Modal(document.getElementById('formModal'));
  }
  bootstrapModalInstance.show();
}

async function generateFormInputs(rowData) {
  let formBody = document.getElementById('dynamicForm');
  formBody.innerHTML = '';
  
  for (let idx = 0; idx < currentHeaders.length; idx++) {
    let h = currentHeaders[idx];
    if(['id', 'no', 'saldo'].includes(h.toLowerCase())) continue;
    
    let nameLower = h.toLowerCase().trim();
    let labelText = h.replace('_', ' ').toUpperCase();
    let val = rowData ? rowData[idx] : "";
    let inputHtml = '';
    
    if (nameLower === 'status' || nameLower.includes('penyelesaian') || nameLower.includes('penyelsaian') || nameLower.includes('admin')) {
      if (session.role !== 'RT' || !rowData) continue;
    }
    
    if (session.role === 'Warga' && !rowData) {
      if (nameLower === 'nik') val = session.nik;
      if (nameLower === 'nama' || nameLower === 'nama_lengkap') val = session.nama;
      if (nameLower.includes('alamat')) val = session.alamat;
      if (nameLower === 'no_hp' || nameLower === 'hp' || nameLower === 'telp' || nameLower === 'wa') val = session.noHp;
    }
    
    if (val && (nameLower === 'tanggal' || nameLower === 'tanggal_lahir' || nameLower.includes('tanggal')) && val.includes('/')) {
      var parts = val.split('/');
      if (parts.length === 3) {
        val = parts[2] + '-' + parts[1] + '-' + parts[0];
      }
    }
    
    if (nameLower === 'status' && (currentActiveMenu === 'Pengaduan' || currentActiveMenu === 'SuratPengantar' || currentActiveMenu === 'Sumbangan')) {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="Belum di verifikasi" ${val === 'Belum di verifikasi' ? 'selected' : ''}>Belum di verifikasi</option>
          <option value="Sedang ditindak lanjuti" ${val === 'Sedang ditindak lanjuti' ? 'selected' : ''}>Sedang ditindak lanjuti</option>
          <option value="selesai" ${val === 'selesai' ? 'selected' : ''}>selesai</option>
          <option value="di tolak" ${val === 'di tolak' ? 'selected' : ''}>di tolak</option>
          <option value="diterima" ${val === 'diterima' ? 'selected' : ''}>diterima</option>
        </select>`;
    } else if (nameLower === 'jenis_aduan' || (currentActiveMenu === 'Pengaduan' && nameLower.includes('jenis'))) {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Jenis Aduan --</option>
          <option value="KEAMANAN" ${val.toUpperCase() === 'KEAMANAN' ? 'selected' : ''}>KEAMANAN</option>
          <option value="KEBERSIHAN" ${val.toUpperCase() === 'KEBERSIHAN' ? 'selected' : ''}>KEBERSIHAN</option>
          <option value="LAMPU JALAN" ${val.toUpperCase() === 'LAMPU JALAN' ? 'selected' : ''}>LAMPU JALAN</option>
          <option value="JALANAN" ${val.toUpperCase() === 'JALANAN' ? 'selected' : ''}>JALANAN</option>
          <option value="LAINNYA" ${val.toUpperCase() === 'LAINNYA' ? 'selected' : ''}>LAINNYA</option>
        </select>`;
    } else if (nameLower === 'tanggal' || nameLower === 'tanggal_lahir' || nameLower.includes('tanggal')) {
      inputHtml = `<input type="date" class="form-control dynamic-input" data-key="${h}" value="${val}">`;
    } else if (nameLower === 'jenis_kelamin') {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Jenis Kelamin --</option>
          <option value="LAKI-LAKI" ${val.toUpperCase() === 'LAKI-LAKI' || val.toUpperCase() === 'LAKI LAKI' ? 'selected' : ''}>LAKI-LAKI</option>
          <option value="PEREMPUAN" ${val.toUpperCase() === 'PEREMPUAN' ? 'selected' : ''}>PEREMPUAN</option>
        </select>`;
    } else if (nameLower === 'status_nikah' || (nameLower === 'status' && currentActiveMenu === 'Warga')) {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Status Nikah --</option>
          <option value="MENIKAH" ${val.toUpperCase() === 'MENIKAH' ? 'selected' : ''}>MENIKAH</option>
          <option value="BELUM MENIKAH" ${val.toUpperCase() === 'BELUM MENIKAH' || val.toUpperCase() === 'BELUM' ? 'selected' : ''}>BELUM MENIKAH</option>
        </select>`;
    } else if (nameLower === 'status_tinggal' || nameLower === 'status_pindah') {
      inputHtml = `
        <select class="form-select dynamic-input" data-key="${h}">
          <option value="">-- Pilih Status Tinggal --</option>
          <option value="TETAP" ${val.toUpperCase() === 'TETAP' ? 'selected' : ''}>TETAP</option>
          <option value="KONTRAK" ${val.toUpperCase() === 'KONTRAK' ? 'selected' : ''}>KONTRAK</option>
        </select>`;
    } else if (nameLower.includes('foto') || nameLower.includes('bukti')) {
      let imgDirect = convertToImageLink(val);
      inputHtml = `
        ${val && !val.includes('***') ? `<div class="mb-1"><small class="text-muted">File saat ini:</small><br><img src="${imgDirect}" class="img-table mb-2" onclick="bukaPopUpFoto('${val}')"></div>` : ''}
        <input type="file" class="form-control dynamic-file-input" data-key="${h}" accept="image/*">`;
    } else {
      let isReadonly = '';
      if (session.role === 'Warga') {
        if (nameLower === 'nik' || nameLower.includes('alamat')) {
          isReadonly = 'readonly style="background-color: #f1f5f9; cursor: not-allowed;"';
        }
      }
      
      inputHtml = `<input type="text" class="form-control dynamic-input" data-key="${h}" value="${val}" placeholder="Masukkan ${labelText.toLowerCase()}..." ${isReadonly}>`;
    }

    formBody.innerHTML += `
      <div class="mb-3">
        <label class="form-label font-weight-bold small text-secondary">${labelText}</label>
        ${inputHtml}
      </div>`;
  }
}

// --- FUNGSI SUBMIT FORM & HAPUS DATA ---
function submitFormBaru() {
  let inputs = document.querySelectorAll('.dynamic-input');
  let fileInputs = document.querySelectorAll('.dynamic-file-input');
  let payload = {};
  
  inputs.forEach(inp => {
    payload[inp.getAttribute('data-key')] = inp.value;
  });
  
  document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary mb-2"></div><br><b>Sedang memproses data ke database...</b></div>';
  
  let filePromises = [];
  fileInputs.forEach(fileInp => {
    let key = fileInp.getAttribute('data-key');
    let file = fileInp.files[0];
    if (file) {
      let p = new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = function(e) {
          payload[key] = {
            base64: e.target.result,
            name: file.name,
            type: file.type
          };
          resolve();
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      filePromises.push(p);
    }
  });
  
  Promise.all(filePromises).then(async () => {
    if (editingId) {
      const res = await callGASPost('updateDataDiSheet', {
        sheetName: currentActiveMenu,
        id: editingId,
        formData: payload
      });
      
      if(res && res.status === 'success') {
        bootstrapModalInstance.hide();
        alert(res.message);
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else {
        alert('Gagal memperbarui: ' + (res ? res.message : 'Error'));
        loadMenu(currentActiveMenu);
      }
    } else {
      const res = await callGASPost('simpanDataKeSheet', {
        sheetName: currentActiveMenu,
        formData: payload
      });

      if(res && res.status === 'success') {
        bootstrapModalInstance.hide();
        alert('Data Berhasil Disimpan!');
        
        if(session.role === 'Warga') {
          if(currentActiveMenu === 'Pengaduan' && typeof waKirimLaporan === 'function') waKirimLaporan('aduan', res.id);
          if(currentActiveMenu === 'SuratPengantar' && typeof waKirimLaporan === 'function') waKirimLaporan('surat', res.id);
          if(currentActiveMenu === 'Sumbangan' && typeof waVerifikasiSumbangan === 'function') waVerifikasiSumbangan(res.id);
        }
        loadMenu(currentActiveMenu);
        fetchNotifikasi();
      } else {
        alert('Gagal menyimpan: ' + (res ? res.message : 'Error'));
        loadMenu(currentActiveMenu);
      }
    }
  }).catch(err => {
    alert('Gagal membaca file foto: ' + err.message);
    loadMenu(currentActiveMenu);
  });
}

async function hapusDataAktif() {
  if(!editingId) return;
  if(confirm('Apakah lu yakin ingin menghapus data ini secara permanen dari database Supabase?')) {
    document.getElementById('dynamicForm').innerHTML = '<div class="text-center p-4"><b class="text-danger">Sedang menghapus data dari server...</b></div>';
    
    const res = await callGASPost('hapusDataDariSheet', {
      sheetName: currentActiveMenu,
      id: editingId
    });

    if(res && res.status === 'success') {
      bootstrapModalInstance.hide();
      alert('Data Berhasil Dihapus!');
      loadMenu(currentActiveMenu);
      fetchNotifikasi();
    } else {
      alert('Gagal menghapus: ' + (res ? res.message : 'Error'));
      loadMenu(currentActiveMenu);
    }
  }
}

function getTombolAksi(menu, row, headers) {
  let id = row[0];
  
  let lowerHeaders = headers.map(h => h.toLowerCase().trim());
  let noHpIdx = lowerHeaders.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';

  if (session.role === 'RT') {
    let btn = `<button class="btn btn-sm btn-outline-primary m-1 fw-bold" onclick="bukaModalEdit('${id}')">Edit/Status</button>`;
    if (menu === 'Pengaduan' || menu === 'SuratPengantar') {
       btn += `<button class="btn btn-sm btn-success m-1 fw-bold" onclick="waKirimLaporanKeWarga('${id}', '${noHpWarga}')"><i class="bi bi-whatsapp me-1"></i>Kirim Laporan</button>`;
    }
    return btn;
  }
  if (session.role === 'Warga') {
    if (menu === 'Pengaduan') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('aduan', '${id}')"><i class="bi bi-whatsapp me-1"></i>WA Lapor</button>`;
    if (menu === 'SuratPengantar') return `<button class="btn btn-sm btn-success fw-bold" onclick="waKirimLaporan('surat', '${id}')"><i class="bi bi-whatsapp me-1"></i>WA Pengantar</button>`;
    if (menu === 'Keuangan') return `<button class="btn btn-sm btn-danger fw-bold" onclick="waLaporMasalahKeuangan('${id}')">Laporkan Masalah</button>`;
    if (menu === 'Sumbangan') return `<button class="btn btn-sm btn-success fw-bold" onclick="waVerifikasiSumbangan('${id}')"><i class="bi bi-whatsapp me-1"></i>WA Verifikasi</button>`;
  }
  return '-';
}

function bukaWa(nomor, text) {
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(text)}`, '_blank');
}

function filterTable() {
  let input = document.getElementById("searchInput").value.toUpperCase().trim();
  
  let tr = document.querySelectorAll("#dataTable tbody tr");
  tr.forEach(row => {
    let text = row.innerText.toUpperCase();
    row.style.display = text.includes(input) ? "" : "none";
  });

  let quickItems = document.querySelectorAll(".quick-action-item");
  quickItems.forEach(item => {
    let menuText = item.innerText.toUpperCase();
    item.style.display = menuText.includes(input) ? "flex" : "none";
  });
}

document.addEventListener("DOMContentLoaded", function() {
  checkExistingSession();

  window.copySingleRek = function(nomor) {
    navigator.clipboard.writeText(nomor).then(() => {
      alert("Nomor rekening " + nomor + " berhasil disalin ke clipboard!");
    }).catch(err => {
      alert("Gagal menyalin otomatis: " + err);
    });
  }
});

// ==========================================================
// ==== TAB FOCUS REFRESH ===================================
// ==========================================================

document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible" && session.token) {
    fetchNotifikasi();
    if (currentActiveMenu) {
      loadMenu(currentActiveMenu);
    }
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const baseUrl = window.location.href.split('?')[0];
    const swUrl = baseUrl + '?pwa=sw';

    navigator.serviceWorker.register(swUrl)
      .then(reg => console.log('PWA Service Worker terdaftar!', reg))
      .catch(err => console.log('PWA SW gagal:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btnInstall = document.getElementById('btn-install-pwa');
  if (btnInstall) {
    btnInstall.style.display = 'block';
  }
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User menginstall PWA RT');
      }
      deferredPrompt = null;
    });
  }
}
