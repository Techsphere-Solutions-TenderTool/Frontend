// src/routes/TenderDetailsPage.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  getCachedTender,
  getTenderById,
  getTenderDocuments,
  getTenderContacts,
  cacheTender,
  summariseTender,
} from "../lib/api.js";
import { PrefsContext } from "../contexts/PrefsContext.js";


function sourceFromId(id) {
  if (!id) return "";
  const num = Number(id);
  if (num === 2) return "ESKOM";
  if (num === 3) return "SANRAL";
  if (num === 4) return "Transnet";
  if (num === 5) return "National eTenders";
  return "";
}

function prettySource(s) {
  if (!s) return "";
  const low = s.toLowerCase();
  if (low === "eskom") return "ESKOM";
  if (low === "sanral") return "SANRAL";
  if (low === "transnet") return "Transnet";
  if (low === "etenders" || low === "national etenders") return "National eTenders";
  return s;
}

function humanCountdown(closingAt) {
  if (!closingAt) return "";
  const d = new Date(closingAt);
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `Closes in ${days}d`;
  if (hours > 0) return `Closes in ${hours}h`;
  return `Closes in ${mins}m`;
}

export default function TenderDetailsPage() {
  const { id } = useParams();
  const loc = useLocation();
  const fromState = loc.state?.row;
  const openAiFromState = loc.state?.openAi === true;

  const prefsCtx = useContext(PrefsContext);
  const canSave = prefsCtx?.canSave;
  const savedIds = prefsCtx?.savedTenders || [];
  const addSaved = prefsCtx?.addSavedTender;
  const removeSaved = prefsCtx?.removeSavedTender;

  const [row, setRow] = useState(fromState || getCachedTender(id));
  const [loading, setLoading] = useState(!row);
  const [err, setErr] = useState("");

  const [docs, setDocs] = useState({ loading: true, error: "", items: [] });
  const [contacts, setContacts] = useState({ loading: true, error: "", items: [] });
  const [docMessage, setDocMessage] = useState("");

  // AI
  const [showAi, setShowAi] = useState(openAiFromState);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // load main tender
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
        if (!dead) setErr("Could not load that tender. Open it from the list first.");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [id, row]);

  // load docs + contacts
  useEffect(() => {
    const tenderId = row?.id ?? id;
    if (!tenderId) return;

    let dead = false;

    // documents
    (async () => {
      try {
        setDocs((p) => ({ ...p, loading: true, error: "" }));
        const items = await getTenderDocuments(tenderId);
        if (!dead) setDocs({ loading: false, error: "", items });
      } catch (e) {
        if (!dead)
          setDocs({
            loading: false,
            error: e.message || "Failed to load documents.",
            items: [],
          });
      }
    })();

    // contacts
    (async () => {
      try {
        setContacts((p) => ({ ...p, loading: true, error: "" }));
        // if tender itself already had contacts, use it
        if (row && Array.isArray(row.contacts) && row.contacts.length > 0) {
          if (!dead) setContacts({ loading: false, error: "", items: row.contacts });
        } else {
          const items = await getTenderContacts(tenderId);
          if (!dead) setContacts({ loading: false, error: "", items });
        }
      } catch (e) {
        if (!dead)
          setContacts({
            loading: false,
            error: e.message || "Failed to load contacts.",
            items: [],
          });
      }
    })();

    return () => {
      dead = true;
    };
  }, [row, id]);

  function handleDownload(doc) {
    if (!doc?.url) {
      setDocMessage("Download failed: no URL on this document.");
      return;
    }
    try {
      window.open(doc.url, "_blank", "noopener");
      setDocMessage(`Download started: ${doc.name}`);
    } catch (e) {
      setDocMessage("Download failed (popup blocked or invalid URL).");
    }
    setTimeout(() => setDocMessage(""), 4500);
  }

  async function handleGenerateSummary() {
    if (!row) return;
    setShowAi(true);
    setAiLoading(true);
    setAiError("");
    setAiText("");

    try {
      const payload = {
        id: row.id || id,
        title: row.title,
        description: row.summary || "", // you can change to row.description if your API has it
        buyer: row.buyer,
        source: row.source || row.publisher || sourceFromId(row.source_id),
        closingDate: row.closing_at,
        location: row.location,
      };
      const result = await summariseTender(payload);
      setAiText(result.summary || "AI did not return a summary.");
    } catch (e) {
      setAiError(e.message || "Failed to generate summary.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) return <div className="p-6 text-slate-100">Loading…</div>;
  if (err) return <div className="p-6 text-red-300">{err}</div>;
  if (!row) return <div className="p-6 text-slate-200">Tender not found.</div>;

  const published = row.published_at
    ? new Date(row.published_at).toLocaleDateString()
    : "—";
  const closing = row.closing_at
    ? new Date(row.closing_at).toLocaleString()
    : "—";

  const sourceRaw =
    row.source ||
    row.publisher ||
    sourceFromId(row.source_id) ||
    row.buyer ||
    "";
  const source = prettySource(sourceRaw);
  const isSaved = savedIds.includes(row.id || id);

  const closingCountdown = humanCountdown(row.closing_at);

  function toggleSave() {
    if (!canSave) {
      alert("Login to save this tender.");
      return;
    }
    const tenderId = row.id || id;
    if (!tenderId) return;
    if (isSaved) {
      removeSaved?.(tenderId);
    } else {
      addSaved?.(tenderId);
    }
    cacheTender({ ...row, id: tenderId });
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="glass-panel p-6 border border-cyan-500/20 rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {row.category && (
                <span className="tt-chip tt-chip-blue uppercase tracking-wide text-xs">
                  {row.category}
                </span>
              )}
              {source && (
                <span className="tt-chip tt-chip-cyan uppercase tracking-wide text-xs">
                  {source}
                </span>
              )}
              {row.status && (
                <span className="tt-chip tt-chip-soft text-xs">{row.status}</span>
              )}
              {closingCountdown && closingCountdown !== "Closed" && (
                <span className="tt-chip tt-chip-warning text-xs">
                  {closingCountdown}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-50">
              {row.title || "Untitled tender"}
            </h1>
            <p className="text-slate-200/70 text-sm">
              Published {published} • Closing {closing}
            </p>
            {row.location && (
              <p className="text-slate-100/80 mt-2 flex gap-2 items-center text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-300" />
                {row.location}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button
              onClick={toggleSave}
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition ${
                isSaved
                  ? "bg-cyan-400 text-slate-900 border-cyan-200"
                  : "bg-slate-900/30 text-yellow-200 border-slate-500/40 hover:bg-slate-900/60"
              }`}
              title={isSaved ? "Unsave this tender" : "Save this tender"}
            >
              ★
            </button>
            <div className="flex gap-2">
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
      </div>

      {/* DOCS + CONTACTS (contacts stay on the side) */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* DOCUMENTS */}
        <div
          className="glass-panel p-4 md:col-span-2 rounded-2xl"
          style={{ "--panel-bg": 0.03 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-50">Documents</h2>
            {docMessage && <div className="text-xs text-emerald-300">{docMessage}</div>}
          </div>

          {docs.loading ? (
            <div className="opacity-70 text-sm">Loading documents…</div>
          ) : docs.error ? (
            <div className="text-red-400 text-sm">{docs.error}</div>
          ) : docs.items.length === 0 ? (
            <div className="opacity-50 text-sm">
              No documents were returned for this tender.
            </div>
          ) : (
            <ul className="space-y-3">
              {docs.items.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 bg-slate-900/20 border border-slate-500/20 rounded-xl px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-slate-50">{doc.name}</div>
                    <div className="text-xs text-slate-300/70">
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

        {/* CONTACTS (side) */}
        <div
          className="glass-panel p-4 rounded-2xl"
          style={{ "--panel-bg": 0.03 }}
        >
          <h2 className="text-lg font-semibold text-slate-50 mb-2">Contacts</h2>
          {contacts.loading ? (
            <div className="opacity-70 text-sm">Loading contacts…</div>
          ) : contacts.error ? (
            <div className="text-red-400 text-sm">{contacts.error}</div>
          ) : contacts.items.length === 0 ? (
            <div className="opacity-50 text-sm">No contacts available for this tender.</div>
          ) : (
            <ul className="space-y-3">
              {contacts.items.map((c) => (
                <li
                  key={c.id}
                  className="bg-slate-900/25 border border-slate-500/10 rounded-xl px-3 py-2"
                >
                  <div className="font-medium text-slate-50">{c.name || "Contact"}</div>
                  {c.role && <div className="text-xs text-slate-300/80">{c.role}</div>}
                  {c.email && (
                    <div className="text-xs mt-1">
                      <a
                        className="text-cyan-200 hover:text-cyan-100"
                        href={`mailto:${c.email}`}
                      >
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.phone && (
                    <div className="text-xs text-slate-200/70 mt-1">
                      {c.phone}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* AI SUMMARY (full-width, below docs) */}
      <div className="glass-panel border border-cyan-500/10 rounded-2xl p-5 bg-gradient-to-r from-slate-950/60 via-slate-900/20 to-cyan-900/10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 rounded-full bg-cyan-500/10 items-center justify-center text-cyan-200 text-sm">
                AI
              </span>
              Tender AI summary
            </h2>
            <p className="text-slate-300/70 text-sm">
              Generate a short, human-readable view of scope, buyer, and key dates for this tender.
            </p>
          </div>
          <button
            onClick={handleGenerateSummary}
            className="btn btn-primary glow-cta"
            disabled={aiLoading}
          >
            {aiLoading ? "Generating…" : "Generate summary"}
          </button>
        </div>

        {aiError && <div className="text-red-400 text-sm mb-3">{aiError}</div>}

        {showAi ? (
          <div className="bg-slate-950/30 border border-slate-600/20 rounded-xl p-4 space-y-2">
            {aiLoading ? (
              <div className="text-sm text-slate-200/70">
                Working on it…
              </div>
            ) : aiText ? (
              <>
                <p className="text-slate-50 text-sm leading-relaxed">{aiText}</p>
                <p className="text-xs text-slate-400/80">
                  Tender: <strong>{row.title}</strong> • Buyer:{" "}
                  <strong>{row.buyer || source}</strong>
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-300/80">
                Click the button above to generate the first AI summary.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            You can expose this to Lex or Bedrock later – just call your Lambda here and set the
            summary text.
          </p>
        )}
      </div>
    </div>
  );
}
