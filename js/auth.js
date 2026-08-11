// ============================================================
// auth.js - Autentikasi & sesi login (FIXED)
// ============================================================

// Pastikan window.session tersedia
if (typeof window.session === 'undefined') {
  window.session = { token: '', role: 'Warga', nik: '', nama: '', alamat: '', noHp: '' };
}
var session = window.session;

async function saveSessionToDatabase(token, nik, role) {
  if (!token || !nik) return;
  try {
    const db = window.db || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    await db.rpc('save_session_secured', {
      p_token: String(token).trim(),
      p_nik: String(nik).trim(),
      p_role: String(role || 'Warga').trim()
    });
  } catch (e) {
    console.warn('Gagal menyimpan sesi:', e);
  }
}

async function doLogin(e) {
  if (e) e.preventDefault();
  try {
    var uInput = document.getElementById('username');
    var pInput = document.getElementById('password');
    var msgEl = document.getElementById('login-msg');
    var u = uInput ? uInput.value.trim() : '';
    var p = pInput ? pInput.value.trim() : '';
    if (!u || !p) {
      if (msgEl) msgEl.innerHTML = "Isi username dan password dulu!";
      else alert("Isi username dan password dulu!");
      return;
    }
    if (msgEl) msgEl.innerHTML = "Memeriksa ke database...";
    
    // Panggil callGASPost via legacy-global
    const res = await window.callGASPost('processLogin', { username: u, password: p });
    
    if (res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();
      let sessionToken = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      window.session.token     = sessionToken;
      window.session.loginTime = Date.now();
      window.session.role      = (roleClean === 'rt') ? 'RT' : 'Warga';
      window.session.nik       = res.nik    ? res.nik.toString().trim()    : (res.username || u);
      window.session.nama      = res.nama   ? res.nama.toString().trim()   : '';
      window.session.alamat    = res.alamat ? res.alamat.toString().trim() : '';
      window.session.noHp      = res.noHp   ? res.noHp.toString().trim()   : '';
      localStorage.setItem('rt_user_session', JSON.stringify(window.session));
      
      await saveSessionToDatabase(sessionToken, window.session.nik, window.session.role);
      await applySessionUI();
    } else {
      if (msgEl) msgEl.innerHTML = res ? res.message : 'Login gagal!';
      else alert(res ? res.message : 'Login gagal!');
    }
  } catch (error) {
    alert("Browser JS Error: " + error.message);
  }
}
window.doLogin = doLogin;
window.processLogin = doLogin;

async function verifySessionToken() {
  if (!window.session || !window.session.token) return true;
  if (window.session.loginTime && (Date.now() - window.session.loginTime < 15000)) {
    return true;
  }
  try {
    // Gunakan legacy call
    const res = await window.callGASGet('getTableData', { sheetName: 'Sessions' });
    if (res && res.status === 'success') {
      let sessData = res.rows || [];
      let match = sessData.find(s => {
        let sTok = s[0] || s.token || s.TOKEN || '';
        return String(sTok).trim() === String(window.session.token).trim();
      });
      if (!match) {
        if (notifTimer) clearInterval(notifTimer);
        localStorage.removeItem('rt_user_session');
        showUIToast('Sesi login Anda telah dihentikan oleh RT. Mengalihkan...', 'error');
        setTimeout(() => location.reload(), 1000);
        return false;
      }
    }
    return true;
  } catch(e) {
    return true;
  }
}

async function applySessionUI() {
  document.getElementById('login-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  document.getElementById('mob-header').classList.add('show-nav');
  document.getElementById('mob-nav').classList.add('show-nav');
  
  let currentRole = window.session.role || 'Warga';
  document.querySelectorAll('.rt-only').forEach(el => {
    if (currentRole === 'RT') {
      if (el.classList.contains('bottom-nav-item')) {
        el.style.display = 'flex';
      } else if (el.matches('.sidebar a, .sheet-menu-item')) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'block';
      }
    } else {
      el.style.display = 'none';
    }
  });

  loadMenu('Dashboard');
  updateMenuBadges(true);
  requestNotifPermission();
  initRealtimeNotif();
  initRealtimePing();
  fetchNotifikasi();
  verifySessionToken();
  if (notifTimer) clearInterval(notifTimer);
  notifTimer = setInterval(async function() {
    if (window.session.token && document.visibilityState === "visible") {
      fetchNotifikasi();
      updateMenuBadges();
      verifySessionToken();
      if (currentActiveMenu === 'Dashboard' && typeof muatInfoWargaRealtime === 'function') {
        let isModalOpen = document.body.classList.contains('modal-open') || document.querySelector('.modal.show') || document.querySelector('#modal-kelola-aset:not(.hidden)');
        if (!isModalOpen) muatInfoWargaRealtime();
      }
    }
  }, 30000);
}

async function doLogout() {
  showUIConfirm('Apakah Anda yakin ingin keluar dari sistem aplikasi SISTEM INFORMASI RT 5?', async function() {
    if (window.session.token) {
      try { 
        const db = window.db || supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        await db.rpc('delete_session_secured', { p_token: window.session.token });
      } catch(e) {}
    }
    if (notifTimer) clearInterval(notifTimer);
    if (supabaseRealtimeChannel && window.db) window.db.removeChannel(supabaseRealtimeChannel);
    document.getElementById('mob-header').classList.remove('show-nav');
    document.getElementById('mob-nav').classList.remove('show-nav');
    localStorage.removeItem('rt_user_session');
    try { sessionStorage.removeItem('menuBadgeCache'); } catch(e) {}
    location.reload();
  }, 'Konfirmasi Logout');
}
window.doLogout = doLogout;

async function checkExistingSession() {
  let savedSession = localStorage.getItem('rt_user_session');
  if (savedSession) {
    try {
      let parsed = JSON.parse(savedSession);
      if (parsed && parsed.token && parsed.role) {
        window.session.token     = parsed.token;
        window.session.role      = (parsed.role.toString().toUpperCase() === 'RT') ? 'RT' : 'Warga';
        window.session.nik       = parsed.nik || '';
        window.session.nama      = parsed.nama || '';
        window.session.alamat    = parsed.alamat || '';
        window.session.noHp      = parsed.noHp || '';
        window.session.loginTime = parsed.loginTime || Date.now();
        await applySessionUI();
        verifySessionToken();
      }
    } catch(e) {
      console.warn('Gagal membaca sesi lokal:', e);
    }
  }
}
window.checkExistingSession = checkExistingSession;