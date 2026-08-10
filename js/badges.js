// ============================================================
// badges.js
// Badge jumlah menu (navbar, dashboard, Lainnya)
// Dipisah dari app.js (refactor modul). Classic script — berbagi global
// scope dengan file JS lain. URUTAN LOAD di index.html WAJIB dijaga.
// ============================================================

const MENU_BADGE_IDS = {
  'Warga':          ['badge-dmenu-Warga', 'badge-mmenu-Warga'],
  'Iuran':          ['badge-dmenu-Iuran', 'badge-mmenu-Iuran'],
  'Bansos':         ['badge-dmenu-Bansos', 'badge-mmenu-Bansos'],
  'Pengaduan':      ['badge-dmenu-Pengaduan', 'badge-smenu-Pengaduan'],
  'SuratPengantar': ['badge-dmenu-SuratPengantar', 'badge-smenu-SuratPengantar'],
  'Sumbangan':      ['badge-dmenu-Sumbangan', 'badge-smenu-Sumbangan'],
  'Aset':           ['badge-dmenu-Aset', 'badge-smenu-Aset'],
  'Aspirasi':       ['badge-dmenu-Aspirasi', 'badge-smenu-Aspirasi']
};
const SHEET_MENUS = ['Pengaduan', 'SuratPengantar', 'Keuangan', 'Sumbangan', 'Aset', 'Aspirasi', 'Kelahiran', 'Kematian', 'PindahMasuk', 'PindahKeluar', 'Pengaturan', 'Profil'];
let menuBadgeCache = null;
let menuBadgeCacheTime = 0;
const MENU_BADGE_TTL = 20000;

function setMenuBadgeText(el, count) {
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : count;
    el.style.display = 'inline-flex';
  } else {
    el.style.display = 'none';
  }
}

function applyMenuBadgeCache(counts) {
  if (!counts) return;
  for (let menu in counts) {
    const ids = MENU_BADGE_IDS[menu] || [];
    ids.forEach(id => setMenuBadgeText(document.getElementById(id), counts[menu]));
  }
  // Badge gabungan tombol "Lainnya" (jumlah semua menu di sheet)
  let total = 0;
  SHEET_MENUS.forEach(m => { total += (counts[m] || 0); });
  setMenuBadgeText(document.getElementById('badge-mmenu-Lainnya'), total);
}

