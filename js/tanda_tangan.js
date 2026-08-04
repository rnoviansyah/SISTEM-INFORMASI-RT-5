// ============================================================
// TANDA TANGAN PEMOHON - Canvas Drawing Module
// Untuk Menu Surat Pengantar RT
// ============================================================

// Storage key untuk tanda tangan sementara
const TTD_STORAGE_KEY = 'rt_ttd_pemohon_temp';

// Variabel canvas drawing
let ttdCanvas = null;
let ttdCtx = null;
let ttdIsDrawing = false;
let ttdLastX = 0;
let ttdLastY = 0;
let ttdHasDrawn = false;

// ── Buka Modal Tanda Tangan ──────────────────────────────────
function bukaModalTandaTangan() {
  let modal = document.getElementById('modal-ttd-pemohon');
  if (!modal) return;

  // Reset state
  ttdHasDrawn = false;
  document.getElementById('btn-konfirmasi-ttd').disabled = true;
  document.getElementById('btn-konfirmasi-ttd').classList.add('opacity-50');

  // Inisialisasi canvas
  setTimeout(() => {
    initTTDCanvas();
    // Jika ada tanda tangan tersimpan sebelumnya, tampilkan preview
    let tersimpan = sessionStorage.getItem(TTD_STORAGE_KEY);
    if (tersimpan) {
      tampilkanPreviewTTD(tersimpan);
    }
  }, 50);

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ── Tutup Modal Tanda Tangan ─────────────────────────────────
function tutupModalTandaTangan() {
  let modal = document.getElementById('modal-ttd-pemohon');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Inisialisasi Canvas ──────────────────────────────────────
function initTTDCanvas() {
  ttdCanvas = document.getElementById('canvas-ttd-pemohon');
  if (!ttdCanvas) return;
  ttdCtx = ttdCanvas.getContext('2d');

  // Set ukuran canvas sesuai container
  let container = ttdCanvas.parentElement;
  ttdCanvas.width = container.offsetWidth || 320;
  ttdCanvas.height = 180;

  // Background putih
  ttdCtx.fillStyle = '#ffffff';
  ttdCtx.fillRect(0, 0, ttdCanvas.width, ttdCanvas.height);

  // Garis panduan
  ttdCtx.strokeStyle = '#e2e8f0';
  ttdCtx.lineWidth = 1;
  ttdCtx.setLineDash([5, 5]);
  ttdCtx.beginPath();
  ttdCtx.moveTo(10, ttdCanvas.height - 40);
  ttdCtx.lineTo(ttdCanvas.width - 10, ttdCanvas.height - 40);
  ttdCtx.stroke();
  ttdCtx.setLineDash([]);

  // Setting pen
  ttdCtx.strokeStyle = '#1e3a8a';
  ttdCtx.lineWidth = 2.5;
  ttdCtx.lineCap = 'round';
  ttdCtx.lineJoin = 'round';

  // Event listeners mouse
  ttdCanvas.removeEventListener('mousedown', ttdStartDraw);
  ttdCanvas.removeEventListener('mousemove', ttdDraw);
  ttdCanvas.removeEventListener('mouseup', ttdStopDraw);
  ttdCanvas.removeEventListener('mouseleave', ttdStopDraw);

  ttdCanvas.addEventListener('mousedown', ttdStartDraw);
  ttdCanvas.addEventListener('mousemove', ttdDraw);
  ttdCanvas.addEventListener('mouseup', ttdStopDraw);
  ttdCanvas.addEventListener('mouseleave', ttdStopDraw);

  // Event listeners touch (mobile)
  ttdCanvas.removeEventListener('touchstart', ttdTouchStart);
  ttdCanvas.removeEventListener('touchmove', ttdTouchMove);
  ttdCanvas.removeEventListener('touchend', ttdStopDraw);

  ttdCanvas.addEventListener('touchstart', ttdTouchStart, { passive: false });
  ttdCanvas.addEventListener('touchmove', ttdTouchMove, { passive: false });
  ttdCanvas.addEventListener('touchend', ttdStopDraw);
}

// ── Helper: Posisi Relatif ke Canvas ────────────────────────
function getPosisiCanvas(e, canvas) {
  let rect = canvas.getBoundingClientRect();
  let scaleX = canvas.width / rect.width;
  let scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// ── Mouse Events ─────────────────────────────────────────────
function ttdStartDraw(e) {
  e.preventDefault();
  ttdIsDrawing = true;
  let pos = getPosisiCanvas(e, ttdCanvas);
  ttdLastX = pos.x;
  ttdLastY = pos.y;
  ttdCtx.beginPath();
  ttdCtx.moveTo(ttdLastX, ttdLastY);
}

function ttdDraw(e) {
  if (!ttdIsDrawing) return;
  e.preventDefault();
  let pos = getPosisiCanvas(e, ttdCanvas);
  ttdCtx.strokeStyle = '#1e3a8a';
  ttdCtx.lineWidth = 2.5;
  ttdCtx.lineCap = 'round';
  ttdCtx.lineJoin = 'round';
  ttdCtx.lineTo(pos.x, pos.y);
  ttdCtx.stroke();
  ttdCtx.beginPath();
  ttdCtx.moveTo(pos.x, pos.y);
  ttdLastX = pos.x;
  ttdLastY = pos.y;
  ttdHasDrawn = true;
  document.getElementById('btn-konfirmasi-ttd').disabled = false;
  document.getElementById('btn-konfirmasi-ttd').classList.remove('opacity-50');
}

function ttdStopDraw(e) {
  ttdIsDrawing = false;
}

// ── Touch Events (Mobile) ────────────────────────────────────
function ttdTouchStart(e) {
  e.preventDefault();
  let touch = e.touches[0];
  let rect = ttdCanvas.getBoundingClientRect();
  let scaleX = ttdCanvas.width / rect.width;
  let scaleY = ttdCanvas.height / rect.height;
  ttdIsDrawing = true;
  ttdLastX = (touch.clientX - rect.left) * scaleX;
  ttdLastY = (touch.clientY - rect.top) * scaleY;
  ttdCtx.beginPath();
  ttdCtx.moveTo(ttdLastX, ttdLastY);
}

function ttdTouchMove(e) {
  if (!ttdIsDrawing) return;
  e.preventDefault();
  let touch = e.touches[0];
  let rect = ttdCanvas.getBoundingClientRect();
  let scaleX = ttdCanvas.width / rect.width;
  let scaleY = ttdCanvas.height / rect.height;
  let x = (touch.clientX - rect.left) * scaleX;
  let y = (touch.clientY - rect.top) * scaleY;
  ttdCtx.strokeStyle = '#1e3a8a';
  ttdCtx.lineWidth = 2.5;
  ttdCtx.lineCap = 'round';
  ttdCtx.lineJoin = 'round';
  ttdCtx.lineTo(x, y);
  ttdCtx.stroke();
  ttdCtx.beginPath();
  ttdCtx.moveTo(x, y);
  ttdLastX = x;
  ttdLastY = y;
  ttdHasDrawn = true;
  document.getElementById('btn-konfirmasi-ttd').disabled = false;
  document.getElementById('btn-konfirmasi-ttd').classList.remove('opacity-50');
}

// ── Hapus Canvas ─────────────────────────────────────────────
function hapusTandaTangan() {
  if (!ttdCtx || !ttdCanvas) return;
  ttdCtx.clearRect(0, 0, ttdCanvas.width, ttdCanvas.height);
  ttdCtx.fillStyle = '#ffffff';
  ttdCtx.fillRect(0, 0, ttdCanvas.width, ttdCanvas.height);
  // Gambar ulang garis panduan
  ttdCtx.strokeStyle = '#e2e8f0';
  ttdCtx.lineWidth = 1;
  ttdCtx.setLineDash([5, 5]);
  ttdCtx.beginPath();
  ttdCtx.moveTo(10, ttdCanvas.height - 40);
  ttdCtx.lineTo(ttdCanvas.width - 10, ttdCanvas.height - 40);
  ttdCtx.stroke();
  ttdCtx.setLineDash([]);
  ttdHasDrawn = false;
  document.getElementById('btn-konfirmasi-ttd').disabled = true;
  document.getElementById('btn-konfirmasi-ttd').classList.add('opacity-50');
}

// ── Hapus TTD Tersimpan ─────────────────────────────────────
function hapusTTDTersimpan() {
  sessionStorage.removeItem(TTD_STORAGE_KEY);
  updateTampilTTDPemohon();
}

// ── Konfirmasi & Simpan TTD ──────────────────────────────────
function konfirmasiTandaTangan() {
  if (!ttdHasDrawn || !ttdCanvas) {
    alert('Silakan buat tanda tangan terlebih dahulu.');
    return;
  }
  // Crop tanda tangan (hapus area kosong)
  let dataUrl = ttdCanvas.toDataURL('image/png');
  // Simpan ke sessionStorage
  sessionStorage.setItem(TTD_STORAGE_KEY, dataUrl);
  tutupModalTandaTangan();
  updateTampilTTDPemohon();
  // Tampilkan notifikasi sukses
  if (typeof showUIToast === 'function') {
    showUIToast('✅ Tanda tangan berhasil disimpan!', 'success');
  }
}

// ── Update Preview TTD di Form ───────────────────────────────
function updateTampilTTDPemohon() {
  let previewContainer = document.getElementById('ttd-pemohon-preview');
  if (!previewContainer) return;
  let ttdData = sessionStorage.getItem(TTD_STORAGE_KEY);
  if (ttdData) {
    previewContainer.innerHTML = `
      <div class="flex flex-col items-center gap-2">
        <div class="border-2 border-blue-200 rounded-xl p-2 bg-white shadow-sm">
          <img src="${ttdData}" alt="Tanda Tangan" class="max-h-20 max-w-full object-contain" style="max-height:80px;">
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="bukaModalTandaTangan()" class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
            <i class="bi bi-pencil me-1"></i>Ubah
          </button>
          <button type="button" onclick="hapusTTDTersimpan()" class="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-100 transition">
            <i class="bi bi-trash me-1"></i>Hapus
          </button>
        </div>
      </div>`;
  } else {
    previewContainer.innerHTML = `
      <button type="button" onclick="bukaModalTandaTangan()" 
        class="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition group">
        <div class="flex flex-col items-center gap-2 text-blue-500 group-hover:text-blue-700">
          <i class="bi bi-pen-fill text-2xl"></i>
          <span class="text-xs font-bold">Klik untuk membuat<br>Tanda Tangan Digital</span>
        </div>
      </button>`;
  }
}

// ── Tampilkan Preview dalam Modal (edit) ─────────────────────
function tampilkanPreviewTTD(dataUrl) {
  // Gambar TTD tersimpan ke canvas
  if (!ttdCanvas || !ttdCtx) return;
  let img = new Image();
  img.onload = function() {
    ttdCtx.clearRect(0, 0, ttdCanvas.width, ttdCanvas.height);
    ttdCtx.fillStyle = '#ffffff';
    ttdCtx.fillRect(0, 0, ttdCanvas.width, ttdCanvas.height);
    ttdCtx.drawImage(img, 0, 0, ttdCanvas.width, ttdCanvas.height);
    ttdHasDrawn = true;
    let btnKonfirmasi = document.getElementById('btn-konfirmasi-ttd');
    if (btnKonfirmasi) {
      btnKonfirmasi.disabled = false;
      btnKonfirmasi.classList.remove('opacity-50');
    }
  };
  img.src = dataUrl;
}

// ── Helper: Ambil TTD Pemohon ────────────────────────────────
function getTTDPemohon() {
  return sessionStorage.getItem(TTD_STORAGE_KEY) || '';
}

// ── Helper: Reset TTD Session ─────────────────────────────────
function resetTTDSession() {
  sessionStorage.removeItem(TTD_STORAGE_KEY);
}

// ── Render HTML Field TTD untuk Form ────────────────────────
function renderFieldTTDPemohon(existingTTD = '') {
  // Jika ada TTD dari row data (edit), restore ke session
  if (existingTTD && existingTTD.startsWith('data:')) {
    sessionStorage.setItem(TTD_STORAGE_KEY, existingTTD);
  }
  let ttdData = sessionStorage.getItem(TTD_STORAGE_KEY) || existingTTD || '';
  let previewHtml = ttdData
    ? `<div class="flex flex-col items-center gap-2">
        <div class="border-2 border-blue-200 rounded-xl p-2 bg-white shadow-sm">
          <img src="${ttdData}" alt="Tanda Tangan" class="max-h-20 max-w-full object-contain" style="max-height:80px;">
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="bukaModalTandaTangan()" class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
            <i class="bi bi-pencil me-1"></i>Ubah
          </button>
          <button type="button" onclick="hapusTTDTersimpan()" class="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-100 transition">
            <i class="bi bi-trash me-1"></i>Hapus
          </button>
        </div>
      </div>`
    : `<button type="button" onclick="bukaModalTandaTangan()" 
        class="w-full border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition group">
        <div class="flex flex-col items-center gap-2 text-blue-500 group-hover:text-blue-700">
          <i class="bi bi-pen-fill text-2xl"></i>
          <span class="text-xs font-bold">Klik untuk membuat<br>Tanda Tangan Digital</span>
        </div>
      </button>`;

  return `
    <div class="mb-3">
      <label class="form-label small text-secondary fw-bold">
        <i class="bi bi-pen-fill me-1 text-primary"></i>TANDA TANGAN PEMOHON
        <span class="text-danger">*</span>
      </label>
      <div class="p-3 border rounded-3 bg-light">
        <div id="ttd-pemohon-preview" class="mb-0">
          ${previewHtml}
        </div>
        <small class="text-muted d-block mt-2 text-[10px]">
          <i class="bi bi-info-circle me-1"></i>Tanda tangan akan otomatis tercetak di PDF surat.
        </small>
      </div>
    </div>`;
}

// Expose global
window.bukaModalTandaTangan = bukaModalTandaTangan;
window.tutupModalTandaTangan = tutupModalTandaTangan;
window.hapusTandaTangan = hapusTandaTangan;
window.hapusTTDTersimpan = hapusTTDTersimpan;
window.konfirmasiTandaTangan = konfirmasiTandaTangan;
window.updateTampilTTDPemohon = updateTampilTTDPemohon;
window.renderFieldTTDPemohon = renderFieldTTDPemohon;
window.getTTDPemohon = getTTDPemohon;
window.resetTTDSession = resetTTDSession;
