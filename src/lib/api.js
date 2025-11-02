// src/lib/api.js

/* =========================================================
   Base + tiny helpers
   ========================================================= */
export const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const SOURCE_ID_MAP = { 1: "etenders", 2: "eskom", 3: "sanral", 4: "transnet" };

function qs(obj = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function http(path, { method = "GET", headers, body, timeoutMs = 15000, json = true } = {}) {
  if (!BASE) throw new Error("VITE_API_BASE_URL is not set in .env");

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body,
      signal: ctrl.signal,
      // mode: "cors" // not required when same domain; API Gateway CORS must be enabled server side
    });
  } catch (err) {
    clearTimeout(t);
    throw new Error(`Network/CORS error calling ${path}: ${err?.message || err}`);
  } finally {
    clearTimeout(t);
  }

  // Read text once; we can parse JSON from the text
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // Try to surface backend error JSON
    try {
      const j = JSON.parse(text);
      const msg = j?.message || j?.error || text || `HTTP ${res.status}`;
      throw new Error(`${method} ${path} failed (${res.status}): ${msg}`);
    } catch {
      throw new Error(`${method} ${path} failed (${res.status}): ${text || "no body"}`);
    }
  }

  if (!text) return null;
  return json ? JSON.parse(text) : text;
}

/* =========================================================
   Source / text helpers
   ========================================================= */
function detectSource(r) {
  // 1) explicit string from API
  if (typeof r.source === "string" && r.source.trim() !== "") {
    const s = r.source.trim().toLowerCase();
    if (s === "eskom") return "eskom";
    if (s === "sanral") return "sanral";
    if (s === "transnet" || s === "transral" || s === "transnet soc") return "transnet";
    if (s === "etenders" || s === "national etenders" || s === "e-tenders") return "etenders";
    return s;
  }

  // 2) alternative fields
  if (typeof r.source_name === "string") {
    const s = r.source_name.trim().toLowerCase();
    if (s.includes("eskom")) return "eskom";
    if (s.includes("sanral")) return "sanral";
    if (s.includes("transnet") || s.includes("transral")) return "transnet";
    if (s.includes("tender")) return "etenders";
  }
  if (typeof r.publisher === "string") {
    const s = r.publisher.trim().toLowerCase();
    if (s.includes("eskom")) return "eskom";
    if (s.includes("sanral")) return "sanral";
    if (s.includes("transnet") || s.includes("transral")) return "transnet";
    if (s.includes("tender")) return "etenders";
  }

  // 3) numeric id
  if (r.source_id != null) {
    const mapped = SOURCE_ID_MAP[r.source_id];
    if (mapped) return mapped;
  }

  // 4) fallback via buyer
  if (typeof r.buyer === "string") {
    const s = r.buyer.trim().toLowerCase();
    if (s === "sanral" || s.includes("national roads")) return "sanral";
    if (s.includes("eskom")) return "eskom";
    if (s.includes("transnet")) return "transnet";
  }

  return "";
}

function normalizeListPayload(data) {
  const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
  const total = data?.total ?? data?.count ?? raw.length;

  const items = raw.map((r) => ({
    id: r.id ?? r.referenceNumber ?? r._id,
    title: r.title ?? r.name ?? "(no title)",
    buyer: r.buyer ?? r.issuer ?? "",
    category: r.category ?? "",
    status: r.status ?? "",
    source: detectSource(r),
    published_at: r.published_at ?? r.publishedAt ?? null,
    closing_at: r.closing_at ?? r.closingAt ?? null,
    location: r.location ?? "",
    url: r.url ?? null,
    summary: r.summary ?? "",
    contacts: r.contacts ?? undefined,
  }));

  return { items, total };
}

/* =========================================================
   Tenders: list + single
   ========================================================= */
export async function listTenders(filters = {}) {
  const {
    page = 1,
    pageSize = 20,
    q = "",
    sort = "-closing_at",

    // optional filters (your backend may use/ignore)
    source,
    category,
    location,
    buyer,
    status,

    // published date range
    from,
    to,

    // closing ranges
    closingFrom,
    closingTo,
    closing_after,
    closing_before,
  } = filters;

  const query = {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    q,
    sort,
  };

  if (source) query.source = source;
  if (category) query.category = category;
  if (location) query.location = location;
  if (buyer) query.buyer = buyer;
  if (status) query.status = status;

  if (from) query.published_from = from;
  if (to) query.published_to = to;

  if (closingFrom) query.closing_after = closingFrom;
  if (closingTo) query.closing_before = closingTo;
  if (closing_after) query.closing_after = closing_after;
  if (closing_before) query.closing_before = closing_before;

  const data = await http(`/tenders${qs(query)}`);
  return normalizeListPayload(data);
}

export async function getTenderById(id) {
  return http(`/tenders/${encodeURIComponent(id)}`);
}

/* ------- tiny session cache for details refresh ------- */
const CACHE_KEY = "tender_cache_v1";
function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}"); }
  catch { return {}; }
}
function writeCache(obj) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj)); }
  catch {}
}
export function cacheTender(row) {
  if (!row?.id) return;
  const c = readCache();
  c[row.id] = row;
  writeCache(c);
}
export function getCachedTender(id) {
  const c = readCache();
  return c[id] || null;
}

/* ------- SNS (stub) ------- */
export async function subscribeToTender({ email, tenderId }) {
  await new Promise((r) => setTimeout(r, 600));
  return { ok: true, message: `Subscribed ${email} to tender ${tenderId} (stub)` };
}

