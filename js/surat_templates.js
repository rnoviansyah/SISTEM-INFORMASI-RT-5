// ============================================================
// SURAT TEMPLATES - Template PDF per Jenis Surat RT 05
// ============================================================
const JENIS_SURAT_LIST = [
  { value: 'Surat Pengantar Umum',             kode: 'SP',         label: 'Surat Pengantar Umum' },
  { value: 'Pengantar SKCK',                   kode: 'SKCK',       label: 'Pengantar SKCK' },
  { value: 'Surat Keterangan Tidak Mampu',     kode: 'SKTM',       label: 'Surat Keterangan Tidak Mampu (SKTM)' },
  { value: 'Surat Keterangan Domisili Usaha',  kode: 'SKDU',       label: 'Surat Keterangan Domisili Usaha (SKDU)' },
  { value: 'Surat Keterangan Pindah',          kode: 'PINDAH',     label: 'Surat Keterangan Pindah Domisili' },
  { value: 'Pengantar Nikah',                  kode: 'NIKAH',      label: 'Surat Pengantar Nikah' },
  { value: 'Surat Keterangan Ahli Waris',      kode: 'AHLI_WARIS', label: 'Surat Keterangan Ahli Waris' },
  { value: 'Surat Izin Keramaian',             kode: 'IZIN',       label: 'Surat Izin Keramaian/Acara' },
];

function getKodeSurat(jenisSurat) {
  if (!jenisSurat) return 'SP';
  let str = jenisSurat.split('|')[0].toLowerCase().trim();
  if (str.includes('keramaian') || str.includes('izin')) return 'IZIN';
  if (str.includes('skck') || str.includes('kepolisian')) return 'SKCK';
  if (str.includes('sktm') || str.includes('tidak mampu')) return 'SKTM';
  if (str.includes('skdu') || str.includes('usaha')) return 'SKDU';
  if (str.includes('pindah')) return 'PINDAH';
  if (str.includes('nikah')) return 'NIKAH';
  if (str.includes('waris')) return 'AHLI_WARIS';
  let found = JENIS_SURAT_LIST.find(j => j.value.toLowerCase() === str || str.includes(j.value.toLowerCase()) || j.value.toLowerCase().includes(str));
  return found ? found.kode : 'SP';
}

