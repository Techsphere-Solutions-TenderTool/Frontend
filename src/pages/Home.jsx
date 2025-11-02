// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import { listTenders } from "../lib/api";
import { MapPin, CalendarDays, Clock4, Star } from "lucide-react";
import { PrefsContext } from "../App.jsx";;


export default function Home() {
  const auth = useAuth();

  // for hero + “latest opportunities”
  const [latest, setLatest] = useState([]);
  const [latestTotal, setLatestTotal] = useState(0);
  const [sources, setSources] = useState([
    { id: "eskom", name: "Eskom Tender Bulletin" },
    { id: "sanral", name: "SANRAL" },
    { id: "transnet", name: "Transnet" },
    { id: "etenders", name: "National eTenders" },
  ]);
  const [loadingLatest, setLoadingLatest] = useState(true);

  // quick search form
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [closingBefore, setClosingBefore] = useState("");

  // show results on the **home** page
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchRan, setSearchRan] = useState(false);
  const [searchTitle, setSearchTitle] = useState("");

  // ----------------------------
  // search helper
  // ----------------------------
  const runSearch = useCallback(
    async ({
      q: qArg = q,
      source: srcArg = source,
      closing_before: cbArg = closingBefore,
    } = {}) => {
      setSearchLoading(true);
      setSearchRan(true);
      try {
        const params = {
          limit: 9,
          offset: 0,
        };
        if (qArg) params.q = qArg;
        if (srcArg) params.source = srcArg;
        if (cbArg) params.closing_before = cbArg;

        const resp = await listTenders(params);
        const items = resp.results ?? resp.items ?? [];
        setSearchResults(items);

        // build title
        let t = "Search results";
        const bits = [];
        if (qArg) bits.push(`“${qArg}”`);
        if (srcArg) bits.push(`publisher: ${srcArg}`);
        if (cbArg) bits.push(`closing before: ${cbArg}`);
        if (bits.length) t = `Search: ${bits.join(" • ")}`;
        setSearchTitle(t);
      } catch (e) {
        console.error(e);
        setSearchResults([]);
        setSearchTitle("No results");
      } finally {
        setSearchLoading(false);
      }
    },
    [q, source, closingBefore]
  );

  // ----------------------------
  // initial load
  // ----------------------------
  useEffect(() => {
    let dead = false;

    // 1) latest tenders for “Latest opportunities” + hero count
    (async () => {
      try {
        const resp = await listTenders({ limit: 6, offset: 0, sort: "-published_at" });
        if (dead) return;
        const items = resp.results ?? resp.items ?? [];
        setLatest(items);
        setLatestTotal(resp.total ?? items.length);
      } catch (e) {
        console.error("Failed to load latest tenders", e);
      } finally {
        if (!dead) setLoadingLatest(false);
      }
    })();

    // 2) try fetch /sources from backend (if it exists)
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL;
        if (!base) return;
        const res = await fetch(`${base}/sources`);
        if (!res.ok) return;
        const data = await res.json();
        if (!dead && Array.isArray(data)) {
          setSources(
            data.map((s) => ({
              id: (s.name || s.id || "").toLowerCase(),
              name: s.name ?? s.id,
            }))
          );
        }
      } catch (e) {
        // ignore, we already have fallback
      }
    })();

    return () => {
      dead = true;
    };
  }, []);

  // ----------------------------
  // form submit stays on home
  // ----------------------------
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
            South Africa’s smartest way to find tenders — from “where do I look?” to “found it” in
            minutes.
          </h1>
          <p className="text-slate-100/90 text-lg max-w-xl">
            Search by sector, province and deadline, save what matters, and let AI read the long
            ones.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleQuickSearch} className="btn btn-primary glow-cta">
              Browse tenders
            </button>
            <button
              onClick={() => alert("Hook this to Lex / OpenAI modal")}
              className="btn btn-outline ts"
            >
              Try AI summary
            </button>
          </div>
        </div>

        {/* hero metric box – now real total */}
        <div className="hero-metric-box">
          <p className="hero-metric-title">Live public tenders</p>
          <p className="hero-metric-value">{latestTotal}</p>
          <p className="hero-metric-sub">
            Fetched from official publishers <br /> “View, filter and share from one interface.”
          </p>
          <p className="hero-metric-foot">Showing {latest.length || 0} on this page</p>
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

      {/* SEARCH RESULTS (on home) */}
      {searchRan && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="h2-pro">{searchTitle}</h2>
          </div>
          {searchLoading ? (
            <p className="text-slate-200/70">Searching…</p>
          ) : searchResults.length === 0 ? (
            <p className="text-slate-200/70">No tenders matched that search.</p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {searchResults.map((t) => (
                <PremiumTenderCard
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
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="h2-pro">Latest opportunities</h2>
          {!searchRan && (
            <Link
              to="/tenders"
              className="text-sm text-cyan-200 hover:text-white transition underline-offset-2 hover:underline"
            >
              View all tenders →
            </Link>
          )}
        </div>
        {loadingLatest ? (
          <p className="text-slate-300/70">Loading latest tenders…</p>
        ) : latest.length === 0 ? (
          <p className="text-slate-300/70">No tenders available right now.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {latest.map((t) => (
              <PremiumTenderCard
                key={t.id ?? t.referenceNumber}
                tender={t}
                isLoggedIn={auth.isAuthenticated}
              />
            ))}
          </div>
        )}
      </section>

      {/* BROWSE BY PUBLISHER – stays on home now */}
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
            >
              <div className="text-xs uppercase tracking-wide text-slate-200/80">Publisher</div>
              <div className="mt-1 text-lg font-semibold text-slate-50">{s.name}</div>
              <div className="mt-2 text-xs text-cyan-100/70">Show on this page →</div>
            </button>
          ))}
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="space-y-3">
        <h2 className="h2-pro">Popular categories</h2>
        <p className="text-slate-200/75 max-w-2xl">
          Explore common sectors suppliers bid for.
        </p>
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
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* WHY PEOPLE USE TENDERTOOL – your “info cards” */}
<section
  className="glass-panel p-6 md:p-7 space-y-4"
  style={{ "--panel-bg": 0.025 }}
>
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
          desc="From major South African publishers so you don’t have to open 4 different portals."
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
          a="Yes — once login is enabled, you’ll be able to save your filters and receive notifications."
        />
        <FAQ
          q="Is this only for government tenders?"
          a="Right now it focuses on South African public-sector / SOE opportunities."
        />
      </section>

      {/* CTA FOR SNS / SIGNUP */}
      <section className="cta-panel">
        <div>
          <h3 className="text-2xl font-bold text-slate-50">Ready to get notified?</h3>
          <p className="text-slate-100/80 mt-1">
            Connect your profile and we’ll send alerts for new tenders in your sector.
          </p>
        </div>
        <button className="btn btn-primary glow-cta">Connect alerts</button>
      </section>

      {/* FOOTER */}
      <footer className="py-6 text-xs text-slate-400 text-center">
        TenderTool • Built on AWS • IIE Varsity College WIL
      </footer>
    </div>
  );
}

