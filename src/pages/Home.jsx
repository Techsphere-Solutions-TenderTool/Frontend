// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { MapPin, CalendarDays, Clock4, Star, ExternalLink } from "lucide-react";

import { listTenders, cacheTender } from "../lib/api";
import { PrefsContext } from "../contexts/PrefsContext.js";
import { textToSpeech } from "../lib/polly";
import { useToast } from "../components/ToastProvider.jsx";
import {
  isMeaningful,
  buildStatusFromClosing,
  buildBadge,
  isFuture,
  humanCountdown,
  parseDate,
  prettySource,
} from "../lib/tenderUtils";



export default function Home() {
  const auth = useAuth();
  const toast = useToast();

  // Data
  const [latest, setLatest] = useState([]);
  const [latestTotal, setLatestTotal] = useState(0);
  const [sources] = useState([
    { id: "eskom", name: "ESKOM" },
    { id: "sanral", name: "SANRAL" },
    { id: "transnet", name: "Transnet" },
    { id: "etenders", name: "National eTenders" },
  ]);
  const [loadingLatest, setLoadingLatest] = useState(true);

  // Quick search form
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [closingBefore, setClosingBefore] = useState("");

  // Search results displayed on home page
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchRan, setSearchRan] = useState(false);
  const [searchTitle, setSearchTitle] = useState("");

  // Voice test
  async function playVoice() {
    try {
      const audioBase64 = await textToSpeech(
        "Welcome to TenderTool, your South African tender assistant."
      );
      const audio = new Audio("data:audio/mp3;base64," + audioBase64);
      await audio.play();
      toast.info("Playing welcome audio.");
    } catch (err) {
      console.error("TTS error:", err);
      toast.error(err?.message || "Error playing speech");
    }
  }

  // Search function
  const runSearch = useCallback(
    async ({
      q: qArg = q,
      source: srcArg = source,
      closing_before: cbArg = closingBefore,
    } = {}) => {
      setSearchLoading(true);
      setSearchRan(true);
      
      try {
        const params = { limit: 9, offset: 0 };
        if (qArg) params.q = qArg;
        if (srcArg) params.source = srcArg;
        if (cbArg) params.closing_before = cbArg;

        const resp = await listTenders(params);
        const items = resp.results ?? resp.items ?? [];
        setSearchResults(items);

        // Build title
        let t = "Search results";
        const bits = [];
        if (qArg) bits.push(`"${qArg}"`);
        if (srcArg) bits.push(`publisher: ${prettySource(srcArg)}`);
        if (cbArg) bits.push(`closing before: ${cbArg}`);
        if (bits.length) t = `Search: ${bits.join(" • ")}`;
        setSearchTitle(t);

        if (items.length === 0) {
          toast.info("No tenders matched that search.");
        }
      } catch (e) {
        console.error(e);
        setSearchResults([]);
        setSearchTitle("No results");
        toast.error("Search failed. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    },
    [q, source, closingBefore, toast]
  );

  // Initial load
  useEffect(() => {
    let dead = false;

    (async () => {
      try {
        const resp = await listTenders({
          limit: 6,
          offset: 0,
          sort: "-published_at",
        });
        if (dead) return;
        
        const items = resp.results ?? resp.items ?? [];
        setLatest(items);
        setLatestTotal(resp.total ?? items.length);
      } catch (e) {
        console.error("Failed to load latest tenders", e);
        if (!dead) toast.error("Could not load latest tenders.");
      } finally {
        if (!dead) setLoadingLatest(false);
      }
    })();

    return () => {
      dead = true;
    };
  }, [toast]);

  // Form submit
  async function handleQuickSearch(e) {
    e.preventDefault();
    runSearch();
  }

  function handlePublisherClick(pubId) {
    setSource(pubId);
    runSearch({ source: pubId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCategoryClick(cat) {
    setQ(cat);
    runSearch({ q: cat });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-10">
      {/* HERO */}
      <div
        className="glass-panel panel-thick p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8"
        style={{ "--panel-bg": 0.12 }}
      >
        <div className="max-w-2xl space-y-5">
          <p className="hero-pill">
            TenderTool • South Africa
            <span className="hero-dot" />
            Updated daily
          </p>
          <h1 className="h1-pro">
            South Africa's smartest way to find tenders — from "where do I look?" to "found it" in
            minutes.
          </h1>
          <p className="text-slate-100/90 text-lg max-w-xl">
            Search by sector, province and deadline, save what matters, and let AI read the long
            ones.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/tenders" className="btn btn-primary glow-cta">
              Browse tenders
            </Link>
            <button
              type="button"
              onClick={() => toast.info("Chat feature coming soon!")}
              className="btn btn-outline ts"
            >
              Try our Chatbot
            </button>
            <button type="button" onClick={playVoice} className="btn btn-outline ts">
              🔊 Test Voice
            </button>
          </div>
        </div>

        {/* Hero metric box */}
        <div className="hero-metric-box">
          <p className="hero-metric-title">Live public tenders</p>
          <p className="hero-metric-value">{latestTotal.toLocaleString()}</p>
          <p className="hero-metric-sub">
            Fetched from official publishers <br /> View, filter and share from one interface.
          </p>
          <p className="hero-metric-foot">Showing {latest.length} on this page</p>
        </div>
      </div>

      {/* QUICK SEARCH BAR */}
      <form
        onSubmit={handleQuickSearch}
        className="glass-panel search-bar"
        style={{ "--panel-bg": 0.04 }}
      >
        <input
          className="input flex-1"
          placeholder="Search title, buyer or description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="select md:w-52 dark-select"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">All publishers</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input md:w-44 dark-date"
          value={closingBefore}
          onChange={(e) => setClosingBefore(e.target.value)}
        />
        <button type="submit" className="btn btn-primary glow-cta md:w-auto">
          Search
        </button>
      </form>

      {/* SEARCH RESULTS */}
      {searchRan && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="h2-pro">{searchTitle}</h2>
            <button
              onClick={() => {
                setSearchRan(false);
                setSearchResults([]);
                setQ("");
                setSource("");
                setClosingBefore("");
              }}
              className="text-sm text-cyan-200 hover:text-white transition"
            >
              Clear search
            </button>
          </div>
          {searchLoading ? (
            <p className="text-slate-200/70">Searching…</p>
          ) : searchResults.length === 0 ? (
            <div className="glass-panel p-8 text-center" style={{ "--panel-bg": 0.03 }}>
              <p className="text-slate-100/70">No tenders matched that search.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {searchResults.map((t) => (
                <TenderCard
                  key={t.id ?? t.referenceNumber}
                  tender={t}
                  isLoggedIn={auth.isAuthenticated}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* LATEST TENDERS */}
      {!searchRan && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="h2-pro">Latest opportunities</h2>
            <Link
              to="/tenders"
              className="text-sm text-cyan-200 hover:text-white transition underline-offset-2 hover:underline"
            >
              View all tenders →
            </Link>
          </div>
          {loadingLatest ? (
            <div className="text-slate-300/70 py-10 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-3">Loading latest tenders…</p>
            </div>
          ) : latest.length === 0 ? (
            <p className="text-slate-300/70">No tenders available right now.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {latest.map((t) => (
                <TenderCard
                  key={t.id ?? t.referenceNumber}
                  tender={t}
                  isLoggedIn={auth.isAuthenticated}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* BROWSE BY PUBLISHER */}
      <section className="space-y-4">
        <h2 className="h2-pro">Browse by publisher</h2>
        <p className="text-slate-200/75 max-w-2xl">
          Jump straight to the organisation you work with most often.
        </p>
        <div className="grid md:grid-cols-4 gap-4">
          {sources.map((s) => (
            <button
              key={s.id}
              onClick={() => handlePublisherClick(s.id)}
              className="glass-panel p-4 text-left hover:border-cyan-400/75 transition"
              style={{ "--panel-bg": 0.04 }}
              type="button"
            >
              <div className="text-xs uppercase tracking-wide text-slate-200/80">Publisher</div>
              <div className="mt-1 text-lg font-semibold text-slate-50">{s.name}</div>
              <div className="mt-2 text-xs text-cyan-100/70 flex items-center gap-1">
                Show on this page <ExternalLink size={12} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="space-y-3">
        <h2 className="h2-pro">Popular categories</h2>
        <p className="text-slate-200/75 max-w-2xl">Explore common sectors suppliers bid for.</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Construction & Roads",
            "Energy & Power",
            "ICT & Software",
            "Cleaning & Facilities",
            "Professional Services",
            "Security",
          ].map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className="chip bg-white/5 border border-white/10 hover:bg-cyan-400/10 hover:border-cyan-400/30 transition"
              type="button"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* WHY USE TENDERTOOL */}
      <section className="glass-panel p-6 md:p-7 space-y-4" style={{ "--panel-bg": 0.025 }}>
        <div>
          <h2 className="h2-pro">Why businesses use TenderTool</h2>
          <p className="text-slate-200/75 max-w-2xl mt-1">
            We centralise, make it searchable, and give you tools to act fast.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-5">
          <BenefitCard
            icon="📄"
            title="All in one place"
            desc="Public tenders from key SA publishers in a unified view."
          />
          <BenefitCard
            icon="⚡"
            title="Fast filtering"
            desc="Filter by source, date and sector in seconds."
          />
          <BenefitCard
            icon="🤖"
            title="AI-friendly"
            desc="Send the long notice to AI to summarise or extract requirements."
          />
          <BenefitCard
            icon="🔔"
            title="Ready for alerts"
            desc="Designed to plug into SNS / email / WhatsApp style alerts."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="grid md:grid-cols-3 gap-5">
        <InfoCard
          title="1. We collect public tenders"
          desc="From major South African publishers so you don't have to open 4 different portals."
        />
        <InfoCard
          title="2. We make them searchable"
          desc="Unified fields: buyer, source, sector, location, deadlines."
        />
        <InfoCard
          title="3. You find and act"
          desc="Filter, view details, open the official link, and (soon) set alerts."
        />
      </section>

      {/* FAQ */}
      <section className="glass-panel p-6 space-y-4" style={{ "--panel-bg": 0.03 }}>
        <h2 className="text-xl md:text-2xl font-semibold">FAQs</h2>
        <FAQ
          q="Do I apply on this website?"
          a="No — we show you the tender details and link you to the official publisher to submit."
        />
        <FAQ
          q="How often is the data updated?"
          a="Daily. We fetch new tenders and refresh closing dates from the original sources."
        />
        <FAQ
          q="Can I get alerts for certain sectors?"
          a="Yes — once login is enabled, you'll be able to save your filters and receive notifications."
        />
        <FAQ
          q="Is this only for government tenders?"
          a="Right now it focuses on South African public-sector / SOE opportunities."
        />
      </section>

      {/* CTA */}
      <section className="cta-panel">
        <div>
          <h3 className="text-2xl font-bold text-slate-50">Ready to get notified?</h3>
          <p className="text-slate-100/80 mt-1">
            Connect your profile and we'll send alerts for new tenders in your sector.
          </p>
        </div>
        <Link to="/tenders" className="btn btn-primary glow-cta">
          Browse all tenders
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="py-6 text-xs text-slate-400 text-center">
        TenderTool • Built on AWS • IIE Varsity College WIL
      </footer>
    </div>
  );
}

/* ===================== TENDER CARD (UNIFIED) ===================== */
function TenderCard({ tender }) {
  const ctx = useContext(PrefsContext);
  const canSave = ctx?.canSave;
  const savedIds = ctx?.savedTenders || [];
  const addSaved = ctx?.addSavedTender;
  const removeSaved = ctx?.removeSavedTender;
  const toast = useToast();

  const id = tender.id ?? tender.referenceNumber;
  const isSaved = savedIds.includes(id);

  // Normalize
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

  const statusInfo = buildStatusFromClosing(closing);
  const badge = buildBadge(tender.published_at);
  const countdown = humanCountdown(closing);

  const handleSave = () => {
    if (!canSave) {
      toast.info("Please log in to save tenders.");
      return;
    }
    if (isSaved) {
      removeSaved?.(id);
      toast.success("Removed from favourites.");
    } else {
      addSaved?.(id);
      toast.success("Saved to favourites.");
    }
  };

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
          onClick={handleSave}
          className={`tt-save-btn ${isSaved ? "is-saved" : ""}`}
          aria-label={isSaved ? "Unsave tender" : "Save tender"}
          type="button"
        >
          <Star size={16} strokeWidth={1.7} fill={isSaved ? "currentColor" : "none"} />
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
      <div className="tt-footer">
        {id ? (
          <Link
            to={`/tenders/${id}`}
            state={{ row: { ...tender, id }, openAi: false }}
            className="tt-view-btn w-full inline-flex items-center justify-center gap-2"
            onClick={() => {
              try {
                cacheTender({ ...tender, id });
              } catch (_) {
                /* ignore */
              }
            }}
          >
            View details
            <ExternalLink size={14} />
          </Link>
        ) : (
          <button className="tt-view-btn w-full" type="button" disabled>
            View details
          </button>
        )}
      </div>
    </article>
  );
}

/* ===================== SMALL COMPONENTS ===================== */

function InfoCard({ title, desc }) {
  return (
    <div className="glass-panel p-5" style={{ "--panel-bg": 0.04 }}>
      <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-slate-300 text-sm">{desc}</p>
    </div>
  );
}

function BenefitCard({ icon, title, desc }) {
  return (
    <div className="benefit-card">
      <div className="benefit-icon">{icon}</div>
      <h3 className="benefit-title">{title}</h3>
      <p className="benefit-desc">{desc}</p>
    </div>
  );
}

function FAQ({ q, a }) {
  return (
    <details className="faq-item">
      <summary className="faq-summary">{q}</summary>
      <p className="faq-answer">{a}</p>
    </details>
  );
}