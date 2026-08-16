// ============================================================
// services/realtime.js
// Layanan realtime & notifikasi: channel Supabase (postgres_changes),
// fetch notifikasi, modal notifikasi.
// Dipisah dari app.js (refactor modul). Classic script — berbagi
// global scope. URUTAN LOAD di index.html WAJIB dijaga
// (setelah config, helpers, dan services/api).
//
// KEBIJAKAN NOTIFIKASI REALTIME:
//  - Suara + notifikasi native browser HANYA untuk event INSERT pada
//    tabel yang relevan bagi warga/RT (Pengaduan, SuratPengantar, dll).
//  - Perubahan lain (UPDATE/DELETE, atau tabel non-notifikasi seperti
//    Warga / Keuangan) hanya memicu REFRESH SENYAP + debounce — badge
//    dan daftar notifikasi tetap akurat tanpa spam suara/notifikasi.
//  - Channel broadcast ping (rt-ping) dihapus: perubahan data di
//    database sudah otomatis diterima semua perangkat lewat
//    postgres_changes, jadi ping terpisah hanya menambah traffic.
// ============================================================

// Tabel yang memicu suara + notifikasi native saat ada INSERT baru.
// (huruf kecil — payload postgres_changes bisa beda kapitalisasi)
const REALTIME_NOTIF_TABLES = [
  'pengaduan', 'suratpengantar', 'peminjaman', 'iuran', 'sumbangan',
  'aspirasi', 'bansos', 'kelahiran', 'kematian', 'pindahmasuk', 'pindahkeluar'
];

let silentRefreshTimer = null;
// Refresh senyap dengan debounce: banyak perubahan beruntun (mis. insert
// massal warga) hanya memicu SATU fetch, bukan satu per satu.
function scheduleSilentRefresh() {
  if (silentRefreshTimer) clearTimeout(silentRefreshTimer);
  silentRefreshTimer = setTimeout(function() {
    silentRefreshTimer = null;
    if (session && session.token) {
      fetchNotifikasi(false);
      if (typeof updateMenuBadges === 'function') updateMenuBadges();
    }
  }, 1000);
}

function initRealtimeNotif() {
  if (!db || !session.token) return;
  if (supabaseRealtimeChannel) db.removeChannel(supabaseRealtimeChannel);
  supabaseRealtimeChannel = db
    .channel('rt-realtime-notif')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      const tableKey = String(payload.table || '').toLowerCase();
      const isInsert = payload.eventType === 'INSERT';
      const isNotifTable = REALTIME_NOTIF_TABLES.indexOf(tableKey) !== -1;

      if (isInsert && isNotifTable) {
        console.log('⚡ Realtime INSERT diterima:', payload.table);
        // Perubahan yang relevan: suara + notifikasi native + refresh
        playNotifSound();
        triggerNativeBrowserNotif(
          '📢 Info Baru di RT 5',
          `Ada pembaruan data di ${payload.table}`
        );
        fetchNotifikasi(true);
      } else {
        // UPDATE/DELETE atau tabel non-notifikasi: refresh senyap (badge
        // & notifikasi tetap akurat, tanpa spam suara/notifikasi).
        scheduleSilentRefresh();
      }

      // Verifikasi sesi jika ada perubahan di tabel Sessions
      if (tableKey === 'sessions') {
        verifySessionToken();
      }
    })
    .subscribe((status) => {
      // Lacak status socket — polling berkala (auth.js) di-skip saat
      // realtime aktif, jadi fallback hanya jalan bila socket putus.
      realtimeActive = (status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') console.log('🟢 Supabase Realtime Listener Active!');
    });
}

