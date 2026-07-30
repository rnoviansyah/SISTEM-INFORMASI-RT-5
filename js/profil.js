async function loadProfilView() {
  const res = await callGASGet('getProfileData', { nik: session.nik });
  if (!res) return;

  if (res.status === 'error') {
    document.getElementById('main-content').innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
    return;
  }
  
  let htmlLayout = `
    <button class="btn btn-outline-secondary btn-sm mb-3 shadow-sm fw-bold" onclick="loadMenu('Dashboard')"><i class="bi bi-arrow-left me-1"></i> Kembali ke Dashboard</button>
    <div class="row g-4">`;
  
  htmlLayout += `
    <div class="col-md-5">
      <div class="card card-custom h-100">
        <h5 class="fw-bold text-primary mb-3"><i class="bi bi-person-vcard-fill me-2"></i>Data Pribadi Anda</h5>
        <div class="table-responsive">
          <table class="table table-sm table-borderless align-middle mb-0">
            <tbody>`;
  
  res.headers.forEach(h => {
    let labelText = h.replace('_', ' ').toUpperCase();
    let val = res.pribadi[h] || '-';
    if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
      htmlLayout += `<tr><td class="fw-bold text-secondary py-2" style="width:38%; font-size:0.85rem;">${labelText}</td><td>${val !== '-' ? `<img src="${val}" class="img-table" onclick="bukaPopUpFoto('${val}')">` : '-'}</td></tr>`;
    } else {
      htmlLayout += `<tr><td class="fw-bold text-secondary py-2" style="width:38%; font-size:0.85rem;">${labelText}</td><td class="text-dark fw-semibold" style="font-size:0.9rem;">${val}</td></tr>`;
    }
  });
  
  htmlLayout += `
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  
  htmlLayout += `
    <div class="col-md-7">
      <div class="card card-custom h-100">
        <h5 class="fw-bold text-success mb-3"><i class="bi bi-houses-fill me-2"></i>Anggota Keluarga</h5>`;
  
  if (!res.keluarga || res.keluarga.length === 0) {
    htmlLayout += `<div class="alert alert-light border text-muted small mb-0">Tidak ada anggota keluarga lain dengan No KK yang sama.</div>`;
  } else {
    htmlLayout += `
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0" style="font-size:0.85rem;" id="keluargaTable">
          <thead class="table-light">
            <tr>`;
    res.headers.forEach(h => {
      if (!['no_kk', 'alamat'].includes(h.toLowerCase().trim())) {
        htmlLayout += `<th class="text-secondary py-2 text-nowrap">${h.replace('_', ' ').toUpperCase()}</th>`;
      }
    });
    htmlLayout += `</tr></thead><tbody>`;
    
    window._profilKeluargaData = res.keluarga;
    window._profilHeaders = res.headers;

    res.keluarga.forEach((member, index) => {
      let memberId = member.id || member.nik || index;
      htmlLayout += `<tr style="cursor:pointer;" onclick="showDetailKeluarga('${memberId}')">`;
      
      res.headers.forEach(h => {
        if (!['no_kk', 'alamat'].includes(h.toLowerCase().trim())) {
          let val = member[h] || '-';
          if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
            htmlLayout += `<td>${val !== '-' ? `<img src="${val}" class="img-table" onclick="event.stopPropagation(); bukaPopUpFoto('${val}')">` : '-'}</td>`;
          } else {
            htmlLayout += `<td class="fw-medium text-dark text-nowrap">${val}</td>`;
          }
        }
      });
      htmlLayout += '</tr>';
    });
    htmlLayout += `</tbody></table></div>`;
  }
  
  htmlLayout += `</div></div></div>`;

  htmlLayout += `
    <div class="modal fade" id="modalDetailKeluarga" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title fw-bold" id="modalKeluargaTitle"><i class="bi bi-person-badge-fill me-2"></i>Detail Anggota Keluarga</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" id="modalKeluargaContent"></div>
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-secondary fw-bold btn-sm" data-bs-dismiss="modal">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('main-content').innerHTML = htmlLayout;
}

function showDetailKeluarga(identifier) {
  if (!window._profilKeluargaData) return;
  let member = window._profilKeluargaData.find(m => (m.id == identifier || m.nik == identifier));
  if (!member) return;

  let contentHtml = '<div class="list-group list-group-flush">';
  let fotoUrl = '';

  window._profilHeaders.forEach(h => {
    let val = member[h] || '-';
    let hLower = h.toLowerCase().trim();

    if (hLower.includes('foto') || hLower.includes('bukti')) {
      if (val && val !== '-' && val !== '***Rahasia***') {
        fotoUrl = val;
      }
    } else {
      contentHtml += `
        <div class="list-group-item py-2 px-0 border-bottom">
          <small class="text-muted font-monospace d-block text-uppercase">${h.replace(/_/g, ' ')}</small>
          <span class="fw-bold text-dark">${val}</span>
        </div>`;
    }
  });

  if (fotoUrl) {
    contentHtml += `
      <div class="mt-3 text-center">
        <small class="text-muted d-block text-start font-monospace uppercase mb-1">FOTO</small>
        <img src="${fotoUrl}" onclick="event.stopPropagation(); bukaPopUpFoto('${fotoUrl}')" class="img-fluid rounded border shadow-sm" style="max-height: 200px; cursor:pointer;" title="Klik untuk memperbesar">
      </div>`;
  }

  contentHtml += '</div>';
  document.getElementById('modalKeluargaContent').innerHTML = contentHtml;

  let modalEl = document.getElementById('modalDetailKeluarga');
  let modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();
}
