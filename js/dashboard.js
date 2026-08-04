const defaultInfoText = "Halo <b>{NAMA}</b>, selamat datang di Portal Layanan Modern Mandiri SISTEM INFORMASI RT 5. Melalui aplikasi ini kamu bisa memantau kas warga, membuat pengaduan masalah lingkungan secara real-time, mengajukan surat pengantar digital secara instan, serta memverifikasi data sumbangan dengan aman.";
let infoWargaTimer = null;
let dashboardCache = null;
function linkify(text) {
  if (!text) return '';
  let urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, function(url) {
    return `<a href="${url}" target="_blank" class="text-blue-600 underline fw-bold" style="color: #2563eb; text-decoration: underline;" onclick="event.stopPropagation();">${url}</a>`;
  });
}
async function muatInfoWargaRealtime() {
  const teks = await callGASGet('getInfoWarga');
  let el = document.getElementById('infoWargaTextDisplay');
  if (el) {
    let rawText = (typeof teks === 'string') ? teks : (teks && teks.data ? teks.data : '');
    let finalText = (rawText && rawText.trim() !== '') ? rawText : defaultInfoText;
    finalText = finalText.replace(/\{NAMA\}/g, session.nama || 'Warga');
    el.innerHTML = linkify(finalText);
  }
}
async function simpanInfoWarga() {
  let textarea = document.getElementById('editInfoTextarea');
  let textBaru = textarea ? textarea.value : '';
  if (textBaru) {
    let btnSimpan = document.querySelector('#modalEditInfo .btn-primary');
    if (btnSimpan) {
      btnSimpan.innerText = 'Menyimpan...';
      btnSimpan.disabled = true;
    }
    const res = await callGASPost('simpanInfoWarga', { teksBaru: textBaru });
    if (btnSimpan) {
      btnSimpan.innerText = 'Simpan Perubahan';
      btnSimpan.disabled = false;
    }
    if (res && res.status === 'success') {
      alert('Informasi Warga berhasil diperbarui!');
      let modalEl = document.getElementById('modalEditInfo');
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
      }
      setTimeout(() => {
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 300);
      muatInfoWargaRealtime();
    } else {
      alert('Gagal menyimpan: ' + (res ? res.message : 'Respon kosong'));
    }
  }
}
async function bukaModalEditInfo() {
  let modalEl = document.getElementById('modalEditInfo');
  if (!modalEl) return;
  if (modalEl.parentElement !== document.body) {
    document.body.appendChild(modalEl);
  }
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  let textarea = document.getElementById('editInfoTextarea');
  if (textarea) textarea.value = "Memuat data dari database...";
  let modalInstance = bootstrap.Modal.getInstance(modalEl);
  if (modalInstance) {
    modalInstance.dispose();
  }
  modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();
  const teks = await callGASGet('getInfoWarga');
  let rawText = (typeof teks === 'string') ? teks : (teks && teks.data ? teks.data : '');
  if (textarea) {
    textarea.value = (rawText && rawText.trim() !== '') ? rawText : defaultInfoText;
  }
}
async function loadDashboardView() {
  currentActiveMenu = 'Dashboard';
  if (typeof syncActiveNav === 'function') syncActiveNav('Dashboard');
  let titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.innerText = 'Dashboard Utama';
  if (document.getElementById('rek-info')) document.getElementById('rek-info').style.display = 'none';
  let oldModal = document.getElementById('modalEditInfo');
  if (oldModal) oldModal.remove();

  let initialRes = dashboardCache || {
    role: session?.role || 'Warga',
    warga: 0, aduan: 0, keuangan: 0, surat: 0, sumbangan: 0
  };
  renderDashboardLayout(initialRes);
  await fetchFreshDashboardData();
}
async function fetchFreshDashboardData() {
  try {
    const res = await callGASGet('getDashboardSummary');
    if (res && res.status === 'success') {
      dashboardCache = res;
      renderDashboardLayout(res);
    } else if (!dashboardCache) {
      renderDashboardLayout({
        role: session?.role || 'Warga',
        warga: 0, aduan: 0, keuangan: 0, surat: 0, sumbangan: 0
      });
    }
  } catch(e) {
    if (!dashboardCache) {
      renderDashboardLayout({
        role: session?.role || 'Warga',
        warga: 0, aduan: 0, keuangan: 0, surat: 0, sumbangan: 0
      });
    }
  }
}
function renderDashboardLayout(res) {
  let btnEditAdmin = res.role === 'RT' 
    ? `<button class="btn btn-warning btn-sm fw-bold me-2" onclick="bukaModalEditInfo()"><i class="bi bi-pencil-square me-1"></i> Edit Info Warga</button>` 
    : '';

  let infoCardHtml = `
    <div class="card card-custom mb-4 shadow-sm border-0 bg-white">
      <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-2">
        <h5 class="fw-bold text-dark mb-2 mb-md-0 flex items-center gap-2"><i class="bi bi-megaphone-fill text-blue-600"></i> Informasi & Pengumuman Warga</h5>
        <div class="d-flex align-items-center">
          ${btnEditAdmin}
          <button class="btn btn-outline-primary btn-sm fw-bold d-none d-md-block" onclick="loadMenu('Profil')"><i class="bi bi-person-vcard me-1"></i> Buka Profil & Keluarga</button>
        </div>
      </div>
      <p id="infoWargaTextDisplay" class="text-muted small mb-0"><span class="spinner-border spinner-border-sm text-primary"></span> Memuat informasi...</p>
    </div>
  `;

  let htmlLayout = infoCardHtml;

  if (res.role === 'RT') {
    htmlLayout += `
      <div class="row text-center d-none d-md-flex g-4 mb-4">
        <div class="col-md-4"><div class="card card-custom border-start border-primary border-4"><h5><i class="bi bi-people-fill text-primary me-2"></i>Total Warga</h5><h2 class="fw-bold text-primary mt-2">${res.warga || 0} Warga</h2></div></div>
        <div class="col-md-4"><div class="card card-custom border-start border-warning border-4"><h5><i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>Aduan Masuk</h5><h2 class="fw-bold text-warning mt-2">${res.aduan || 0} Laporan</h2></div></div>
        <div class="col-md-4"><div class="card card-custom border-start border-success border-4"><h5><i class="bi bi-cash-stack text-success me-2"></i>Data Transaksi</h5><h2 class="fw-bold text-success mt-2">${res.keuangan || 0} Laporan</h2></div></div>
      </div>
      <div class="d-block d-md-none">
        <div class="quick-actions-grid">
          <div class="quick-action-item" onclick="loadMenu('Warga')"><div class="quick-action-icon"><i class="bi bi-people-fill"></i></div>Warga</div>
          <div class="quick-action-item" onclick="loadMenu('Kelahiran')"><div class="quick-action-icon"><i class="bi bi-gender-ambiguous"></i></div>Kelahiran</div>
          <div class="quick-action-item" onclick="loadMenu('Kematian')"><div class="quick-action-icon"><i class="bi bi-heartbreak-fill"></i></div>Kematian</div>
          <div class="quick-action-item" onclick="loadMenu('PindahMasuk')"><div class="quick-action-icon"><i class="bi bi-box-arrow-in-right"></i></div>Pindah Masuk</div>
          <div class="quick-action-item" onclick="loadMenu('PindahKeluar')"><div class="quick-action-icon"><i class="bi bi-box-arrow-left"></i></div>Pindah Keluar</div>
          <div class="quick-action-item" onclick="loadMenu('Pengaduan')"><div class="quick-action-icon"><i class="bi bi-chat-square-text-fill"></i></div>Aduan</div>
          <div class="quick-action-item" onclick="loadMenu('SuratPengantar')"><div class="quick-action-icon"><i class="bi bi-file-earmark-text-fill"></i></div>Surat</div>
          <div class="quick-action-item" onclick="loadMenu('Keuangan')"><div class="quick-action-icon"><i class="bi bi-wallet2"></i></div>Keuangan</div>
          <div class="quick-action-item" onclick="loadMenu('Sumbangan')"><div class="quick-action-icon"><i class="bi bi-gift-fill"></i></div>Sumbangan</div>
          <div class="quick-action-item" onclick="loadMenu('Aset')"><div class="quick-action-icon"><i class="bi bi-tools"></i></div>Inventaris</div>
          <div class="quick-action-item" onclick="loadMenu('Aspirasi')"><div class="quick-action-icon"><i class="bi bi-chat-heart-fill"></i></div>Aspirasi</div>
          <div class="quick-action-item" onclick="loadMenu('Pengaturan')"><div class="quick-action-icon"><i class="bi bi-gear-fill text-primary"></i></div>Pengaturan</div>
          <div class="quick-action-item" onclick="loadMenu('Profil')"><div class="quick-action-icon"><i class="bi bi-person-vcard text-primary"></i></div>Profil Saya</div>
        </div>
        <p class="fw-bold text-secondary mb-2" style="font-size:0.85rem;"><i class="bi bi-graph-up me-1"></i> Rekap Ringkasan RT</p>
        <div class="mobile-stats-grid">
          <div class="m-stat-card blue-card"><span class="m-stat-title">Total Warga</span><span class="m-stat-value">${res.warga || 0} Orang</span></div>
          <div class="m-stat-card teal-card"><span class="m-stat-title">Transaksi Beres</span><span class="m-stat-value">${res.keuangan || 0} Data</span></div>
          <div class="m-stat-card orange-card"><span class="m-stat-title">Aduan Masuk</span><span class="m-stat-value">${res.aduan || 0} Kasus</span></div>
          <div class="m-stat-card slate-card"><span class="m-stat-title">Status Sistem</span><span class="m-stat-value">Aktif RT</span></div>
        </div>
      </div>
    `;
  } else {
    htmlLayout += `
      <div class="row text-center d-none d-md-flex g-4 mb-4">
        <div class="col-md-4"><div class="card card-custom border-start border-warning border-4"><h5><i class="bi bi-chat-left-dots-fill text-warning me-2"></i>Aduan Saya</h5><h2 class="fw-bold text-warning mt-2">${res.aduan || 0} Laporan</h2></div></div>
        <div class="col-md-4"><div class="card card-custom border-start border-primary border-4"><h5><i class="bi bi-file-earmark-text-fill text-primary me-2"></i>Surat Saya</h5><h2 class="fw-bold text-primary mt-2">${res.surat || 0} Pengajuan</h2></div></div>
        <div class="col-md-4"><div class="card card-custom border-start border-success border-4"><h5><i class="bi bi-gift-fill text-success me-2"></i>Sumbangan Saya</h5><h2 class="fw-bold text-success mt-2">${res.sumbangan || 0} Data</h2></div></div>
      </div>
      <div class="d-block d-md-none">
        <div class="quick-actions-grid">
          <div class="quick-action-item" onclick="loadMenu('Warga')"><div class="quick-action-icon"><i class="bi bi-people-fill"></i></div>Warga</div>
          <div class="quick-action-item" onclick="loadMenu('Pengaduan')"><div class="quick-action-icon"><i class="bi bi-chat-square-text-fill"></i></div>Aduan</div>
          <div class="quick-action-item" onclick="loadMenu('SuratPengantar')"><div class="quick-action-icon"><i class="bi bi-file-earmark-text-fill"></i></div>Surat</div>
          <div class="quick-action-item" onclick="loadMenu('Keuangan')"><div class="quick-action-icon"><i class="bi bi-wallet2"></i></div>Keuangan</div>
          <div class="quick-action-item" onclick="loadMenu('Sumbangan')"><div class="quick-action-icon"><i class="bi bi-gift-fill"></i></div>Sumbangan</div>
          <div class="quick-action-item" onclick="loadMenu('Aset')"><div class="quick-action-icon"><i class="bi bi-tools"></i></div>Inventaris</div>
          <div class="quick-action-item" onclick="loadMenu('Aspirasi')"><div class="quick-action-icon"><i class="bi bi-chat-heart-fill"></i></div>Aspirasi</div>
          <div class="quick-action-item" onclick="loadMenu('Profil')"><div class="quick-action-icon"><i class="bi bi-person-vcard text-primary"></i></div>Profil Saya</div>
        </div>
        <p class="fw-bold text-secondary mb-2" style="font-size:0.85rem;"><i class="bi bi-graph-up me-1"></i> Rekap Laporan Saya</p>
        <div class="mobile-stats-grid">
          <div class="m-stat-card orange-card"><span class="m-stat-title">Aduan Saya</span><span class="m-stat-value">${res.aduan || 0} Laporan</span></div>
          <div class="m-stat-card blue-card"><span class="m-stat-title">Surat Saya</span><span class="m-stat-value">${res.surat || 0} Berkas</span></div>
          <div class="m-stat-card teal-card"><span class="m-stat-title">Sumbangan Saya</span><span class="m-stat-value">${res.sumbangan || 0} Data</span></div>
          <div class="m-stat-card slate-card"><span class="m-stat-title">Status Akun</span><span class="m-stat-value">Terverifikasi</span></div>
        </div>
      </div>
    `;
  }
    <!-- Modal Edit Informasi Khusus RT Admin -->
    <div class="modal fade" id="modalEditInfo" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-light">
            <h5 class="modal-title fw-bold"><i class="bi bi-pencil-square me-2"></i>Edit Informasi Warga</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label font-weight-bold small text-secondary">Teks Informasi (Gunakan <code>{NAMA}</code> untuk nama warga otomatis)</label>
              <textarea id="editInfoTextarea" class="form-control" rows="5" placeholder="Masukkan teks informasi warga..."></textarea>
            </div>
          </div>
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
            <button type="button" class="btn btn-primary fw-bold" onclick="simpanInfoWarga()">Simpan Perubahan</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('main-content').innerHTML = htmlLayout;
  muatInfoWargaRealtime();
  if (infoWargaTimer) clearInterval(infoWargaTimer);
  infoWargaTimer = setInterval(muatInfoWargaRealtime, 10000);
}
