// ============================================================
// surat.js
// Surat Pengantar — dirender oleh TableRenderer GENERIK (table_renderer.js).
// Konfigurasi tampilan ada di TableRenderer.configs['SuratPengantar'].
// Logika cetak PDF surat tetap di sini.
// ============================================================

async function loadSuratView() {
  currentActiveMenu = 'SuratPengantar';
  syncActiveNav('SuratPengantar');
  document.getElementById('page-title').innerText = 'Surat Pengantar';
  document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat surat pengantar...</small></div>';
  document.getElementById('rek-info').style.display = 'none';
  const res = await callRpcGet('getTableData', { sheetName: 'SuratPengantar' });
  if (res) {
    currentHeaders = res.headers || [];
    currentRows = res.rows || [];
    TableRenderer.render('SuratPengantar', res);
  }
}
window.loadSuratView = loadSuratView;
const originalLoadMenuSurat = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'SuratPengantar' || menu === 'Surat') {
    loadSuratView();
  } else {
    if (typeof originalLoadMenuSurat === 'function') originalLoadMenuSurat(menu);
  }
};

function cetakPDFSuratPengantar(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let row = currentRows.find(r => r[idIdx] === id);
  if (!row) return;

  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let nikIdx = headers.findIndex(h => h.includes('nik'));
  let alamatIdx = headers.findIndex(h => h.includes('alamat'));
  let jenisIdx = headers.findIndex(h => h.includes('jenis') || h.includes('perihal') || h.includes('keperluan') || h.includes('surat'));
  let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('waktu'));
  let rtIdx = headers.findIndex(h => h.includes('rt'));
  let ketIdx = headers.indexOf('keterangan');
  if (ketIdx === -1) ketIdx = headers.findIndex(h => h.includes('keterangan') && !h.includes('admin'));
  if (ketIdx === -1) ketIdx = headers.findIndex(h => h.includes('catatan') || h.includes('ket'));

  let statusIdx = headers.findIndex(h => h === 'status' || h.includes('status'));
  let statusSurat = statusIdx > -1 ? (row[statusIdx] || '') : '';
  let statusClean = String(statusSurat || '').toLowerCase().trim();
  let isSelesai = ['selesai', 'diterima', 'approved', 'disetujui'].includes(statusClean) || statusClean.includes('selesai') || statusClean.includes('terima') || statusClean.includes('setuju');

  let namaWarga = '-';
  let nikWarga = '-';
  let alamatWarga = '-';
  let jenisSurat = 'Surat Pengantar';
  let tanggalSurat = '-';
  namaWarga = namaIdx > -1 ? (row[namaIdx] || '-') : '-';
  nikWarga = nikIdx > -1 ? (row[nikIdx] || '-') : '-';
  alamatWarga = alamatIdx > -1 ? (row[alamatIdx] || '-') : '-';
  jenisSurat = jenisIdx > -1 ? (row[jenisIdx] || 'Surat Pengantar') : 'Surat Pengantar';
  tanggalSurat = tglIdx > -1 ? (row[tglIdx] || '-') : '-';

  let keterangan = ketIdx > -1 ? (row[ketIdx] || '-') : '-';
  let ttdPemohon = '';
  let namaPemohon = namaWarga;
  let ttdIdx = headers.findIndex(h => h.includes('ttd_pemohon') || h.includes('tanda_tangan'));
  if (ttdIdx > -1) ttdPemohon = row[ttdIdx] || '';
  if (!ttdPemohon && typeof getTTDPemohon === 'function') {
    ttdPemohon = getTTDPemohon() || '';
  }

  let cfg = (typeof appSettings !== 'undefined' && appSettings) ? appSettings : {};
  let titleApp = cfg.app_title || 'SISTEM INFORMASI RT';
  let rtRwText = cfg.rt_rw_text || 'RT 05 / RW 01';
  let kelurahanText = cfg.nama_kelurahan || 'Kelurahan Palmerah, Kota Jakarta Barat';
  let alamatRtText = cfg.alamat_rt || '';
  let logoUrl = cfg.app_logo || './img/logo.webp';
  let namaSekretaris = cfg.nama_sekretaris || cfg.sekretaris || 'Sekretaris RT';
  let namaKetuaRt = cfg.nama_rt_ketua || cfg.nama_ketua_rt || cfg.nama_rt || 'Ketua RT';

  // Tanda tangan & Nama Pengurus RT ditampilkan jika status surat sudah Selesai/Diterima
  let ttdSekretaris = (isSelesai && (cfg.ttd_sekretaris || cfg.ttd_sekretaris_rt)) ? (cfg.ttd_sekretaris || cfg.ttd_sekretaris_rt) : '';
  let ttdKetuaRt = (isSelesai && (cfg.ttd_ketua_rt || cfg.ttd_rt_ketua || cfg.ttd_rt)) ? (cfg.ttd_ketua_rt || cfg.ttd_rt_ketua || cfg.ttd_rt) : '';

  let suratDataPayload = { namaWarga, nikWarga, alamatWarga, keterangan, tanggalSurat };
  let suratContent = (typeof renderSuratBody === 'function')
    ? renderSuratBody(jenisSurat, suratDataPayload)
    : {
        judul: 'SURAT PENGANTAR',
        nomorKode: 'SP',
        isi: `
          <p>Yang bertanda tangan di bawah ini Pengurus ${rtRwText}, menerangkan dengan sebenarnya bahwa:</p>
          <table class="table-data">
            <tr><td class="label">Nama Lengkap</td><td width="10">:</td><td><b>${namaWarga}</b></td></tr>
            <tr><td class="label">NIK</td><td>:</td><td>${nikWarga}</td></tr>
            <tr><td class="label">Alamat / No. Rumah</td><td>:</td><td>${alamatWarga}</td></tr>
            <tr><td class="label">Keperluan / Jenis Surat</td><td>:</td><td><b>${jenisSurat}</b></td></tr>
            <tr><td class="label">Keterangan Tambahan</td><td>:</td><td>${keterangan}</td></tr>
            <tr><td class="label">Tanggal Pengajuan</td><td>:</td><td>${tanggalSurat}</td></tr>
          </table>
          <p>Demikian Surat Pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
        `
      };

  let todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

  let printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${suratContent.judul} - ${namaWarga}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm 15mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; margin: 0; padding: 10px; font-size: 11pt; line-height: 1.35; }
        .kop-surat { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; }
        .kop-logo { width: 70px; height: 70px; object-fit: contain; margin-right: 15px; }
        .kop-text { flex: 1; text-align: center; }
        .kop-text h2 { margin: 0; font-size: 13.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .kop-text h3 { margin: 1px 0; font-size: 11.5pt; font-weight: bold; text-transform: uppercase; }
        .kop-text p { margin: 0; font-size: 9pt; font-style: italic; }
        
        .surat-title { text-align: center; margin-bottom: 14px; }
        .surat-title h4 { margin: 0; font-size: 13pt; text-decoration: underline; text-transform: uppercase; font-weight: bold; }
        .surat-title p { margin: 2px 0 0 0; font-size: 10pt; }
        
        .content { margin-bottom: 14px; text-align: justify; }
        .table-data { width: 100%; margin: 6px 0 8px 10px; border-collapse: collapse; }
        .table-data td { padding: 2px 6px; vertical-align: top; font-size: 10.5pt; }
        .table-data td.label { width: 160px; }
        
        .ttd-section { width: 100%; margin-top: 15px; border-collapse: collapse; page-break-inside: avoid; }
        .ttd-section td { width: 50%; text-align: center; vertical-align: top; padding: 0 8px; font-size: 10.5pt; }
        .ttd-space { height: 50px; display: flex; align-items: center; justify-content: center; }
        .ttd-nama { font-weight: bold; text-decoration: underline; }
        
        @media print {
          @page { size: A4 portrait; margin: 10mm 15mm; }
          html, body { width: 100%; margin: 0; padding: 0 !important; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 15px; text-align: right;">
        <button onclick="window.print()" style="background: #1e3a8a; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">🖨️ Cetak / Simpan PDF</button>
      </div>

      <div class="kop-surat">
        <img src="${logoUrl}" class="kop-logo" alt="Logo RT">
        <div class="kop-text">
          <h2>PENGURUS ${rtRwText.toUpperCase()}</h2>
          <h3>${titleApp}</h3>
          <p>${alamatRtText ? alamatRtText + ' • ' : ''}${kelurahanText}</p>
        </div>
      </div>

      <div class="surat-title">
        <h4>${suratContent.judul}</h4>
        <p>Nomor: ${id} / ${suratContent.nomorKode || 'SP'} / ${rtRwText.replace(/\s+/g, '')} / ${new Date().getFullYear()}</p>
      </div>

      <div class="content">
        ${suratContent.isi}
      </div>

      <!-- Tanda Tangan Pemohon -->
      ${ttdPemohon ? `
      <div style="margin: 12px 0 8px 0; page-break-inside: avoid;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <p style="font-size: 10.5pt; margin: 0 0 3px 0;">Yang bertanda tangan / menyetujui,<br><b>Pemohon</b></p>
              <div style="height: 55px; display: flex; align-items: center; justify-content: flex-start; padding: 2px 0;">
                <img src="${ttdPemohon}" style="max-height: 50px; max-width: 160px; object-fit: contain;" alt="TTD Pemohon">
              </div>
              <p style="font-weight: bold; text-decoration: underline; font-size: 10.5pt; margin: 0;">( ${namaPemohon} )</p>
            </td>
            <td style="width: 50%; vertical-align: top;"></td>
          </tr>
        </table>
      </div>
      <hr style="border: none; border-top: 1px dashed #ccc; margin: 8px 0;">` : ''}

      ${!isSelesai ? `<div style="text-align:center; margin: 10px 0; padding: 6px 10px; border: 2px dashed #f59e0b; border-radius: 8px; background: #fffbeb;">
        <p style="color:#b45309; font-weight:bold; font-size:10pt; margin:0;">⚠️ SURAT INI BELUM DISETUJUI / STATUS: ${statusSurat || 'Belum di verifikasi'}</p>
        <p style="color:#92400e; font-size:8.5pt; margin:2px 0 0 0;">Tanda tangan akan muncul setelah status surat diubah menjadi <b>Selesai</b> atau <b>Diterima</b> oleh RT.</p>
      </div>` : ''}

      <table class="ttd-section">
        <tr>
          <td>
            <p style="margin:0 0 3px 0;">Dibuat oleh:<br><b>Sekretaris ${rtRwText}</b></p>
            <div class="ttd-space">
              ${ttdSekretaris ? `<img src="${ttdSekretaris}" style="max-height: 50px; max-width: 130px; object-fit: contain; margin: 0 auto; display: block;">` : ''}
            </div>
            <p class="ttd-nama" style="margin:0;">( ${namaSekretaris} )</p>
          </td>
          <td>
            <p style="margin:0 0 3px 0;">Tanggal: ${todayStr}<br>Diketahui oleh:<br><b>Ketua ${rtRwText}</b></p>
            <div class="ttd-space">
              ${ttdKetuaRt ? `<img src="${ttdKetuaRt}" style="max-height: 50px; max-width: 130px; object-fit: contain; margin: 0 auto; display: block;">` : ''}
            </div>
            <p class="ttd-nama" style="margin:0;">( ${namaKetuaRt} )</p>
          </td>
        </tr>
      </table>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
