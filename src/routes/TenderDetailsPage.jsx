// src/routes/TenderDetailsPage.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getCachedTender, getTenderById } from "../lib/api.js";

export default function TenderDetailsPage() {
  const { id } = useParams();
  const loc = useLocation();
  const fromState = loc.state?.row;

  const [row, setRow] = useState(fromState || getCachedTender(id));
  const [loading, setLoading] = useState(!row);
  const [err, setErr] = useState('');

  // Optional: if you add /tenders/:id upstream, this will populate on hard-refresh
  useEffect(() => {
    if (row) return;
    let dead = false;
    (async () => {
      try {
        setLoading(true); setErr('');
        const data = await getTenderById(id);   // works only if endpoint exists
        if (!dead) setRow(data);
      } catch (e) {
        if (!dead) setErr('Open via list or add /tenders/:id in API.');
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [id, row]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err)      return <div className="p-6 text-error">{err}</div>;
  if (!row)     return <div className="p-6">Tender not found.</div>;

  const pub = row.published_at ? new Date(row.published_at).toLocaleDateString() : '—';
  const cls = row.closing_at   ? new Date(row.closing_at).toLocaleString()     : '—';

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {row.category && <span className="chip chip-blue">{row.category}</span>}
              {row.status &&   <span className="chip chip-green">{row.status}</span>}
              <span className="chip chip-cyan">{row.buyer}</span>
            </div>
            <h1 className="text-2xl font-semibold">{row.title}</h1>
            <p className="opacity-80 text-sm mt-1">
              Published {pub} • Closing {cls}
            </p>
            {row.location && <p className="opacity-90 mt-3">{row.location}</p>}
          </div>
          <div className="flex items-center gap-2">
            {row.url && <a href={row.url} target="_blank" rel="noreferrer" className="btn btn-primary glow-cta">View Original</a>}
            <Link to="/tenders" className="btn btn-ghost">← Back</Link>
          </div>
        </div>
      </div>

      {/* Stubs for docs/contacts (add when API provides) */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-4 md:col-span-2">
          <h2 className="text-lg font-semibold">Documents</h2>
          <div className="mt-3 opacity-70">No documents endpoint yet.</div>
        </div>
        <div className="glass-panel p-4">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <div className="mt-3 opacity-70">No contacts endpoint yet.</div>
        </div>
      </div>
    </div>
  );
}
