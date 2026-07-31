var SPREADSHEET_ID = 'MASUKKAN_ID_SPREADSHIT!';
var SESSION_DURATION_HOURS = 24; // Durasi masa aktif token session (24 jam)

// ==========================================
// ==== HELPER KEAMANAN & SESSION ENGINE ====
// ==========================================

function hashPassword(str) {
  if (!str) return '';
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str.toString().trim());
  var txtHash = '';
  for (var j = 0; j < rawHash.length; j++) {
    var pad = (rawHash[j] < 0) ? rawHash[j] + 256 : rawHash[j];
    txtHash += ("0" + pad.toString(16)).slice(-2);
  }
  return txtHash;
}

function getSessionSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Sessions');
  if (!sheet) {
    sheet = ss.insertSheet('Sessions');
    sheet.appendRow(['Token', 'NIK', 'Role', 'CreatedAt']);
  }
  return sheet;
}

function createSessionToken(nik, role) {
  var token = Utilities.getUuid();
  var sheet = getSessionSheet();
  var now = new Date().getTime();
  sheet.appendRow([token, nik, role, now]);
  return token;
}

function getUserSession(token) {
  if (!token) return null;
  var sheet = getSessionSheet();
  var data = sheet.getDataRange().getValues();
  var now = new Date().getTime();
  var maxAge = SESSION_DURATION_HOURS * 3600 * 1000;

  for (var i = 1; i < data.length; i++) {
    var rowToken = data[i][0].toString().trim();
    if (rowToken === token.toString().trim()) {
      var createdAt = Number(data[i][3]) || 0;
      if (now - createdAt > maxAge) {
        return null; 
      }
      return {
        nik: data[i][1].toString().trim(),
        role: data[i][2].toString().trim().toUpperCase() 
      };
    }
  }
  return null;
}

function sanitizeInput(val) {
  if (typeof val === 'string') {
    if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
      return "'" + val;
    }
  }
  return val;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function convertToImageLink(url) {
  if (!url) return "";
  if (url.includes("drive.google.com") || url.includes("googleusercontent")) {
    var idMatch = url.match(/[-\w]{25,}/);
    if (idMatch) {
      return "https://lh3.googleusercontent.com/d/" + idMatch[0];
    }
  }
  return url;
}

// ==========================================
// ==== HANDLER REST API GET & POST =========
// ==========================================

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    var action = e.parameter.action;
    var token = e.parameter.token || '';
    var result = {};

    if (action === 'getDaftarBarangAset') {
      return createJsonResponse(getDaftarBarangAset());
    } else if (action === 'getInfoWarga') {
      return createJsonResponse({ status: 'success', data: getInfoWarga() });
    }

    var session = getUserSession(token);
    if (!session) {
      return createJsonResponse({ status: 'error', message: 'Sesi tidak valid atau telah kadaluwarsa. Silakan login kembali.' });
    }

    if (action === 'getTableData') {
      result = getTableData(e.parameter.sheetName, session.role, session.nik);
    } else if (action === 'getNotifications') {
      result = getNotifications(session.role, session.nik);
    } else if (action === 'getRiwayatPeminjaman') {
      result = getRiwayatPeminjaman();
    } else if (action === 'getProfileData') {
      result = getProfileData(session.nik);
    } else if (action === 'getDashboardSummary') {
      result = getDashboardSummary(session.role, session.nik);
    } else if (action === 'getIuranData') {
      result = getIuranDataForUser(session.nik, session.role);
    } else if (action === 'getDaftarWargaUntukIuran') {
      result = getDaftarWargaUntukIuran();
    } else {
      result = { status: 'error', message: 'Action GET tidak dikenal!' };
    }

    return createJsonResponse(result);
  }

  if (e && e.parameter && e.parameter.pwa === 'sw') {
    var swContent = `
      const CACHE_NAME = 'rt-app-v1';
      self.addEventListener('install', (e) => self.skipWaiting());
      self.addEventListener('activate', (e) => self.clients.claim());
      self.addEventListener('fetch', (event) => {
        event.respondWith(
          fetch(event.request).catch(() => caches.match(event.request))
        );
      });
    `;
    return ContentService.createTextOutput(swContent)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  var html = HtmlService.createTemplateFromFile('Index');
  return html.evaluate()
    .setTitle('SISTEM INFORMASI RT 05')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    var result = {};

    if (action === 'processLogin') {
      return createJsonResponse(processLogin(postData.username, postData.password));
    }

    var session = getUserSession(postData.token);
    if (!session) {
      return createJsonResponse({ status: 'error', message: 'Akses ditolak! Sesi tidak valid atau telah kadaluwarsa.' });
    }

    if (action === 'simpanDataKeSheet') {
      result = simpanDataKeSheet(postData.sheetName, postData.formData, session);
    } else if (action === 'updateDataDiSheet') {
      result = updateDataDiSheet(postData.sheetName, postData.id, postData.formData, session);
    } else if (action === 'hapusDataDariSheet') {
      if (session.role !== 'RT') return createJsonResponse({ status: 'error', message: 'Hanya RT yang diizinkan menghapus data!' });
      result = hapusDataDariSheet(postData.sheetName, postData.id);
    } else if (action === 'simpanPengajuanPeminjaman') {
      postData.payload.nik = session.nik; 
      result = simpanPengajuanPeminjaman(postData.payload);
    } else if (action === 'verifikasiPeminjamanRT') {
      if (session.role !== 'RT') return createJsonResponse({ status: 'error', message: 'Hanya RT yang diizinkan memverifikasi peminjaman!' });
      result = verifikasiPeminjamanRT(postData.idPinjam, postData.status, postData.qtyAcc, postData.catatanRt);
    } else if (action === 'prosesPengembalianAsetRT') {
      if (session.role !== 'RT') return createJsonResponse({ status: 'error', message: 'Hanya RT yang diizinkan memproses pengembalian!' });
      result = prosesPengembalianAsetRT(postData.idPinjam, postData.qtyKembali, postData.catatanRt);
    } else if (action === 'simpanInfoWarga') {
      if (session.role !== 'RT') return createJsonResponse({ status: 'error', message: 'Hanya RT yang diizinkan memperbarui info warga!' });
      result = simpanInfoWarga(postData.teksBaru);
    } else {
      result = { status: 'error', message: 'Action POST tidak dikenal!' };
    }

    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.message });
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// ==== FUNGSI LOGIKA BISNIS (SEKURE) ======
// ==========================================

