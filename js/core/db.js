// ============================================================
// db.js - Koneksi Supabase & Wrapper RPC
// ============================================================

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let _supabaseDb = null;

export function getDbInstance() {
  if (!_supabaseDb && SUPABASE_URL && SUPABASE_KEY) {
    _supabaseDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabaseDb;
}

export function setConfig(url, key) {
  SUPABASE_URL = url;
  SUPABASE_KEY = key;
  _supabaseDb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

export async function safeSupabaseSelect(tableName, sessionToken, limit = 100, offset = 0) {
  try {
    const { data, error } = await getDbInstance().rpc('generic_select_secured', {
      p_table: tableName,
      p_token: sessionToken || '',
      p_limit: limit,
      p_offset: offset
    });
    if (!error && data && data.status === 'success') {
      return { data: data.data || [], error: null, limit: data.limit, offset: data.offset };
    }
    return { data: [], error: error || (data ? data.message : 'Gagal memuat data') };
  } catch(e) {
    return { data: [], error: e };
  }
}

export async function safeSupabaseInsert(tableName, rows, sessionToken) {
  try {
    const rowData = (rows && rows.length > 0) ? rows[0] : {};
    const { data, error } = await getDbInstance().rpc('generic_insert_secured', {
      p_table: tableName,
      p_token: sessionToken || '',
      p_row: rowData
    });
    if (!error && data && data.status === 'success') {
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal insert') } };
  } catch(e) {
    return { error: e };
  }
}

export async function safeSupabaseUpdate(tableName, payload, eqColumn, eqValue, sessionToken) {
  try {
    const { data, error } = await getDbInstance().rpc('generic_update_secured', {
      p_table: tableName,
      p_token: sessionToken || '',
      p_id_col: String(eqColumn),
      p_id_val: String(eqValue),
      p_row: payload
    });
    if (!error && data && data.status === 'success') {
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal update') } };
  } catch(e) {
    return { error: e };
  }
}

export async function safeSupabaseDelete(tableName, eqColumn, eqValue, sessionToken) {
  try {
    if (tableName.toLowerCase() === 'sessions') {
      const { error } = await getDbInstance().rpc('delete_session_secured', { 
        p_token: String(eqValue).trim() 
      });
      return { error: error || null };
    }
    const { data, error } = await getDbInstance().rpc('generic_delete_secured', {
      p_table: tableName,
      p_token: sessionToken || '',
      p_id_col: String(eqColumn),
      p_id_val: String(eqValue)
    });
    if (!error && data && data.status === 'success') {
      return { error: null };
    }
    return { error: { message: error ? error.message : (data ? data.message : 'Gagal delete') } };
  } catch(e) {
    return { error: e };
  }
}