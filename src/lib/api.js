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

// Map AWS → UI
function normalizeListPayload(data) {
  // Your AWS sample: { total, limit, offset, results: [...] }
  const raw   = Array.isArray(data) ? data : (data.results ?? data.items ?? []);
  const total = data.total ?? raw.length;

  const items = raw.map(r => ({
    id:         r.id ?? r.referenceNumber ?? r._id,
    title:      r.title ?? r.name ?? '(no title)',
    buyer:      r.buyer ?? r.issuer ?? '—',
    category:   r.category ?? '—',
    status:     r.status ?? '',
    source:     'ESKOM',                // optional: you can derive from source_id if you like
    published_at: r.published_at ?? null,
    closing_at:   r.closing_at ?? null,
    location:     r.location ?? '',
    url:          r.url ?? null,
    summary:      r.summary ?? '',      // not in sample, safe default
  }));

  return { items, total };
}

export async function listTenders({ page = 1, pageSize = 20, q = '', sort = '-closing_at' } = {}) {
  // If your API uses page & pageSize, keep as-is. If it uses limit/offset, change here.
  const query = { page, pageSize, q, sort };
  const data = await http(`/tenders${qs(query)}`);
  return normalizeListPayload(data);
}

// (Optional) If you later add /tenders/:id upstream, this will work:
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

/** Optional: SNS stub remains unchanged */
export async function subscribeToTender({ email, tenderId }) {
  await new Promise(r => setTimeout(r, 600));
  return { ok: true, message: `Subscribed ${email} to tender ${tenderId} (stub)` };
}