function processLogin(username, password) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Users');
    if (!sheet) return { status: 'error', message: 'Sheet Users tidak ditemukan!' };

    var data = sheet.getDataRange().getDisplayValues(); 
    var hashedInputPass = hashPassword(password);
    
    for (var i = 1; i < data.length; i++) {
      var sheetUser = data[i][0].toString().trim();
      var sheetPass = data[i][1].toString().trim();
      
      var isPassValid = (sheetPass === hashedInputPass) || (sheetPass === password.toString().trim());
      
      if (sheetUser === username.toString().trim() && isPassValid) {
        var rawRole = data[i][2].toString().trim().toLowerCase();
        var normalizedRole = (rawRole === 'rt') ? 'RT' : 'Warga';
        var userNik = data[i][3].toString().trim();
        
        var userNama = "", userAlamat = "", userNoHp = "";
        var wargaSheet = ss.getSheetByName('Warga');
        if (wargaSheet) {
          var wargaData = wargaSheet.getDataRange().getDisplayValues();
          var wHeaders = wargaData[0].map(function(h) { return h.toLowerCase().trim(); });
          var nikIdx = wHeaders.indexOf('nik');
          var namaIdx = wHeaders.indexOf('nama_lengkap');
          var alamatIdx = wHeaders.indexOf('alamat');
          var hpIdx = wHeaders.indexOf('no_hp');
          
          for (var j = 1; j < wargaData.length; j++) {
            if (wargaData[j][nikIdx].toString().trim() === userNik) {
              if (namaIdx > -1) userNama = wargaData[j][namaIdx];
              if (alamatIdx > -1) userAlamat = wargaData[j][alamatIdx];
              if (hpIdx > -1) userNoHp = wargaData[j][hpIdx];
              break;
            }
          }
        }
        
        var sessionToken = createSessionToken(userNik, normalizedRole);

        return { 
          status: 'success', 
          token: sessionToken,
          role: normalizedRole, 
          nik: userNik,
          nama: userNama,
          alamat: userAlamat,
          noHp: userNoHp
        };
      }
    }
    return { status: 'error', message: 'Username atau Password salah bro!' };
  } catch(e) {
    return { status: 'error', message: 'Error Database: ' + e.message };
  }
}

function getProfileData(userNik) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var wargaSheet = ss.getSheetByName('Warga');
    if (!wargaSheet) return { status: 'error', message: 'Sheet Warga tidak ditemukan!' };
    
    var wargaData = wargaSheet.getDataRange().getDisplayValues();
    var headers = wargaData[0];
    var lowerHeaders = headers.map(function(h) { return h.toLowerCase().trim(); });
    
    var nikIdx = lowerHeaders.indexOf('nik');
    var kkIdx = lowerHeaders.indexOf('no_kk');
    if (nikIdx === -1) return { status: 'error', message: 'Kolom NIK tidak ditemukan di database!' };
    
    var myData = null, myKk = "";
    
    for (var i = 1; i < wargaData.length; i++) {
      if (wargaData[i][nikIdx].toString().trim() === userNik.toString().trim()) {
        myData = {};
        headers.forEach(function(header, idx) { myData[header] = wargaData[i][idx]; });
        if (kkIdx > -1) myKk = wargaData[i][kkIdx].toString().trim();
        break;
      }
    }
    
    if (!myData) return { status: 'error', message: 'Profil Anda belum terdaftar!' };
    
    var keluarga = [];
    if (myKk && kkIdx > -1) {
      for (var j = 1; j < wargaData.length; j++) {
        var rowKk = wargaData[j][kkIdx].toString().trim();
        var rowNik = wargaData[j][nikIdx].toString().trim();
        
        if (rowKk === myKk && rowNik !== userNik.toString().trim()) {
          var member = {};
          headers.forEach(function(header, idx) { member[header] = wargaData[j][idx]; });
          keluarga.push(member);
        }
      }
    }
    
    headers.forEach(function(h) {
      if (h.toLowerCase().includes('foto') || h.toLowerCase().includes('bukti')) {
        myData[h] = convertToImageLink(myData[h]);
        keluarga.forEach(function(m) { m[h] = convertToImageLink(m[h]); });
      }
    });
    
    return { status: 'success', pribadi: myData, keluarga: keluarga, headers: headers };
  } catch(e) {
    return { status: 'error', message: 'Gagal memuat profil: ' + e.message };
  }
}

