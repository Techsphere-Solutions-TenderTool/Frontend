// src/routes/TendersPage.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, Clock4 } from "lucide-react";
import { listTenders, cacheTender } from "../lib/api.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";

import { PrefsContext } from "../App.jsx";

/* ===================== CONFIG ===================== */

// If your API emits numeric source_id, map to slugs
const SOURCE_ID_MAP = { 1: "etenders", 2: "eskom", 3: "sanral", 4: "transnet" };

// Categories shown to users (labels)
const CATEGORIES = [
  "Construction & Civil",
  "Distribution",
  "Generation",
  "Corporate",
  "Engineering",
  "IT & Software",
  "Security",
  "Cleaning & Hygiene",
  "Medical & Healthcare",
  "Consulting & Training",
  "Transport & Fleet",
  "Facilities & Maintenance",
  "Electrical & Energy",
];

// When applying client-side filters, fetch a larger chunk to filter locally
const FETCH_CHUNK = 400;

/* ===================== TEXT/DATE HELPERS ===================== */

const norm = (v) =>
  String(v || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function parseDate(d) {
  const t = d ? new Date(d) : null;
  return t && !isNaN(t.getTime()) ? t : null;
}

function prettySource(s) {
  if (!s) return "";
  const low = String(s).toLowerCase();
  if (low === "eskom") return "ESKOM";
  if (low === "sanral") return "SANRAL";
  if (low === "transnet") return "Transnet";
  if (low === "etenders") return "National eTenders";
  return s;
}

// Turn any category text (any case / formatting) into a stable slug
function categorySlug(s) {
  const n = norm(s);
  if (!n) return "";
  if (/(construction|civil)/.test(n)) return "construction-civil";
  if (/distribution/.test(n)) return "distribution";
  if (/generation/.test(n)) return "generation";
  if (/corporate/.test(n)) return "corporate";
  if (/engineering/.test(n)) return "engineering";
  if (/(it|software)/.test(n)) return "it-software";
  if (/security/.test(n)) return "security";
  if (/(clean|hygiene)/.test(n)) return "cleaning-hygiene";
  if (/(medical|health)/.test(n)) return "medical-healthcare";
  if (/(consult|training)/.test(n)) return "consulting-training";
  if (/(transport|fleet)/.test(n)) return "transport-fleet";
  if (/(facilit|maintain)/.test(n)) return "facilities-maintenance";
  if (/(electrical|energy)/.test(n)) return "electrical-energy";
  return n; // fallback
}

function getSourceSlug(row) {
  const fromField = norm(row.source || row.publisher || row.buyer);
  if (["eskom", "sanral", "transnet", "etenders"].includes(fromField)) return fromField;
  const viaId = SOURCE_ID_MAP[row.source_id] || "";
  return norm(viaId);
}

/* ===================== SORT HELPERS ===================== */

function cmpDates(a, b, dir = "asc") {
  const av = a ? a.getTime() : -Infinity;
  const bv = b ? b.getTime() : -Infinity;
  const diff = av - bv;
  return dir === "asc" ? diff : -diff;
}

function makeComparator(sortKey) {
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

/* ===================== PAGER HELPERS ===================== */

function buildPageList(curr, total, { siblings = 1, boundaries = 1 } = {}) {
  const pages = [];
  const start = Math.max(2, curr - siblings);
  const end = Math.min(total - 1, curr + siblings);
  for (let i = 1; i <= Math.min(boundaries, total); i++) pages.push(i);
  if (start > boundaries + 1) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - boundaries) pages.push("…");
  for (let i = Math.max(total - boundaries + 1, 1); i <= total; i++) {
    if (!pages.includes(i)) pages.push(i);
  }
  return pages.filter((p) => p >= 1 && p <= total);
}

/* ===================== PAGE ===================== */

export default function TendersPage() {
  const navigate = useNavigate();
  const ctx = useContext(PrefsContext);

  const canSave = ctx?.canSave;
  const savedIds = ctx?.savedTenders || [];
  const addSaved = ctx?.addSavedTender;
  const removeSaved = ctx?.removeSavedTender;

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // UI state
  const [view, setView] = useState("all"); // "all" | "saved"
  const [showAdvanced, setShowAdvanced] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 350);
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [closingAfter, setClosingAfter] = useState("");
  const [closingBefore, setClosingBefore] = useState("");

  // paging + sort
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState("-published_at");

  // status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // jump to first page whenever filters/view/sort change
  useEffect(() => {
    setPage(1);
  }, [qDebounced, source, category, location, closingAfter, closingBefore, sort, view]);

  // Are we doing client-side filters?
  const clientFiltersActive =
    !!source || !!category || !!location || !!closingAfter || !!closingBefore;

  // Build the request for the API:
  // - Always send q + sort so backend can help reduce volume
  // - NEVER send category/source/location/date range → we handle locally
  const apiFilters = useMemo(() => {
    const f = {
      page: clientFiltersActive ? 1 : page,
      pageSize: clientFiltersActive ? FETCH_CHUNK : pageSize,
      q: qDebounced,
      sort,
    };
    return f;
  }, [clientFiltersActive, page, pageSize, qDebounced, sort]);

  // fetch + client filtering/sorting/paging
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const data = await listTenders(apiFilters);
        if (!alive) return;

        const items = data.results || data.items || [];
        const grandTotal = data.total ?? data.count ?? items.length;

        // ---- client-side filters ----
        let filtered = items;

        // keyword
        if (qDebounced) {
          const needle = norm(qDebounced);
          filtered = filtered.filter(
            (t) =>
              norm(t.title).includes(needle) ||
              norm(t.buyer).includes(needle) ||
              norm(t.location).includes(needle)
          );
        }

        // publisher
        if (source) {
          const wanted = norm(source);
          filtered = filtered.filter((t) => getSourceSlug(t) === wanted);
        }

        // category (robust to ANY casing/format)
        if (category) {
          const wanted = categorySlug(category);
          filtered = filtered.filter((t) => categorySlug(t.category) === wanted);
        }

        // location contains (case-insensitive)
        if (location) {
          const loc = norm(location);
          filtered = filtered.filter((t) => norm(t.location).includes(loc));
        }

        // closing date range (inclusive)
        if (closingAfter) {
          const ca = new Date(closingAfter);
          ca.setHours(0, 0, 0, 0);
          filtered = filtered.filter((t) => {
            const d = parseDate(t.closing_at);
            return !!d && d >= ca;
          });
        }
        if (closingBefore) {
          const cb = new Date(closingBefore);
          cb.setHours(23, 59, 59, 999);
          filtered = filtered.filter((t) => {
            const d = parseDate(t.closing_at);
            return !!d && d <= cb;
          });
        }

        // favourites view
        let finalItems =
          view === "saved"
            ? savedIds.length === 0
              ? []
              : filtered.filter((t) => {
                  const id = t.id ?? t.referenceNumber;
                  return savedIds.includes(id);
                })
            : filtered;

        // guarantee sort
        finalItems.sort(makeComparator(sort));

        // totals & slicing
        const hasClientFilters = clientFiltersActive || view === "saved" || !!qDebounced;
        const totalForPager = hasClientFilters ? finalItems.length : grandTotal;

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const visibleRows = hasClientFilters ? finalItems.slice(start, end) : finalItems;

        if (!alive) return;
        setRows(visibleRows);
        setTotal(totalForPager);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRows([]);
        setTotal(0);
        setError(e?.message || "Failed to load tenders.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    apiFilters,
    view,
    savedIds,
    clientFiltersActive,
    qDebounced,
    source,
    category,
    location,
    closingAfter,
    closingBefore,
    sort,
    page,
    pageSize,
  ]);

  // pagination info
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total || 0);
  const pageCount = Math.max(1, Math.ceil((total || 0) / pageSize));
  const pages = buildPageList(page, pageCount, { siblings: 1, boundaries: 1 });

  // helpers
  const clearFilters = () => {
    setQ("");
    setSource("");
    setCategory("");
    setLocation("");
    setClosingAfter("");
    setClosingBefore("");
    setView("all");
  };

  const isSavedViewEmpty = view === "saved" && savedIds.length === 0;

  return (
    <div className="space-y-5">
      {/* heading */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50">South African tenders</h1>
        <p className="text-slate-200/70 mt-1">
          Browse, filter, and save tenders. Switch to <strong>Favourites</strong> to see only yours.
        </p>
      </div>

      {/* filter bar */}
      <div className="glass-panel p-4 space-y-3" style={{ "--panel-bg": 0.03 }}>
        {/* tabs */}
        <div className="tender-tabs">
          <button onClick={() => setView("all")} className={view === "all" ? "is-active" : ""}>
            All
          </button>
          <button onClick={() => setView("saved")} className={view === "saved" ? "is-active" : ""}>
            Favourites
          </button>
        </div>

        {/* main filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="input flex-1 min-w-[220px]"
            placeholder="Search title/description/buyer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select md:w-40" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="-published_at">Newest</option>
            <option value="published_at">Oldest</option>
            <option value="closing_at">Closing soonest</option>
            <option value="-closing_at">Closing latest</option>
          </select>
          <button
            className="btn btn-outline ts"
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "Hide filters" : "Advanced filters"}
          </button>
          {(qDebounced || source || category || location || closingAfter || closingBefore) && (
            <button className="btn text-sm" type="button" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        {/* advanced panel */}
        {showAdvanced && (
          <div className="advanced-filter-panel">
            <div>
              <label>Publisher</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="select">
                <option value="">All publishers</option>
                <option value="eskom">ESKOM</option>
                <option value="sanral">SANRAL</option>
                <option value="transnet">Transnet</option>
                <option value="etenders">National eTenders</option>
              </select>
            </div>
            <div>
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
                <option value="">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Location contains</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Durban, KZN, Western Cape"
              />
            </div>
            <div>
              <label>Closing from</label>
              <input
                type="date"
                className="input"
                value={closingAfter}
                onChange={(e) => setClosingAfter(e.target.value)}
              />
            </div>
            <div>
              <label>Closing to</label>
              <input
                type="date"
                className="input"
                value={closingBefore}
                onChange={(e) => setClosingBefore(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* summary line */}
      <div className="text-sm text-slate-200/65">
        {view === "saved" ? (
          isSavedViewEmpty ? (
            <>You haven’t favourited any tenders yet. ⭐ Add some first.</>
          ) : (
            <>Showing your favourites ({savedIds.length})</>
          )
        ) : total ? (
          <>
            Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
            <strong>{total}</strong> tenders
          </>
        ) : (
          <>No tenders found.</>
        )}
      </div>

      {/* list */}
      {error && (
        <div className="alert alert-error bg-red-500/10 border border-red-200/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-200/70 py-10 text-center">Loading tenders…</div>
      ) : view === "saved" && isSavedViewEmpty ? (
        <div className="glass-panel p-6 text-center text-slate-100/70">
          ⭐ You haven’t favourited anything yet. Go to <strong>All</strong>, click the star on a
          tender, then come back.
        </div>
      ) : (
        <div className="tender-grid">
          {rows.map((t) => {
            const id = t.id ?? t.referenceNumber;
            const isSaved = savedIds.includes(id);
            return (
              <TenderRowCard
                key={id}
                tender={t}
                isSaved={isSaved}
                onSave={() => {
                  if (!canSave) {
                    alert("Login to add favourites.");
                    return;
                  }
                  if (isSaved) removeSaved?.(id);
                  else addSaved?.(id);
                  cacheTender({ ...t, id });
                }}
                onView={(openAi) => {
                  cacheTender({ ...t, id });
                  navigate(`/tenders/${id}`, {
                    state: { row: { ...t, id }, openAi: !!openAi },
                  });
                }}
              />
            );
          })}
        </div>
      )}

      {/* numbered pager */}
      {!loading && view !== "saved" && total > pageSize ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex gap-2">
            <button
              className="btn btn-outline ts text-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>

            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`btn btn-outline ts text-sm ${p === page ? "btn-active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}

            <button
              className="btn btn-outline ts text-sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next
            </button>
          </div>

          <div className="text-xs text-slate-200/45">
            Page {page} / {pageCount} • {total} tenders
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ========================= CARD ========================= */

function TenderRowCard({ tender, isSaved, onSave, onView }) {
  const id = tender.id ?? tender.referenceNumber;
  const title = tender.title || "Untitled tender";
  const category = nice(tender.category);
  const source = prettySource(
    tender.source || tender.publisher || tender.buyer || SOURCE_ID_MAP[tender.source_id]
  );
  const buyer = nice(tender.buyer);
  const location = nice(tender.location);
  const published = parseDate(tender.published_at);
  const closing = parseDate(tender.closing_at);

  const status = buildStatus(closing);

  return (
    <article className="tender-card-nice relative">
      {/* star */}
      <button
        onClick={onSave}
        className={`save-btn ${isSaved ? "is-saved" : ""} absolute top-3 right-3`}
        title={isSaved ? "Remove from favourites" : "Add to favourites"}
      >
        ★
      </button>

      {/* chip row */}
      <div className="tender-chip-row pr-10">
        {category && <span className="tt-chip tt-chip-blue">{category}</span>}
        {source && <span className="tt-chip tt-chip-cyan">{source}</span>}
        {status && <span className={`tt-chip ${status.className}`}>{status.label}</span>}
      </div>

      {/* title */}
      <h2 className="tender-title mt-2">{title}</h2>

      {/* sub */}
      <p className="tender-sub">
        {buyer ? buyer : "Official publisher"}
        {location ? ` • ${location}` : ""}
      </p>

      {/* meta with icons */}
      <div className="tender-meta-icons mt-2">
        {location && (
          <span>
            <MapPin size={14} className="inline-block mr-1 opacity-70" />
            {location}
          </span>
        )}
        {published && (
          <span>
            <CalendarDays size={14} className="inline-block mr-1 opacity-70" />
            {published.toLocaleDateString()}
          </span>
        )}
        {closing && isFuture(closing) && (
          <span>
            <Clock4 size={14} className="inline-block mr-1 opacity-70" />
            {humanCountdown(closing)}
          </span>
        )}
      </div>

      {/* actions */}
      <div className="tender-actions-nice mt-3 flex flex-col gap-2 sm:flex-row">
        <button onClick={() => onView(false)} className="btn btn-primary glow-cta">
          View details
        </button>
        <button onClick={() => onView(true)} className="btn btn-secondary sm:ml-2">
          AI summaries
        </button>
      </div>
    </article>
  );
}

/* ========================= SMALL UTILS ========================= */

function nice(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (!s) return "";
  const bad = ["-", "—", "n/a", "na", "null", "none"];
  if (bad.includes(s.toLowerCase())) return "";
  return s;
}

function isFuture(d) {
  return d.getTime() - Date.now() > 0;
}

function buildStatus(closingDate) {
  if (!closingDate || !isFuture(closingDate)) {
    return { label: "Open", className: "tt-chip-soft" };
  }
  const diffDays = (closingDate - new Date()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return { label: "Closing today", className: "tt-chip-danger" };
  if (diffDays <= 3) return { label: "Closing in 3 days", className: "tt-chip-warning" };
  if (diffDays <= 7) return { label: "Closing soon", className: "tt-chip-warning" };
  return { label: "Open", className: "tt-chip-soft" };
}

function humanCountdown(closingDate) {
  const diffMs = closingDate - new Date();
  if (diffMs <= 0) return "";
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Closes in ${days}d`;
  if (hours > 0) return `Closes in ${hours}h`;
  return `Closes in ${mins}m`;
}
