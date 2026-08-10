let rawKeluargaData = [];
let profilHeaders = [];

function renderProfilCustom(res) {
  let pribadi = res.pribadi || {};
  let keluarga = res.keluarga || [];
  profilHeaders = res.headers || [];
  rawKeluargaData = keluarga;
  let pribadiHtml = '';
  
  profilHeaders.forEach(h => {
    let labelText = h.replace(/_/g, ' ').toUpperCase();
    let val = pribadi[h] || '-';
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti')) {
      pribadiHtml += `
        <div class="border-b pb-2">
          <p class="text-[10px] text-gray-400 font-bold uppercase">${labelText}</p>
          ${val !== '-' ? `<img src="${val}" onclick="bukaPopUpFoto('${val}')" class="w-16 h-16 object-cover rounded-xl border cursor-pointer mt-1 shadow-sm">` : '-'}
        </div>`;
    } else {
      pribadiHtml += `
        <div class="border-b pb-2">
          <p class="text-[10px] text-gray-400 font-bold uppercase">${labelText}</p>
          <p class="font-semibold text-gray-800">${val}</p>
        </div>`;
    }
  });

  // ============================================================
  // NOTIFIKASI BUTTON - TAMBAHKAN INI!
  // ============================================================
  let notifStatusText = 'Klik tombol untuk mengaktifkan';
  let notifStatusColor = 'text-gray-400';
  let notifIcon = 'bi-info-circle';
  
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      notifStatusText = 'Notifikasi aktif ✅';
      notifStatusColor = 'text-emerald-600';
      notifIcon = 'bi-check-circle-fill';
    } else if (Notification.permission === 'denied') {
      notifStatusText = 'Notifikasi diblokir ❌';
      notifStatusColor = 'text-red-600';
      notifIcon = 'bi-x-circle-fill';
    }
  }

  let notifButtonHtml = `
    <div class="mt-4 pt-3 border-t border-gray-200">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h5 class="font-bold text-xs text-gray-700"><i class="bi bi-bell-fill me-1 text-primary"></i> Notifikasi Push</h5>
          <p class="text-[10px] text-gray-500">Aktifkan notifikasi untuk menerima info terbaru dari RT</p>
        </div>
        <button onclick="mintaIzinNotifikasi()" class="btn btn-primary btn-sm fw-bold py-1.5 px-3 rounded-xl text-xs shadow transition">
          <i class="bi bi-bell-fill me-1"></i> Aktifkan Notifikasi
        </button>
      </div>
      <div id="notif-status" class="text-[10px] mt-1 ${notifStatusColor}">
        <i class="bi ${notifIcon} me-1"></i>
        ${notifStatusText}
      </div>
    </div>
  `;

  // Tambahkan notifButtonHtml ke pribadiHtml
  pribadiHtml += notifButtonHtml;

  let displayHeaders = profilHeaders.filter(h => !['no_kk', 'alamat'].includes(h.toLowerCase().trim()));
  
  let html = `
    <div class="p-1 text-gray-800 font-sans space-y-4">
      <!-- HEADER & TOMBOL KEMBALI -->
      <div class="flex justify-between items-center mb-2">
        <h2 class="font-bold text-base text-gray-800"><i class="bi bi-person-vcard-fill me-2 text-primary"></i>Profil Saya & Keluarga</h2>
        <button onclick="loadMenu('Dashboard')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-xl text-xs transition border flex items-center gap-1 shadow-sm">
          <i class="bi bi-arrow-left"></i> Dashboard
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <!-- CARD DATA PRIBADI -->
        <div class="md:col-span-5 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <h3 class="font-bold text-xs text-blue-600 uppercase tracking-wide border-b pb-2"><i class="bi bi-person-badge me-1"></i> Data Pribadi Anda</h3>
          <div class="space-y-2 text-xs">
            ${pribadiHtml}
          </div>
        </div>
        <!-- CARD ANGGOTA KELUARGA -->
        <div class="md:col-span-7 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div class="flex justify-between items-center mb-3 border-b pb-2">
            <h3 class="font-bold text-xs text-emerald-600 uppercase tracking-wide"><i class="bi bi-houses-fill me-1"></i> Anggota Keluarga (1 KK)</h3>
            <span class="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">${keluarga.length} Orang</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-100/70 text-gray-600 uppercase font-semibold border-b">
                <tr>
                  <th class="p-3 text-center">No</th>
                  ${displayHeaders.map(h => `<th class="p-3 text-nowrap">${h.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="keluarga-table-body">
  `;
  
  if (keluarga.length === 0) {
    html += `<tr><td colspan="${displayHeaders.length + 1}" class="text-center p-4 text-gray-400">Tidak ada anggota keluarga lain dengan No KK yang sama.</td></tr>`;
  } else {
    keluarga.forEach((member, i) => {
      let memberId = member.id || member.nik || i;
      html += `<tr class="border-b hover:bg-blue-50/50 cursor-pointer transition" onclick="showDetailKeluarga('${memberId}')">`;
      html += `<td class="p-3 text-center text-gray-400">${i + 1}</td>`;
      displayHeaders.forEach(h => {
        let val = member[h] || '-';
        if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
          html += `<td class="p-3">${val !== '-' ? `<img src="${val}" class="w-8 h-8 object-cover rounded-lg border shadow-sm" onclick="event.stopPropagation(); bukaPopUpFoto('${val}')">` : '-'}</td>`;
        } else {
          html += `<td class="p-3 font-medium text-gray-800 text-nowrap">${val}</td>`;
        }
      });
      html += `</tr>`;
    });
  }
  
  html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <!-- MODAL DETAIL ANGGOTA KELUARGA -->
    <div id="modal-detail-keluarga" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white p-5 rounded-2xl w-full max-w-sm shadow-2xl relative font-sans">
        <button onclick="tutupDetailKeluarga()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">&times;</button>
        <div class="mb-3 border-b pb-2 pe-6">
          <h3 class="font-bold text-gray-800 text-sm">Rincian Anggota Keluarga</h3>
        </div>
        <div id="modal-detail-keluarga-body" class="mb-4 space-y-2 text-xs max-h-[60vh] overflow-y-auto pe-1"></div>
        <button onclick="tutupDetailKeluarga()" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl text-xs font-bold transition">Tutup</button>
      </div>
    </div>
  `;
  
  document.getElementById('main-content').innerHTML = html;
}