function getTableData(sheetName, role, userNik) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { headers: [], rows: [] };
  var data = sheet.getDataRange().getDisplayValues();
  
  var headers = data[0] || [];
  var rows = data.length > 1 ? data.slice(1) : [];
  var lowerHeaders = headers.map(function(h) { return h.toLowerCase().trim(); });
  
  if (sheetName === 'Keuangan') {
    var pemIndex = lowerHeaders.indexOf('pemasukan');
    var pengIndex = lowerHeaders.indexOf('pengeluaran');
    var salIndex = lowerHeaders.indexOf('saldo');
    
    if (pemIndex > -1 && pengIndex > -1 && salIndex > -1) {
      var runningSaldo = 0;
      rows = rows.map(function(row) {
        var pem = Number(row[pemIndex].replace(/[^0-9]/g, '')) || 0;
        var peng = Number(row[pengIndex].replace(/[^0-9]/g, '')) || 0;
        runningSaldo += (pem - peng);
        row[salIndex] = runningSaldo.toLocaleString('id-ID');
        return row;
      });
    }
  }

  var photoIndexes = [];
  lowerHeaders.forEach(function(h, idx) {
    if (h.includes('foto') || h.includes('bukti')) photoIndexes.push(idx);
  });

  if (photoIndexes.length > 0 && rows.length > 0) {
    rows = rows.map(function(row) {
      photoIndexes.forEach(function(idx) { row[idx] = convertToImageLink(row[idx]); });
      return row;
    });
  }

  var cleanRole = role.toString().trim().toLowerCase();
  if (cleanRole === 'warga') {
    var nikIndex = lowerHeaders.indexOf('nik');

    if (sheetName === 'Warga') {
      var kkIndex = lowerHeaders.indexOf('no_kk');
      var userKk = "";
      
      if (nikIndex > -1) {
        for (var i = 0; i < rows.length; i++) {
          if (rows[i][nikIndex].toString().trim() === userNik.toString().trim()) {
            userKk = rows[i][kkIndex].toString().trim();
            break;
          }
        }
      }

      rows = rows.map(function(row) {
        var rowKk = kkIndex > -1 ? row[kkIndex].toString().trim() : "";
        if (kkIndex > -1 && userKk && rowKk === userKk) {
          return row;
        } else {
          var filteredRow = [];
          lowerHeaders.forEach(function(h, idx) {
            if (['no', 'nama_lengkap', 'nama_panggilan', 'jenis_kelamin', 'no_hp', 'foto_url', 'alamat'].includes(h)) {
              filteredRow.push(row[idx]);
            } else {
              filteredRow.push('XXXXX');
            }
          });
          return filteredRow;
        }
      });
    } else {
      if (nikIndex > -1) {
        rows = rows.filter(function(row) {
          return row[nikIndex].toString().trim() === userNik.toString().trim();
        });
      }
    }
  }

  return { headers: headers, rows: rows };
}

function getDashboardSummary(role, userNik) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var cleanRole = role.toString().trim().toLowerCase();
  
  if (cleanRole === 'rt') {
    return {
      role: 'RT',
      warga: Math.max(0, ss.getSheetByName('Warga').getLastRow() - 1),
      aduan: Math.max(0, ss.getSheetByName('Pengaduan').getLastRow() - 1),
      keuangan: Math.max(0, ss.getSheetByName('Keuangan').getLastRow() - 1)
    };
  } else {
    var countByNik = function(sName) {
      var sheet = ss.getSheetByName(sName);
      var data = sheet ? sheet.getDataRange().getDisplayValues() : [];
      if (data.length <= 1) return 0;
      var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });
      var nikIdx = headers.indexOf('nik');
      var c = 0;
      if (nikIdx > -1) {
        for (var i = 1; i < data.length; i++) {
          if (data[i][nikIdx].toString().trim() === userNik.toString().trim()) c++;
        }
      }
      return c;
    };
    
    return {
      role: 'Warga',
      aduan: countByNik('Pengaduan'),
      surat: countByNik('SuratPengantar'),
      sumbangan: countByNik('Sumbangan')
    };
  }
}

