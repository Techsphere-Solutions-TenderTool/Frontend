const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// fetch helper with timeout + better error messages
async function http(path, { method = 'GET', headers = {}, body, signal, timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(import.meta.env.VITE_API_KEY ? { 'x-api-key': import.meta.env.VITE_API_KEY } : {}),
        ...headers,
      },
      body,
      signal: signal || ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${text || 'no body'}`);
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(t);
  }
}

// normalize whatever your API returns into the shape the table expects
function normalizeListPayload(data) {
  const raw   = Array.isArray(data) ? data : (data.items ?? data.results ?? data.records ?? data.data ?? []);
  const total = data.total ?? data.count ?? data.totalCount ?? raw.length;

  const items = raw.map(r => ({
    id:            r.id ?? r.ocid ?? r.tenderId ?? r._id ?? r.referenceNumber,
    title:         r.title ?? r.tender?.title ?? r.name ?? '(no title)',
    buyer:         r.buyer?.name ?? r.buyerName ?? r.buyer ?? r.issuer ?? '—',
    source:        r.source ?? r.platform ?? r.origin ?? r.category ?? '—',
    published_at:  r.published_at ?? r.date ?? r.publishedAt ?? r.publicationDate ?? r.tender?.tenderPeriod?.startDate ?? null,
    closing_at:    r.closing_at ?? r.closeDate ?? r.closingAt ?? r.closingDateTime ?? r.tender?.tenderPeriod?.endDate ?? null,
    summary:       r.summary ?? r.description ?? '',
    sourceUrl:     r.sourceUrl ?? r.url ?? r.link ?? null,
    location:      r.location ?? r.region ?? '',
    referenceNumber: r.referenceNumber ?? r.id ?? '',
  }));

  return { items, total };
}

export async function listTenders(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    q = '',
    sort = '-closing_at',     // "field" or "-field"
    status = '',
    buyer = '',
    source = '',
    published_from = '',
    published_to = '',
  } = params;

  const query = { page, pageSize, q, sort, status, buyer, source, published_from, published_to };
  const data = await http(`/tenders${qs(query)}`);
  return normalizeListPayload(data);
}

export async function getTender(id) {
  return http(`/tenders/${encodeURIComponent(id)}`);
}

export async function getDocuments(id) {
  const data = await http(`/tenders/${encodeURIComponent(id)}/documents`);
  const items = Array.isArray(data) ? data : (data.items ?? data.results ?? data.data ?? []);
  return { items };
}

export async function getContacts(id) {
  const data = await http(`/tenders/${encodeURIComponent(id)}/contacts`);
  const items = Array.isArray(data) ? data : (data.items ?? data.results ?? data.data ?? []);
  return { items };
}

/** Optional: SNS stub remains unchanged */
export async function subscribeToTender({ email, tenderId }) {
  await new Promise(r => setTimeout(r, 600));
  return { ok: true, message: `Subscribed ${email} to tender ${tenderId} (stub)` };
}
