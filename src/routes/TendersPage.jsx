// src/routes/TendersPage.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, Clock4 } from "lucide-react";
import { listTenders, cacheTender } from "../lib/api.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { PrefsContext } from "../App.jsx";

const CLOSING_SOON_DAYS = 7; // we’ll relax to 30 if we get 0

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
  const [view, setView] = useState("all"); // all | saved | closing
  const [showAdvanced, setShowAdvanced] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 350);
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [closingAfter, setClosingAfter] = useState("");
  const [closingBefore, setClosingBefore] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState("-published_at");

  // status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // when filters change → go to first page
  useEffect(() => {
    setPage(1);
  }, [qDebounced, source, category, location, closingAfter, closingBefore, sort, view]);

  // build filters to send to API
  const apiFilters = useMemo(() => {
    const f = {
      page,
      pageSize,
      q: qDebounced,
      sort,
    };

    if (source) f.source = source;
    if (category) f.category = category;
    if (location) f.location = location;
    if (closingAfter) f.closing_after = closingAfter;
    if (closingBefore) f.closing_before = closingBefore;

    // for closing we’ll sort on closing_at
    if (view === "closing") {
      f.sort = "closing_at";
      // we want more to filter client-side
      f.pageSize = 60;
    }

    return f;
  }, [
    page,
    pageSize,
    qDebounced,
    sort,
    source,
    category,
    location,
    closingAfter,
    closingBefore,
    view,
  ]);

  // fetch
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

        let finalItems = items;

        // 1) saved view → client side filter
        if (view === "saved") {
          if (savedIds.length === 0) {
            finalItems = [];
          } else {
            finalItems = items.filter((t) => {
              const id = t.id ?? t.referenceNumber;
              return savedIds.includes(id);
            });
          }
        }

        // 2) closing soon → only within 7 days (relax to 30 if none)
        if (view === "closing") {
          const now = new Date();
          const in7 = items.filter((t) => {
            if (!t.closing_at) return false;
            const d = new Date(t.closing_at);
            const diffDays = (d - now) / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= CLOSING_SOON_DAYS;
          });

          if (in7.length > 0) {
            finalItems = in7;
          } else {
            const in30 = items.filter((t) => {
              if (!t.closing_at) return false;
              const d = new Date(t.closing_at);
              const diffDays = (d - now) / (1000 * 60 * 60 * 24);
              return diffDays >= 0 && diffDays <= 30;
            });
            finalItems = in30;
          }
        }

        setRows(finalItems);
        setTotal(view === "saved" ? savedIds.length : grandTotal);
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
  }, [apiFilters, view, savedIds]);

  // pagination info
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total || 0);

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
          Browse, filter, and save tenders. Switch to <strong>Saved</strong> to see only yours.
        </p>
      </div>

      {/* filter bar */}
      <div className="glass-panel p-4 space-y-3" style={{ "--panel-bg": 0.03 }}>
        {/* tabs */}
        <div className="tender-tabs">
          <button
            onClick={() => setView("all")}
            className={view === "all" ? "is-active" : ""}
          >
            All
          </button>
          <button
            onClick={() => setView("saved")}
            className={view === "saved" ? "is-active" : ""}
          >
            Saved
          </button>
          <button
            onClick={() => setView("closing")}
            className={view === "closing" ? "is-active" : ""}
          >
            Closing soon
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
          <select
            className="select md:w-40"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
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
          {(qDebounced ||
            source ||
            category ||
            location ||
            closingAfter ||
            closingBefore) && (
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
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="select"
              >
                <option value="">All publishers</option>
                <option value="eskom">Eskom</option>
                <option value="sanral">SANRAL</option>
                <option value="transnet">Transnet</option>
                <option value="etenders">National eTenders</option>
              </select>
            </div>
            <div>
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select"
              >
                <option value="">All</option>
                <option value="GENERATION">Generation</option>
                <option value="DISTRIBUTION">Distribution</option>
                <option value="CONSTRUCTION">Construction</option>
                <option value="ICT">ICT & Software</option>
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
            <>You haven’t saved any tenders yet. ⭐ Save from Home or All.</>
          ) : (
            <>Showing your saved tenders ({savedIds.length})</>
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
      ) : isSavedViewEmpty ? (
        <div className="glass-panel p-6 text-center text-slate-100/70">
          ⭐ You haven’t saved anything yet. Go to <strong>All</strong>, click the star on a tender,
          then come back.
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
                    alert("Login to save this tender.");
                    return;
                  }
                  if (isSaved) removeSaved?.(id);
                  else addSaved?.(id);
                  cacheTender({ ...t, id });
                }}
                onView={() => {
                  cacheTender({ ...t, id });
                  navigate(`/tenders/${id}`, { state: { row: { ...t, id } } });
                }}
              />
            );
          })}
        </div>
      )}

      {/* pager (only for normal view) */}
      {!loading && view !== "saved" && total > pageSize && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              className="btn btn-outline ts text-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              className="btn btn-outline ts text-sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={endItem >= total}
            >
              Next
            </button>
          </div>
          <div className="text-xs text-slate-200/45">
            Page {page} • {total} tenders
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CARD (same energy as Home)
   ========================================================= */
function TenderRowCard({ tender, isSaved, onSave, onView }) {
  const id = tender.id ?? tender.referenceNumber;
  const title = tender.title || "Untitled tender";
  const category = nice(tender.category);
  const source = nice(tender.source || tender.publisher || tender.buyer);
  const buyer = nice(tender.buyer);
  const location = nice(tender.location);
  const published = tender.published_at ? new Date(tender.published_at) : null;
  const closing = tender.closing_at ? new Date(tender.closing_at) : null;

  const status = buildStatus(closing);

  return (
    <article className="tender-card-nice relative">
      {/* star */}
      <button
        onClick={onSave}
        className={`save-btn ${isSaved ? "is-saved" : ""} absolute top-3 right-3`}
        title={isSaved ? "Unsave tender" : "Save tender"}
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

      {/* action */}
      <div className="tender-actions-nice mt-3">
        <button onClick={onView} className="btn btn-primary glow-cta">
          View details
        </button>
      </div>
    </article>
  );
}

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