function simpanDataKeSheet(sheetName, formData, session) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    var headers = sheet.getDataRange().getValues()[0];
    
    var lowerHeaders = headers.map(function(h) { return h.toString().toLowerCase().trim(); });
    var nikIndex = lowerHeaders.indexOf('nik');
    
    if (nikIndex > -1 && session.role !== 'RT' && sheetName !== 'Iuran') {
      formData['nik'] = session.nik;
    }

    for (var key in formData) {
      if (formData[key] && typeof formData[key] === 'object' && formData[key].base64) {
        var fileData = formData[key];
        var contentType = fileData.type || '';
        
        if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
          return { status: 'error', message: 'Format file tidak diizinkan! (Hanya gambar dan PDF)' };
        }

        var rawData = fileData.base64.split(',')[1];
        var blob = Utilities.newBlob(Utilities.base64Decode(rawData), contentType, fileData.name);
        var file = DriveApp.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        formData[key] = convertToImageLink(file.getUrl());
      } else {
        formData[key] = sanitizeInput(formData[key]);
      }
    }
    
    var newRow = [];
    var uniqueId = sheetName.substring(0,3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    var nowFormatted = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");
    var timeOnly = Utilities.formatDate(new Date(), "Asia/Jakarta", "HH:mm");

    headers.forEach(function(header) {
      var hLower = header.toString().toLowerCase().trim();
      if (hLower === 'id' || hLower === 'no') {
        newRow.push(uniqueId);
      } else if (hLower === 'tanggal' || hLower.includes('tgl') || hLower === 'waktu' || hLower === 'timestamp') {
        var valTgl = formData[header] !== undefined ? formData[header] : formData[hLower];
        if (valTgl) {
          var dateParts = valTgl.toString().split('-');
          if (dateParts.length === 3) {
            newRow.push(dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0] + ' ' + timeOnly);
          } else {
            newRow.push(valTgl + ' ' + timeOnly);
          }
        } else {
          newRow.push(nowFormatted);
        }
      } else if (hLower === 'status') {
        var valStatus = formData[header] !== undefined ? formData[header] : formData['status'];
        if (!valStatus) {
          if (sheetName === 'Iuran') {
            valStatus = 'Belum Lunas';
          } else {
            valStatus = 'Menunggu Verifikasi';
          }
        }
        newRow.push(valStatus);
      } else if (hLower === 'saldo') {
        newRow.push(''); 
      } else {
        var val = undefined;
        for (var k in formData) {
          if (k.toLowerCase().trim() === hLower) {
            val = formData[k];
            break;
          }
        }
        newRow.push(val !== undefined ? val : '');
      }
    });
    
    sheet.appendRow(newRow);
    return { status: 'success', id: uniqueId, message: 'Data berhasil disimpan!' };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function updateDataDiSheet(sheetName, id, formData, session) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { status: 'error', message: 'Data tidak ditemukan!' };
    
    for (var key in formData) {
      if (formData[key] && typeof formData[key] === 'object' && formData[key].base64) {
        var fileData = formData[key];
        var contentType = fileData.type || '';
        
        if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
          return { status: 'error', message: 'Format file tidak diizinkan! (Hanya gambar dan PDF)' };
        }

        var rawData = fileData.base64.split(',')[1];
        var blob = Utilities.newBlob(Utilities.base64Decode(rawData), contentType, fileData.name);
        var file = DriveApp.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        formData[key] = convertToImageLink(file.getUrl());
      } else {
        formData[key] = sanitizeInput(formData[key]);
      }
    }
    
    headers.forEach(function(header, idx) {
      var hLower = header.toString().toLowerCase().trim();
      if (['id', 'no', 'saldo'].includes(hLower)) return;

      var matchVal = undefined;
      for (var k in formData) {
        if (k.toLowerCase().trim() === hLower) {
          matchVal = formData[k];
          break;
        }
      }

      if (matchVal !== undefined) {
        if (matchVal === '' && (hLower.includes('foto') || hLower.includes('bukti'))) return;
        
        if (hLower === 'tanggal' && matchVal) {
          var dateParts = matchVal.split('-');
          sheet.getRange(rowIndex, idx + 1).setValue(dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]);
        } else {
          sheet.getRange(rowIndex, idx + 1).setValue(matchVal);
        }
      }
    });
    
    return { status: 'success', message: 'Perubahan data berhasil disimpan!' };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function hapusDataDariSheet(sheetName, id) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        sheet.deleteRow(i + 1);
        return { status: 'success', message: 'Data berhasil dihapus!' };
      }
    }
    return { status: 'error', message: 'Data tidak ditemukan!' };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function fixPeminjamanSheetHeader() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Peminjaman');
  var targetHeaders = ['ID Pinjam', 'Nama Peminjam', 'ID Barang', 'Nama Barang', 'Jumlah Minta', 'Jumlah ACC', 'Keterangan Warga', 'Catatan RT', 'Status', 'Tanggal', 'NIK'];

  if (!sheet) {
    sheet = ss.insertSheet('Peminjaman');
    sheet.appendRow(targetHeaders);
    return sheet;
  }

  var data = sheet.getDataRange().getDisplayValues();
  if (data.length === 0) {
    sheet.appendRow(targetHeaders);
    return sheet;
  }

  var currentHeaders = data[0].map(function(h) { return h.toLowerCase().trim(); });
  if (currentHeaders.indexOf('catatan rt') === -1 || currentHeaders.length < 11) {
    sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
  }
  return sheet;
}

