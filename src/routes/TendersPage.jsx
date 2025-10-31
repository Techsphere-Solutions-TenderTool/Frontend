// src/routes/TendersPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTenders, cacheTender } from "../lib/api.js";
import Pager from "../ui/Pager.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";

export default function TendersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // paging & sorting
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState("-published_at");

  // search
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 350);

  // status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // whenever search text changes → go back to page 1
  useEffect(() => {
    setPage(1);
  }, [qDebounced]);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      q: qDebounced,
      sort,
    }),
    [page, pageSize, qDebounced, sort]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listTenders(filters);
        if (!alive) return;
        setRows(data.items || []);
        setTotal(data.total || 0);
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

  return (
    <div
      className="glass-panel tender-shell"
      style={{ "--panel-bg": 0.05, "--panel-ol": 0.55, "--panel-thickness": "2.5px" }}
    >
      {/* header + filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-semibold">Tenders</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className="input input-bordered w-full md:w-72"
            placeholder="Search title/description…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="select select-bordered"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="-published_at">Newest</option>
            <option value="published_at">Oldest</option>
            <option value="-closing_at">Closing soon</option>
            <option value="closing_at">Closing (asc)</option>
          </select>
          {qDebounced && (
            <button className="btn btn-outline ts" onClick={() => setQ("")}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* loading / error */}
      {loading && <div className="opacity-75 mb-3">Loading tenders…</div>}
      {error && <div className="alert alert-error mb-3">{error}</div>}

      {/* list */}
      <div className="tender-list-pro">
        {!loading && !error && rows.length === 0 ? (
          <div className="opacity-70 py-10 text-center">No tenders found.</div>
        ) : (
          rows.map((t) => {
            const tidyId = t.id ?? t.referenceNumber;
            return (
              <div key={tidyId} className="tender-card-pro">
                <div className="tender-card-body">
                  <div className="flex gap-2 flex-wrap mb-2">
                    {t.category && <span className="chip chip-blue">{t.category}</span>}
                    {t.buyer && <span className="chip chip-cyan">{t.buyer}</span>}
                    {t.source && <span className="chip chip-magenta">{t.source}</span>}
                  </div>
                  <div className="tender-card-title">{t.title || "Untitled tender"}</div>
                  {t.location && <div className="tender-card-sub">{t.location}</div>}
                  <div className="tender-meta-line">
                    <span>Published: {fmtDate(t.published_at)}</span>
                    <span>Closes: {fmtDateTime(t.closing_at)}</span>
                  </div>
                </div>
                <div className="tender-actions">
                  <Link
                    to={`/tenders/${tidyId}`}
                    state={{ row: { ...t, id: tidyId } }}
                    onClick={() => cacheTender({ ...t, id: tidyId })}
                    className="tender-view-btn"
                  >
                    View Details
                  </Link>
                  <span className="tender-source-light">{t.source || "Original"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* pager */}
      <div className="mt-5 flex gap-3 items-center">
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

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString() : "—";
}
function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString() : "—";
}
