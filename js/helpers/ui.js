// ============================================================
// helpers/ui.js
// Helper UI: toast, konfirmasi modal, loading tombol, template view,
// notifikasi browser, favicon. Dipisah dari app.js (refactor modul).
// Classic script — berbagi global scope. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

function setBtnLoading(btn, isLoading, customText = 'Menyimpan...') {
  if (!btn) return;
  if (typeof btn === 'string') btn = document.querySelector(btn);
  if (!btn || !(btn instanceof HTMLElement)) return;

  if (isLoading) {
    if (!btn.dataset.origHtml) {
      btn.dataset.origHtml = btn.innerHTML;
    }
    btn.disabled = true;
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.75';
    if (btn.classList.contains('btn-door-login') || customText === 'Memproses...') {
      btn.innerHTML = btn.dataset.origHtml;
      btn.classList.add('is-loading');
    } else {
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${customText}`;
    }
  } else {
    btn.disabled = false;
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
    btn.classList.remove('is-loading');
    btn.classList.remove('is-animating');
    if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
      delete btn.dataset.origHtml;
    }
  }
}
window.setBtnLoading = setBtnLoading;

document.addEventListener('click', function(e) {
  let target = e.target.closest('button, input[type="submit"], .btn-primary, .btn-submit');
  if (!target) return;
  let txt = (target.innerText || target.value || '').toLowerCase().trim();
  
  // Tombol penutup/batal (×, Batal, Tutup, Kembali) TIDAK ikut auto-loading "Menyimpan..."
  let isCloseBtn = !!target.closest('[data-bs-dismiss]') ||
                   target.classList.contains('btn-close') ||
                   txt === '×' || txt === '✕' || txt === '✖' ||
                   txt.includes('batal') || txt.includes('tutup') || txt.includes('kembali');
  if (isCloseBtn) return;

  let isActionBtn = txt.includes('simpan') || 
                    txt.includes('masuk') || 
                    txt.includes('kirim') || 
                    txt.includes('tambah') || 
                    txt.includes('ubah') || 
                    txt.includes('update') || 
                    // Submit asli: hanya tombol submit yang benar-benar di dalam <form>
                    (target.type === 'submit' && !!target.closest('form'));
                    
  if (isActionBtn && !target.disabled) {
    let loadingText = txt.includes('masuk') ? 'Memproses...' : 
                      (txt.includes('kirim') ? 'Mengirim...' : 'Menyimpan...');
    setTimeout(() => {
      if (target) setBtnLoading(target, true, loadingText);
    }, 10);
    
    setTimeout(() => {
      if (target && target.disabled) {
        setBtnLoading(target, false);
      }
    }, 4000);
  }
}, true);

// Aksesibilitas: elemen berperan tombol (div/span dengan role="button" —
// quick action dashboard, item sheet menu) dapat diaktifkan via Enter/Spasi,
// tidak hanya klik mouse.
document.addEventListener('keydown', function(e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.getAttribute && e.target.getAttribute('role') === 'button') {
    e.preventDefault();
    e.target.click();
  }
});

function showUIToast(message, type = 'auto') {
  if (!message) return;
  document.querySelectorAll('button[data-orig-html]').forEach(btn => setBtnLoading(btn, false));
  let strMsg = String(message).trim();
  let toastContainer = document.getElementById('ui-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'ui-toast-container';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1099';
    document.body.appendChild(toastContainer);
  }
  let isSuccess = (type === 'success') || strMsg.toLowerCase().includes('berhasil') || strMsg.toLowerCase().includes('lunas') || strMsg.toLowerCase().includes('sukses');
  let isError = (type === 'danger' || type === 'error') || strMsg.toLowerCase().includes('gagal') || strMsg.toLowerCase().includes('error') || strMsg.toLowerCase().includes('ditolak') || strMsg.toLowerCase().includes('wajib') || strMsg.toLowerCase().includes('salah');
  let bgClass = isSuccess ? 'bg-success text-white' : (isError ? 'bg-danger text-white' : 'bg-dark text-white');
  let icon = isSuccess 
    ? '<i class="bi bi-check-circle-fill fs-5 me-2"></i>' 
    : (isError ? '<i class="bi bi-exclamation-triangle-fill fs-5 me-2"></i>' : '<i class="bi bi-info-circle-fill fs-5 me-2"></i>');
  let toastId = 'toast-' + Date.now() + '-' + Math.floor(Math.random()*1000);
  let toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg mb-2 show rounded-3" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex align-items-center">
        <div class="toast-body d-flex align-items-center font-sans fw-bold text-xs py-2 px-3">
          ${icon}
          <div>${strMsg}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" onclick="document.getElementById('${toastId}').remove()"></button>
      </div>
    </div>`;
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  setTimeout(() => {
    let el = document.getElementById(toastId);
    if (el) {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }
  }, 4500);
}
window.alert = function(msg) {
  showUIToast(msg);
};

function showUIConfirm(text, onConfirm, title = "Konfirmasi Tindakan") {
  let modalEl = document.getElementById('customConfirmModal');
  if (!modalEl) {
    let div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="customConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 1095;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            <div class="modal-body text-center p-4">
              <div class="rounded-circle bg-warning-subtle text-warning mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
                <i class="bi bi-exclamation-triangle-fill fs-2"></i>
              </div>
              <h6 class="fw-bold text-gray-800 mb-2" id="confirmModalTitle">Konfirmasi</h6>
              <p class="text-xs text-gray-600 mb-4" id="confirmModalText"></p>
              <div class="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-sm btn-light font-bold px-3 py-2 w-50 rounded-2" data-bs-dismiss="modal">Batal</button>
                <button type="button" class="btn btn-sm btn-danger font-bold px-3 py-2 w-50 rounded-2" id="btnConfirmOk">Ya, Lanjutkan</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById('customConfirmModal');
  }
  document.getElementById('confirmModalTitle').innerText = title;
  document.getElementById('confirmModalText').innerText = text;
  let bsModal = new bootstrap.Modal(modalEl);
  let btnOk = document.getElementById('btnConfirmOk');
  let newBtnOk = btnOk.cloneNode(true);
  btnOk.parentNode.replaceChild(newBtnOk, btnOk);
  newBtnOk.addEventListener('click', function() {
    bsModal.hide();
    if (typeof onConfirm === 'function') onConfirm();
  });
  bsModal.show();
}
window.showUIConfirm = showUIConfirm;

const viewTemplateCache = {};
async function loadViewTemplate(viewName, fallbackHtml = '') {
  const container = document.getElementById('main-content');
  if (!container) return false;
  if (viewTemplateCache[viewName]) {
    container.innerHTML = viewTemplateCache[viewName];
    return true;
  }
  try {
    const res = await fetch(`./views/${viewName}.html?v=` + Date.now());
    if (res.ok) {
      const html = await res.text();
      viewTemplateCache[viewName] = html;
      container.innerHTML = html;
      return true;
    }
  } catch (err) {
    console.warn(`[ViewLoader] views/${viewName}.html fetch skipped:`, err);
  }
  if (fallbackHtml) {
    viewTemplateCache[viewName] = fallbackHtml;
    container.innerHTML = fallbackHtml;
    return true;
  }
  return false;
}
window.loadViewTemplate = loadViewTemplate;

function playNotifSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}

function triggerNativeBrowserNotif(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      let notifIcon = appSettings.app_logo || './img/logo.jpg';
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: body,
            icon: notifIcon,
            badge: notifIcon,
            vibrate: [200, 100, 200],
            tag: 'kahfi-notif-' + Date.now(),
            renotify: true
          });
        }).catch(() => {
          new Notification(title, { body, icon: notifIcon });
        });
      } else {
        new Notification(title, { body, icon: notifIcon });
      }
    } catch(e) {}
  }
}

// Favicon mengikuti logo aplikasi (default img/logo.webp; ikut berubah saat logo diganti di Pengaturan)
function applyFavicon(url) {
  try {
    if (!url) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (apple) apple.href = url;
  } catch(e) {}
}
window.applyFavicon = applyFavicon;