function parseTanggalToTimestamp(str) {
  if (!str) return 0;
  if (str instanceof Date) return str.getTime();
  
  var s = str.toString().trim();
  if (!s || s === '-') return 0;

  var match1 = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match1) {
    return new Date(parseInt(match1[3], 10), parseInt(match1[2], 10) - 1, parseInt(match1[1], 10), match1[4] ? parseInt(match1[4], 10) : 0, match1[5] ? parseInt(match1[5], 10) : 0, match1[6] ? parseInt(match1[6], 10) : 0).getTime();
  }

  var match2 = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match2) {
    return new Date(parseInt(match2[1], 10), parseInt(match2[2], 10) - 1, parseInt(match2[3], 10), match2[4] ? parseInt(match2[4], 10) : 0, match2[5] ? parseInt(match2[5], 10) : 0, match2[6] ? parseInt(match2[6], 10) : 0).getTime();
  }

  var matchTime = s.match(/(\d{1,2}):(\d{2})/);
  if (matchTime) {
    var now = new Date();
    now.setHours(parseInt(matchTime[1], 10), parseInt(matchTime[2], 10), 0, 0);
    return now.getTime();
  }

  var d = new Date(s);
  return !isNaN(d.getTime()) ? d.getTime() : 0;
}

function getNotifications(role, userNik) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var cleanRole = role.toString().trim().toLowerCase();
    var notifications = [];
    var targetSheets = ['Pengaduan', 'SuratPengantar', 'Sumbangan', 'Peminjaman'];
    
    targetSheets.forEach(function(sName) {
      var sheet = ss.getSheetByName(sName);
      if (!sheet) return;
      var data = sheet.getDataRange().getDisplayValues();
      if (data.length <= 1) return;
      
      var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });
      var nikIdx = headers.indexOf('nik');
      var namaIdx = headers.findIndex(function(h) { return h.includes('nama peminjam') || h.includes('peminjam') || (h.includes('nama') && !h.includes('barang')); });
      var statusIdx = headers.indexOf('status');
      if (statusIdx === -1) statusIdx = headers.findIndex(function(h) { return h.includes('status'); });
      var barangIdx = headers.findIndex(function(h) { return h.includes('nama barang') || (h.includes('barang') && !h.includes('id')); });
      var qtyIdx = headers.findIndex(function(h) { return h.includes('minta') || h.includes('jumlah'); });
      var catatanRtIdx = headers.findIndex(function(h) { return h.includes('catatan') || h.includes('lokasi'); });
      var tglIdx = headers.findIndex(function(h) { return h.includes('tanggal') || h.includes('waktu') || h.includes('timestamp') || h.includes('tgl'); });
      
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowId = row[0] || ('#' + i);
        var rowNik = nikIdx > -1 ? row[nikIdx].toString().trim() : '';
        var rowNama = (namaIdx > -1 && row[namaIdx]) ? row[namaIdx].toString().trim() : 'Warga';
        var rowStatus = (statusIdx > -1 && row[statusIdx]) ? row[statusIdx].toString().trim() : '';
        var statusLower = rowStatus.toLowerCase();
        var rowBarang = (barangIdx > -1 && row[barangIdx]) ? row[barangIdx].toString().trim() : 'Barang Aset';
        var rowQty = (qtyIdx > -1 && row[qtyIdx]) ? row[qtyIdx].toString().trim() : '1';
        var rowCatatanRt = (catatanRtIdx > -1 && row[catatanRtIdx]) ? row[catatanRtIdx].toString().trim() : '';
        
        var rawTglText = (tglIdx > -1 && row[tglIdx]) ? row[tglIdx].toString().trim() : '';
        var rawTimestamp = parseTanggalToTimestamp(rawTglText);
        var displayJam = rawTglText ? (rawTglText.match(/(\d{1,2}:\d{2})/) ? rawTglText.match(/(\d{1,2}:\d{2})/)[1] + ' WIB' : rawTglText) : 'Baru';
        
        if (cleanRole === 'rt') {
          if (sName === 'Peminjaman' && statusLower.includes('menunggu')) {
            notifications.push({ id: rowId, menu: 'Aset', pesan: `<b>${rowNama}</b> mengajukan pinjam aset <b>${rowBarang}</b> (${rowQty} unit)`, type: 'warning', tanggal: displayJam, timestamp: rawTimestamp, rowIndex: i });
          } else if (sName !== 'Peminjaman' && (statusLower.includes('belum') || statusLower.includes('menunggu'))) {
            notifications.push({ id: rowId, menu: sName, pesan: `<b>${rowNama}</b> membuat laporan baru di menu <b>${sName}</b> (ID: ${rowId})`, type: 'warning', tanggal: displayJam, timestamp: rawTimestamp, rowIndex: i });
          }
        } else {
          if (sName === 'Peminjaman' && rowNik === userNik.toString().trim() && !statusLower.includes('menunggu') && rowStatus !== '') {
            var badgeBg = statusLower.includes('setuju') ? 'bg-success' : (statusLower.includes('tolak') ? 'bg-danger' : 'bg-secondary');
            var noteText = (rowCatatanRt && rowCatatanRt !== '-') ? `<br><small class="text-muted">Ket RT: ${rowCatatanRt}</small>` : '';
            notifications.push({ id: rowId, menu: 'Aset', pesan: `Pengajuan pinjam <b>${rowBarang}</b> Anda (ID: ${rowId}) telah diverifikasi RT: <span class="badge ${badgeBg}">${rowStatus}</span>${noteText}`, type: 'info', tanggal: displayJam, timestamp: rawTimestamp, rowIndex: i });
          } else if (sName !== 'Peminjaman' && rowNik === userNik.toString().trim() && !statusLower.includes('belum') && !statusLower.includes('menunggu') && rowStatus !== '') {
            notifications.push({ id: rowId, menu: sName, pesan: `Laporan <b>${sName}</b> Anda (ID: ${rowId}) telah diverifikasi RT. Status: <span class="badge bg-success">${rowStatus}</span>`, type: 'info', tanggal: displayJam, timestamp: rawTimestamp, rowIndex: i });
          }
        }
      }
    });
    
    notifications.sort(function(a, b) { return b.timestamp !== a.timestamp ? b.timestamp - a.timestamp : b.rowIndex - a.rowIndex; });
    return { status: 'success', data: notifications };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function simpanInfoWarga(teksBaru) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Pengaturan');
    if (!sheet) {
      sheet = ss.insertSheet('Pengaturan');
      sheet.appendRow(['KUNCI', 'NILAI']);
      sheet.appendRow(['INFO_WARGA', teksBaru]);
    } else {
      if (sheet.getLastRow() < 2) sheet.appendRow(['INFO_WARGA', teksBaru]);
      else sheet.getRange('B2').setValue(teksBaru);
    }
    return { status: 'success', message: 'Informasi berhasil diperbarui!' };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function getInfoWarga() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Pengaturan');
    if (!sheet || sheet.getLastRow() < 2) return '';
    var val = sheet.getRange('B2').getValue();
    return val ? val.toString() : '';
  } catch(e) {
    return '';
  }
}

