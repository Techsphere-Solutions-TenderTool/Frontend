import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, Clock4, Star } from "lucide-react";

import { listTenders, cacheTender } from "../lib/api.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { PrefsContext } from "../contexts/PrefsContext.js";
import {
  parseDate,
  prettySource,
  isMeaningful,
  isFuture,
  humanCountdown,
  buildStatusChip,
  buildBadge,
  categorySlug,
  getSourceSlug,
  makeComparator,
  buildPageList,
} from "../lib/tenderUtils.js";
import { useAuth } from "react-oidc-context";
import { useToast } from "../components/ToastProvider.jsx";


/* ===================== CONFIG ===================== */
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
  "Goods & Services",
];

/* ===================== MAIN PAGE ===================== */
export default function TendersPage() {
  const navigate = useNavigate();
  const ctx = useContext(PrefsContext);

  const canSave = ctx?.canSave;
  const savedIds = ctx?.savedTenders || [];
  const addSaved = ctx?.addSavedTender;
  const removeSaved = ctx?.removeSavedTender;

  // State
  const [allRows, setAllRows] = useState([]); // all fetched data from API
  const [displayRows, setDisplayRows] = useState([]); // after filtering/sorting/paging
  const [totalCount, setTotalCount] = useState(0); // API total or filtered total

  const [view, setView] = useState("all"); // "all" | "saved"
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 350);
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [closingAfter, setClosingAfter] = useState("");
  const [closingBefore, setClosingBefore] = useState("");

  // Pagination & sort
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState("-published_at");

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const auth = useAuth();
  const toast = useToast();


  // Reset to page 1 when filters or sort/view change
  useEffect(() => {
    setPage(1);
  }, [qDebounced, source, category, location, closingAfter, closingBefore, sort, view]);

  /* -------- Fetch ALL records robustly (respects server page caps) -------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        setAllRows([]);

        // only text query goes server-side
        const baseParams = { sort };
        if (qDebounced) baseParams.q = qDebounced;

        // request in safe chunks; server may cap this further (e.g. 20)
        const PAGE_LIMIT = 200;
        let offset = 0;
        let allData = [];
        let total = 0;

        while (mounted) {
          const resp = await listTenders({ ...baseParams, limit: PAGE_LIMIT, offset });
          if (!mounted) return;

          const items = resp.results ?? resp.items ?? [];
          total = resp.total ?? resp.count ?? total ?? 0;

          if (items.length === 0) break;

          allData = allData.concat(items);
          offset += items.length;

          if (allData.length >= total) break;
        }

        if (mounted) {
          setAllRows(allData);
          // keep the full API total here; we’ll swap to filtered total only when filters are active
          setTotalCount(total);
        }
      } catch (e) {
        console.error("Failed to fetch tenders:", e);
        if (!mounted) return;
        setAllRows([]);
        setTotalCount(0);
        setError(e?.message || "Failed to load tenders.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [qDebounced, sort]);

  /* -------- Apply filters, sort, pagination (client-side) -------- */
  useEffect(() => {
    let filtered = [...allRows];

    // text (defensive double-check)
    if (qDebounced) {
      const needle = qDebounced.toLowerCase().trim();
      filtered = filtered.filter((t) =>
        [t.title, t.buyer, t.location, t.category]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      );
    }

    // publisher
  if (source) {
  const wanted = source.toLowerCase();
  filtered = filtered.filter(t => t.source.toLowerCase() === wanted);
}


    // category
    if (category) {
      const wanted = categorySlug(category);
      filtered = filtered.filter((t) => categorySlug(t.category) === wanted);
    }

    // location contains
    if (location) {
      const loc = location.toLowerCase().trim();
      filtered = filtered.filter((t) => String(t.location || "").toLowerCase().includes(loc));
    }

    // inclusive date range (midnight → end of day)
    if (closingAfter) {
      const ca = new Date(closingAfter);
      ca.setHours(0, 0, 0, 0);
      filtered = filtered.filter((t) => {
        const d = parseDate(t.closing_at);
        return d ? d >= ca : false; // exclude if missing when range applied
      });
    }
    if (closingBefore) {
      const cb = new Date(closingBefore);
      cb.setHours(23, 59, 59, 999);
      filtered = filtered.filter((t) => {
        const d = parseDate(t.closing_at);
        return d ? d <= cb : false;
      });
    }

    // favourites view
    if (view === "saved") {
      filtered = filtered.filter((t) => {
        const id = t.id ?? t.referenceNumber;
        return savedIds.includes(id);
      });
    }

    // sort
    filtered.sort(makeComparator(sort));

    // totals: only switch to filtered totals if filters or saved view are active
    const filtersActive = Boolean(
      qDebounced || source || category || location || closingAfter || closingBefore || view === "saved",
    );
    const filteredTotal = filtered.length;

    // clamp page after filters changed
    const pageCountNext = Math.max(1, Math.ceil(filteredTotal / pageSize));
    const safePage = Math.min(page, pageCountNext);

    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    setDisplayRows(filtered.slice(start, end));

    if (filtersActive) {
      setTotalCount(filteredTotal);
    }
    // if page changed due to clamping, update once
    if (page !== safePage) setPage(safePage);
  }, [
    allRows,
    qDebounced,
    source,
    category,
    location,
    closingAfter,
    closingBefore,
    view,
    savedIds,
    sort,
    page,
    pageSize,
  ]);

  // Pagination helpers
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalCount);
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const pages = buildPageList(page, pageCount, { siblings: 1, boundaries: 1 });

  // Clear all filters
  const clearFilters = () => {
    setQ("");
    setSource("");
    setCategory("");
    setLocation("");
    setClosingAfter("");
    setClosingBefore("");
    setView("all");
    setPage(1);
  };

  const hasActiveFilters =
    qDebounced || source || category || location || closingAfter || closingBefore;

  const isSavedViewEmpty = view === "saved" && savedIds.length === 0;

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50">South African Tenders</h1>
        <p className="text-slate-200/70 mt-1">
          Browse, filter, and save tenders. Switch to <strong>Favourites</strong> to see only yours.
        </p>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 space-y-3" style={{ "--panel-bg": 0.03 }}>
        {/* View tabs */}
        <div className="tender-tabs">
          <button onClick={() => setView("all")} className={view === "all" ? "is-active" : ""}>
            All Tenders
          </button>
          <button onClick={() => setView("saved")} className={view === "saved" ? "is-active" : ""}>
            Favourites {savedIds.length > 0 && `(${savedIds.length})`}
          </button>
        </div>

        {/* Main filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="input flex-1 min-w-[220px]"
            placeholder="Search title, buyer, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select md:w-44" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="-published_at">Newest first</option>
            <option value="published_at">Oldest first</option>
            <option value="closing_at">Closing soonest</option>
            <option value="-closing_at">Closing latest</option>
          </select>
          <button
            className="btn btn-outline ts"
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "Hide" : "Show"} filters
          </button>
          {hasActiveFilters && (
            <button className="btn text-sm" type="button" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>

        {/* Advanced filters */}
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select"
              >
                <option value="">All categories</option>
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
                placeholder="e.g. Gauteng, Durban, Cape Town"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400">Active filters:</span>
          {qDebounced && <FilterChip label="Search" value={qDebounced} onClear={() => setQ("")} />}
          {source && (
            <FilterChip label="Publisher" value={prettySource(source)} onClear={() => setSource("")} />
          )}
          {category && (
            <FilterChip label="Category" value={category} onClear={() => setCategory("")} />
          )}
          {location && (
            <FilterChip label="Location" value={location} onClear={() => setLocation("")} />
          )}
          {closingAfter && (
            <FilterChip
              label="From"
              value={new Date(closingAfter).toLocaleDateString()}
              onClear={() => setClosingAfter("")}
            />
          )}
          {closingBefore && (
            <FilterChip
              label="To"
              value={new Date(closingBefore).toLocaleDateString()}
              onClear={() => setClosingBefore("")}
            />
          )}
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-slate-200/65">
        {view === "saved" ? (
          isSavedViewEmpty ? (
            <>You haven't favourited any tenders yet. ⭐ Add some from the <strong>All</strong> view.</>
          ) : (
            <>
              Showing <strong>{displayRows.length}</strong> of your <strong>{savedIds.length}</strong> favourites
            </>
          )
        ) : totalCount > 0 ? (
          <>
            Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
            <strong>{totalCount}</strong> tenders
          </>
        ) : (
          <>No tenders found matching your criteria.</>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error bg-red-500/10 border border-red-200/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading / empty states */}
      {loading ? (
        <div className="text-slate-200/70 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-3">Loading tenders…</p>
        </div>
      ) : isSavedViewEmpty ? (
        <div className="glass-panel p-8 text-center" style={{ "--panel-bg": 0.03 }}>
          <p className="text-slate-100/70 text-lg">⭐ You haven't favourited anything yet.</p>
          <p className="text-slate-300/60 mt-2">
            Go to <strong>All Tenders</strong>, click the star on cards you want to save, then come back here.
          </p>
        </div>
      ) : displayRows.length === 0 && hasActiveFilters ? (
        <div className="glass-panel p-8 text-center" style={{ "--panel-bg": 0.03 }}>
          <p className="text-slate-100/70 text-lg">No tenders match your filters.</p>
          <button onClick={clearFilters} className="btn btn-primary glow-cta mt-4">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Tender grid */}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayRows.map((t) => {
              const id = t.id ?? t.referenceNumber;
              const isSaved = savedIds.includes(id);
              console.log("Display rows:", displayRows);

              return (
                <TenderCard
                  key={id}
                  tender={t}
                  isSaved={isSaved}
                  onSave={() => {
                   if (!auth.isAuthenticated) {
                     toast.error("Please log in to save tenders.");
                     return;
                    }

                  if (isSaved) {
                    removeSaved?.(id);
                  toast.success("Removed from favourites.");
                   } else {
                   addSaved?.(id);
                  toast.success("Saved to favourites.");
                 }

                   cacheTender({ ...t, id });
                  }}
                  onView={() => {
                    cacheTender({ ...t, id });
                    navigate(`/tenders/${id}`, {
                      state: { row: { ...t, id }, openAi: false },
                    });
                  }}
                  onAi={() => {
                    cacheTender({ ...t, id });
                    navigate(`/tenders/${id}`, {
                      state: { row: { ...t, id }, openAi: true },
                    });
                  }}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalCount > pageSize && (
            <div className="flex items-center justify-between gap-3 pt-8 pb-4">
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  className="btn btn-outline ts text-sm px-4 py-2"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>

                {pages.map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400 self-center">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      className={`btn btn-outline ts text-sm px-3 py-2 ${
                        p === page ? "btn-active border-cyan-400 bg-cyan-500/20" : ""
                      }`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  className="btn btn-outline ts text-sm px-4 py-2"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                >
                  Next →
                </button>
              </div>

              <div className="text-xs text-slate-200/45 whitespace-nowrap">
                Page <strong>{page}</strong> of <strong>{pageCount}</strong>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ===================== TENDER CARD ===================== */
import { Link } from "react-router-dom";

function TenderCard({ tender, isSaved, onSave, onAi }) {
  const id = tender.id ?? tender.referenceNumber;

  // Skip cards with no ID
  if (!id) {
    console.warn("Tender missing ID, skipping:", tender);
    return null;
  }

  // Skip incomplete scraper junk rows
  if (!tender.title || tender.title === "Tender") return null;

  const title = tender.title || "Untitled tender";

  const categoryRaw = tender.category;
  const category =
    categoryRaw && isMeaningful(categoryRaw)
      ? categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1).toLowerCase()
      : null;

  const sourceRaw = tender.source || tender.publisher || tender.buyer || null;
  const sourceName = sourceRaw && isMeaningful(sourceRaw) ? prettySource(sourceRaw) : null;

  const buyer = tender.buyer && isMeaningful(tender.buyer) ? tender.buyer : null;
  const location = tender.location && isMeaningful(tender.location) ? tender.location : null;

  const published = parseDate(tender.published_at);
  const closing = parseDate(tender.closing_at);

  const statusInfo = buildStatusChip(closing);
  const badge = buildBadge(tender.published_at);
  const countdown = humanCountdown(closing);

  return (
    <article className="tt-card">
      {/* Top row */}
      <div className="tt-card-top">
        <div className="flex gap-2 flex-wrap">
          {badge && (
            <span className="tt-chip tt-chip-accent text-[10px] font-bold px-2 py-0.5">
              {badge}
            </span>
          )}
          {category && <span className="tt-chip tt-chip-blue">{category}</span>}
          {sourceName && <span className="tt-chip tt-chip-cyan">{sourceName}</span>}
          {statusInfo && (
            <span className={`tt-chip ${statusInfo.className}`}>{statusInfo.label}</span>
          )}
        </div>

        <button
          onClick={onSave}
          className={`tt-save-btn ${isSaved ? "is-saved" : ""}`}
          aria-label={isSaved ? "Unsave tender" : "Save tender"}
          type="button"
        >
          <Star
            size={16}
            strokeWidth={1.7}
            fill={isSaved ? "#fbbf24" : "none"}
            color={isSaved ? "#fbbf24" : "currentColor"}
            className={isSaved ? "animate-pulse drop-shadow-lg drop-shadow-yellow-400" : ""}
          />
        </button>
      </div>

      {/* Title */}
      <h3 className="tt-title line-clamp-2">{title}</h3>

      {/* Subline */}
      {(buyer || location) && buyer !== sourceName && (
        <p className="tt-subline">
          {buyer && buyer !== sourceName ? buyer : ""}
          {buyer && buyer !== sourceName && location ? " • " : ""}
          {location || ""}
        </p>
      )}

      {/* Meta row */}
      <div className="tt-meta-row">
        {location && (
          <span className="tt-meta-item">
            <MapPin size={14} className="tt-meta-icon" />
            {location}
          </span>
        )}
        {published && (
          <span className="tt-meta-item">
            <CalendarDays size={14} className="tt-meta-icon" />
            {published.toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
        {closing && isFuture(closing) && countdown && (
          <span className="tt-meta-item">
            <Clock4 size={14} className="tt-meta-icon" />
            Closes in {countdown}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="tt-footer mt-auto">
        <div className="flex items-center gap-2 w-full">
          <Link
            to={`/tenders/${id}`}
            state={{ row: { ...tender, id }, openAi: false }}
            className="tt-view-btn w-full"
            onClick={() => cacheTender({ ...tender, id })}
          >
            View details
          </Link>

          <button
  onClick={() => {
    if (!auth.isAuthenticated) {
      toast.error("Please log in to use AI features.");
      return;
    }
    onAi();
  }}
  className="btn btn-outline ts text-xs px-3 py-2 whitespace-nowrap"
  type="button"
  title="Open with Gen-AI summary"
>
  AI summary
</button>

        </div>
      </div>
    </article>
  );
}


/* ===================== FILTER CHIP ===================== */
function FilterChip({ label, value, onClear }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-sm">
      <span className="text-slate-300/80">{label}:</span>
      <span className="text-slate-50 font-medium">{value}</span>
      <button
        onClick={onClear}
        className="ml-1 text-slate-400 hover:text-slate-100 transition"
        aria-label={`Clear ${label}`}
      >
        ×
      </button>
    </span>
  );
}