function renderSuratBody(jenisSurat, data) {
  // data: { namaWarga, nikWarga, alamatWarga, keterangan, tanggalSurat }
  let { namaWarga, nikWarga, alamatWarga, keterangan, tanggalSurat } = data;
  let cleanJenis = (jenisSurat || '').split('|')[0].trim();
  let kode = getKodeSurat(cleanJenis);

  // Parse extra fields from jenisSurat payload or keterangan
  let extra = {};
  if (jenisSurat && jenisSurat.includes('|')) {
    try { extra = JSON.parse(jenisSurat.split('|').slice(1).join('|')); } catch(e) {}
  }
  if (Object.keys(extra).length === 0 && keterangan && keterangan !== '{' && keterangan !== 'null' && keterangan !== '-') {
    if (typeof keterangan === 'object') {
      extra = keterangan;
    } else if (typeof keterangan === 'string') {
      let trimmed = keterangan.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try { extra = JSON.parse(trimmed); } catch(e) { extra = {}; }
      } else {
        extra = {
          catatan: trimmed,
          nama_acara: trimmed,
          nama_usaha: trimmed,
          keperluan: trimmed,
          alamat_baru: trimmed,
          nama_almarhum: trimmed
        };
      }
    }
  }

  const dataWargaTable = `
    <table class="table-data">
      <tr><td class="label">Nama Lengkap</td><td width="10">:</td><td><b>${namaWarga}</b></td></tr>
      <tr><td class="label">NIK</td><td>:</td><td>${nikWarga}</td></tr>
      <tr><td class="label">Alamat / No. Rumah</td><td>:</td><td>${alamatWarga}</td></tr>
    </table>`;

  if (kode === 'SKCK') {
    return {
      judul: 'SURAT PENGANTAR SKCK',
      nomorKode: 'SKCK',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 01 yang berdomisili di alamat tersebut di atas. Surat pengantar ini dibuat untuk keperluan <b>pengurusan Surat Keterangan Catatan Kepolisian (SKCK)</b> di Kepolisian Sektor (Polsek) setempat.</p>
        <p>Sejauh yang kami ketahui, yang bersangkutan adalah warga yang baik dan tidak pernah terlibat dalam tindak kriminal ataupun kegiatan yang bertentangan dengan hukum.</p>
        <p>Demikian surat pengantar ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
      `
    };
  }

  if (kode === 'SKTM') {
    let keperluan = extra.keperluan || extra.catatan || keterangan || '-';
    return {
      judul: 'SURAT KETERANGAN TIDAK MAMPU',
      nomorKode: 'SKTM',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Berdasarkan kenyataan yang ada dan pengamatan kami, yang bersangkutan adalah warga yang tergolong dalam <b>kategori kurang mampu / tidak mampu secara ekonomi</b> dan benar-benar membutuhkan bantuan.</p>
        <p>Surat Keterangan Tidak Mampu ini dibuat untuk keperluan: <b>${keperluan}</b></p>
        <p>Demikian surat keterangan ini kami buat dengan sebenarnya, untuk dapat digunakan sebagaimana mestinya. Apabila dikemudian hari pernyataan ini tidak benar, maka kami bersedia mempertanggungjawabkannya.</p>
      `
    };
  }

  if (kode === 'SKDU') {
    let namaUsaha = extra.nama_usaha || extra.namaUsaha || extra.catatan || '-';
    let jenisUsaha = extra.jenis_usaha || extra.jenisUsaha || '-';
    return {
      judul: 'SURAT KETERANGAN DOMISILI USAHA',
      nomorKode: 'SKDU',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Yang bersangkutan benar-benar adalah warga RT 05 / RW 01 yang berdomisili di alamat tersebut di atas, dan telah menjalankan usaha dengan keterangan sebagai berikut:</p>
        <table class="table-data">
          <tr><td class="label">Nama Usaha</td><td width="10">:</td><td><b>${namaUsaha}</b></td></tr>
          <tr><td class="label">Jenis Usaha</td><td>:</td><td>${jenisUsaha}</td></tr>
          <tr><td class="label">Lokasi Usaha</td><td>:</td><td>${alamatWarga}</td></tr>
        </table>
        <p>Demikian Surat Keterangan Domisili Usaha ini kami buat dengan sebenarnya, untuk keperluan pengurusan izin usaha yang berlaku.</p>
      `
    };
  }

  if (kode === 'PINDAH') {
    let alamatBaru = extra.alamat_baru || extra.alamatBaru || extra.catatan || '-';
    return {
      judul: 'SURAT KETERANGAN PINDAH DOMISILI',
      nomorKode: 'PINDAH',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 01 yang berdomisili di alamat tersebut di atas. Yang bersangkutan menyatakan akan <b>pindah domisili/tempat tinggal</b> ke alamat:</p>
        <table class="table-data">
          <tr><td class="label">Alamat Baru</td><td width="10">:</td><td><b>${alamatBaru}</b></td></tr>
        </table>
        <p>Demikian Surat Keterangan Pindah Domisili ini kami buat dengan sebenarnya untuk digunakan sebagaimana mestinya dalam keperluan administrasi kependudukan.</p>
      `
    };
  }

  if (kode === 'NIKAH') {
    let statusNikah = extra.status_nikah || extra.statusNikah || extra.catatan || 'Belum Menikah';
    return {
      judul: 'SURAT PENGANTAR NIKAH',
      nomorKode: 'NIKAH',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 01 yang berdomisili di alamat tersebut di atas, dan berdasarkan catatan administrasi lingkungan kami, yang bersangkutan berstatus: <b>${statusNikah}</b>.</p>
        <p>Surat pengantar ini dibuat untuk keperluan <b>pengurusan pernikahan / akad nikah</b> di Kantor Urusan Agama (KUA) setempat.</p>
        <p>Demikian surat pengantar ini kami buat dengan sebenarnya untuk digunakan sebagaimana mestinya.</p>
      `
    };
  }

  if (kode === 'AHLI_WARIS') {
    let namaAlmarhum = extra.nama_almarhum || extra.namaAlmarhum || '-';
    let tglMeninggal = extra.tgl_meninggal || extra.tglMeninggal || '-';
    let daftarWaris = extra.daftar_waris || extra.catatan || '-';
    return {
      judul: 'SURAT KETERANGAN AHLI WARIS',
      nomorKode: 'AW',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 01. Yang bersangkutan merupakan ahli waris sah dari almarhum/almarhumah:</p>
        <table class="table-data">
          <tr><td class="label">Nama Almarhum/ah</td><td width="10">:</td><td><b>${namaAlmarhum}</b></td></tr>
          <tr><td class="label">Tanggal Meninggal</td><td>:</td><td>${tglMeninggal}</td></tr>
          <tr><td class="label">Keterangan Waris</td><td>:</td><td>${daftarWaris}</td></tr>
        </table>
        <p>Demikian Surat Keterangan Ahli Waris ini kami buat dengan sebenarnya untuk keperluan pengurusan administrasi harta peninggalan.</p>
      `
    };
  }

  if (kode === 'IZIN') {
    let namaAcara  = extra.nama_acara  || extra.namaAcara  || extra.catatan || '-';
    let tglAcara   = extra.tgl_acara   || extra.tglAcara   || tanggalSurat  || '-';
    let jamMulai   = extra.jam_mulai   || extra.jamMulai   || '-';
    let jamSelesai = extra.jam_selesai || extra.jamSelesai || '-';
    return {
      judul: 'SURAT KETERANGAN IZIN KERAMAIAN',
      nomorKode: 'IZIN',
      isi: `
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 01, menerangkan bahwa:</p>
        ${dataWargaTable}
        <p>Telah mengajukan permohonan izin untuk menyelenggarakan kegiatan/acara dengan rincian sebagai berikut:</p>
        <table class="table-data">
          <tr><td class="label">Nama / Jenis Acara</td><td width="10">:</td><td><b>${namaAcara}</b></td></tr>
          <tr><td class="label">Lokasi Acara</td><td>:</td><td>${alamatWarga}</td></tr>
          <tr><td class="label">Tanggal Acara</td><td>:</td><td>${tglAcara}</td></tr>
          <tr><td class="label">Waktu</td><td>:</td><td>${jamMulai} s/d ${jamSelesai}</td></tr>
        </table>
        <p>Kami selaku pengurus RT menyatakan <b>tidak keberatan</b> dengan penyelenggaraan kegiatan tersebut, dengan ketentuan tidak mengganggu ketertiban umum dan lingkungan sekitar.</p>
        <p>Demikian surat keterangan izin ini dibuat untuk digunakan sebagaimana mestinya.</p>
      `
    };
  }

  // DEFAULT: Surat Pengantar Umum (SP)
  let cleanKeterangan = extra.catatan || extra.keperluan || (typeof keterangan === 'string' && !keterangan.trim().startsWith('{') ? keterangan : '-');
  return {
    judul: 'SURAT PENGANTAR',
    nomorKode: 'SP',
    isi: `
      <p>Yang bertanda tangan di bawah ini Pengurus Rukun Tetangga (RT) 05, menerangkan dengan sebenarnya bahwa:</p>
      ${dataWargaTable}
      <table class="table-data">
        <tr><td class="label">Keperluan / Jenis Surat</td><td width="10">:</td><td><b>${cleanJenis}</b></td></tr>
        <tr><td class="label">Keterangan Tambahan</td><td>:</td><td>${cleanKeterangan}</td></tr>
        <tr><td class="label">Tanggal Pengajuan</td><td>:</td><td>${tanggalSurat}</td></tr>
      </table>
      <p>Demikian Surat Pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
    `
  };
}

