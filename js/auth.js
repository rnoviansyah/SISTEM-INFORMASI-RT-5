// ============================================================
// auth.js
// Autentikasi & sesi login
// Dipisah dari app.js (refactor modul). Classic script — berbagi global
// scope dengan file JS lain. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

async function saveSessionToDatabase(token, nik, role) {
  if (!token || !nik) return;
  try {
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
    // Indikator loading = animasi pintu pada tombol Masuk; teks "Memeriksa..."
    // sengaja tidak ditampilkan agar tidak perlu di-sweep berkala (lihat index.html).
    const res = await callRpcPost('processLogin', { username: u, password: p });
    if (res && res.status === 'success') {
      var roleClean = res.role.toString().trim().toLowerCase();
      // security_patch_v11: token dibuat DI SERVER (RPC login_secured,
      // gen_random_uuid) dan sesi sudah tersimpan — frontend tinggal pakai
      // hasilnya. Fallback DB lama (tanpa v11): token dibuat klien lalu
      // disimpan via save_session_secured.
      var tokenDariServer = !!(res.token && String(res.token).trim());
      var sessionToken = tokenDariServer ? String(res.token).trim()
                        : ('SESS-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
      session.token     = sessionToken;
      session.loginTime = Date.now();
      // Patch v12: sesi kedaluwarsa 30 hari (server enforce via expires_at).
      session.expiresAt = res.expires_at ? new Date(res.expires_at).getTime() : (Date.now() + 30 * 24 * 3600 * 1000);
      session.role      = (roleClean === 'rt') ? 'RT' : 'Warga';
      session.nik       = res.nik    ? res.nik.toString().trim()    : (res.username || u);
      session.nama      = res.nama   ? res.nama.toString().trim()   : '';
      session.alamat    = res.alamat ? res.alamat.toString().trim() : '';
      session.noHp      = res.noHp   ? res.noHp.toString().trim()   : '';
      localStorage.setItem('rt_user_session', JSON.stringify(session));
      // Sesi dari login_secured sudah ada di DB — jangan disimpan dua kali.
      if (!tokenDariServer) await saveSessionToDatabase(sessionToken, session.nik, session.role);
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
  if (!session || !session.token) return true;
  // Patch v12: sesi kedaluwarsa -> logout otomatis (server juga menolak).
  if (session.expiresAt && Date.now() > session.expiresAt) {
    if (notifTimer) clearInterval(notifTimer);
    localStorage.removeItem('rt_user_session');
    showUIToast('Sesi login Anda telah kedaluwarsa. Silakan login ulang.', 'error');
    setTimeout(function() { location.reload(); }, 1000);
    return false;
  }
  if (session.loginTime && (Date.now() - session.loginTime < 15000)) {
    return true;
  }
  try {
    delete menuDataCache['Sessions'];
    const { data: sessData, error } = await safeSupabaseSelect('Sessions');
    if (error) return true;
    let match = (sessData || []).find(s => {
      let sTok = s.token || s.TOKEN || '';
      return String(sTok).trim() === String(session.token).trim();
    });
    if (!match && Array.isArray(sessData)) {
      if (notifTimer) clearInterval(notifTimer);
      localStorage.removeItem('rt_user_session');
      showUIToast('Sesi login Anda telah dihentikan oleh RT. Mengalihkan...', 'error');
      setTimeout(() => location.reload(), 1000);
      return false;
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
  
  let currentRole = await getValidUserRole();
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
  fetchNotifikasi();
  verifySessionToken();
  if (notifTimer) clearInterval(notifTimer);
  // Temuan audit: polling 30 dtk redundan dengan Supabase Realtime
  // (postgres_changes sudah mengirim perubahan via WebSocket). Jeda diperpanjang
  // ke 3 menit dan hanya jadi FALLBACK — saat channel realtime SUBSCRIBED,
  // notifikasi/badge datang lewat socket (services/realtime.js) sehingga
  // fetch berkala dilewati.
  notifTimer = setInterval(async function() {
    if (!session.token || document.visibilityState !== "visible") return;
    if (!realtimeActive) {
      fetchNotifikasi();
      updateMenuBadges();
      if (currentActiveMenu === 'Dashboard' && typeof muatInfoWargaRealtime === 'function') {
        let isModalOpen = document.body.classList.contains('modal-open') || document.querySelector('.modal.show') || document.querySelector('#modal-kelola-aset:not(.hidden)');
        if (!isModalOpen) muatInfoWargaRealtime();
      }
    }
    // Validasi sesi tetap berjalan berkala (3 menit) di kedua mode.
    verifySessionToken();
  }, 180000);
}

async function doLogout() {
  showUIConfirm('Apakah Anda yakin ingin keluar dari sistem aplikasi SISTEM INFORMASI RT 5?', async function() {
    if (session.token) {
      try { await safeSupabaseDelete('Sessions', 'token', session.token); } catch(e) {}
    }
    if (notifTimer) clearInterval(notifTimer);
    if (supabaseRealtimeChannel && db) db.removeChannel(supabaseRealtimeChannel);
    document.getElementById('mob-header').classList.remove('show-nav');
    document.getElementById('mob-nav').classList.remove('show-nav');
    localStorage.removeItem('rt_user_session');
    try { sessionStorage.removeItem('menuBadgeCache'); } catch(e) {}
    location.reload();
  }, 'Konfirmasi Logout');
}

async function checkExistingSession() {
  let savedSession = localStorage.getItem('rt_user_session');
  if (savedSession) {
    try {
      let parsed = JSON.parse(savedSession);
      if (parsed && parsed.token && parsed.role) {
        session.token     = parsed.token;
        session.role      = (parsed.role.toString().toUpperCase() === 'RT') ? 'RT' : 'Warga';
        session.nik       = parsed.nik || '';
        session.nama      = parsed.nama || '';
        session.alamat    = parsed.alamat || '';
        session.noHp      = parsed.noHp || '';
        session.loginTime = parsed.loginTime || Date.now();
        session.expiresAt = parsed.expiresAt || (Date.now() + 30 * 24 * 3600 * 1000);
        await applySessionUI();
        verifySessionToken();
      }
    } catch(e) {
      console.warn('Gagal membaca sesi lokal:', e);
    }
  }
}
