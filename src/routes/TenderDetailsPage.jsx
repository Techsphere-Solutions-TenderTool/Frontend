// src/routes/TenderDetailsPage.jsx
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  getCachedTender,
  getTenderById,
  getTenderDocuments,
  getTenderContacts,
} from "../lib/api.js";

export default function TenderDetailsPage() {
  const { id } = useParams();
  const loc = useLocation();
  const fromState = loc.state?.row;

  const [row, setRow] = useState(fromState || getCachedTender(id));
  const [loading, setLoading] = useState(!row);
  const [err, setErr] = useState("");

  // NEW: docs + contacts state
  const [docs, setDocs] = useState({ loading: true, error: "", items: [] });
  const [contacts, setContacts] = useState({ loading: true, error: "", items: [] });
  const [docMessage, setDocMessage] = useState("");

  // load main tender (in case user refreshed)
  useEffect(() => {
    if (row) return;
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await getTenderById(id);
        if (!dead) setRow(data);
      } catch (e) {
        if (!dead) setErr("Open via list or add /tenders/:id in API.");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [id, row]);

  // once we have a row (and an id) → load docs + contacts
  useEffect(() => {
    if (!row?.id && !id) return;

    const tenderId = row?.id ?? id;
    let dead = false;

    // documents
    (async () => {
      try {
        setDocs((p) => ({ ...p, loading: true, error: "" }));
        const items = await getTenderDocuments(tenderId);
        if (!dead) setDocs({ loading: false, error: "", items });
      } catch (e) {
        if (!dead) setDocs({ loading: false, error: e.message || "Failed to load documents.", items: [] });
      }
    })();

    // contacts
    (async () => {
      try {
        setContacts((p) => ({ ...p, loading: true, error: "" }));
        const items = await getTenderContacts(tenderId);
        if (!dead) setContacts({ loading: false, error: "", items });
      } catch (e) {
        if (!dead) setContacts({ loading: false, error: e.message || "Failed to load contacts.", items: [] });
      }
    })();

    return () => {
      dead = true;
    };
  }, [row, id]);

  // download handler
  function handleDownload(doc) {
    if (!doc?.url) {
      setDocMessage("Download failed: no URL on this document.");
      return;
    }
    try {
      // open in new tab – browser will handle download if it's an attachment
      window.open(doc.url, "_blank", "noopener");
      setDocMessage(`Download started: ${doc.name}`);
    } catch (e) {
      setDocMessage("Download failed (popup blocked or invalid URL).");
    }
    // clear message after a while
    setTimeout(() => setDocMessage(""), 4500);
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-error">{err}</div>;
  if (!row) return <div className="p-6">Tender not found.</div>;

  const pub = row.published_at ? new Date(row.published_at).toLocaleDateString() : "—";
  const cls = row.closing_at ? new Date(row.closing_at).toLocaleString() : "—";

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {row.category && <span className="chip chip-blue">{row.category}</span>}
              {row.status && <span className="chip chip-magenta">{row.status}</span>}
              <span className="chip chip-cyan">{row.buyer}</span>
            </div>
            <h1 className="text-2xl font-semibold">{row.title}</h1>
            <p className="opacity-80 text-sm mt-1">
              Published {pub} • Closing {cls}
            </p>
            {row.location && <p className="opacity-90 mt-3">{row.location}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary glow-cta"
              >
                View Original
              </a>
            )}
            <Link to="/tenders" className="btn btn-ghost">
              ← Back
            </Link>
          </div>
        </div>
      </div>

      {/* Documents & Contacts */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* DOCUMENTS */}
        <div className="glass-panel p-4 md:col-span-2" style={{ "--panel-bg": 0.03 }}>
          <h2 className="text-lg font-semibold mb-2">Documents</h2>

          {docMessage && <div className="mb-3 text-sm text-emerald-300">{docMessage}</div>}

          {docs.loading ? (
            <div className="opacity-70">Loading documents…</div>
          ) : docs.error ? (
            <div className="text-red-400 text-sm">{docs.error}</div>
          ) : docs.items.length === 0 ? (
            <div className="opacity-70">No documents for this tender.</div>
          ) : (
            <ul className="space-y-3">
              {docs.items.map((doc) => (
                <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 bg-white/5 rounded-lg px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-xs opacity-70">
                      {doc.type || "file"}
                      {doc.size ? ` • ${Math.round(doc.size / 1024)} KB` : ""}
                    </div>
                  </div>
                  <button onClick={() => handleDownload(doc)} className="btn btn-primary glow-cta">
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CONTACTS */}
        <div className="glass-panel p-4" style={{ "--panel-bg": 0.03 }}>
          <h2 className="text-lg font-semibold mb-2">Contacts</h2>
          {contacts.loading ? (
            <div className="opacity-70">Loading contacts…</div>
          ) : contacts.error ? (
            <div className="text-red-400 text-sm">{contacts.error}</div>
          ) : contacts.items.length === 0 ? (
            <div className="opacity-70">No contacts endpoint yet.</div>
          ) : (
            <ul className="space-y-3">
              {contacts.items.map((c) => (
                <li key={c.id} className="bg-white/5 rounded-lg px-3 py-2">
                  <div className="font-medium">{c.name}</div>
                  {c.role && <div className="text-xs opacity-70">{c.role}</div>}
                  {c.email && (
                    <div className="text-xs">
                      <a className="text-cyan-200" href={`mailto:${c.email}`}>
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.phone && <div className="text-xs opacity-80">{c.phone}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