window.renderExtraSuratFields = function(selectedJenis, existingVal = {}) {
  let container = document.getElementById('extra-surat-fields-container');
  if (!container) return;
  
  if (!selectedJenis) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  
  let kode = typeof getKodeSurat === 'function' ? getKodeSurat(selectedJenis) : '';
  container.style.display = 'block';
  
  let html = `<div class="mb-2"><h6 class="font-bold text-xs text-primary mb-1"><i class="bi bi-file-earmark-plus-fill me-1"></i> Data Khusus ${selectedJenis}</h6><small class="text-muted text-[10px]">Isi data spesifik di bawah ini untuk dicetak pada dokumen PDF.</small></div>`;
  
  if (kode === 'IZIN') {
    html += `
      <div class="row g-2">
        <div class="col-12 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Nama / Jenis Acara <span class="text-danger">*</span></label>
          <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="nama_acara" value="${existingVal.nama_acara || ''}" placeholder="Contoh: Hajatan Pernikahan / Syukuran / Pentas Seni">
        </div>
        <div class="col-12 col-md-6 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Tanggal Acara Pelaksanaan <span class="text-danger">*</span></label>
          <input type="date" class="form-control form-control-sm extra-surat-input" data-extra-key="tgl_acara" value="${existingVal.tgl_acara || ''}">
        </div>
        <div class="col-6 col-md-3 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Jam Mulai</label>
          <input type="time" class="form-control form-control-sm extra-surat-input" data-extra-key="jam_mulai" value="${existingVal.jam_mulai || ''}">
        </div>
        <div class="col-6 col-md-3 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Jam Selesai</label>
          <input type="time" class="form-control form-control-sm extra-surat-input" data-extra-key="jam_selesai" value="${existingVal.jam_selesai || ''}">
        </div>
      </div>`;
  } else if (kode === 'SKDU') {
    html += `
      <div class="row g-2">
        <div class="col-12 col-md-6 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Nama Usaha / Toko <span class="text-danger">*</span></label>
          <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="nama_usaha" value="${existingVal.nama_usaha || ''}" placeholder="Contoh: Toko Berkah Jaya">
        </div>
        <div class="col-12 col-md-6 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Jenis Usaha / Bidang <span class="text-danger">*</span></label>
          <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="jenis_usaha" value="${existingVal.jenis_usaha || ''}" placeholder="Contoh: Sembako / Kuliner / Konveksi">
        </div>
      </div>`;
  } else if (kode === 'SKTM') {
    html += `
      <div class="mb-1">
        <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Keperluan Pengurusan SKTM <span class="text-danger">*</span></label>
        <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="keperluan" value="${existingVal.keperluan || ''}" placeholder="Contoh: Beasiswa Sekolah / Keringanan Biaya RS / BPJS">
      </div>`;
  } else if (kode === 'PINDAH') {
    html += `
      <div class="mb-1">
        <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Alamat Tujuan Pindah Lengkap <span class="text-danger">*</span></label>
        <textarea class="form-control form-control-sm extra-surat-input" data-extra-key="alamat_baru" rows="2" placeholder="Masukkan alamat lengkap tujuan pindah (RT, RW, Desa/Kel, Kec, Kab/Kota)...">${existingVal.alamat_baru || ''}</textarea>
      </div>`;
  } else if (kode === 'NIKAH') {
    html += `
      <div class="mb-1">
        <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Status Perkawinan Saat Ini <span class="text-danger">*</span></label>
        <select class="form-select form-select-sm extra-surat-input" data-extra-key="status_nikah">
          <option value="Belum Menikah" ${(existingVal.status_nikah || '') === 'Belum Menikah' ? 'selected' : ''}>Belum Menikah</option>
          <option value="Duda" ${(existingVal.status_nikah || '') === 'Duda' ? 'selected' : ''}>Duda</option>
          <option value="Janda" ${(existingVal.status_nikah || '') === 'Janda' ? 'selected' : ''}>Janda</option>
        </select>
      </div>`;
  } else if (kode === 'AHLI_WARIS') {
    html += `
      <div class="row g-2">
        <div class="col-12 col-md-6 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Nama Almarhum / Almarhumah <span class="text-danger">*</span></label>
          <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="nama_almarhum" value="${existingVal.nama_almarhum || ''}" placeholder="Nama lengkap almarhum">
        </div>
        <div class="col-12 col-md-6 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Tanggal Meninggal Dunia</label>
          <input type="date" class="form-control form-control-sm extra-surat-input" data-extra-key="tgl_meninggal" value="${existingVal.tgl_meninggal || ''}">
        </div>
        <div class="col-12 mb-1">
          <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Keterangan / Daftar Ahli Waris</label>
          <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="daftar_waris" value="${existingVal.daftar_waris || ''}" placeholder="Contoh: Memiliki 3 orang anak kandung">
        </div>
      </div>`;
  } else if (kode === 'SKCK') {
    html += `
      <div class="mb-1">
        <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Keperluan Pengurusan SKCK</label>
        <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="keperluan" value="${existingVal.keperluan || ''}" placeholder="Contoh: Persyaratan Melamar Pekerjaan / CPNS">
      </div>`;
  } else {
    html += `
      <div class="mb-1">
        <label class="form-label text-[11px] font-semibold text-gray-700 mb-0">Keterangan / Catatan Tambahan</label>
        <input type="text" class="form-control form-control-sm extra-surat-input" data-extra-key="catatan" value="${existingVal.catatan || ''}" placeholder="Keterangan tambahan jika ada...">
      </div>`;
  }

  container.innerHTML = html;
};