function showDetailKeluarga(identifier) {
  if (!rawKeluargaData) return;
  let member = rawKeluargaData.find(m => (m.id == identifier || m.nik == identifier));
  if (!member) return;
  let detailHtml = '';
  let fotoUrl = '';
  
  profilHeaders.forEach(h => {
    let val = member[h] || '-';
    let hLower = h.toLowerCase().trim();
    if (hLower.includes('foto') || hLower.includes('bukti')) {
      if (val && val !== '-' && val !== '***Rahasia***') {
        fotoUrl = val;
      }
    } else {
      detailHtml += `
        <div class="border-b pb-1">
          <p class="text-[10px] text-gray-400 font-bold uppercase">${h.replace(/_/g, ' ')}</p>
          <p class="font-semibold text-gray-800">${val}</p>
        </div>`;
    }
  });
  
  if (fotoUrl) {
    detailHtml += `
      <div class="mt-2">
        <p class="text-[10px] text-gray-400 font-bold uppercase mb-1">Foto:</p>
        <img src="${fotoUrl}" onclick="bukaPopUpFoto('${fotoUrl}')" class="w-full max-h-40 object-contain rounded-xl border cursor-pointer shadow-sm">
      </div>`;
  }
  
  document.getElementById('modal-detail-keluarga-body').innerHTML = detailHtml;
  document.getElementById('modal-detail-keluarga').classList.remove('hidden');
}

function tutupDetailKeluarga() {
  document.getElementById('modal-detail-keluarga').classList.add('hidden');
}

async function loadProfilView() {
  const res = await callGASGet('getProfileData', { nik: session.nik });
  if (!res) return;
  if (res.status === 'error') {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger text-center my-3">${res.message}</div>`;
    return;
  }
  renderProfilCustom(res);
}

const originalLoadMenuProfil = window.loadMenu;
window.loadMenu = async function(menu) {
  if (menu === 'Profil') {
    currentActiveMenu = menu;
    if (typeof syncActiveNav === 'function') syncActiveNav(menu);
    let titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = 'Profil Saya';
    document.getElementById('main-content').innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br><small class="text-muted mt-2 d-block">Memuat data profil & keluarga...</small></div>';
    if (document.getElementById('rek-info')) document.getElementById('rek-info').style.display = 'none';
    await loadProfilView();
  } else {
    if (typeof originalLoadMenuProfil === 'function') originalLoadMenuProfil(menu);
  }
};