function getDaftarBarangAset() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Aset');
    if (!sheet) return { status: 'error', message: 'Sheet Aset tidak ditemukan!' };

    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });
    var idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
    var namaIdx = headers.findIndex(function(h) { return h.includes('nama_barang') || h.includes('barang') || h.includes('nama'); });
    var stokIdx = headers.findIndex(function(h) { return h.includes('stok') || h.includes('jumlah') || h.includes('qty'); });

    var listBarang = [];
    for (var i = 1; i < data.length; i++) {
      var stokVal = stokIdx > -1 ? (parseInt(data[i][stokIdx]) || 0) : 1;
      if (stokVal > 0) {
        listBarang.push({
          id: data[i][idIdx],
          nama: namaIdx > -1 ? data[i][namaIdx] : 'Barang #' + i,
          stok: stokVal
        });
      }
    }
    return { status: 'success', data: listBarang };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function simpanPengajuanPeminjaman(payload) {
  try {
    var sheet = fixPeminjamanSheetHeader();
    var idPinjam = 'PNJ-' + Math.floor(1000 + Math.random() * 9000);
    var nowFormatted = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");

    sheet.appendRow([
      idPinjam, payload.namaPeminjam, payload.idBarang, payload.namaBarang,
      Number(payload.jumlah), 0, payload.keterangan || '-', '-', 'Menunggu Verifikasi',
      nowFormatted, payload.nik || ''
    ]);

    return { status: 'success', message: 'Pengajuan peminjaman berhasil dikirim! Menunggu verifikasi RT.' };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function getRiwayatPeminjaman() {
  try {
    var sheet = fixPeminjamanSheetHeader();
    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });
    var idPinjamIdx = headers.indexOf('id pinjam') > -1 ? headers.indexOf('id pinjam') : 0;
    var namaPeminjamIdx = headers.findIndex(function(h) { return h.includes('nama peminjam') || h.includes('peminjam'); });
    var idBarangIdx = headers.findIndex(function(h) { return h.includes('id barang'); });
    var namaBarangIdx = headers.findIndex(function(h) { return h.includes('nama barang') || (h.includes('barang') && !h.includes('id')); });
    var jumlahMintaIdx = headers.findIndex(function(h) { return h.includes('minta') || h.includes('jumlah'); });
    var jumlahAccIdx = headers.findIndex(function(h) { return h.includes('acc'); });
    var ketWargaIdx = headers.findIndex(function(h) { return h.includes('keterangan') || h.includes('ket'); });
    var catatanRtIdx = headers.findIndex(function(h) { return h.includes('catatan') || h.includes('lokasi'); });
    var statusIdx = headers.indexOf('status') > -1 ? headers.indexOf('status') : headers.findIndex(function(h) { return h.includes('status'); });
    var tglIdx = headers.findIndex(function(h) { return h.includes('tanggal') || h.includes('tgl') || h.includes('waktu'); });
    var nikIdx = headers.indexOf('nik');

    var riwayat = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      riwayat.push({
        idPinjam: row[idPinjamIdx] || '',
        namaPeminjam: (namaPeminjamIdx > -1 && row[namaPeminjamIdx]) ? row[namaPeminjamIdx] : '',
        idBarang: (idBarangIdx > -1 && row[idBarangIdx]) ? row[idBarangIdx] : '',
        namaBarang: (namaBarangIdx > -1 && row[namaBarangIdx]) ? row[namaBarangIdx] : '',
        jumlahMinta: (jumlahMintaIdx > -1 && row[jumlahMintaIdx]) ? (Number(row[jumlahMintaIdx]) || 0) : 0,
        jumlahAcc: (jumlahAccIdx > -1 && row[jumlahAccIdx]) ? (Number(row[jumlahAccIdx]) || 0) : 0,
        keterangan: (ketWargaIdx > -1 && row[ketWargaIdx]) ? row[ketWargaIdx] : '-',
        catatanRt: (catatanRtIdx > -1 && row[catatanRtIdx]) ? row[catatanRtIdx] : '-',
        status: (statusIdx > -1 && row[statusIdx]) ? row[statusIdx] : 'Menunggu Verifikasi',
        tanggal: (tglIdx > -1 && row[tglIdx]) ? row[tglIdx] : '',
        nik: (nikIdx > -1 && row[nikIdx]) ? row[nikIdx] : ''
      });
    }

    return { status: 'success', data: riwayat };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function verifikasiPeminjamanRT(idPinjam, status, qtyAcc, catatanRt) {
  try {
    var sheetPinjam = fixPeminjamanSheetHeader();
    var data = sheetPinjam.getDataRange().getDisplayValues();
    var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });

    var idPinjamIdx = headers.indexOf('id pinjam') > -1 ? headers.indexOf('id pinjam') : 0;
    var idBarangIdx = headers.findIndex(function(h) { return h.includes('id barang'); });
    var jumlahAccIdx = headers.findIndex(function(h) { return h.includes('acc'); });
    var catatanRtIdx = headers.findIndex(function(h) { return h.includes('catatan') || h.includes('lokasi'); });
    var statusIdx = headers.indexOf('status') > -1 ? headers.indexOf('status') : headers.findIndex(function(h) { return h.includes('status'); });

    var rowIndex = -1, idBarang = '', oldStatus = '';
    for (var i = 1; i < data.length; i++) {
      if (data[i][idPinjamIdx].toString().trim() === idPinjam.toString().trim()) {
        rowIndex = i + 1;
        idBarang = idBarangIdx > -1 ? data[i][idBarangIdx] : '';
        oldStatus = statusIdx > -1 ? data[i][statusIdx] : '';
        break;
      }
    }

    if (rowIndex === -1) return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };

    var numAcc = Number(qtyAcc) || 0;
    var noteText = catatanRt ? catatanRt.toString().trim() : '-';

    if (jumlahAccIdx > -1) sheetPinjam.getRange(rowIndex, jumlahAccIdx + 1).setValue(numAcc);
    if (catatanRtIdx > -1) sheetPinjam.getRange(rowIndex, catatanRtIdx + 1).setValue(noteText);
    if (statusIdx > -1) sheetPinjam.getRange(rowIndex, statusIdx + 1).setValue(status);

    if (status === 'Disetujui' && oldStatus !== 'Disetujui' && numAcc > 0) {
      updateStokAset(idBarang, -numAcc);
    }

    return { status: 'success', message: 'Verifikasi peminjaman berhasil disimpan!' };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function prosesPengembalianAsetRT(idPinjam, qtyKembali, catatanRt) {
  try {
    var sheetPinjam = fixPeminjamanSheetHeader();
    var data = sheetPinjam.getDataRange().getDisplayValues();
    var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });

    var idPinjamIdx = headers.indexOf('id pinjam') > -1 ? headers.indexOf('id pinjam') : 0;
    var idBarangIdx = headers.findIndex(function(h) { return h.includes('id barang'); });
    var jumlahAccIdx = headers.findIndex(function(h) { return h.includes('acc'); });
    var catatanRtIdx = headers.findIndex(function(h) { return h.includes('catatan') || h.includes('lokasi'); });
    var statusIdx = headers.indexOf('status') > -1 ? headers.indexOf('status') : headers.findIndex(function(h) { return h.includes('status'); });

    var rowIndex = -1, idBarang = '', qtyAcc = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][idPinjamIdx].toString().trim() === idPinjam.toString().trim()) {
        rowIndex = i + 1;
        idBarang = idBarangIdx > -1 ? data[i][idBarangIdx] : '';
        qtyAcc = jumlahAccIdx > -1 ? (Number(data[i][jumlahAccIdx]) || 0) : 0;
        break;
      }
    }

    if (rowIndex === -1) return { status: 'error', message: 'Data peminjaman tidak ditemukan!' };

    var numKembali = Number(qtyKembali) || 0;
    var numHilang = Math.max(0, qtyAcc - numKembali);
    var noteText = catatanRt ? catatanRt.toString().trim() : '-';

    var statusBaru = (numKembali === 0) ? 'Hilang Total' : (numHilang > 0 ? 'Selesai (Hilang ' + numHilang + ' Unit)' : 'Selesai');

    if (catatanRtIdx > -1) sheetPinjam.getRange(rowIndex, catatanRtIdx + 1).setValue(noteText);
    if (statusIdx > -1) sheetPinjam.getRange(rowIndex, statusIdx + 1).setValue(statusBaru);

    if (numKembali > 0) updateStokAset(idBarang, numKembali);

    return { 
      status: 'success', 
      message: numHilang > 0 ? `Pengembalian diproses! ${numKembali} unit kembali, ${numHilang} unit dicatat hilang.` : 'Semua barang berhasil dikembalikan!' 
    };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}

