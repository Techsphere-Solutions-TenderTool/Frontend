// src/lib/api.js

// Base URL for your tender API (Vite env)
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// What your scrapers/lambdas are basically sending
// 1 = Nat. eTenders, 2 = Eskom, 3 = SANRAL, 4 = Transnet
const SOURCE_ID_MAP = {
  1: "etenders",
  2: "eskom",
  3: "sanral",
  4: "transnet",
};

function qs(obj = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      p.append(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function http(path, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
    const text = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${text || "no body"}`);
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------
// detectSource: normalise all the different ways your
// scrapers can name the source / publisher
// ---------------------------------------------------
function detectSource(r) {
  // 1) explicit string from API
  if (typeof r.source === "string" && r.source.trim() !== "") {
    const s = r.source.trim().toLowerCase();
    if (s === "eskom") return "eskom";
    if (s === "sanral") return "sanral";
    if (s === "transnet" || s === "transral" || s === "transnet soc") return "transnet";
    if (s === "etenders" || s === "national etenders" || s === "e-tenders") return "etenders";
    return s; // unknown, but keep
  }

  // 2) sometimes there's a source_name / publisher
  if (typeof r.source_name === "string") {
    const s = r.source_name.trim().toLowerCase();
    if (s.includes("eskom")) return "eskom";
    if (s.includes("sanral")) return "sanral";
    if (s.includes("transnet") || s.includes("transral")) return "transnet";
    if (s.includes("tender") || s.includes("e-tender")) return "etenders";
  }

  if (typeof r.publisher === "string") {
    const s = r.publisher.trim().toLowerCase();
    if (s.includes("eskom")) return "eskom";
    if (s.includes("sanral")) return "sanral";
    if (s.includes("transnet") || s.includes("transral")) return "transnet";
    if (s.includes("tender")) return "etenders";
  }

  // 3) your sample clearly has source_id
  if (r.source_id != null) {
    const mapped = SOURCE_ID_MAP[r.source_id];
    if (mapped) return mapped;
  }

  // 4) last resort: sometimes buyer is SANRAL
  if (typeof r.buyer === "string") {
    const s = r.buyer.trim().toLowerCase();
    if (s === "sanral" || s.includes("national roads")) return "sanral";
    if (s === "eskom" || s.includes("eskom")) return "eskom";
    if (s.includes("transnet")) return "transnet";
  }

  // don't force "ESKOM" anymore – that was your bug
  return "";
}

// ---------------------------------------------------
// normalise the list payload
// ---------------------------------------------------
function normalizeListPayload(data) {
  // Your API: { total, limit, offset, results: [...] }
  const raw = Array.isArray(data)
    ? data
    : data?.results ?? data?.items ?? [];

  const total = data?.total ?? raw.length;

  const items = raw.map((r) => {
    const source = detectSource(r);

    return {
      id: r.id ?? r.referenceNumber ?? r._id,
      title: r.title ?? r.name ?? "(no title)",
      buyer: r.buyer ?? r.issuer ?? "",
      category: r.category ?? "",
      status: r.status ?? "",
      source, // now correct: eskom, sanral, transnet, etenders
      published_at: r.published_at ?? r.publishedAt ?? null,
      closing_at: r.closing_at ?? r.closingAt ?? null,
      location: r.location ?? "",
      url: r.url ?? null,
      summary: r.summary ?? "",
    };
  });

  return { items, total };
}

// ---------------------------------------------------
// public fetchers
// ---------------------------------------------------
export async function listTenders(filters = {}) {
  const {
    page = 1,
    pageSize = 20,
    q = "",
    sort = "-closing_at",

    // extra filters you send from UI
    source,
    category,
    location,
    buyer,
    status,
    from,
    to,
    closingFrom,
    closingTo,
    closing_after,
    closing_before,
  } = filters;

  // your backend uses limit/offset
  const query = {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    q,
    sort,
  };

  // forward every filter to backend (even if it ignores now)
  if (source) query.source = source;
  if (category) query.category = category;
  if (location) query.location = location;
  if (buyer) query.buyer = buyer;
  if (status) query.status = status;

  // published date range (you had from/to)
  if (from) query.published_from = from;
  if (to) query.published_to = to;

  // closing date (2 names, to match your “later” API)
  if (closingFrom) query.closing_after = closingFrom;
  if (closingTo) query.closing_before = closingTo;
  if (closing_after) query.closing_after = closing_after;
  if (closing_before) query.closing_before = closing_before;

  const data = await http(`/tenders${qs(query)}`);
  return normalizeListPayload(data);
}

// single tender
export async function getTenderById(id) {
  return http(`/tenders/${encodeURIComponent(id)}`);
}

/* ------- tiny session cache for details refresh ------- */
const CACHE_KEY = "tender_cache_v1";

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeCache(obj) {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
}

export function cacheTender(row) {
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
   documents & contacts for a tender
   ========================================================= */
function normalizeDocuments(data) {
  const raw = Array.isArray(data)
    ? data
    : data?.results ?? data?.items ?? [];
  return raw.map((d) => ({
    id: d.id ?? d.document_id ?? d.key ?? d.name ?? Math.random().toString(36).slice(2),
    name: d.name ?? d.filename ?? d.title ?? "Document",
    url: d.url ?? d.download_url ?? d.s3_url ?? null,
    type: d.type ?? d.mime ?? "",
    size: d.size ?? d.filesize ?? null,
  }));
}

function normalizeContacts(data) {
  const raw = Array.isArray(data)
    ? data
    : data?.results ?? data?.items ?? [];
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
  // 1st attempt: REST
  try {
    const data = await http(`/tenders/${encodeURIComponent(tenderId)}/documents`);
    return normalizeDocuments(data);
  } catch (e) {
    // 2nd attempt: flat
    const data = await http(`/documents${qs({ tenderId })}`);
    return normalizeDocuments(data);
  }
}

export async function getTenderContacts(tenderId) {
  if (!tenderId) return [];
  // 1st attempt: REST
  try {
    const data = await http(`/tenders/${encodeURIComponent(tenderId)}/contacts`);
    return normalizeContacts(data);
  } catch (e) {
    // 2nd attempt: flat
    const data = await http(`/contacts${qs({ tenderId })}`);
    return normalizeContacts(data);
  }
}

/* =========================================================
   ✅ AI: summarise tender
   tries a couple of common endpoints so you don't get
   UGLY 404s in the UI
   ========================================================= */
export async function summariseTender(data) {
  if (!BASE) {
    // dev fallback
    return {
      summary:
        "AI service is not configured (VITE_API_BASE_URL is empty). Add the endpoint on the backend.",
    };
  }

  const endpoints = [
    "/summarise",
    "/ai/summarise",
    "/ai/summary",
    "/summary",
  ];

  const body = JSON.stringify(data);

  for (const path of endpoints) {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await res.text();

    // success → return JSON
    if (res.ok) {
      return text ? JSON.parse(text) : { summary: "" };
    }

    // if this endpoint just doesn't exist, try next one
    if (res.status === 404) {
      continue;
    }

    // any other error → throw right away
    throw new Error(text || `Failed to summarise using ${path}`);
  }

  // if we got here, none of the routes existed
  return {
    summary:
      "AI summary route not found on the API. Ask your backend to add POST /summarise (or /ai/summarise).",
  };
}
