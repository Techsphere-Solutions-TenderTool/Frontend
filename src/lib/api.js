// src/lib/api.js
const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function qs(obj = {}) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function http(path, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
    const text = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${text || 'no body'}`);
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(t);
  }
}

// ---------------------- LIST NORMALIZER ----------------------
function normalizeListPayload(data) {
  // Your AWS sample: { total, limit, offset, results: [...] }
  const raw   = Array.isArray(data) ? data : (data.results ?? data.items ?? []);
  const total = data.total ?? raw.length;

  const items = raw.map(r => ({
    id:           r.id ?? r.referenceNumber ?? r._id,
    title:        r.title ?? r.name ?? '(no title)',
    buyer:        r.buyer ?? r.issuer ?? '—',
    category:     r.category ?? '—',
    status:       r.status ?? '',
    source:       r.source ?? 'ESKOM',   // derive from source_id later
    published_at: r.published_at ?? null,
    closing_at:   r.closing_at ?? null,
    location:     r.location ?? '',
    url:          r.url ?? null,
    summary:      r.summary ?? '',
  }));

  return { items, total };
}

// ---------------------- NEW: DOCS / CONTACTS NORMALIZERS ----------------------
function normalizeDocuments(data) {
  const raw = Array.isArray(data) ? data : (data.results ?? data.items ?? []);
  return raw.map(d => ({
    id:   d.id ?? d.document_id ?? d.key ?? d.name ?? Math.random().toString(36).slice(2),
    name: d.name ?? d.filename ?? d.title ?? 'Document',
    url:  d.url ?? d.download_url ?? d.s3_url ?? null,
    type: d.type ?? d.mime ?? '',
    size: d.size ?? d.filesize ?? null,
  }));
}

function normalizeContacts(data) {
  const raw = Array.isArray(data) ? data : (data.results ?? data.items ?? []);
  return raw.map(c => ({
    id:    c.id ?? c.contact_id ?? Math.random().toString(36).slice(2),
    name:  c.name ?? c.fullname ?? 'Contact',
    email: c.email ?? c.mail ?? '',
    phone: c.phone ?? c.tel ?? c.mobile ?? '',
    role:  c.role ?? c.position ?? '',
  }));
}

// ---------------------- EXPORTS ----------------------
export async function listTenders({ page = 1, pageSize = 20, q = '', sort = '-closing_at' } = {}) {
  const query = { page, pageSize, q, sort };
  const data = await http(`/tenders${qs(query)}`);
  return normalizeListPayload(data);
}

// single tender
export async function getTenderById(id) {
  return http(`/tenders/${encodeURIComponent(id)}`);
}

/* ------- tiny session cache for details refresh ------- */
const CACHE_KEY = 'tender_cache_v1';

function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}
function writeCache(obj) { sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj)); }

export function cacheTender(row) {
  const c = readCache(); c[row.id] = row; writeCache(c);
}
export function getCachedTender(id) {
  const c = readCache(); return c[id] || null;
}

/* ------- SNS (stub) ------- */
export async function subscribeToTender({ email, tenderId }) {
  await new Promise(r => setTimeout(r, 600));
  return { ok: true, message: `Subscribed ${email} to tender ${tenderId} (stub)` };
}

/* =========================================================
   NEW: documents & contacts for a tender
   We’ll try the REST-ish version first:
     /tenders/{id}/documents
     /tenders/{id}/contacts
   and if that fails (because your gateway looks like /documents?tid=...),
   we fall back to the flat routes.
   ========================================================= */
export async function getTenderDocuments(tenderId) {
  if (!tenderId) return [];
  try {
    const data = await http(`/tenders/${encodeURIComponent(tenderId)}/documents`);
    return normalizeDocuments(data);
  } catch (e) {
    // fallback to flat route: /documents?tenderId=...
    const data = await http(`/documents${qs({ tenderId })}`);
    return normalizeDocuments(data);
  }
}

export async function getTenderContacts(tenderId) {
  if (!tenderId) return [];
  try {
    const data = await http(`/tenders/${encodeURIComponent(tenderId)}/contacts`);
    return normalizeContacts(data);
  } catch (e) {
    // fallback to flat route: /contacts?tenderId=...
    const data = await http(`/contacts${qs({ tenderId })}`);
    return normalizeContacts(data);
  }
}
