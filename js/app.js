// --- HELPER FETCH GET (SUPABASE BRIDGE) ---
async function callGASGet(actionName, params = {}) {
  try {
    // 1. Get Table Data standard dengan Sensor Warga Lain (Sesuai code.gs)
    if (actionName === 'getTableData') {
      const sheetName = params.sheetName;
      const { data, error } = await db.from(sheetName).select('*');
      let safeData = makeCaseInsensitive(data);
      
      if (error) {
        console.error('Supabase Fetch Error:', error);
        return { status: 'error', message: error.message };
      }

      if (!safeData || safeData.length === 0) {
        return { status: 'success', headers: [], rows: [] };
      }

      const headers = Object.keys(safeData[0]);
      const lowerHeaders = headers.map(h => h.toLowerCase().trim());
      const cleanRole = (session.role || 'warga').toLowerCase();

      if (cleanRole === 'warga' && session.nik) {
        if (sheetName.toLowerCase() === 'warga') {
          // Cari No_KK warga yang sedang login
          let userKk = '';
          const targetWarga = safeData.find(w => {
            let wNik = cariNilaiKolom(w, ['nik', 'ktp']);
            return wNik && wNik.toString().trim() === session.nik.toString().trim();
          });
          if (targetWarga) {
            userKk = cariNilaiKolom(targetWarga, ['kk', 'no_kk']);
          }

          const kkIdx = lowerHeaders.findIndex(h => h.includes('kk') || h.includes('no_kk'));

          // Transform rows murni meniru sensor code.gs
          let rows = safeData.map(rowObj => {
            let rowArr = headers.map(h => rowObj[h] !== null && rowObj[h] !== undefined ? rowObj[h] : '');
            let rowKk = kkIdx > -1 ? String(rowObj[headers[kkIdx]] || '').trim() : '';

            if (userKk && rowKk === userKk) {
              return rowArr; // Satu KK, tampil penuh
            } else {
              // Sensor data warga lain
              return headers.map((h, idx) => {
                let hLower = h.toLowerCase().trim();
                if (['no', 'nama_lengkap', 'nama_panggilan', 'nama', 'jenis_kelamin', 'no_hp', 'foto_url', 'alamat'].includes(hLower)) {
                  return rowArr[idx];
                } else {
                  return 'XXXXX';
                }
              });
            }
          });

          return { status: 'success', headers: headers, rows: rows };
        } else {
          // Untuk sheet selain Warga, tetap filter per NIK
          safeData = safeData.filter(row => {
            let rNik = cariNilaiKolom(row, ['nik', 'ktp']);
            return rNik && rNik.toString().trim() === session.nik.toString().trim();
          });
        }
      }

      const rows = safeData.map(row => headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
      return { status: 'success', headers: headers, rows: rows };
    }

    // ... (fungsi GET lainnya tetap sama)
