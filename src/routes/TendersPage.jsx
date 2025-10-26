import { useEffect, useMemo, useState } from "react";
import { listTenders } from "../lib/api.js";
import Pager from "../ui/Pager.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";

export default function TendersPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // paging & sorting
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState("-closing_at"); // "-field" => desc

  // search
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 350);

  // status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset to page 1 whenever the search text changes
  useEffect(() => { setPage(1); }, [qDebounced]);

  // Build a stable filter object (memo avoids needless renders)
  const filters = useMemo(() => ({
    page, pageSize, q: qDebounced, sort
  }), [page, pageSize, qDebounced, sort]);

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
        setError(e?.message ? String(e.message) : "Failed to load tenders.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [filters]);

  return (
    <div
      className="glass-panel p-6"
      style={{ "--panel-bg": 0.09, "--panel-ol": 0.55, "--panel-thickness": "2.5px" }}
    >
      <h2 className="text-xl md:text-2xl font-semibold mb-4">Tenders</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <input
          className="input input-bordered w-full max-w-md"
          placeholder="Search title/description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search tenders"
        />
        <select
          className="select select-bordered"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          title="Sort order"
          aria-label="Sort tenders"
        >
          <option value="-closing_at">Closing soon (desc)</option>
          <option value="closing_at">Closing (asc)</option>
          <option value="-published_at">Newest</option>
          <option value="published_at">Oldest</option>
        </select>

        {qDebounced && (
          <button
            className="btn btn-outline ts"
            onClick={() => setQ("")}
            title="Clear search"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status banners */}
      {loading && (
        <div className="opacity-80 mb-3">Loading tenders…</div>
      )}
      {error && (
        <div className="alert alert-error mb-3">
          <span>Error: {error}</span>
          <button className="btn btn-sm ml-3" onClick={() => setPage(p => p)}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-sticky w-full">
          <thead>
            <tr>
              <th>Title</th>
              <th>Buyer</th>
              <th>Source</th>
              <th>Published</th>
              <th>Closes</th>
              <th>Ref #</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center opacity-70">
                  No tenders found.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.referenceNumber ?? t.id}>
                  <td className="max-w-[28rem]">
                    {t.sourceUrl ? (
                      <a className="link" href={t.sourceUrl} target="_blank" rel="noreferrer">
                        {t.title}
                      </a>
                    ) : (
                      <span>{t.title}</span>
                    )}
                    {t.summary && <div className="text-sm opacity-70">{t.summary}</div>}
                  </td>
                  <td>{t.buyer || "—"}</td>
                  <td>{t.source || "—"}</td>
                  <td>{fmtDate(t.published_at)}</td>
                  <td>{fmtDateTime(t.closing_at)}</td>
                  <td>{t.referenceNumber ?? t.id ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      <div className="mt-4 flex items-center gap-3">
        <Pager
          page={page}
          pageSize={pageSize}
          total={total}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}

function fmtDate(d)     { return d ? new Date(d).toLocaleDateString() : ""; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString()     : ""; }
