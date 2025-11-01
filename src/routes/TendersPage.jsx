// src/routes/TendersPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTenders, cacheTender } from "../lib/api.js";
import Pager from "../ui/Pager.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";

export default function TendersPage() {
  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // paging & sorting
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState("-published_at");

  // search
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 400);

  // tabs
  const [view, setView] = useState("all"); // "all" | "saved" | "closing"

  // advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [closingAfter, setClosingAfter] = useState("");
  const [closingBefore, setClosingBefore] = useState("");
  const [location, setLocation] = useState("");

  // status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // when search changes -> go back to page 1
  useEffect(() => {
    setPage(1);
  }, [qDebounced, source, category, closingAfter, closingBefore, location, sort, view]);

  // build filter object we send to API
  const filters = useMemo(() => {
    const f = {
      page,
      pageSize,
      q: qDebounced,
      sort,
    };

    if (source) f.source = source;
    if (category) f.category = category;
    if (closingAfter) f.closing_after = closingAfter;
    if (closingBefore) f.closing_before = closingBefore;
    if (location) f.location = location;

    // for now: view === "closing" -> ask API for "closing soon" by sorting on closing date
    if (view === "closing") {
      f.sort = "closing_at"; // earliest first
      // if your API later supports ?closing_soon=true, just add it here
    }

    // for view === "saved" we'll filter client-side for now (until Cognito route is ready)
    return f;
  }, [page, pageSize, qDebounced, sort, source, category, closingAfter, closingBefore, location, view]);

  // fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listTenders(filters);

        if (!alive) return;
        const items = data.results || data.items || [];
        const grandTotal = data.total ?? data.count ?? items.length;

        // temporary: if user selected "saved", we'll just show nothing.
        // later you'll plug in /saved-tenders for the logged-in user.
        let finalItems = items;

        setRows(finalItems);
        setTotal(grandTotal);
      } catch (e) {
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
  }, [filters]);

  // pagination calc for summary
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total || 0);

  // human filters summary text
  const activeFilters = [];
  if (source) activeFilters.push(source);
  if (category) activeFilters.push(category);
  if (location) activeFilters.push(location);
  if (closingAfter || closingBefore) activeFilters.push("Closing range");

  return (
    <div
      className="glass-panel tender-shell"
      style={{ "--panel-bg": 0.04, "--panel-ol": 0.55, "--panel-thickness": "2.5px" }}
    >
      {/* sticky filters bar */}
      <div className="tender-filters-sticky">
        {/* tabs */}
        <div className="tender-tabs">
          <button onClick={() => setView("all")} className={view === "all" ? "is-active" : ""}>
            All
          </button>
          <button onClick={() => setView("saved")} className={view === "saved" ? "is-active" : ""}>
            Saved
          </button>
          <button onClick={() => setView("closing")} className={view === "closing" ? "is-active" : ""}>
            Closing soon
          </button>
        </div>

        {/* main filter row */}
        <div className="tender-filter-row">
          <input
            className="input w-full md:w-72"
            placeholder="Search title/description…"
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
            <option value="-closing_at">Closing (latest)</option>
            <option value="closing_at">Closing soonest</option>
          </select>
          <button
            type="button"
            className="btn btn-outline ts md:w-auto"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "Hide advanced" : "Advanced filters"}
          </button>
          {(qDebounced || source || category || closingAfter || closingBefore || location) && (
            <button
              type="button"
              className="btn md:w-auto"
              onClick={() => {
                setQ("");
                setSource("");
                setCategory("");
                setClosingAfter("");
                setClosingBefore("");
                setLocation("");
                setView("all");
              }}
            >
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
                <option value="eskom">Eskom</option>
                <option value="sanral">SANRAL</option>
                <option value="transnet">Transnet</option>
                <option value="etenders">National eTenders</option>
              </select>
            </div>
            <div>
              <label>Category / sector</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="select">
                <option value="">All categories</option>
                <option value="GENERATION">Generation</option>
                <option value="DISTRIBUTION">Distribution</option>
                <option value="CONSTRUCTION">Construction</option>
                <option value="ICT">ICT & Software</option>
              </select>
            </div>
            <div>
              <label>Location contains</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="e.g. Durban, Western Cape"
              />
            </div>
            <div>
              <label>Closing from</label>
              <input
                type="date"
                value={closingAfter}
                onChange={(e) => setClosingAfter(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label>Closing to</label>
              <input
                type="date"
                value={closingBefore}
                onChange={(e) => setClosingBefore(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
      </div>

      {/* result summary */}
      <div className="tender-result-summary">
        {total ? (
          <p>
            Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
            <strong>{total}</strong> tenders
            {activeFilters.length ? ` • Filter: ${activeFilters.join(", ")}` : ""}
            {view === "saved" ? " • Saved by you" : ""}
            {view === "closing" ? " • Closing soonest" : ""}
          </p>
        ) : (
          <p>No tenders found.</p>
        )}
      </div>

      {/* loading / error */}
      {loading && <div className="opacity-75 mb-3">Loading tenders…</div>}
      {error && <div className="alert alert-error mb-3">{error}</div>}

      {/* list */}
      <div className="tender-grid">
        {!loading && !error && rows.length === 0 ? (
          <div className="opacity-70 py-10 text-center">No tenders found.</div>
        ) : (
          rows.map((t) => {
            const id = t.id ?? t.referenceNumber;
            return (
              <TenderCard
                key={id}
                tender={t}
                linkTo={`/tenders/${id}`}
                onSave={() => console.log("TODO: save tender", id)}
              />
            );
          })
        )}
      </div>

      {/* pager */}
      <div className="mt-6 flex gap-3 items-center justify-between flex-wrap">
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
        <span className="text-sm opacity-60">{total ? `${total} tenders` : ""}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- */
/* tender card component (nice, no "ESKOM" under button)    */
/* ------------------------------------------------------- */

function TenderCard({ tender, linkTo, onSave }) {
  const title = tender.title || "Untitled tender";
  const buyer = tender.buyer || "Official publisher";
  const category = tender.category || "General";
  const location = tender.location || "South Africa";
  const published = tender.published_at ? new Date(tender.published_at) : null;
  const closing = tender.closing_at ? new Date(tender.closing_at) : null;
  const isNew = published ? isToday(published) : false;
  const closingLabel = closing ? formatDateTime(closing) : "—";
  const countdown = closing ? getCountdown(closing) : null;

  // status chips
  const closingSoon =
    closing && closing.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && closing > new Date();

  return (
    <div className="tender-card-nice">
      {/* top row */}
      <div className="tender-card-top">
        <div className="tender-chip-row">
          {category && <span className="chip chip-blue">{category}</span>}
          {buyer && <span className="chip chip-cyan">{buyer}</span>}
          <span className="chip chip-green">Open</span>
          {closingSoon && <span className="chip chip-amber">Closing soon</span>}
          {isNew && <span className="chip chip-pink">New</span>}
        </div>
        <button onClick={onSave} className="save-btn" title="Save tender">
          ★
        </button>
      </div>

      {/* title */}
      <h3 className="tender-title">{title}</h3>
      <p className="tender-sub">{location}</p>

      {/* meta with icons */}
      <div className="tender-meta-icons">
        <span>📍 {location}</span>
        <span>📅 Published: {published ? published.toLocaleDateString() : "—"}</span>
        <span>⏰ Closes: {closingLabel}</span>
        {countdown && <span className="countdown-badge">{countdown}</span>}
      </div>

      {/* actions */}
      <div className="tender-actions-nice">
        <Link
          to={linkTo}
          state={{ row: { ...tender, id: tender.id ?? tender.referenceNumber } }}
          onClick={() => cacheTender({ ...tender, id: tender.id ?? tender.referenceNumber })}
          className="btn btn-primary glow-cta"
        >
          View details
        </Link>
      </div>
    </div>
  );
}

/* ------------------ helpers ------------------ */

function isToday(d) {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDateTime(d) {
  return d.toLocaleString();
}

function getCountdown(deadline) {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}h ${mins}m left`;
}
