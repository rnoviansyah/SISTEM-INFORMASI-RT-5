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
  let found = JENIS_SURAT_LIST.find(j => j.value.toLowerCase() === jenisSurat.toLowerCase().trim());
  return found ? found.kode : 'SP';
}

function renderSuratBody(jenisSurat, data) {
  // data: { namaWarga, nikWarga, alamatWarga, keterangan, tanggalSurat }
  let { namaWarga, nikWarga, alamatWarga, keterangan, tanggalSurat } = data;
  let kode = getKodeSurat(jenisSurat);

  // Parse keterangan as JSON for extra fields (optional)
  let extra = {};
  try { extra = JSON.parse(keterangan); } catch(e) { extra = { catatan: keterangan || '' }; }

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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 06 yang berdomisili di alamat tersebut di atas. Surat pengantar ini dibuat untuk keperluan <b>pengurusan Surat Keterangan Catatan Kepolisian (SKCK)</b> di Kepolisian Sektor (Polsek) setempat.</p>
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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan dengan sesungguhnya bahwa:</p>
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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Yang bersangkutan benar-benar adalah warga RT 05 / RW 06 yang berdomisili di alamat tersebut di atas, dan telah menjalankan usaha dengan keterangan sebagai berikut:</p>
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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 06 yang berdomisili di alamat tersebut di atas. Yang bersangkutan menyatakan akan <b>pindah domisili/tempat tinggal</b> ke alamat:</p>
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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 06 yang berdomisili di alamat tersebut di atas, dan berdasarkan catatan administrasi lingkungan kami, yang bersangkutan berstatus: <b>${statusNikah}</b>.</p>
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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan dengan sesungguhnya bahwa:</p>
        ${dataWargaTable}
        <p>Adalah benar warga RT 05 / RW 06. Yang bersangkutan merupakan ahli waris sah dari almarhum/almarhumah:</p>
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
        <p>Yang bertanda tangan di bawah ini, Ketua Rukun Tetangga (RT) 05 / RW 06, menerangkan bahwa:</p>
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
  return {
    judul: 'SURAT PENGANTAR',
    nomorKode: 'SP',
    isi: `
      <p>Yang bertanda tangan di bawah ini Pengurus Rukun Tetangga (RT) 05, menerangkan dengan sebenarnya bahwa:</p>
      ${dataWargaTable}
      <table class="table-data">
        <tr><td class="label">Keperluan / Jenis Surat</td><td width="10">:</td><td><b>${jenisSurat}</b></td></tr>
        <tr><td class="label">Keterangan Tambahan</td><td>:</td><td>${keterangan}</td></tr>
        <tr><td class="label">Tanggal Pengajuan</td><td>:</td><td>${tanggalSurat}</td></tr>
      </table>
      <p>Demikian Surat Pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
    `
  };
}
