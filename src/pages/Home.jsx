import React from "react";

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div
        className="glass-panel p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 glow-inner rounded-xl"
        style={{ '--panel-bg': .10, '--panel-ol': .60, '--panel-thickness': '3px' }}
      >
        <div className="max-w-2xl">
          <h1 className="h1-pro">
            Techsphere <span className="sr-only"> </span>TenderTool
          </h1>
          <p className="mt-3 text-lg opacity-90">
            AI-assisted discovery, filtering, and analysis of South African public-sector tenders —
            unified from multiple issuers into one fast, beautiful interface.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="/tenders" className="btn btn-primary glow-cta">Browse Tenders</a>
            <a href="/contact" className="btn btn-outline ts">Talk to Us</a>
          </div>
        </div>
        <img src="/techsphere-logo.png" alt="Techsphere Solutions" className="h-24 w-24 md:h-32 md:w-32" />
      </div>

      {/* Value props */}
      <div className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          title="Multi-Source Coverage"
          desc="eTenders, Eskom, SANRAL and Transnet in one place, with consistent fields for searching and sorting."
          tag="Sources"
        />
        <FeatureCard
          title="Smart Filters"
          desc="Search by free text, buyer, source, status and date windows; sort by closing or published dates."
          tag="Filtering"
        />
        <FeatureCard
          title="Instant Details"
          desc="Open any tender to view documents and contact information neatly organized into cards."
          tag="Details"
        />
      </div>

      {/* Explainer */}
      <div className="glass-panel p-6">
        <h2 className="text-xl md:text-2xl font-semibold">Why TenderTool?</h2>
        <p className="mt-2 opacity-90">
          Government and state-owned entities publish tenders on different websites with different
          structures, which makes discovery and analysis hard. TenderTool centralizes that process
          and surfaces insights so suppliers can respond quickly and teams make better bid/no-bid
          decisions.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ title, desc, tag }) {
  const tagClass =
    tag === "Sources"   ? "chip chip-cyan" :
    tag === "Filtering" ? "chip chip-blue" :
    tag === "Details"   ? "chip chip-magenta" : "chip chip-violet";

  return (
    <div
      className="glass-panel p-5"
      style={{ '--panel-bg': .11, '--panel-ol': .52, '--panel-thickness': '2px' }}
    >
      <div className={tagClass}>{tag}</div>
      <h3 className="text-lg md:text-xl font-semibold text-slate-100 mt-2">{title}</h3>
      <p className="mt-1 text-slate-300">{desc}</p>
    </div>
  );
}
