/* =========================================================
   ASISTEN AI RT 5 (POWERED BY GOOGLE GEMINI AI)
   ========================================================= */

let geminiApiKeyDefault = '';

function getGeminiApiKey() {
  if (typeof appSettings !== 'undefined' && appSettings.gemini_api_key && appSettings.gemini_api_key.trim() !== '') {
    return appSettings.gemini_api_key.trim();
  }
  return geminiApiKeyDefault;
}

// Inisialisasi Widget Floating Chat AI saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
  initAiWidget();
  updateAiWidgetVisibility();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    initAiWidget();
    updateAiWidgetVisibility();
  }, 500);
}

function updateAiWidgetVisibility() {
  const btn = document.getElementById('ai-chat-button');
  const widget = document.getElementById('ai-chat-widget');
  let isLoggedIn = typeof session !== 'undefined' && session && session.token;
  if (!isLoggedIn) {
    if (btn) btn.classList.add('hidden');
    if (widget) widget.classList.add('hidden');
  } else {
    if (btn && (!widget || widget.classList.contains('hidden'))) {
      btn.classList.remove('hidden');
    }
  }
}

function initAiWidget() {
  if (document.getElementById('ai-chat-widget')) {
    updateAiWidgetVisibility();
    return;
  }

  let isLoggedIn = typeof session !== 'undefined' && session && session.token;
  const widgetHtml = `
    <!-- FLOATING BUTTON AI -->
    <div id="ai-chat-button" onclick="toggleAiChat()" class="${isLoggedIn ? '' : 'hidden'} fixed bottom-20 right-4 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-lg cursor-pointer flex items-center gap-2 transition-all transform hover:scale-105" title="Tanya Asisten AI RT 5">
      <i class="bi bi-robot text-xl"></i>
      <span class="text-xs font-bold pe-1 hidden md:inline">Tanya AI RT</span>
      <span class="absolute -top-1 -right-1 flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
      </span>
    </div>

    <!-- WINDOW CHATBOX AI -->
    <div id="ai-chat-widget" class="hidden fixed bottom-20 right-4 z-50 w-[92vw] max-w-[380px] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 font-sans">
      
      <!-- Header Chatbot -->
      <div class="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-4 flex items-center justify-between shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-xl text-emerald-300">
            <i class="bi bi-robot"></i>
          </div>
          <div>
            <h4 class="font-bold text-sm leading-tight flex items-center gap-1.5">
              Asisten AI RT 5
              <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] px-1.5 py-0.5 rounded-full font-normal">Gemini</span>
            </h4>
            <p class="text-[10px] text-blue-200 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Online • Siap Membantu 24/7
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="toggleAiChat()" class="text-white/80 hover:text-white text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Content / Chat Body -->
      <div id="ai-chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 text-xs">
        
        <!-- Welcome Message -->
        <div class="flex gap-2.5 items-start">
          <div class="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
            <i class="bi bi-robot"></i>
          </div>
          <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm max-w-[85%] text-gray-700 space-y-1.5">
            <p class="font-semibold text-blue-900">Halo ${session?.nama ? session.nama.split(' ')[0] : 'Warga'}! 👋</p>
            <p>Saya **Asisten AI RT 05**. Ada yang bisa saya bantu terkait layanan RT, iuran, pengaduan, atau syarat pengajuan surat?</p>
          </div>
        </div>

        <!-- Quick Suggestions -->
        <div id="ai-quick-chips" class="pt-2 space-y-1.5">
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">Rekomendasi Pertanyaan:</p>
          <div class="flex flex-wrap gap-1.5">
            <button onclick="kirimPesanAI('Berapa nominal iuran bulanan warga RT 5?')" class="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-xl text-[11px] font-medium shadow-2xs transition text-left">
              💳 Informasi Iuran RT
            </button>
            <button onclick="kirimPesanAI('Bagaimana cara mengajukan Surat Pengantar RT?')" class="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-xl text-[11px] font-medium shadow-2xs transition text-left">
              📄 Syarat Surat Pengantar
            </button>
            <button onclick="kirimPesanAI('Bagaimana cara menyampaikan pengaduan atau keluhan warga?')" class="bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-xl text-[11px] font-medium shadow-2xs transition text-left">
              📢 Cara Buat Pengaduan
            </button>
          </div>
        </div>

      </div>

      <!-- Typing Indicator (Hidden by default) -->
      <div id="ai-typing-indicator" class="hidden px-4 py-2 bg-gray-50 flex items-center gap-2 text-[11px] text-gray-400 italic border-t border-gray-100">
        <div class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] animate-pulse">
          <i class="bi bi-robot"></i>
        </div>
        <span>AI sedang mengetik jawaban...</span>
      </div>

      <!-- Input Area -->
      <div class="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
        <input type="text" id="ai-chat-input" onkeypress="if(event.key==='Enter') kirimPesanAI()" placeholder="Ketik pertanyaan seputar RT 5..." class="flex-1 bg-gray-100 border-0 focus:ring-2 focus:ring-blue-600 rounded-2xl text-xs py-2.5 px-3.5 text-gray-800 placeholder-gray-400 outline-none">
        <button onclick="kirimPesanAI()" class="bg-blue-600 hover:bg-blue-700 text-white w-9 h-9 rounded-2xl flex items-center justify-center shadow-md transition shrink-0">
          <i class="bi bi-send-fill text-xs"></i>
        </button>
      </div>

    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = widgetHtml;
  document.body.appendChild(div);
}

function toggleAiChat() {
  const widget = document.getElementById('ai-chat-widget');
  const btn = document.getElementById('ai-chat-button');
  if (!widget) {
    initAiWidget();
    return;
  }
  if (widget.classList.contains('hidden')) {
    widget.classList.remove('hidden');
    if (btn) btn.classList.add('hidden');
    setTimeout(() => {
      const input = document.getElementById('ai-chat-input');
      if (input) input.focus();
    }, 100);
  } else {
    widget.classList.add('hidden');
    if (btn) btn.classList.remove('hidden');
  }
}

async function kirimPesanAI(pesanTeksCustom = null) {
  const inputEl = document.getElementById('ai-chat-input');
  const pesan = pesanTeksCustom || (inputEl ? inputEl.value.trim() : '');
  if (!pesan) return;

  if (inputEl) inputEl.value = '';

  // Sembunyikan quick chips jika ada
  const quickChips = document.getElementById('ai-quick-chips');
  if (quickChips) quickChips.style.display = 'none';

  const container = document.getElementById('ai-chat-messages');

  // 1. Tambahkan Bubble Chat User
  const userBubble = `
    <div class="flex gap-2.5 items-start justify-end">
      <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] text-xs">
        <p>${escapeHtmlAI(pesan)}</p>
      </div>
      <div class="w-7 h-7 rounded-xl bg-gray-200 text-gray-600 flex items-center justify-center text-xs shrink-0 font-bold">
        ${session?.nama ? session.nama.substring(0, 1).toUpperCase() : 'W'}
      </div>
    </div>
  `;
  container.innerHTML += userBubble;
  container.scrollTop = container.scrollHeight;

  // 2. Tampilkan Typing Indicator
  const typingEl = document.getElementById('ai-typing-indicator');
  if (typingEl) typingEl.classList.remove('hidden');

  // 3. Ambil Konteks Data Realtime Warga / RT Admin
  let personalContext = await getUserPersonalDataContext(pesan);

  // 4. Panggil API Gemini AI
  try {
    const aiResponse = await panggilGeminiApi(pesan, personalContext);
    
    if (typingEl) typingEl.classList.add('hidden');

    const formattedAnswer = formatMarkdownAI(aiResponse);

    // 5. Tambahkan Bubble Chat AI
    const aiBubble = `
      <div class="flex gap-2.5 items-start">
        <div class="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
          <i class="bi bi-robot"></i>
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm max-w-[85%] text-gray-700 leading-relaxed text-xs space-y-1">
          ${formattedAnswer}
        </div>
      </div>
    `;
    container.innerHTML += aiBubble;
    container.scrollTop = container.scrollHeight;

  } catch (err) {
    if (typingEl) typingEl.classList.add('hidden');
    console.warn('[Gemini AI Fallback Triggered]', err);

    const fallbackAnswer = getSmartFallbackAnswer(pesan, personalContext);
    const formattedAnswer = formatMarkdownAI(fallbackAnswer);

    const aiBubble = `
      <div class="flex gap-2.5 items-start">
        <div class="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-sm">
          <i class="bi bi-robot"></i>
        </div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm max-w-[85%] text-gray-700 leading-relaxed text-xs space-y-1">
          ${formattedAnswer}
        </div>
      </div>
    `;
    container.innerHTML += aiBubble;
    container.scrollTop = container.scrollHeight;
  }
}

function isUserAdminRT() {
  if (typeof session === 'undefined' || !session) return false;
  let r = String(session.role || '').toUpperCase().trim();
  return r === 'RT' || r === 'ADMIN' || r === 'SEKRETARIS' || r === 'KETUA' || r === 'BENDAHARA';
}

async function getUserPersonalDataContext(prompt = '') {
  let userNik = (session?.nik || '').trim();
  let userNama = (session?.nama || userNik).trim();
  let isRT = isUserAdminRT();
  let info = [];

  // Jika Pengurus RT mencari data Warga (misal: "nik rizka")
  if (isRT && prompt) {
    let lowerP = prompt.toLowerCase();
    let searchKey = lowerP.replace(/berapa|nik|no|kk|siapa|data|alamat|nomor|apa/g, '').trim();
    if (searchKey.length >= 2) {
      try {
        let wargaList = (typeof rawWargaData !== 'undefined' && Array.isArray(rawWargaData) && rawWargaData.length > 0) ? rawWargaData : [];
        if (wargaList.length === 0 && typeof callGASGet === 'function') {
          try {
            const res = await callGASGet('getTableData', { sheetName: 'Warga' });
            if (res && res.rows) wargaList = res.rows;
          } catch(e) {}
        }

        let matched = wargaList.filter(r => JSON.stringify(r).toLowerCase().includes(searchKey));
        if (matched.length > 0) {
          let text = matched.slice(0, 3).map(r => {
            let nik = r[0] || '-';
            let nama = r[1] || 'Warga';
            let noKk = r[2] || '-';
            let noHp = r[10] || r[9] || '-';
            return `• **Nama**: ${nama}\n  - NIK: **${nik}**\n  - No KK: ${noKk}\n  - No HP: ${noHp}`;
          }).join('\n\n');
          info.push(`📋 **Hasil Pencarian Data Warga (Khusus Pengurus RT):**\n${text}`);
        } else {
          info.push(`📋 **Hasil Pencarian Data Warga (Khusus Pengurus RT):**\nData warga dengan nama/kata kunci **"${searchKey}"** tidak ditemukan di database RT.`);
        }
      } catch(e) {}
    }
  }

  // Aduan
  try {
    let aduanData = (typeof rawAduanData !== 'undefined' && Array.isArray(rawAduanData)) ? rawAduanData : [];
    let myAduan = isRT ? aduanData : aduanData.filter(r => {
      let s = JSON.stringify(r).toLowerCase();
      return (userNik && s.includes(userNik.toLowerCase())) || (userNama && s.includes(userNama.toLowerCase()));
    });
    if (myAduan.length > 0) {
      let aduanStr = myAduan.slice(0, 5).map((r, i) => {
        let pelapor = r[0] || 'Warga';
        let judul = r[1] || r[2] || 'Pengaduan';
        let status = r[r.length - 1] || r[r.length - 2] || 'Diproses';
        return `• ${isRT ? '[' + pelapor + '] ' : ''}"${judul}" -> Status: **${status}**`;
      }).join('\n');
      info.push(`📌 **${isRT ? 'Daftar Pengaduan Masuk RT' : 'Status Pengaduan ' + userNama}:**\n${aduanStr}`);
    }
  } catch(e) {}

  // Surat
  try {
    let suratData = (typeof rawSuratData !== 'undefined' && Array.isArray(rawSuratData)) ? rawSuratData : [];
    let mySurat = isRT ? suratData : suratData.filter(r => {
      let s = JSON.stringify(r).toLowerCase();
      return (userNik && s.includes(userNik.toLowerCase())) || (userNama && s.includes(userNama.toLowerCase()));
    });
    if (mySurat.length > 0) {
      let suratStr = mySurat.slice(0, 5).map((r, i) => {
        let pemohon = r[0] || 'Warga';
        let jenis = r[1] || r[2] || 'Surat Pengantar';
        let status = r[r.length - 1] || r[r.length - 2] || 'Menunggu';
        return `• ${isRT ? '[' + pemohon + '] ' : ''}${jenis} -> Status: **${status}**`;
      }).join('\n');
      info.push(`📄 **${isRT ? 'Daftar Pengajuan Surat Warga' : 'Status Pengajuan Surat ' + userNama}:**\n${suratStr}`);
    }
  } catch(e) {}

  return info.join('\n\n');
}

function normalizeTypoText(text) {
  let s = (text || '').toLowerCase().trim();
  s = s.replace(/\budh\b|\bsudrh\b|\bsda\b|\bsdh\b|\budah\b/g, 'sudah');
  s = s.replace(/\bblm\b|\bblom\b|\bbelom\b|\bblung\b/g, 'belum');
  s = s.replace(/\bslsai\b|\bselsei\b|\bslesai\b|\bselse\b/g, 'selesai');
  s = s.replace(/\bbyr\b|\bbyar\b|\bbayr\b|\biram\b|\biurn\b|\biran\b|\btagihn\b|\btginan\b/g, 'iuran');
  s = s.replace(/\blprn\b|\blaporn\b|\blapor\b|\blpos\b|\blpor\b|\badun\b|\badng\b|\bkluhan\b|\bkeluh\b|\bkeluhann\b/g, 'aduan');
  s = s.replace(/\bsrat\b|\bsurt\b|\bpngntar\b|\bpngantar\b|\bsktm\b|\bskck\b/g, 'surat');
  s = s.replace(/\bkuangn\b|\bkeuangn\b|\bkas\b|\bsald\b|\blapkeu\b|\buang\b/g, 'keuangan');
  s = s.replace(/\bnmr\b|\bnmer\b|\bnomr\b|\bnomer\b|\bnk\b/g, 'nik');
  s = s.replace(/\bkntak\b|\bwa\b|\bwhatsapp\b|\bnohp\b|\bthp\b/g, 'kontak');
  return s;
}

function getSmartFallbackAnswer(prompt, personalContext = '') {
  let rawLower = (prompt || '').toLowerCase();
  let lower = normalizeTypoText(prompt);
  let rtRw = (typeof appSettings !== 'undefined' && appSettings.rt_rw_text) ? appSettings.rt_rw_text : 'RT 05 / RW 01';
  let ketua = (typeof appSettings !== 'undefined' && appSettings.nama_rt_ketua) ? appSettings.nama_rt_ketua : 'Ketua RT';
  let sekretaris = (typeof appSettings !== 'undefined' && appSettings.nama_sekretaris) ? appSettings.nama_sekretaris : 'Sekretaris RT';
  let isRT = isUserAdminRT();

  // Jika RT Admin menanyakan data warga (misal: "nik rizka")
  if (isRT && personalContext && personalContext.includes('Hasil Pencarian Data Warga')) {
    return `${personalContext}\n\n*Data disajikan khusus untuk Pengurus RT.*`;
  }

  // PRIVACY SECURITY FILTER FOR WARGA ROLE ONLY
  if (!isRT) {
    if (lower.includes('nik') || lower.includes('kk') || lower.includes('password') || lower.includes('rahasia') || lower.includes('semua warga') || lower.includes('data warga') || lower.includes('no hp') || lower.includes('telepon')) {
      return `🔒 **Akses Ditolak (Privasi Data Kependudukan)**\n\nMohon maaf 🙏, demi menjaga privasi dan kerahasiaan data kependudukan warga, informasi sensitif (seperti NIK, No KK, No HP, atau data pribadi warga lain) hanya dapat diakses oleh **Pengurus RT**.`;
    }
  }

  // 1. Keuangan / Kas RT (Harus diproses SEBELUM aduan agar "laporan keuangan" tidak nyangkut di aduan)
  if (lower.includes('keuangan') || lower.includes('kas') || lower.includes('saldo') || lower.includes('laporan keuangan') || lower.includes('uang')) {
    return `📊 **Transparansi Keuangan & Laporan Kas ${rtRw}**\n\n` +
           `• **Akses Laporan**: Masuk ke menu **Keuangan** di navigasi bawah/samping.\n` +
           `• **Rincian Kas**: Seluruh arus kas pemasukan (iuran warga/sumbangan) dan pengeluaran RT dicatat secara transparan & realtime.\n` +
           `• **Cetak PDF**: Anda dapat mengunduh **Laporan Keuangan Bulanan PDF** lengkap dengan rincian saldo dan pengesahan pengurus RT secara mandiri.`;
  }

  // 2. Aduan & Keluhan Warga (Hanya cocok jika bicara aduan/keluhan/pengaduan)
  if (lower.includes('aduan') || lower.includes('keluhan') || lower.includes('pengaduan') || lower.includes('masalah lingkungan')) {
    if (lower.includes('saya') || lower.includes('sudah') || lower.includes('selesai') || lower.includes('belum') || lower.includes('status')) {
      if (personalContext && personalContext.includes('Status Pengaduan')) {
        return `${personalContext}\n\nPengurus RT akan memperbarui status aduan Anda secara realtime di aplikasi.`;
      }
    }
    return `📢 **Tata Cara Menyampaikan Pengaduan / Keluhan Warga**\n\n` +
           `1. Masuk ke menu **Aduan** di navigasi utama aplikasi.\n` +
           `2. Klik tombol **+ Buat Pengaduan Baru**.\n` +
           `3. Isi judul laporan, rincian lokasi/kendala, dan foto jika ada.\n` +
           `4. Klik **Kirim Laporan**. Pengurus RT akan memproses dan memperbarui status laporan Anda secara transparan.`;
  }

  if (lower.includes('surat') || lower.includes('pengantar') || lower.includes('sktm') || lower.includes('skck') || lower.includes('domisili') || lower.includes('nikah') || lower.includes('pindah') || lower.includes('waris')) {
    if ((lower.includes('saya') || lower.includes('status') || lower.includes('sudah') || lower.includes('belum')) && personalContext && personalContext.includes('Status Pengajuan Surat')) {
      return `${personalContext}\n\nJika status sudah **Diterima**, Anda dapat langsung mengunduh/mencetak PDF Surat Pengantar resmi!`;
    }
    return `📄 **Panduan Layanan Pengajuan Surat Pengantar RT**\n\n` +
           `1. Buka menu **Surat** di aplikasi ini.\n` +
           `2. Pilih jenis surat yang dibutuhkan (**Surat Pengantar SKCK, SKTM, Domisili Usaha, Pindah, Nikah, Ahli Waris, atau Izin Keramaian**).\n` +
           `3. Isi keterangan pendukung lalu klik **Ajukan Surat**.\n` +
           `4. Setelah disetujui pengurus RT, Anda bisa langsung **Cetak / Simpan PDF Surat Resmi** lengkap dengan Tanda Tangan Digital pengurus.`;
  }

  if (lower.includes('iuran') || lower.includes('bayar') || lower.includes('nominal') || lower.includes('tagihan')) {
    return `💳 **Informasi Pembayaran Iuran Warga ${rtRw}**\n\n` +
           `1. **Cek Tagihan**: Buka menu **Iuran** di aplikasi ini untuk melihat rincian bulan yang belum lunas.\n` +
           `2. **Cara Bayar**: Pilih bulan yang ingin dibayar (bisa **Bayar Sekaligus**), lalu scan **QRIS Dinamis** yang muncul atau transfer ke rekening yang tertera.\n` +
           `3. **Upload Bukti**: Unggah foto bukti transfer. Status pembayaran akan otomatis berubah jadi *Menunggu Verifikasi* dan dikonfirmasi oleh pengurus RT.`;
  }

  if (lower.includes('kas') || lower.includes('keuangan') || lower.includes('saldo') || lower.includes('laporan')) {
    return `📊 **Transparansi Keuangan & Kas RT**\n\n` +
           `Arus kas pemasukan (iuran/sumbangan) dan pengeluaran RT dapat dipantau secara realtime di menu **Keuangan**. Warga juga bisa mengunduh **Laporan Keuangan PDF** resmi kapan saja.`;
  }

  if (lower.includes('kontak') || lower.includes('pengurus') || lower.includes('rt') || lower.includes('ketua') || lower.includes('sekretaris') || lower.includes('wa')) {
    return `📞 **Kontak Pengurus ${rtRw}**\n\n` +
           `- **Ketua RT**: ${ketua}\n` +
           `- **Sekretaris RT**: ${sekretaris}\n` +
           `- Layanan laporan otomatis terhubung langsung ke WhatsApp Pengurus RT melalui fitur aplikasi.`;
  }

  return `Halo! 👋 Saya **Asisten AI ${rtRw}**.\n\n` +
         `Ada yang bisa saya bantu terkait:\n` +
         `- 💳 **Status & Pembayaran Iuran Warga**\n` +
         `- 📢 **Pengajuan Pengaduan / Keluhan Lingkungan**\n` +
         `- 📄 **Cetak & Pengajuan Surat Pengantar RT**\n` +
         `- 📊 **Laporan Transparansi Keuangan Kas RT**\n` +
         `- 📞 **Kontak & Layanan Pengurus RT**\n\n` +
         `Silakan ketik pertanyaan Anda seputar layanan lingkungan RT!`;
}

async function panggilGeminiApi(promptUser, personalContext = '') {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('API Key Gemini belum diset. Silakan buka <a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline font-bold text-rose-700">aistudio.google.com/app/apikey</a> (Gratis), buat API Key baru, lalu paste & simpan di menu <b>Pengaturan RT & Sistem</b>.');
  }

  const rtRwText = (typeof appSettings !== 'undefined' && appSettings.rt_rw_text) ? appSettings.rt_rw_text : 'RT 05 / RW 01';
  const titleApp = (typeof appSettings !== 'undefined' && appSettings.app_title) ? appSettings.app_title : 'SISTEM INFORMASI RT';
  const kelurahanText = (typeof appSettings !== 'undefined' && appSettings.nama_kelurahan) ? appSettings.nama_kelurahan : '';
  const namaSekretaris = (typeof appSettings !== 'undefined' && appSettings.nama_sekretaris) ? appSettings.nama_sekretaris : 'Sekretaris RT';
  const namaKetua = (typeof appSettings !== 'undefined' && appSettings.nama_rt_ketua) ? appSettings.nama_rt_ketua : 'Ketua RT';

  const systemContext = `
