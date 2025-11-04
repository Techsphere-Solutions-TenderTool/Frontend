// src/routes/TenderDetailsPage.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { MapPin, CalendarDays, Clock4, Star, ExternalLink, Download } from "lucide-react";
import {
  getCachedTender,
  getTenderById,
  getTenderDocuments,
  getTenderContacts,
  cacheTender,
  summariseTender,
} from "../lib/api.js";
import { PrefsContext } from "../contexts/PrefsContext.js";
import {
  prettySource,
  humanCountdownFull,

  parseDate,
  isMeaningful,
  buildStatusFromClosing,
  prettyCategory,
} from "../lib/tenderUtils.js";
import { useAuth } from "react-oidc-context";
import { useToast } from "../components/ToastProvider.jsx";


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
  const auth = useAuth();
const toast = useToast();

  // Load main tender
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
        if (!dead) setErr("Could not load that tender. Please navigate from the list.");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    
    return () => {
      dead = true;
    };
  }, [id, row]);

  // Load docs + contacts
  useEffect(() => {
    const tenderId = row?.id ?? id;
    if (!tenderId) return;

    let dead = false;

    // Documents
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

    // Contacts
    (async () => {
      try {
        setContacts((p) => ({ ...p, loading: true, error: "" }));
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
      setDocMessage("Download failed: no URL for this document.");
      return;
    }
    try {
      window.open(doc.url, "_blank", "noopener");
      setDocMessage(`Opening: ${doc.name}`);
    } catch (e) {
      setDocMessage("Download failed (popup blocked or invalid URL).");
    }
    setTimeout(() => setDocMessage(""), 4000);
  }

  async function handleGenerateSummary() {
  if (!auth.isAuthenticated) {
    toast.error("Please log in to use AI features.");
    return;
  }

  if (!row) return;
  setShowAi(true);
  setAiLoading(true);
  setAiError("");
  setAiText("");

  try {
    const sourceRaw = row.source || row.publisher || row.buyer || "";
    const payload = {
      id: row.id || id,
      title: row.title,
      description: row.summary || row.description || "",
      buyer: row.buyer,
      source: prettySource(sourceRaw),
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


  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        <p className="mt-4 text-slate-100">Loading tender…</p>
      </div>
    );
  }
  
  if (err) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-300 text-lg">{err}</p>
        <Link to="/tenders" className="btn btn-primary mt-4">
          ← Back to tenders
        </Link>
      </div>
    );
  }
  
  if (!row) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-200 text-lg">Tender not found.</p>
        <Link to="/tenders" className="btn btn-primary mt-4">
          ← Back to tenders
        </Link>
      </div>
    );
  }

  // Normalize data
  const title = row.title || "Untitled tender";
  const category = prettyCategory(row.category);
  const sourceRaw = row.source || row.publisher || row.buyer || "";
  const source = prettySource(sourceRaw);
  const buyer = row.buyer && isMeaningful(row.buyer) ? row.buyer : null;
  const location = row.location && isMeaningful(row.location) ? row.location : null;

  const published = parseDate(row.published_at);
  const closing = parseDate(row.closing_at);
  const statusInfo = buildStatusFromClosing(closing);
  const closingCountdown = humanCountdownFull(closing);

  const isSaved = savedIds.includes(row.id || id);

  function toggleSave() {
    if (!canSave) {
      alert("Please log in to save tenders.");
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
      <div className="glass-panel border border-cyan-500/20 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3 flex-1">
            {/* Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <span className="tt-chip tt-chip-blue text-xs uppercase tracking-wide">
                  {category}
                </span>
              )}
              {source && (
                <span className="tt-chip tt-chip-cyan text-xs uppercase tracking-wide">
                  {source}
                </span>
              )}
              {statusInfo && (
                <span className={`tt-chip ${statusInfo.className} text-xs`}>
                  {statusInfo.label}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-50 leading-tight">
              {title}
            </h1>

            {/* Meta info */}
            <div className="space-y-2 text-sm">
              {published && (
                <div className="flex items-center gap-2 text-slate-200/80">
                  <CalendarDays size={16} className="text-cyan-300" />
                  <span>
                    Published: {published.toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {closing && (
                <div className="flex items-center gap-2 text-slate-200/80">
                  <Clock4 size={16} className="text-cyan-300" />
                  <span>
                    Closing: {closing.toLocaleString("en-ZA", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {closingCountdown && closingCountdown !== "Closed" && (
                    <span className="text-yellow-200 font-medium ml-2">
                      ({closingCountdown})
                    </span>
                  )}
                </div>
              )}
              {location && (
                <div className="flex items-center gap-2 text-slate-200/80">
                  <MapPin size={16} className="text-cyan-300" />
                  <span>{location}</span>
                </div>
              )}
              {buyer && buyer !== source && (
                <div className="text-slate-200/80">
                  <span className="font-medium">Buyer:</span> {buyer}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 items-end">
            <button
              onClick={toggleSave}
              className={`w-11 h-11 rounded-full flex items-center justify-center border transition ${
                isSaved
                  ? "bg-cyan-400 text-slate-900 border-cyan-200"
                  : "bg-slate-900/30 text-yellow-200 border-slate-500/40 hover:bg-slate-900/60"
              }`}
              title={isSaved ? "Unsave this tender" : "Save this tender"}
            >
              <Star size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
            <div className="flex gap-2 flex-wrap">
              {row.url && (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary glow-cta inline-flex items-center gap-2"
                >
                  View original
                  <ExternalLink size={14} />
                </a>
              )}
              <Link to="/tenders" className="btn btn-ghost">
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* DESCRIPTION (if available) */}
      {(row.summary || row.description) && (
        <div className="glass-panel p-5 rounded-2xl" style={{ "--panel-bg": 0.03 }}>
          <h2 className="text-lg font-semibold text-slate-50 mb-3">Description</h2>
          <div className="text-slate-200/80 text-sm leading-relaxed whitespace-pre-wrap">
            {row.summary || row.description}
          </div>
        </div>
      )}

      {/* DOCS + CONTACTS */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* DOCUMENTS */}
        <div
          className="glass-panel p-5 md:col-span-2 rounded-2xl"
          style={{ "--panel-bg": 0.03 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-50">Documents</h2>
            {docMessage && (
              <div className="text-xs text-emerald-300 animate-pulse">{docMessage}</div>
            )}
          </div>

          {docs.loading ? (
            <div className="text-slate-300/70 text-sm">Loading documents…</div>
          ) : docs.error ? (
            <div className="text-red-400 text-sm">{docs.error}</div>
          ) : docs.items.length === 0 ? (
            <div className="text-slate-300/60 text-sm">
              No documents available for this tender.
            </div>
          ) : (
            <ul className="space-y-3">
              {docs.items.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 bg-slate-900/20 border border-slate-500/20 rounded-xl px-4 py-3 hover:border-cyan-500/30 transition"
                >
                  <div className="flex-1">
                    <div className="font-medium text-slate-50">{doc.name}</div>
                    <div className="text-xs text-slate-300/70 mt-0.5">
                      {doc.type || "Document"}
                      {doc.size ? ` • ${Math.round(doc.size / 1024)} KB` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="btn btn-primary glow-cta inline-flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CONTACTS */}
        <div
          className="glass-panel p-5 rounded-2xl"
          style={{ "--panel-bg": 0.03 }}
        >
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Contacts</h2>
          {contacts.loading ? (
            <div className="text-slate-300/70 text-sm">Loading contacts…</div>
          ) : contacts.error ? (
            <div className="text-red-400 text-sm">{contacts.error}</div>
          ) : contacts.items.length === 0 ? (
            <div className="text-slate-300/60 text-sm">No contacts available.</div>
          ) : (
            <ul className="space-y-3">
              {contacts.items.map((c, idx) => (
                <li
                  key={c.id || idx}
                  className="bg-slate-900/25 border border-slate-500/10 rounded-xl px-3 py-3"
                >
                  <div className="font-medium text-slate-50">{c.name || "Contact"}</div>
                  {c.role && (
                    <div className="text-xs text-slate-300/80 mt-0.5">{c.role}</div>
                  )}
                  {c.email && (
                    <div className="text-xs mt-1.5">
                      <a
                        className="text-cyan-200 hover:text-cyan-100 transition"
                        href={`mailto:${c.email}`}
                      >
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.phone && (
                    <div className="text-xs text-slate-200/70 mt-1">{c.phone}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* AI SUMMARY */}
      <div className="glass-panel border border-cyan-500/10 rounded-2xl p-6 bg-gradient-to-r from-slate-950/60 via-slate-900/20 to-cyan-900/10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 rounded-full bg-cyan-500/10 items-center justify-center text-cyan-200">
                AI
              </span>
              AI Summary
            </h2>
            <p className="text-slate-300/70 text-sm mt-1">
              Generate a concise summary of this tender using AI.
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

        {aiError && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{aiError}</p>
          </div>
        )}

        {showAi ? (
          <div className="bg-slate-950/30 border border-slate-600/20 rounded-xl p-5 space-y-3">
            {aiLoading ? (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                <span className="text-sm text-slate-200/70">Generating summary…</span>
              </div>
            ) : aiText ? (
              <>
                <p className="text-slate-50 text-sm leading-relaxed">{aiText}</p>
                <div className="text-xs text-slate-400/80 pt-2 border-t border-slate-600/20">
                  Summary for: <strong>{title}</strong>
                  {buyer && buyer !== source && (
                    <> • Buyer: <strong>{buyer}</strong></>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-300/80">
                Click the button above to generate an AI summary of this tender.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            This feature uses AI to summarize key details, requirements, and deadlines.
          </p>
        )}
      </div>
    </div>
  );
}