/* ------------------------------------------------
   PREMIUM TENDER CARD (clean v2)
   ------------------------------------------------ */
function PremiumTenderCard({ tender }) {
  const auth = useAuth();
  const ctx = useContext(PrefsContext);
  const canSave = ctx?.canSave;
  const savedIds = ctx?.savedTenders || [];
  const addSaved = ctx?.addSavedTender;
  const removeSaved = ctx?.removeSavedTender;

  const id = tender.id ?? tender.referenceNumber;
  const isSaved = savedIds.includes(id);

  // ---------- normalize ----------
  const title = tender.title || "Untitled tender";

  const categoryRaw = tender.category;
  const category =
    categoryRaw && isMeaningful(categoryRaw)
      ? categoryRaw.charAt(0).toUpperCase() + categoryRaw.slice(1).toLowerCase()
      : null;

  // publisher / source from your scrapers
 const sourceRaw = tender.source || tender.publisher || tender.buyer || null;
  const sourceName = sourceRaw && isMeaningful(sourceRaw) ? sourceRaw : null;

  const buyer = tender.buyer && isMeaningful(tender.buyer) ? tender.buyer : null;
  const location = tender.location && isMeaningful(tender.location) ? tender.location : null;

  const published = tender.published_at ? new Date(tender.published_at) : null;
  const closing = tender.closing_at ? new Date(tender.closing_at) : null;

  

  // ---------- micro badge (NEW / Updated) ----------
  let badge = null;
  if (published) {
    const now = new Date();
    const diffHours = (now - published) / (1000 * 60 * 60);
    if (diffHours <= 24) {
      badge = "NEW";
    } else if (diffHours <= 72) {
      badge = "Updated";
    }
  }

  // ---------- status chip (Open / Closing …) ----------
  const statusInfo = buildStatusFromClosing(closing);

  // ---------- save handler ----------
 const handleSave = () => {
    if (!canSave) {
      alert("Login to save this tender.");
      return;
    }
    if (isSaved) {
      removeSaved?.(id);
    } else {
      addSaved?.(id);
    }
  };
  


  return (
    <article className="tt-card">
      <div className="tt-card-top">
        <div className="flex gap-2 flex-wrap">
          {category && <span className="tt-chip tt-chip-blue">{category}</span>}
          {sourceName && <span className="tt-chip tt-chip-cyan">{sourceName}</span>}
          {statusInfo && <span className={`tt-chip ${statusInfo.className}`}>{statusInfo.label}</span>}
        </div>
        <button
          onClick={handleSave}
          className={`tt-save-btn ${isSaved ? "is-saved" : ""}`}
          aria-label={isSaved ? "Unsave tender" : "Save tender"}
        >
          <Star size={16} strokeWidth={1.7} />
        </button>
      </div>

      <h3 className="tt-title line-clamp-2">{title}</h3>

      {buyer || location ? (
        <p className="tt-subline">
          {buyer ? buyer : ""}
          {buyer && location ? " • " : ""}
          {location ? location : ""}
        </p>
      ) : null}

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
            {published.toLocaleDateString()}
          </span>
        )}
        {closing && isFuture(closing) && (
          <span className="tt-meta-item">
            <Clock4 size={14} className="tt-meta-icon" />
            {humanCountdownRich(closing)}
          </span>
        )}
      </div>

      <div className="tt-footer">
        <button className="tt-view-btn w-full">View details</button>
      </div>
    </article>
  );
}