async function fetchNotifikasi(isRealtimeTrigger = false) {
  if (!session.token) return;
  const res = await callRpcGet('getNotifications');
  if (res && res.status === 'success') {
    rawNotifData = res.data || [];
    let savedTimestamps = JSON.parse(localStorage.getItem('rt_notif_times_' + session.nik) || '{}');
    let now = new Date();
    rawNotifData.forEach(item => {
      let notifDate = null;
      if (item.rawDate) {
        notifDate = parseTanggalKeDate(item.rawDate);
      }
      if ((!notifDate || isNaN(notifDate.getTime())) && savedTimestamps[item.id]) {
        let savedDate = new Date(savedTimestamps[item.id]);
        if (!isNaN(savedDate.getTime())) notifDate = savedDate;
      }
      if (!notifDate || isNaN(notifDate.getTime())) {
        notifDate = new Date();
        savedTimestamps[item.id] = notifDate.toISOString();
      } else {
        savedTimestamps[item.id] = notifDate.toISOString();
      }
      item.timestampMs = notifDate.getTime();
      let nowJakarta = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      let isHariIni = notifDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) === nowJakarta;
      let jamStr = notifDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':') + ' WIB';
      item.waktuTampil = isHariIni ? jamStr : (notifDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + jamStr);
    });
    localStorage.setItem('rt_notif_times_' + session.nik, JSON.stringify(savedTimestamps));
    rawNotifData.sort((a, b) => (b.timestampMs || 0) - (a.timestampMs || 0));
    let unreadCount = rawNotifData.length;
    if (isRealtimeTrigger && unreadCount > lastNotifCount && lastNotifCount !== 0) {
      playNotifSound();
      let notifTerbaru = rawNotifData[0];
      if (notifTerbaru) triggerNativeBrowserNotif(`RT 5 - ${notifTerbaru.menu}`, notifTerbaru.pesan);
    }
    lastNotifCount = unreadCount;
    let readCount = parseInt(localStorage.getItem('rt_notif_read_count_' + session.nik) || '0');
    if (rawNotifData.length < readCount) { readCount = 0; localStorage.setItem('rt_notif_read_count_' + session.nik, '0'); }
    let actualUnread = rawNotifData.length - readCount;
    document.querySelectorAll('.notif-badge').forEach(badge => {
      if (actualUnread > 0) {
        badge.innerText = actualUnread;
        badge.style.display = 'inline-block';
        badge.classList.add('animate-pulse');
      } else {
        badge.style.display = 'none';
        badge.classList.remove('animate-pulse');
      }
    });
    
    // 🔔 UPDATE BADGE NOTIFIKASI
    updateBadgeNotifikasi();
    updateMenuBadges();
  }
}

function bukaModalNotifikasi() {
  let listEl = document.getElementById('notifList');
  if (!rawNotifData || rawNotifData.length === 0) {
    listEl.innerHTML = '<div class="alert alert-light text-center my-3 text-muted"><i class="bi bi-bell-slash fs-4 d-block mb-2"></i>Tidak ada notifikasi baru saat ini.</div>';
  } else {
    let html = '<div class="list-group list-group-flush">';
    rawNotifData.forEach(item => {
      let waktu = item.waktuTampil || 'Baru saja';
      html += `
        <div class="list-group-item list-group-item-action py-3 px-2 border-bottom" style="cursor:pointer;" onclick="bukaNotifTarget('${escJsStr(item.menu)}')">
          <div class="d-flex w-100 justify-content-between align-items-center mb-1">
            <span class="badge bg-primary">${escHtml(item.menu)}</span>
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${escHtml(waktu)}</small>
          </div>
          <p class="mb-0 text-dark small">${escHtml(item.pesan)}</p>
        </div>`;
    });
    html += '</div>';
    listEl.innerHTML = html;
  }
  document.querySelectorAll('.notif-badge').forEach(badge => {
    badge.style.display = 'none';
    badge.innerText = '0';
    badge.classList.remove('animate-pulse');
  });
  localStorage.setItem('rt_notif_read_count_' + session.nik, rawNotifData.length);
  if (!bootstrapNotifModalInstance) bootstrapNotifModalInstance = new bootstrap.Modal(document.getElementById('notifModal'));
  bootstrapNotifModalInstance.show();
  
  // Tambahkan tombol "Tandai Semua Dibaca"
  setTimeout(() => {
    const notifList = document.getElementById('notifList');
    if (notifList) {
      const header = notifList.querySelector('.notif-header');
      if (!header) {
        const newHeader = document.createElement('div');
        newHeader.className = 'notif-header d-flex justify-content-between align-items-center mb-2 p-2 border-bottom';
        newHeader.innerHTML = `
          <span class="text-xs text-muted"><i class="bi bi-bell me-1"></i>Notifikasi</span>
          <button onclick="tandaiSemuaDibaca()" class="btn btn-sm btn-outline-primary py-0 px-2 rounded text-xs fw-bold">
            <i class="bi bi-check-all me-1"></i>Tandai Semua Dibaca
          </button>
        `;
        notifList.prepend(newHeader);
      }
    }
  }, 100);
}

function bukaNotifTarget(menuName) {
  if (bootstrapNotifModalInstance) bootstrapNotifModalInstance.hide();
  loadMenu(menuName);
}
