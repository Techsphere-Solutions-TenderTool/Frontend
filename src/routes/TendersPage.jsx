// src/routes/TendersPage.jsx 
import { useEffect, useState } from 'react';
import { listTenders } from '../lib/api';

export default function TendersPage() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('-closing_at'); // desc
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await listTenders({ page, pageSize, q, sort });
        if (!alive) return;
        setRows(data.items || []);
        setTotal(data.total || 0);
      } catch (e) {
        if (!alive) return;
        setRows([]);
        setTotal(0);
        setError(e.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [page, pageSize, q, sort]);

  return (
    <div className="glass-panel p-6" style={{ '--panel-bg': .09, '--panel-ol': .55, '--panel-thickness': '2.5px' }}>
      <h2 className="text-xl md:text-2xl font-semibold mb-4">Tenders</h2>

      {/* simple search + sort */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input input-bordered w-full max-w-md"
          placeholder="Search title/description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select select-bordered"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          title="Sort"
        >
          <option value="-closing_at">Closing soon (desc)</option>
          <option value="closing_at">Closing (asc)</option>
          <option value="-published_at">Newest</option>
          <option value="published_at">Oldest</option>
        </select>
      </div>

      {loading && <div className="opacity-80">Loading tenders…</div>}
      {error && <div className="text-error">Error: {error}</div>}

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
              <tr><td colSpan={6} className="py-8 text-center opacity-70">No tenders found.</td></tr>
            ) : rows.map((t) => (
              <tr key={t.referenceNumber ?? t.id}>
                <td className="max-w-[28rem]">
                  <a className="link" href={t.sourceUrl ?? '#'} target="_blank" rel="noreferrer">
                    {t.title}
                  </a>
                  {t.summary && <div className="text-sm opacity-70">{t.summary}</div>}
                </td>
                <td>{t.buyer}</td>
                <td>{t.source}</td>
                <td>{fmt(t.published_at)}</td>
                <td>{fmtDT(t.closing_at)}</td>
                <td>{t.referenceNumber ?? t.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Pager page={page} onPrev={() => setPage(p => Math.max(1, p - 1))} onNext={() => setPage(p => p + 1)} />
        <span className="opacity-70">Showing {rows.length} of {total || '…'}</span>
      </div>
    </div>
  );
}

function Pager({ page, onPrev, onNext }) {
  return (
    <div className="join">
      <button className="btn join-item btn-outline ts" onClick={onPrev} disabled={page<=1}>Prev</button>
      <button className="btn join-item btn-ghost no-animation">Page {page}</button>
      <button className="btn join-item btn-primary glow-cta" onClick={onNext}>Next</button>
    </div>
  );
}

function fmt(d)   { return d ? new Date(d).toLocaleDateString() : '' }
function fmtDT(d) { return d ? new Date(d).toLocaleString()     : '' }
