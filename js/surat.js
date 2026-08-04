let rawSuratData = [];
let selectedSuratRow = null;
function renderSuratPengantarCustom(data) {
  rawSuratData = data.rows || [];
  let headers = data.headers.map(h => h.toLowerCase().trim());
  let html = `
    <div class="p-1 text-gray-800 font-sans">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-file-earmark-text-fill me-2 text-primary"></i>Daftar Surat Pengantar</h2>
        ${session.role === 'Warga' ? `
          <button onclick="bukaModalForm()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs shadow transition">
            + Buat Surat Baru
          </button>
        ` : ''}
      </div>
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
              <tr>
                <th class="p-3 text-center">No</th>
                <th class="p-3">ID</th>
                <th class="p-3">Tanggal</th>
                <th class="p-3">Nama Warga</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="surat-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="modal-detail-surat" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative">
        <button onclick="tutupDetailSurat()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-3 border-b pb-2 pe-6">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Surat Pengantar</h3>
        </div>
        <div id="modal-detail-surat-body" class="mb-4 space-y-2 text-xs max-h-[60vh] overflow-y-auto pe-1"></div>
        <div id="surat-action-buttons" class="space-y-2"></div>
        <button onclick="tutupDetailSurat()" class="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;
  document.getElementById('main-content').innerHTML = html;
  filterDataSurat();
  let searchInp = document.getElementById('searchInput');
  if (searchInp) {
    searchInp.onkeyup = function() {
      filterDataSurat();
    };
  }
}
function filterDataSurat() {
  let searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase().trim() : '';
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let namaIdx = headers.findIndex(h => h.includes('nama'));
  let filtered = [...rawSuratData].filter(row => {
    if (!searchVal) return true;
    return row.some(val => String(val || '').toLowerCase().includes(searchVal));
  });
  let tbody = document.getElementById('surat-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-gray-400">Tidak ada data surat pengantar.</td></tr>`;
  } else {
    filtered.forEach((r, i) => {
      let tglIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('waktu'));
      let statusIdx = headers.indexOf('status');
      let statusVal = r[statusIdx] || 'Belum di verifikasi';
      let badgeColor = statusVal.toLowerCase().includes('selesai') || statusVal.toLowerCase().includes('diterima') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
      let btnAksi = session.role === 'RT' 
        ? `<div class="flex gap-1 justify-center">
             <button onclick="event.stopPropagation(); cetakPDFSuratPengantar('${r[idIdx]}')" class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-[11px] font-bold border border-indigo-200" title="Cetak PDF"><i class="bi bi-printer"></i></button>
             <button onclick="event.stopPropagation(); bukaModalEdit('${r[idIdx]}')" class="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[11px] font-bold border border-blue-200">Edit</button>
           </div>`
        : `<div class="flex gap-1 justify-center">
             <button onclick="event.stopPropagation(); cetakPDFSuratPengantar('${r[idIdx]}')" class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-[11px] font-bold border border-indigo-200" title="Cetak PDF"><i class="bi bi-printer"></i></button>
             <button onclick="event.stopPropagation(); waKirimLaporan('surat', '${r[idIdx]}')" class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold border border-emerald-200">WA</button>
           </div>`;
      tbody.innerHTML += `
        <tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailSurat('${r[idIdx]}')">
          <td class="p-3 text-center text-gray-400">${i + 1}</td>
          <td class="p-3 text-[10px] font-mono text-gray-600">${r[idIdx]}</td>
          <td class="p-3 font-medium">${r[tglIdx] || '-'}</td>
          <td class="p-3 font-medium text-gray-800">${r[namaIdx] || '-'}</td>
          <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${statusVal}</span></td>
          <td class="p-3 text-center">${btnAksi}</td>
        </tr>`;
    });
  }
}
function cetakPDFSuratPengantar(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let row = rawSuratData.find(r => r[idIdx] === id) || selectedSuratRow;
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
  let isSelesai = ['selesai', 'diterima', 'approved', 'disetujui'].includes(statusSurat.toLowerCase().trim());

  let namaWarga = namaIdx > -1 ? (row[namaIdx] || '-') : '-';
  let nikWarga = nikIdx > -1 ? (row[nikIdx] || '-') : '-';
  let alamatWarga = alamatIdx > -1 ? (row[alamatIdx] || '-') : '-';
  let jenisSurat = jenisIdx > -1 ? (row[jenisIdx] || 'Surat Pengantar') : 'Surat Pengantar';
  let tanggalSurat = tglIdx > -1 ? (row[tglIdx] || '-') : '-';
  let rtWarga = rtIdx > -1 ? (row[rtIdx] || '05') : '05';
  
  let keterangan = '-';
  if (Array.isArray(row)) {
    keterangan = ketIdx > -1 ? (row[ketIdx] || '-') : '-';
  } else if (typeof row === 'object') {
    keterangan = row.keterangan || row.Keterangan || row.KETERANGAN || (ketIdx > -1 ? row[headers[ketIdx]] : '-');
  }

  let titleApp = (typeof appSettings !== 'undefined' && appSettings.app_title) ? appSettings.app_title : 'SISTEM INFORMASI RT 5';
  let logoUrl = (typeof appSettings !== 'undefined' && appSettings.app_logo) ? appSettings.app_logo : './img/logo.webp';
  let namaSekretaris = (typeof appSettings !== 'undefined' && appSettings.nama_sekretaris) ? appSettings.nama_sekretaris : 'Sekretaris RT 05';
  let namaKetuaRt = (typeof appSettings !== 'undefined' && appSettings.nama_rt_ketua) ? appSettings.nama_rt_ketua : 'Ketua RT 05';

  // Tanda tangan hanya ditampilkan jika status surat sudah Selesai/Diterima
  let ttdSekretaris = (isSelesai && typeof appSettings !== 'undefined' && appSettings.ttd_sekretaris) ? appSettings.ttd_sekretaris : '';
  let ttdKetuaRt = (isSelesai && typeof appSettings !== 'undefined' && appSettings.ttd_ketua_rt) ? appSettings.ttd_ketua_rt : '';

  let suratDataPayload = { namaWarga, nikWarga, alamatWarga, keterangan, tanggalSurat };
  let suratContent = (typeof renderSuratBody === 'function') 
    ? renderSuratBody(jenisSurat, suratDataPayload)
    : {
        judul: 'SURAT PENGANTAR',
        nomorKode: 'SP',
        isi: `
          <p>Yang bertanda tangan di bawah ini Pengurus Rukun Tetangga (RT) 05, menerangkan dengan sebenarnya bahwa:</p>
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

  let todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  let printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${suratContent.judul} - ${namaWarga}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; background: #fff; margin: 0; padding: 20px; font-size: 12pt; line-height: 1.5; }
        .kop-surat { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 25px; }
        .kop-logo { width: 85px; height: 85px; object-fit: contain; margin-right: 20px; }
        .kop-text { flex: 1; text-align: center; }
        .kop-text h2 { margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .kop-text h3 { margin: 2px 0; font-size: 13pt; font-weight: bold; text-transform: uppercase; }
        .kop-text p { margin: 0; font-size: 10pt; font-style: italic; }
        
        .surat-title { text-align: center; margin-bottom: 25px; }
        .surat-title h4 { margin: 0; font-size: 14pt; text-decoration: underline; text-transform: uppercase; font-weight: bold; }
        .surat-title p { margin: 3px 0 0 0; font-size: 11pt; }
        
        .content { margin-bottom: 30px; text-align: justify; }
        .table-data { width: 100%; margin: 12px 0 15px 15px; border-collapse: collapse; }
        .table-data td { padding: 4px 8px; vertical-align: top; font-size: 11pt; }
        .table-data td.label { width: 180px; }
        
        .ttd-section { width: 100%; margin-top: 40px; border-collapse: collapse; page-break-inside: avoid; }
        .ttd-section td { width: 50%; text-align: center; vertical-align: top; padding: 0 10px; font-size: 11pt; }
        .ttd-space { height: 75px; display: flex; align-items: center; justify-content: center; }
        .ttd-nama { font-weight: bold; text-decoration: underline; }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #1e3a8a; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">🖨️ Cetak / Simpan PDF</button>
      </div>

      <div class="kop-surat">
        <img src="${logoUrl}" class="kop-logo" alt="Logo RT">
        <div class="kop-text">
          <h2>PENGURUS RUKUN TETANGGA 05 / RW 06</h2>
          <h3>${titleApp}</h3>
          <p>Sistem Layanan & Informasi Warga Digital - Modern, Transparan & Efisien</p>
        </div>
      </div>

      <div class="surat-title">
        <h4>${suratContent.judul}</h4>
        <p>Nomor: ${id} / ${suratContent.nomorKode || 'SP'} / RT.05 / ${new Date().getFullYear()}</p>
      </div>

      <div class="content">
        ${suratContent.isi}
      </div>

      ${!isSelesai ? `<div style="text-align:center; margin: 20px 0; padding: 10px; border: 2px dashed #f59e0b; border-radius: 8px; background: #fffbeb;">
        <p style="color:#b45309; font-weight:bold; font-size:11pt; margin:0;">⚠️ SURAT INI BELUM DISETUJUI / STATUS: ${statusSurat || 'Belum di verifikasi'}</p>
        <p style="color:#92400e; font-size:9pt; margin:4px 0 0 0;">Tanda tangan akan muncul setelah status surat diubah menjadi <b>Selesai</b> atau <b>Diterima</b> oleh RT.</p>
      </div>` : ''}

      <table class="ttd-section">
        <tr>
          <td>
            <p>Dibuat oleh:<br><b>Sekretaris RT 05</b></p>
            <div class="ttd-space">
              ${ttdSekretaris ? `<img src="${ttdSekretaris}" style="max-height: 70px; max-width: 150px; object-fit: contain; margin: 0 auto; display: block;">` : ''}
            </div>
            <p class="ttd-nama">( ${namaSekretaris} )</p>
          </td>
          <td>
            <p>Tanggal: ${todayStr}<br>Diketahui oleh:<br><b>Ketua RT 05</b></p>
            <div class="ttd-space">
              ${ttdKetuaRt ? `<img src="${ttdKetuaRt}" style="max-height: 70px; max-width: 150px; object-fit: contain; margin: 0 auto; display: block;">` : ''}
            </div>
            <p class="ttd-nama">( ${namaKetuaRt} )</p>
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
function showDetailSurat(id) {
  let headers = currentHeaders.map(h => h.toLowerCase().trim());
  let idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  let row = rawSuratData.find(r => r[idIdx] === id);
  if (!row) return;
  selectedSuratRow = row;
  let fotoIdx = headers.findIndex(h => h.includes('foto') || h.includes('bukti'));
  let fotoUrl = row[fotoIdx] || '';
  let noHpIdx = headers.findIndex(h => h.includes('hp') || h.includes('wa') || h.includes('telp') || h.includes('nomor'));
  let noHpWarga = noHpIdx > -1 ? row[noHpIdx] : '';
  let fotoDirectUrl = (typeof convertToImageLink === 'function') ? convertToImageLink(fotoUrl) : fotoUrl;
  let hasFoto = (fotoUrl && fotoUrl !== '-' && fotoUrl !== '***Rahasia***');
  let imgHtml = `
    <div class="text-center mb-3 p-3 bg-gray-50 rounded-2xl border shadow-sm">
      <p class="text-[10px] text-gray-400 font-bold uppercase mb-2">Bukti Lampiran Foto Surat:</p>
      ${hasFoto 
        ? `<img src="${fotoDirectUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-32 h-32 object-cover mx-auto rounded-2xl border shadow cursor-pointer hover:opacity-90 transition">
           <small class="text-[9px] text-blue-600 block mt-1.5 font-bold"><i class="bi bi-zoom-in me-1"></i>Klik foto untuk memperbesar</small>`
        : `<div class="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner"><i class="bi bi-file-image"></i></div>
           <small class="text-[10px] text-gray-400 block mt-1">Belum ada lampiran foto</small>`
      }
    </div>`;
  let detailHtml = imgHtml;
  currentHeaders.forEach((h, idx) => {
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti') || hLower === 'id' || hLower === 'no') return;
    let valStr = String(row[idx] || '-');
    let formattedVal = valStr;
    if (valStr.includes('|')) {
      let parts = valStr.split('|');
      let mainText = parts[0];
      let jsonPart = parts.slice(1).join('|');
      try {
        let parsed = JSON.parse(jsonPart);
        formattedVal = `<b>${mainText}</b>` + Object.entries(parsed).map(([k, v]) => `<div class="mt-0.5 text-[11px]"><span class="text-gray-500 font-bold">${k.replace(/_/g, ' ').toUpperCase()}:</span> ${v}</div>`).join('');
      } catch(e) {
        formattedVal = mainText;
      }
    } else if (valStr.trim().startsWith('{') && valStr.trim().endsWith('}')) {
      try {
        let parsed = JSON.parse(valStr);
        formattedVal = Object.entries(parsed).map(([k, v]) => `<div class="mt-0.5 text-[11px]"><span class="text-gray-500 font-bold">${k.replace(/_/g, ' ').toUpperCase()}:</span> ${v}</div>`).join('');
      } catch(e) {}
    }
    detailHtml += `
      <div class="border-b pb-1">
        <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
        <p class="font-semibold text-gray-800">${formattedVal}</p>
      </div>`;
  });
  document.getElementById('modal-detail-surat-body').innerHTML = detailHtml;
  let actionHtml = '';
  if (session.role === 'RT') {
    actionHtml = `
      <button onclick="cetakPDFSuratPengantar('${id}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2"><i class="bi bi-printer-fill me-1"></i> Cetak PDF Surat</button>
      <button onclick="bukaModalEdit('${id}'); tutupDetailSurat();" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2">Edit / Ubah Status</button>
      <button onclick="waKirimLaporanKeWarga('${id}', '${noHpWarga}'); tutupDetailSurat();" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim Laporan (WA)</button>`;
  } else {
    actionHtml = `
      <button onclick="cetakPDFSuratPengantar('${id}')" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm mb-2"><i class="bi bi-printer-fill me-1"></i> Cetak PDF Surat</button>
      <button onclick="waKirimLaporan('surat', '${id}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-sm">Kirim via WhatsApp</button>`;
  }
  document.getElementById('surat-action-buttons').innerHTML = actionHtml;
  document.getElementById('modal-detail-surat').classList.remove('hidden');
}
function tutupDetailSurat() {
  document.getElementById('modal-detail-surat').classList.add('hidden');
}
const originalLoadMenuSurat = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'SuratPengantar') {
    currentActiveMenu = menu;
    syncActiveNav(menu);
    document.getElementById('page-title').innerText = 'Surat Pengantar';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat surat pengantar...</small></div>';
    document.getElementById('rek-info').style.display = 'none';
    const res = await callGASGet('getTableData', { sheetName: 'SuratPengantar' });
    if (res) {
      currentHeaders = res.headers || [];
      currentRows = res.rows || [];
      renderSuratPengantarCustom(res);
    }
  } else {
    if (typeof originalLoadMenuSurat === 'function') originalLoadMenuSurat(menu);
  }
};