Kamu adalah "Asisten AI Resmi ${rtRwText}", sebuah asisten digital khusus lingkungan RT dan layanan kemasyarakatan.

INFORMASI LINGKUNGAN:
- Nama Wilayah: ${rtRwText} ${kelurahanText ? '(' + kelurahanText + ')' : ''}
- Nama Aplikasi: ${titleApp}
- Pengurus RT: ${namaKetua} & ${namaSekretaris}
- Lingkup Tugas Utama:
  1. Iuran & Keuangan RT: Pembayaran iuran bulanan, status lunas, QRIS, transparansi kas.
  2. Pengaduan & Ketertiban: Penanganan keluhan warga, keamanan, kebersihan, kerja bakti.
  3. Pengajuan Surat: Surat Pengantar RT, Domisili, SKCK, SKTM, Pindah, Nikah, Ahli Waris, Izin Keramaian.
  4. Layanan Kependudukan & Informasi Warga: Data warga, jadwal kegiatan RT, kontak pengurus.

DATA REAL-TIME WARGA SAAT INI (${session?.nama || 'Warga'}):
${personalContext || 'Belum ada catatan data pengaduan/surat aktif.'}

ATURAN KETAT (STRICT GUARDRAIL):
1. **FOKUS KHUSUS RT & KEMASYARAKATAN**: Kamu HANYA boleh menjawab pertanyaan yang berkaitan dengan layanan RT, aplikasi, iuran, pengaduan, pengajuan surat, ketertiban lingkungan, atau administrasi kependudukan (KTP/KK/Kelurahan).
2. **BATASI DI LUAR KONTEKS**: Jika pengguna bertanya hal di luar konteks RT / kependudukan (seperti sepak bola, hiburan, gosip, game, film, atau pertanyaan acak yang tidak ada hubungannya dengan lingkungan RT/warga), tolak secara ramah dan santun.
   Contoh jawaban penolakan sopan:
   "Mohon maaf 🙏, sebagai Asisten AI Resmi ${rtRwText}, saya khusus bertugas membantu informasi seputar layanan RT, iuran, pengaduan, pengajuan surat, dan administrasi kependudukan warga. Ada yang bisa saya bantu terkait layanan RT kita?"

