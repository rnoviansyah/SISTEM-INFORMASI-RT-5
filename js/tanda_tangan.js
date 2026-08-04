// ============================================================
// TANDA TANGAN PEMOHON - Inline Canvas Module
// Untuk Menu Surat Pengantar RT
// ============================================================

let inlineCanvas = null;
let inlineCtx = null;
let inlineIsDrawing = false;
let inlineLastX = 0;
let inlineLastY = 0;
let inlineHasDrawn = false;

function initInlineCanvas(existingDataUrl = '') {
  setTimeout(() => {
    inlineCanvas = document.getElementById('canvas-ttd-inline');
    if (!inlineCanvas) return;
    inlineCtx = inlineCanvas.getContext('2d');

    let container = inlineCanvas.parentElement;
    if (container && container.offsetWidth > 0) {
      inlineCanvas.width = container.offsetWidth;
    } else {
      inlineCanvas.width = 340;
    }
    inlineCanvas.height = 150;

    // Reset background to clean white
    inlineCtx.fillStyle = '#ffffff';
    inlineCtx.fillRect(0, 0, inlineCanvas.width, inlineCanvas.height);

    // Draw guideline
    drawCanvasGuideline();

    inlineCtx.strokeStyle = '#1e3a8a';
    inlineCtx.lineWidth = 2.5;
    inlineCtx.lineCap = 'round';
    inlineCtx.lineJoin = 'round';

    inlineHasDrawn = false;
    let hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'block';

    // If existing signature URL, draw onto canvas
    if (existingDataUrl && typeof existingDataUrl === 'string' && (existingDataUrl.startsWith('data:') || existingDataUrl.startsWith('http'))) {
      let img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        inlineCtx.drawImage(img, 0, 0, inlineCanvas.width, inlineCanvas.height);
        inlineHasDrawn = true;
        if (hint) hint.style.display = 'none';
      };
      img.src = existingDataUrl;
    }

    // Attach mouse & touch listeners
    attachInlineCanvasEvents();
  }, 150);
}

function drawCanvasGuideline() {
  if (!inlineCtx || !inlineCanvas) return;
  inlineCtx.strokeStyle = '#cbd5e1';
  inlineCtx.lineWidth = 1;
  inlineCtx.setLineDash([4, 4]);
  inlineCtx.beginPath();
  inlineCtx.moveTo(15, inlineCanvas.height - 30);
  inlineCtx.lineTo(inlineCanvas.width - 15, inlineCanvas.height - 30);
  inlineCtx.stroke();
  inlineCtx.setLineDash([]);
}

function attachInlineCanvasEvents() {
  if (!inlineCanvas) return;

  // Mouse events
  inlineCanvas.onmousedown = function(e) {
    e.preventDefault();
    inlineIsDrawing = true;
    let pos = getInlinePos(e);
    inlineLastX = pos.x;
    inlineLastY = pos.y;
    inlineCtx.beginPath();
    inlineCtx.moveTo(inlineLastX, inlineLastY);
  };

  inlineCanvas.onmousemove = function(e) {
    if (!inlineIsDrawing) return;
    e.preventDefault();
    let pos = getInlinePos(e);
    inlineCtx.strokeStyle = '#1e3a8a';
    inlineCtx.lineWidth = 2.5;
    inlineCtx.lineCap = 'round';
    inlineCtx.lineJoin = 'round';
    inlineCtx.lineTo(pos.x, pos.y);
    inlineCtx.stroke();
    inlineCtx.beginPath();
    inlineCtx.moveTo(pos.x, pos.y);
    inlineLastX = pos.x;
    inlineLastY = pos.y;
    inlineHasDrawn = true;
    let hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
  };

  inlineCanvas.onmouseup = function() { inlineIsDrawing = false; };
  inlineCanvas.onmouseleave = function() { inlineIsDrawing = false; };

  // Touch events (Mobile)
  inlineCanvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    let touch = e.touches[0];
    let pos = getInlinePos(touch);
    inlineIsDrawing = true;
    inlineLastX = pos.x;
    inlineLastY = pos.y;
    inlineCtx.beginPath();
    inlineCtx.moveTo(inlineLastX, inlineLastY);
  }, { passive: false });

  inlineCanvas.addEventListener('touchmove', function(e) {
    if (!inlineIsDrawing) return;
    e.preventDefault();
    let touch = e.touches[0];
    let pos = getInlinePos(touch);
    inlineCtx.strokeStyle = '#1e3a8a';
    inlineCtx.lineWidth = 2.5;
    inlineCtx.lineCap = 'round';
    inlineCtx.lineJoin = 'round';
    inlineCtx.lineTo(pos.x, pos.y);
    inlineCtx.stroke();
    inlineCtx.beginPath();
    inlineCtx.moveTo(pos.x, pos.y);
    inlineLastX = pos.x;
    inlineLastY = pos.y;
    inlineHasDrawn = true;
    let hint = document.getElementById('canvas-hint');
    if (hint) hint.style.display = 'none';
  }, { passive: false });

  inlineCanvas.addEventListener('touchend', function() { inlineIsDrawing = false; });
}

function getInlinePos(e) {
  let rect = inlineCanvas.getBoundingClientRect();
  let scaleX = inlineCanvas.width / rect.width;
  let scaleY = inlineCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function hapusTandaTanganInline() {
  if (!inlineCtx || !inlineCanvas) return;
  inlineCtx.fillStyle = '#ffffff';
  inlineCtx.fillRect(0, 0, inlineCanvas.width, inlineCanvas.height);
  drawCanvasGuideline();
  inlineHasDrawn = false;
  let hint = document.getElementById('canvas-hint');
  if (hint) hint.style.display = 'block';
}

function getTTDPemohonInline() {
  if (!inlineHasDrawn || !inlineCanvas) return '';
  return inlineCanvas.toDataURL('image/png');
}

function renderFieldTTDPemohon(existingTTD = '') {
  return `
    <div class="mb-3 p-3 border rounded-3 bg-white shadow-sm">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <label class="form-label small text-primary fw-bold mb-0">
          <i class="bi bi-pen-fill me-1"></i>TANDA TANGAN PEMOHON <span class="text-danger">*</span>
        </label>
        <button type="button" onclick="hapusTandaTanganInline()" class="btn btn-outline-danger btn-sm text-[11px] py-0 px-2 rounded-2">
          <i class="bi bi-arrow-counterclockwise me-1"></i>Hapus / Ulangi
        </button>
      </div>
      <div class="border rounded-2 overflow-hidden bg-white position-relative shadow-inner" style="touch-action: none;">
        <canvas id="canvas-ttd-inline" width="340" height="150" class="w-100 block cursor-crosshair" style="display:block; height:150px; background:#fff;"></canvas>
        <div id="canvas-hint" class="position-absolute top-50 start-50 translate-middle text-muted text-xs pointer-events-none select-none opacity-50 text-center">
          <i class="bi bi-pencil-fill d-block fs-4 mb-1"></i>
          <span>Goreskan Tanda Tangan di Sini</span>
        </div>
      </div>
      <small class="text-muted text-[10px] d-block mt-1">
        <i class="bi bi-info-circle me-1"></i>Gunakan jari (HP) atau mouse (PC) untuk membuat tanda tangan. Tanda tangan akan otomatis tercetak di PDF Surat.
      </small>
    </div>`;
}

// Global exports
window.initInlineCanvas = initInlineCanvas;
window.hapusTandaTanganInline = hapusTandaTanganInline;
window.getTTDPemohonInline = getTTDPemohonInline;
window.renderFieldTTDPemohon = renderFieldTTDPemohon;