/* ------------------------------------------------
   helper fns used above
   ------------------------------------------------ */
function isMeaningful(v) {
  if (!v) return false;
  const s = String(v).trim();
  if (!s) return false;
  const bad = ["-", "—", "n/a", "na", "null", "none"];
  return !bad.includes(s.toLowerCase());
}

// decide status chip
function buildStatusFromClosing(closingDate) {
  if (!closingDate) {
    return { label: "Open", className: "tt-chip-soft" };
  }
  if (!isFuture(closingDate)) {
    // you said: don't show "Closed" on cards
    return { label: "Open", className: "tt-chip-soft" };
  }

  const now = new Date();
  const diffMs = closingDate - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) {
    return { label: "Closing today", className: "tt-chip-danger" };
  }
  if (diffDays <= 3) {
    return { label: "Closing in 3 days", className: "tt-chip-warning" };
  }
  if (diffDays <= 7) {
    return { label: "Closing soon", className: "tt-chip-warning" };
  }
  return { label: "Open", className: "tt-chip-soft" };
}

function isFuture(d) {
  return d.getTime() - Date.now() > 0;
}

// build one neat line under title
function buildSubline({ buyer, location }) {
  if (buyer && location && buyer !== location) return `${buyer} • ${location}`;
  if (buyer) return buyer;
  if (location) return location;
  return "";
}

// “Closes in 2 months 5 days” / “Closes in 6d” / “Closes in 3h”
function humanCountdownRich(closingDate) {
  const now = new Date();
  const diffMs = closingDate - now;
  if (diffMs <= 0) return ""; // don't show

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // longer than 30 days → show months + days
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    if (days > 0) {
      return `Closes in ${months} mo ${days}d`;
    }
    return `Closes in ${months} mo`;
  }

  if (diffDays > 0) return `Closes in ${diffDays}d`;
  if (diffHours > 0) return `Closes in ${diffHours}h`;
  return `Closes in ${diffMins}m`;
}


/* ------------------------------------------------
   helpers
   ------------------------------------------------ */
function computeUrgency(closingDate) {
  if (!closingDate) return { urgencyLabel: null, urgencyClass: "" };
  const now = new Date();
  const diffMs = closingDate - now;
  if (diffMs < 0) {
    return { urgencyLabel: null, urgencyClass: "" };
  }
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) {
    return { urgencyLabel: "Closing today", urgencyClass: "tt-chip-danger" };
  }
  if (diffDays <= 3) {
    return { urgencyLabel: "Closing in 3 days", urgencyClass: "tt-chip-warning" };
  }
  if (diffDays <= 7) {
    return { urgencyLabel: "Closing soon", urgencyClass: "tt-chip-soft" };
  }
  return { urgencyLabel: null, urgencyClass: "" };
}

function humanCountdown(closingDate) {
  const now = new Date();
  const diffMs = closingDate - now;
  if (diffMs <= 0) return "Closed";
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `Closes in ${diffDays}d`;
  if (diffHours > 0) return `Closes in ${diffHours}h`;
  return `Closes in ${diffMins}m`;
}

/* ----------------- small components ----------------- */

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