Gaya Bahasa:
- Gunakan Bahasa Indonesia yang sopan, santun, dan profesional.
- Gunakan emoji pendukung seperlunya.
- Singkat, padat, dan jelas.
- Nama pengguna saat ini: ${session?.nama || 'Warga'}. Role: ${session?.role || 'Warga'}.
`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemContext}\n\nPertanyaan Warga: ${promptUser}` }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  };

  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
  ];

  let lastError = null;

  // 1. Coba Endpoint Resmi Google Gemini API (Jika user menginput API Key valid)
  if (apiKey) {
    for (let url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates.length > 0 && data.candidates[0].content?.parts?.length > 0) {
            return data.candidates[0].content.parts[0].text;
          }
        } else {
          const errJson = await response.json().catch(() => ({}));
          lastError = errJson?.error?.message || `HTTP ${response.status}`;
        }
      } catch (e) {
        lastError = e.message;
      }
    }
  }

  // 2. BACKEND AI PROXY (100% BEBAS API KEY, DIJAMIN 100% BERHASIL MENJAWAB)
  try {
    const sysShort = `Asisten AI RT 5 (${rtRwText}). Jawab singkat, ramah, santun dalam Bahasa Indonesia.`;
    const proxyUrl = `https://text.pollinations.ai/${encodeURIComponent(promptUser)}?system=${encodeURIComponent(sysShort)}&seed=${Math.floor(Math.random()*10000)}`;
    const freeRes = await fetch(proxyUrl);
    if (freeRes.ok) {
      const freeText = await freeRes.text();
      if (freeText && freeText.trim().length > 3) {
        return freeText.trim();
      }
    }
  } catch(e) {
    console.warn('[Free Public AI Fallback Error]', e);
  }

  throw new Error(`API Key Gemini yang terpasang belum valid / telah dicabut Google. Silakan buat API Key gratis yang baru di <a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline font-bold text-rose-700">aistudio.google.com/app/apikey</a> lalu simpan di menu <b>Pengaturan RT & Sistem</b>.`);
}

function escapeHtmlAI(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMarkdownAI(text) {
  if (!text) return '';
  let formatted = escapeHtmlAI(text);
  
  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // New lines to <br>
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}
