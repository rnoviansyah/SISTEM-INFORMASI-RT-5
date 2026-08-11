// ============================================================
// session.js - Login, Logout, Token Management
// ============================================================

let _session = { token: '', role: 'Warga', nik: '', nama: '', alamat: '', noHp: '' };

export function getSession() {
  return _session;
}

export function setSession(data) {
  Object.assign(_session, data);
  localStorage.setItem('rt_user_session', JSON.stringify(_session));
}

export function clearSession() {
  _session = { token: '', role: 'Warga', nik: '', nama: '', alamat: '', noHp: '' };
  localStorage.removeItem('rt_user_session');
}

export function loadSessionFromStorage() {
  const saved = localStorage.getItem('rt_user_session');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(_session, parsed);
      return true;
    } catch(e) {}
  }
  return false;
}

export async function verifySessionToken(db) {
  if (!_session.token) return false;
  try {
    const { data } = await db.rpc('auth_role', { p_token: _session.token });
    return data === 'RT' || data === 'Warga';
  } catch(e) {
    return false;
  }
}