function updateStokAset(idBarang, deltaQty) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetAset = ss.getSheetByName('Aset');
  if (!sheetAset) return;

  var data = sheetAset.getDataRange().getValues();
  var headers = data[0].map(function(h) { return h.toString().toLowerCase().trim(); });
  var idIdx = headers.indexOf('id') > -1 ? headers.indexOf('id') : 0;
  var stokIdx = headers.findIndex(function(h) { return h.includes('stok') || h.includes('jumlah') || h.includes('qty'); });

  if (stokIdx === -1) return;

  for (var i = 1; i < data.length; i++) {
    if (data[i][idIdx].toString().trim() === idBarang.toString().trim()) {
      var stokLama = Number(data[i][stokIdx]) || 0;
      var stokBaru = Math.max(0, stokLama + deltaQty);
      sheetAset.getRange(i + 1, stokIdx + 1).setValue(stokBaru);
      break;
    }
  }
}

// ==========================================
// ==== MODUL TAMBAHAN: IURAN WARGA =========
// ==========================================

function getIuranDataForUser(userNik, role) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Iuran');
    
    if (!sheet) {
      sheet = ss.insertSheet('Iuran');
      sheet.appendRow(['ID', 'NIK', 'Nama', 'No_KK', 'Bulan', 'Tahun', 'Nominal', 'Status', 'Tanggal_Bayar', 'Diterima_Oleh', 'Bukti_Transfer']);
    } else {
      var dataCheck = sheet.getDataRange().getDisplayValues();
      if (dataCheck.length === 0 || dataCheck[0][0] === '') {
        sheet.clear();
        sheet.appendRow(['ID', 'NIK', 'Nama', 'No_KK', 'Bulan', 'Tahun', 'Nominal', 'Status', 'Tanggal_Bayar', 'Diterima_Oleh', 'Bukti_Transfer']);
      } else {
        var existingHeaders = dataCheck[0].map(function(h) { return h.toLowerCase().trim(); });
        if (existingHeaders.indexOf('bukti_transfer') === -1) {
          sheet.getRange(1, existingHeaders.length + 1).setValue('Bukti_Transfer');
        }
      }
    }

    var data = sheet.getDataRange().getDisplayValues();
    var headers = data[0] || [];
    var rows = data.length > 1 ? data.slice(1) : [];

    rows = rows.filter(function(row) {
      return row.some(function(cell) { return cell.toString().trim() !== ""; });
    });

    // Otomatis ubah link Drive pada kolom foto/bukti ke format lh3.googleusercontent.com
    var lowerHeaders = headers.map(function(h) { return h.toLowerCase().trim(); });
    var photoIndexes = [];
    lowerHeaders.forEach(function(h, idx) {
      if (h.includes('foto') || h.includes('bukti')) photoIndexes.push(idx);
    });

    if (photoIndexes.length > 0 && rows.length > 0) {
      rows = rows.map(function(row) {
        photoIndexes.forEach(function(idx) {
          row[idx] = convertToImageLink(row[idx]);
        });
        return row;
      });
    }

    var cleanRole = role.toString().trim().toLowerCase();
    
    if (cleanRole !== 'rt' && userNik) {
      var wargaSheet = ss.getSheetByName('Warga');
      var userKk = "";
      if (wargaSheet) {
        var wData = wargaSheet.getDataRange().getDisplayValues();
        var wHeaders = wData[0].map(function(h) { return h.toLowerCase().trim(); });
        var nikIdx = wHeaders.indexOf('nik');
        var kkIdx = wHeaders.indexOf('no_kk');
        if (nikIdx > -1 && kkIdx > -1) {
          for (var i = 1; i < wData.length; i++) {
            if (wData[i][nikIdx].toString().trim() === userNik.toString().trim()) {
              userKk = wData[i][kkIdx].toString().trim();
              break;
            }
          }
        }
      }

      var nikColIdx = headers.map(function(h) { return h.toLowerCase().trim(); }).indexOf('nik');
      var kkColIdx = headers.map(function(h) { return h.toLowerCase().trim(); }).indexOf('no_kk');

      rows = rows.filter(function(row) {
        var rowNik = nikColIdx > -1 ? row[nikColIdx].toString().trim() : "";
        var rowKk = kkColIdx > -1 ? row[kkColIdx].toString().trim() : "";
        return (rowNik === userNik.toString().trim()) || (userKk && rowKk === userKk);
      });
    }

    return {
      status: 'success',
      headers: headers,
      rows: rows
    };
  } catch(e) {
    return { status: 'error', message: 'Gagal memuat data iuran: ' + e.message };
  }
}

function getDaftarWargaUntukIuran() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Warga');
    if (!sheet) return { status: 'success', data: [] };

    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    var headers = data[0].map(function(h) { return h.toLowerCase().trim(); });
    var nikIdx = headers.indexOf('nik');
    var namaIdx = headers.findIndex(function(h) { return h.includes('nama'); });
    var kkIdx = headers.indexOf('no_kk');

    var listWarga = [];
    for (var i = 1; i < data.length; i++) {
      listWarga.push({
        nik: nikIdx > -1 ? data[i][nikIdx] : '',
        nama: namaIdx > -1 ? data[i][namaIdx] : 'Warga',
        no_kk: kkIdx > -1 ? data[i][kkIdx] : ''
      });
    }
    return { status: 'success', data: listWarga };
  } catch(e) {
    return { status: 'error', message: e.message };
  }
}
