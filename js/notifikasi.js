// ============================================================
// NOTIFIKASI - Manajemen Izin, Badge, & Push Notification
// Developed by Rizky Noviansyah
// ============================================================

// 1. Minta Izin Notifikasi
async function mintaIzinNotifikasi() {
  if (!('Notification' in window)) {
    showUIToast('Browser Anda tidak mendukung notifikasi.', 'error');
    return false;
  }

  if (Notification.permission === 'granted') {
    showUIToast('Notifikasi sudah aktif! ✅', 'success');
    updateNotifStatusUI();
    return true;
  }

  if (Notification.permission === 'denied') {
    showUIToast('Izin notifikasi ditolak. Aktifkan di pengaturan browser.', 'error');
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showUIToast('Notifikasi diaktifkan! 🎉', 'success');
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        setTimeout(() => {
          reg.showNotification('✅ Notifikasi Aktif!', {
            body: 'Anda akan menerima notifikasi dari RT 5',
            icon: './img/logo.webp',
            badge: './img/logo.webp'
          });
        }, 1000);
      } catch (err) {
        console.error('❌ Gagal daftar SW:', err);
      }
    }
    updateNotifStatusUI();
    return true;
  } else {
    showUIToast('Izin notifikasi ditolak.', 'error');
    updateNotifStatusUI();
    return false;
  }
}
window.mintaIzinNotifikasi = mintaIzinNotifikasi;

// 2. Update Status UI Notifikasi
function updateNotifStatusUI() {
  const statusEl = document.getElementById('notif-status');
  if (!statusEl) return;
  
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') {
      statusEl.innerHTML = '<span class="text-emerald-600"><i class="bi bi-check-circle-fill me-1"></i> Notifikasi aktif</span>';
    } else if (Notification.permission === 'denied') {
      statusEl.innerHTML = '<span class="text-red-600"><i class="bi bi-x-circle-fill me-1"></i> Notifikasi diblokir</span>';
    } else {
      statusEl.innerHTML = '<span class="text-gray-400"><i class="bi bi-info-circle me-1"></i> Klik tombol untuk mengaktifkan</span>';
    }
  }
}

// 3. Update Badge Notifikasi
async function updateBadgeNotifikasi() {
  try {
    const supabase = window.db;
    if (!supabase) return;

    const userNik = window.session?.nik || localStorage.getItem('nik') || '';
    if (!userNik) {
      return;
    }

    // Coba ambil dari tabel Notifikasi
    const { count, error } = await supabase
      .from('Notifikasi')
      .select('id', { count: 'exact', head: true })
      .eq('dibaca', false)
      .eq('nik', userNik);

    if (error) {
      // Jika tabel belum ada, fallback ke notifikasi dari rawNotifData
      console.warn('Tabel Notifikasi belum ada, fallback ke rawNotifData');
      const unreadCount = rawNotifData ? rawNotifData.length : 0;
      updateBadgeDOM(unreadCount);
      return;
    }

    const unreadCount = count || 0;
    updateBadgeDOM(unreadCount);
    localStorage.setItem('rt_notif_unread_' + userNik, unreadCount);

  } catch (error) {
    console.error('Gagal update badge:', error);
  }
}
window.updateBadgeNotifikasi = updateBadgeNotifikasi;

// Helper: Update DOM Badge
function updateBadgeDOM(count) {
  const badges = document.querySelectorAll('.notif-badge');
  badges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
      badge.classList.add('animate-pulse');
    } else {
      badge.style.display = 'none';
      badge.classList.remove('animate-pulse');
    }
  });
}

// 4. Tandai Notifikasi Dibaca (per item)
async function tandaiDibaca(id) {
  try {
    const supabase = window.db;
    if (!supabase) return;

    await supabase
      .from('Notifikasi')
      .update({ dibaca: true })
      .eq('id', id);

    updateBadgeNotifikasi();

  } catch (error) {
    console.error('Gagal tandai dibaca:', error);
  }
}
window.tandaiDibaca = tandaiDibaca;

// 5. Kirim Notifikasi
async function kirimNotifikasi(judul, pesan, url = './') {
  try {
    const supabase = window.db;
    if (!supabase) {
      console.warn('Database tidak terhubung.');
      return;
    }

    const userNik = window.session?.nik || localStorage.getItem('nik') || '';
    if (!userNik) {
      console.warn('Tidak ada NIK user.');
      return;
    }

    const { error } = await supabase
      .from('Notifikasi')
      .insert([{
        judul: judul,
        pesan: pesan,
        url: url,
        nik: userNik,
        dibaca: false,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;

    updateBadgeNotifikasi();

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(judul, {
        body: pesan,
        icon: './img/logo.webp',
        badge: './img/logo.webp',
        vibrate: [100, 50, 100],
        data: { url: url }
      });
    }


  } catch (error) {
    console.error('Gagal kirim notifikasi:', error);
  }
}
window.kirimNotifikasi = kirimNotifikasi;

// 6. Tandai Semua Dibaca
async function tandaiSemuaDibaca() {
  try {
    const supabase = window.db;
    if (!supabase) return;

    const userNik = window.session?.nik || localStorage.getItem('nik') || '';
    if (!userNik) return;

    const { error } = await supabase
      .from('Notifikasi')
      .update({ dibaca: true })
      .eq('dibaca', false)
      .eq('nik', userNik);

    if (error) throw error;

    updateBadgeNotifikasi();
    showUIToast('Semua notifikasi ditandai dibaca ✅', 'success');

    const notifModal = document.getElementById('notifModal');
    if (notifModal && notifModal.classList.contains('show')) {
      bukaModalNotifikasi();
    }

  } catch (error) {
    console.error('Gagal tandai semua dibaca:', error);
  }
}
window.tandaiSemuaDibaca = tandaiSemuaDibaca;

// 7. Buka Modal Notifikasi (override yang asli)
const originalBukaModalNotifikasi = window.bukaModalNotifikasi || function() {};

window.bukaModalNotifikasi = function() {
  // Panggil yang asli dulu
  if (typeof originalBukaModalNotifikasi === 'function') {
    originalBukaModalNotifikasi();
  }
  
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
};

// 8. Init Notifikasi
document.addEventListener('DOMContentLoaded', function() {
  // Update badge setiap 30 detik
  setInterval(updateBadgeNotifikasi, 30000);
  
  // Update badge pertama kali
  setTimeout(updateBadgeNotifikasi, 2000);
  
  // Update status UI notifikasi
  updateNotifStatusUI();
});

// 9. Override fetchNotifikasi untuk update badge
const originalFetchNotifikasi = window.fetchNotifikasi || function() {};

window.fetchNotifikasi = async function(isRealtimeTrigger = false) {
  // Panggil yang asli
  if (typeof originalFetchNotifikasi === 'function') {
    await originalFetchNotifikasi(isRealtimeTrigger);
  }
  
  // Update badge
  setTimeout(updateBadgeNotifikasi, 500);
};