async function updateMenuBadges(force = false) {
  try {
    if (!session || !session.token) return;
    // Pulihkan cache badge dari sesi terakhir (agar badge langsung tampil setelah refresh)
    if (!menuBadgeCache) {
      try {
        const saved = JSON.parse(sessionStorage.getItem('menuBadgeCache') || 'null');
        if (saved && saved.role && saved.counts) {
          const curRole = (await getValidUserRole()).toUpperCase();
          if (saved.role === curRole) {
            menuBadgeCache = saved.counts;
            menuBadgeCacheTime = 0; // paksa fetch segar
          }
        }
      } catch(e) {}
    }
    const now = Date.now();
    if (!force && menuBadgeCache && (now - menuBadgeCacheTime) < MENU_BADGE_TTL) {
      applyMenuBadgeCache(menuBadgeCache);
      if (typeof window.applyDashboardBadges === 'function') window.applyDashboardBadges(menuBadgeCache);
      return;
    }
    const role = (await getValidUserRole()).toUpperCase();
    const userNik = (session.nik || '').toString().trim();
    const userNama = (session.nama || '').toString().toLowerCase().trim();

    // allSettled: satu tabel gagal tidak mematikan badge menu lainnya
    const badgeRes = await Promise.allSettled([
      safeSupabaseSelect('Warga'), safeSupabaseSelect('Iuran'), safeSupabaseSelect('Bansos'),
      safeSupabaseSelect('Pengaduan'), safeSupabaseSelect('SuratPengantar'), safeSupabaseSelect('Sumbangan'),
      safeSupabaseSelect('Peminjaman'), safeSupabaseSelect('Aspirasi')
    ]);
    const [wargaRes, iuranRes, bansosRes, aduanRes, suratRes, sumRes, pinjamRes, aspRes] = badgeRes.map(r => (r.status === 'fulfilled' && r.value) ? r.value : { data: [] });
    const warga = wargaRes.data || [];
    const iuran = iuranRes.data || [];
    const bansos = bansosRes.data || [];
    const aduan = aduanRes.data || [];
    const surat = suratRes.data || [];
    const sumbangan = sumRes.data || [];
    const pinjam = pinjamRes.data || [];
    const aspirasi = aspRes.data || [];

    const counts = {};
    const matchOwn = (r) => {
      let rNik = cariNilaiKolom(r, ['nik', 'ktp']).trim();
      let rNama = cariNilaiKolom(r, ['nama', 'nama_lengkap']).toLowerCase().trim();
      return (userNik && rNik && rNik === userNik) || (userNama && rNama && (rNama === userNama || rNama.includes(userNama) || userNama.includes(rNama)));
    };
    const isLunasStatus = (s) => { s = String(s).toLowerCase(); return s === 'lunas' || (s.includes('lunas') && !s.includes('belum')); };
    const isPendingStatus = (s) => { s = String(s).toLowerCase(); return !s || s.includes('belum') || s.includes('menunggu') || s.includes('baru') || s.includes('proses'); };

    // Filter status "belum selesai proses" (belum diverifikasi / belum dibayar / menunggu)
    const statusOf = (r) => cariNilaiKolom(r, ['status']).toLowerCase();
    const belumProses = (s) => isPendingStatus(s) && !s.includes('selesai') && !s.includes('ditolak');
    const belumLunas  = (s) => !s || s.includes('belum') || s.includes('menunggu');

    if (role === 'RT') {
      // RT: total warga + jumlah yang BELUM diverifikasi / perlu perhatian
      counts['Warga'] = warga.length;
      counts['Iuran'] = iuran.filter(r => { let s = statusOf(r); return s.includes('menunggu') || s.includes('verifikasi'); }).length;
      counts['Bansos'] = bansos.filter(r => belumLunas(statusOf(r))).length;
      counts['Pengaduan'] = aduan.filter(r => belumProses(statusOf(r))).length;
      counts['SuratPengantar'] = surat.filter(r => belumProses(statusOf(r))).length;
      counts['Sumbangan'] = sumbangan.filter(r => { let s = statusOf(r); return isPendingStatus(s) && !s.includes('diverifikasi') && !s.includes('selesai'); }).length;
      counts['Aset'] = pinjam.filter(r => { let s = statusOf(r); return isPendingStatus(s) && !s.includes('selesai') && !s.includes('disetujui') && !s.includes('ditolak'); }).length;
      counts['Aspirasi'] = aspirasi.filter(r => { let s = statusOf(r); return !s || s.includes('baru'); }).length;
    } else {
      // Warga: badge Warga = TOTAL warga (RLS menampilkan semua warga, data sensitif disensor)
      // Badge menu lain = jumlah MILIK SENDIRI yang BELUM diverifikasi / belum dibayar (seperti menu RT)
      counts['Warga'] = warga.length;
      counts['Iuran'] = iuran.filter(r => matchOwn(r) && belumLunas(statusOf(r))).length;
      counts['Bansos'] = bansos.filter(r => matchOwn(r) && belumLunas(statusOf(r))).length;
      counts['Pengaduan'] = aduan.filter(r => matchOwn(r) && belumProses(statusOf(r))).length;
      counts['SuratPengantar'] = surat.filter(r => matchOwn(r) && belumProses(statusOf(r))).length;
      counts['Sumbangan'] = sumbangan.filter(r => { let s = statusOf(r); return matchOwn(r) && isPendingStatus(s) && !s.includes('diverifikasi') && !s.includes('selesai'); }).length;
      counts['Aset'] = pinjam.filter(r => { let s = statusOf(r); return matchOwn(r) && isPendingStatus(s) && !s.includes('selesai') && !s.includes('disetujui') && !s.includes('ditolak'); }).length;
      counts['Aspirasi'] = aspirasi.filter(r => matchOwn(r) && (!statusOf(r) || statusOf(r).includes('baru'))).length;
    }

    menuBadgeCache = counts;
    menuBadgeCacheTime = now;
    try { sessionStorage.setItem('menuBadgeCache', JSON.stringify({ role, counts })); } catch(e) {}
    applyMenuBadgeCache(counts);
    if (typeof window.applyDashboardBadges === 'function') window.applyDashboardBadges(counts);
  } catch (e) {
    console.warn('Gagal update badge menu:', e);
    // Retry (maks 3x) bila badge belum pernah tampil - agar tidak hilang selamanya
    if (!menuBadgeCache) {
      if (!window.__menuBadgeRetryCount) window.__menuBadgeRetryCount = 0;
      if (window.__menuBadgeRetryCount < 3) {
        window.__menuBadgeRetryCount++;
        setTimeout(() => { updateMenuBadges(true); }, 4000);
      }
    }
  }
}
window.updateMenuBadges = updateMenuBadges;
window.getMenuBadgeCache = () => (menuBadgeCache ? Object.assign({}, menuBadgeCache) : null);
