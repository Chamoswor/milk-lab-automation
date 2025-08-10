/* ------------------------------------------------------------
 * LAB API middleware - v2  (matcher nytt databaseskjema)
 * ------------------------------------------------------------ */
const API_BASE_URL = '/api/lab';

/* ---------- Felles helper ---------- */
async function handleResponse(response) {
  if (response.ok) {
    if (response.status === 204) return { success: true, data: null };
    const data = await response.json();
    return { success: true, data };
  }
  let msg = `HTTP ${response.status}`;
  try {
    const err = await response.json();
    msg = err.message || err.error || msg;
  } catch { /* ignore */ }
  return { success: false, message: msg, status: response.status };
}

/* ============================================================
 *  SAMPLE-ENDPOINTS
 * ============================================================ */

/**
 * Henter prøver (inkl. rack/slot) med paginering og evt. søk.
 * Backend returnerer hele sample-objektet med relasjoner:
 *   { id, supplier, matrix, sample_taken_time, type:{name}, slot:{ Rack:{ rfid } } … }
 */
export async function lab_getSamples({ page = 1, pageSize = 10, search } = {}) {
  try {
    const qs = new URLSearchParams({ page, pageSize });
    if (search) qs.append('search', search);
    const res = await fetch(`${API_BASE_URL}/samples?${qs}`);
    return handleResponse(res);
  } catch (e) {
    console.error('lab_getSamples:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}

/** Oppretter ny sample */
export async function lab_createSample(sample) {
  // sample: { supplier, matrix, sample_type, sample_taken_time, ... }
  try {
    const res = await fetch(`${API_BASE_URL}/samples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sample),
    });
    return handleResponse(res);
  } catch (e) {
    console.error('lab_createSample:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}

/** Oppdaterer eksisterende sample */
export async function lab_updateSample(id, sample) {
  try {
    const res = await fetch(`${API_BASE_URL}/samples/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sample),
    });
    return handleResponse(res);
  } catch (e) {
    console.error('lab_updateSample:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}

/** Sletter sample */
export async function lab_deleteSample(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/samples/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  } catch (e) {
    console.error('lab_deleteSample:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}

/* Select/deselect beholdes uendret om du fremdeles bruker dem */
export async function lab_selectSample(id)   { return fetchPost(`/samples/${id}/select`); }
export async function lab_deselectSample(id) { return fetchPost(`/samples/${id}/deselect`); }

async function fetchPost(url) {
  try {
    const res = await fetch(API_BASE_URL + url, { method: 'POST' });
    return handleResponse(res);
  } catch (e) {
    console.error(url, e); return { success: false, message: e.message };
  }
}

/* ============================================================
 *  RACK-ENDPOINTS
 * ============================================================ */

/** Oppdaterer RFID eller sample_type på et rack */
export async function lab_updateRack(rackId, rackData) {
  // rackData: { rfid?, sample_type? }
  try {
    const res = await fetch(`${API_BASE_URL}/racks/${rackId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rackData),
    });
    return handleResponse(res);
  } catch (e) {
    console.error('lab_updateRack:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}

/** (Valgfritt) Hent racks hvis du trenger dropdown-liste e.l. */
export async function lab_getRacks() {
  try {
    const res = await fetch(`${API_BASE_URL}/racks`);
    return handleResponse(res);
  } catch (e) {
    console.error('lab_getRacks:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}

/* ============================================================
 *  SAMPLE-TYPE / LOOKUP-ENDPOINTS
 * ============================================================ */

/** Hent liste over alle prøvetyper (id, name) – brukes i select-felt */
export async function lab_getSampleTypes() {
  try {
    const res = await fetch(`${API_BASE_URL}/rack-types`);
    return handleResponse(res);
  } catch (e) {
    console.error('lab_getSampleTypes:', e);
    return { success: false, message: e.message || 'Network error' };
  }
}
