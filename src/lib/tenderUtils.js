/**
 * COMPLETE TENDER UTILITIES
 * All helper functions for tender display, filtering, sorting, and pagination
 */

/* ===================== TEXT NORMALIZATION ===================== */
export function norm(v) {
  return String(v || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMeaningful(v) {
  if (!v) return false;
  const s = String(v).trim();
  if (!s) return false;
  const bad = ["-", "—", "n/a", "na", "null", "none", "undefined", "n.a."];
  return !bad.includes(s.toLowerCase());
}

/* ===================== DATES ===================== */
export function parseDate(d) {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(+t) ? null : t;
}

export function isFuture(d) {
  return d instanceof Date && d.getTime() > Date.now();
}

export function formatDate(d, format = "short") {
  const date = parseDate(d);
  if (!date) return "—";
  if (format === "short") {
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }
  if (format === "long") {
    return date.toLocaleDateString("en-ZA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("en-ZA");
}

/* ===================== SOURCES ===================== */
export function prettySource(s) {
  if (!s) return "";
  const low = String(s).toLowerCase();
  if (low === "eskom") return "ESKOM";
  if (low === "sanral") return "SANRAL";
  if (low === "transnet") return "Transnet";
  if (low === "etenders" || low === "national etenders") return "National eTenders";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function mapSourceIdToSlug(id) {
  const map = { 1: "etenders", 2: "eskom", 3: "sanral", 4: "transnet" };
  return map[id] || "";
}

export function getSourceSlug(row) {
  const fromField = norm(row.source || row.publisher || row.buyer || "");
  if (["eskom", "sanral", "transnet", "etenders"].includes(fromField)) return fromField;
  if (row.source_id) {
    const mapped = mapSourceIdToSlug(row.source_id);
    if (mapped) return mapped;
  }
  return fromField;
}

/* ===================== CATEGORIES ===================== */
export function categorySlug(s) {
  const n = norm(s);
  if (!n) return "";
  if (/(construction|civil|building)/.test(n)) return "construction-civil";
  if (/distribution/.test(n)) return "distribution";
  if (/generation/.test(n)) return "generation";
  if (/(corporate|admin)/.test(n)) return "corporate";
  if (/engineering/.test(n)) return "engineering";
  if (/(it|software|tech|ict)/.test(n)) return "it-software";
  if (/security/.test(n)) return "security";
  if (/(clean|hygiene|janitorial)/.test(n)) return "cleaning-hygiene";
  if (/(medical|health|hospital)/.test(n)) return "medical-healthcare";
  if (/(consult|training|advisory)/.test(n)) return "consulting-training";
  if (/(transport|fleet|vehicle)/.test(n)) return "transport-fleet";
  if (/(facilit|maintain|upkeep)/.test(n)) return "facilities-maintenance";
  if (/(electrical|energy|power)/.test(n)) return "electrical-energy";
  return n;
}

export function prettyCategory(s) {
  if (!s || !isMeaningful(s)) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/* ===================== STATUS / BADGES ===================== */
export function buildStatusFromClosing(closingDate) {
  const d = parseDate(closingDate);
  if (!d || !isFuture(d)) return { label: "Open", className: "tt-chip-soft" };
  const diffDays = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return { label: "Closing today", className: "tt-chip-danger" };
  if (diffDays <= 3) return { label: "Closing in 3 days", className: "tt-chip-warning" };
  if (diffDays <= 7) return { label: "Closing soon", className: "tt-chip-warning" };
  return { label: "Open", className: "tt-chip-soft" };
}
export const buildStatusChip = buildStatusFromClosing;

export function computeBadge(publishedAt) {
  const d = parseDate(publishedAt);
  if (!d) return null;
  const diffHours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  if (diffHours <= 24) return "NEW";
  if (diffHours <= 72) return "Updated";
  return null;
}
export const buildBadge = computeBadge;

/* ===================== COUNTDOWN ===================== */
export function humanCountdown(closingDate) {
  const d = parseDate(closingDate);
  if (!d) return "";
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "";
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 30) {
    const months = Math.floor(days / 30);
    const rem = days % 30;
    return rem ? `${months}mo ${rem}d` : `${months}mo`;
  }
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function humanCountdownRich(closingDate) {
  const s = humanCountdown(closingDate);
  return s ? `Closes in ${s}` : "";
}

export function humanCountdownFull(closingDate) {
  const d = parseDate(closingDate);
  if (!d) return "No closing date";
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 30) {
    const months = Math.floor(days / 30);
    const rem = days % 30;
    return rem
      ? `Closes in ${months} month${months !== 1 ? "s" : ""} and ${rem} day${rem !== 1 ? "s" : ""}`
      : `Closes in ${months} month${months !== 1 ? "s" : ""}`;
  }
  if (days > 0) return `Closes in ${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `Closes in ${hours} hour${hours !== 1 ? "s" : ""}`;
  return `Closes in ${mins} minute${mins !== 1 ? "s" : ""}`;
}

/* ===================== DISPLAY HELPERS ===================== */
export function buildSubline({ buyer, location, source }) {
  const items = [];
  if (buyer && isMeaningful(buyer) && buyer !== source) items.push(buyer);
  if (location && isMeaningful(location)) items.push(location);
  return items.join(" • ");
}

export function computeUrgency(closingDate) {
  const d = parseDate(closingDate);
  if (!d) return { urgencyLabel: null, urgencyClass: "" };
  const diffDays = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return { urgencyLabel: "Closing today", urgencyClass: "tt-chip-danger" };
  if (diffDays <= 3) return { urgencyLabel: "Closing in 3 days", urgencyClass: "tt-chip-warning" };
  if (diffDays <= 7) return { urgencyLabel: "Closing soon", urgencyClass: "tt-chip-soft" };
  return { urgencyLabel: null, urgencyClass: "" };
}

/* ===================== SORTING ===================== */
function cmpDates(a, b, dir = "asc") {
  const av = a ? a.getTime() : -Infinity;
  const bv = b ? b.getTime() : -Infinity;
  const diff = av - bv;
  return dir === "asc" ? diff : -diff;
}

export function makeComparator(sortKey) {
  switch (sortKey) {
    case "published_at":
      return (a, b) => cmpDates(parseDate(a.published_at), parseDate(b.published_at), "asc");
    case "-published_at":
      return (a, b) => cmpDates(parseDate(a.published_at), parseDate(b.published_at), "desc");
    case "closing_at":
      return (a, b) => cmpDates(parseDate(a.closing_at), parseDate(b.closing_at), "asc");
    case "-closing_at":
      return (a, b) => cmpDates(parseDate(a.closing_at), parseDate(b.closing_at), "desc");
    default:
      return (a, b) => cmpDates(parseDate(a.published_at), parseDate(b.published_at), "desc");
  }
}

/* ===================== PAGINATION ===================== */
export function buildPageList(curr, total, { siblings = 1, boundaries = 1 } = {}) {
  if (total <= 1) return [1];
  const pages = [];
  const start = Math.max(2, curr - siblings);
  const end = Math.min(total - 1, curr + siblings);

  for (let i = 1; i <= Math.min(boundaries, total); i++) pages.push(i);
  if (start > boundaries + 1) pages.push("…");
  for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
  if (end < total - boundaries) pages.push("…");
  for (let i = Math.max(total - boundaries + 1, 2); i <= total; i++)
    if (!pages.includes(i)) pages.push(i);

  return pages;
}

/* ===================== FILTERING (optional helpers) ===================== */
export function matchesTextSearch(tender, query) {
  if (!query) return true;
  const needle = norm(query);
  const haystack = [tender.title, tender.buyer, tender.location, tender.category, tender.description, tender.summary]
    .filter(Boolean)
    .map(norm)
    .join(" ");
  return haystack.includes(needle);
}

export function matchesSource(tender, sourceSlug) {
  if (!sourceSlug) return true;
  return getSourceSlug(tender) === norm(sourceSlug);
}

export function matchesCategory(tender, categoryLabel) {
  if (!categoryLabel) return true;
  const wantedSlug = categorySlug(categoryLabel);
  const tenderSlug = categorySlug(tender.category);
  return tenderSlug === wantedSlug;
}

export function matchesLocation(tender, locationQuery) {
  if (!locationQuery) return true;
  const needle = norm(locationQuery);
  const haystack = norm(tender.location);
  return haystack.includes(needle);
}

export function matchesDateRange(tender, { closingAfter, closingBefore }) {
  const closing = parseDate(tender.closing_at);
  if (!closing) return false;
  if (closingAfter) {
    const ca = new Date(closingAfter);
    ca.setHours(0, 0, 0, 0);
    if (closing < ca) return false;
  }
  if (closingBefore) {
    const cb = new Date(closingBefore);
    cb.setHours(23, 59, 59, 999);
    if (closing > cb) return false;
  }
  return true;
}

export function filterTenders(tenders, filters) {
  const { q = "", source = "", category = "", location = "", closingAfter = "", closingBefore = "" } = filters;
  return tenders.filter((t) => {
    if (!matchesTextSearch(t, q)) return false;
    if (!matchesSource(t, source)) return false;
    if (!matchesCategory(t, category)) return false;
    if (!matchesLocation(t, location)) return false;
    if (!matchesDateRange(t, { closingAfter, closingBefore })) return false;
    return true;
  });
}

/* ===================== VALIDATION ===================== */
export function isValidTender(tender) {
  if (!tender) return false;
  if (!tender.title || !isMeaningful(tender.title)) return false;
  return true;
}
export function getTenderId(tender) {
  return tender?.id ?? tender?.referenceNumber ?? null;
}

export default {
  norm,
  isMeaningful,
  parseDate,
  isFuture,
  formatDate,
  prettySource,
  mapSourceIdToSlug,
  getSourceSlug,
  categorySlug,
  prettyCategory,
  buildStatusFromClosing,
  buildStatusChip,
  computeBadge,
  buildBadge,
  computeUrgency,
  humanCountdown,
  humanCountdownRich,
  humanCountdownFull,
  buildSubline,
  makeComparator,
  buildPageList,
  matchesTextSearch,
  matchesSource,
  matchesCategory,
  matchesLocation,
  matchesDateRange,
  filterTenders,
  isValidTender,
  getTenderId,
};