/* =========================================================
   Documents & Contacts
   ========================================================= */
function normalizeDocuments(data) {
  const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
  return raw.map((d) => ({
    id: d.id ?? d.document_id ?? d.key ?? d.name ?? Math.random().toString(36).slice(2),
    name: d.name ?? d.filename ?? d.title ?? "Document",
    url: d.url ?? d.download_url ?? d.s3_url ?? null,
    type: d.type ?? d.mime ?? "",
    size: d.size ?? d.filesize ?? null,
  }));
}
function normalizeContacts(data) {
  const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
  return raw.map((c) => ({
    id: c.id ?? c.contact_id ?? Math.random().toString(36).slice(2),
    name: c.name ?? c.fullname ?? "Contact",
    email: c.email ?? c.mail ?? "",
    phone: c.phone ?? c.tel ?? c.mobile ?? "",
    role: c.role ?? c.position ?? "",
  }));
}
export async function getTenderDocuments(tenderId) {
  if (!tenderId) return [];
  try {
    const data = await http(`/tenders/${encodeURIComponent(tenderId)}/documents`);
    return normalizeDocuments(data);
  } catch (err) {
    // fallback endpoint
    const data = await http(`/documents${qs({ tenderId })}`);
    return normalizeDocuments(data);
  }
}
export async function getTenderContacts(tenderId) {
  if (!tenderId) return [];
  try {
    const data = await http(`/tenders/${encodeURIComponent(tenderId)}/contacts`);
    return normalizeContacts(data);
  } catch (err) {
    const data = await http(`/contacts${qs({ tenderId })}`);
    return normalizeContacts(data);
  }
}

/* =========================================================
   ✅ NEW: Stats endpoint with cache + robust normalizer
   GET /stats  → returns something like:
     { total: 1036, bySource: { eskom: 123, sanral: 45, ... },
       byCategory: { construction: 10, ... }, lastUpdated: "ISO" }
   We accept many common shapes defensively.
   ========================================================= */
let _statsCache = { at: 0, data: null };
const STATS_TTL_MS = 5 * 60 * 1000; // 5 minutes

function normalizeStats(data) {
  if (!data) return { total: 0, bySource: {}, byCategory: {}, lastUpdated: null };

  // Try to detect total
  const total =
    data.total ??
    data.count ??
    data?.tenders?.total ??
    (Array.isArray(data.results) ? data.results.length : 0);

  // bySource can be object or array of {source,count}
  let bySource = {};
  const src = data.bySource || data.by_source || data.sources;
  if (Array.isArray(src)) {
    for (const row of src) {
      const key = (row.source || row.name || row.id || "").toString().toLowerCase();
      const val = Number(row.count ?? row.total ?? row.value ?? 0);
      if (key) bySource[key] = val;
    }
  } else if (src && typeof src === "object") {
    for (const [k, v] of Object.entries(src)) bySource[k.toLowerCase()] = Number(v || 0);
  }

  // byCategory similar story
  let byCategory = {};
  const cat = data.byCategory || data.by_category || data.categories;
  if (Array.isArray(cat)) {
    for (const row of cat) {
      const key = (row.category || row.name || row.id || "").toString();
      const val = Number(row.count ?? row.total ?? row.value ?? 0);
      if (key) byCategory[key] = val;
    }
  } else if (cat && typeof cat === "object") {
    for (const [k, v] of Object.entries(cat)) byCategory[k] = Number(v || 0);
  }

  const lastUpdated =
    data.lastUpdated || data.last_updated || data.updatedAt || data.generatedAt || null;

  return { total: Number(total || 0), bySource, byCategory, lastUpdated };
}

/**
 * Get stats with a small memory cache. Pass { force: true } to bypass cache.
 */
export async function getStats({ force = false } = {}) {
  const now = Date.now();
  if (!force && _statsCache.data && now - _statsCache.at < STATS_TTL_MS) {
    return _statsCache.data;
  }
  const raw = await http("/stats");
  const normalized = normalizeStats(raw);
  _statsCache = { at: now, data: normalized };
  return normalized;
}

/* Optional: list available sources (if backend exposes it) */
export async function getSources() {
  try {
    const data = await http("/sources");
    // Normalize to [{id, name}]
    const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
    return raw.map((s) => ({
      id: (s.id || s.name || "").toString().toLowerCase(),
      name: s.name || s.id || "",
    }));
  } catch {
    // Provide sensible defaults if endpoint not present
    return [
      { id: "eskom", name: "ESKOM" },
      { id: "sanral", name: "SANRAL" },
      { id: "transnet", name: "Transnet" },
      { id: "etenders", name: "National eTenders" },
    ];
  }
}

/* =========================================================
   AI summary (same as before, slightly cleaned)
   ========================================================= */
export async function summariseTender(data) {
  if (!BASE) {
    return { summary: "AI service is not configured (VITE_API_BASE_URL is empty)." };
  }

  const endpoints = ["/summarise", "/ai/summarise", "/ai/summary", "/summary"];
  const body = JSON.stringify(data);

  for (const path of endpoints) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : { summary: "" };
    if (res.status === 404) continue; // try next known route
    throw new Error(text || `Failed to summarise using ${path}`);
  }

  return {
    summary:
      "AI summary route not found on the API. Ask your backend to add POST /summarise (or /ai/summarise).",
  };
}