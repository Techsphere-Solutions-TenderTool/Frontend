// src/pages/About.jsx
import React from "react";
import logo from "../assets/techsphere-logo.png";

export default function About() {
  return (
    <div className="space-y-8">
      {/* HERO / IDENTITY */}
      <div
        className="glass-panel rounded-2xl px-8 py-10 space-y-8"
        style={{ "--panel-bg": 0.1, "--panel-ol": 0.55, "--panel-thickness": "3px" }}
      >
        {/* top row: logo + text */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 lg:items-center">
          {/* BIG LOGO */}
          <div
            className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl bg-slate-950/50 border border-white/10 shadow-2xl flex items-center justify-center shrink-0"
          >
            <img
              src={logo}
              alt="Techsphere TenderTool"
              className="w-28 lg:w-32 object-contain drop-shadow-[0_0_18px_rgba(22,194,242,0.35)]"
            />
          </div>

          {/* text */}
          <div className="flex-1 space-y-3">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-100/80">
              Techsphere • TenderTool
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            </p>
            <h1 className="h1-pro leading-tight">About Techsphere TenderTool</h1>
            <p className="text-slate-100/85 max-w-2xl">
              Unified procurement intelligence for South African suppliers. We monitor the official
              sources, normalise the data, and make it usable for real teams.
            </p>
            <p className="text-xs text-slate-200/55">
              Durban, South Africa • Built on AWS • IIE Varsity College WIL project
            </p>
          </div>
        </div>

        {/* STATS ROW – put it UNDER, so it’s not squashed */}
        <div className="flex flex-wrap gap-4">
          <AboutStat
            label="Active sources"
            value="4+"
            hint="eTenders, Eskom, SANRAL, Transnet"
          />
          <AboutStat label="Refresh" value="Daily" hint="New & updated tenders" />
          <AboutStat label="Focus" value="South Africa" hint="Public / SOE tenders" />
        </div>
      </div>

      {/* WHY WE BUILT IT */}
      <div className="glass-panel p-8 space-y-3">
        <h2 className="text-2xl md:text-3xl font-semibold">Why we built it</h2>
        <p className="opacity-85 leading-relaxed">
          South African public-sector opportunities are fragmented — eTenders holds a lot, but many
          departments, metros and SOEs still publish on their own sub-sites. TenderTool pulls those
          locations into a single, searchable interface.
        </p>
      </div>

      {/* SOURCES */}
      <div className="glass-panel p-8 space-y-5">
        <h2 className="text-xl md:text-2xl font-semibold">Sources we unify right now</h2>
        <p className="text-slate-200/75">
          We started with the publishers teams in Durban & Gauteng work with most often.
        </p>
        <div className="flex flex-wrap gap-3">
          <SourceChip name="National eTenders" />
          <SourceChip name="Eskom Tender Bulletin" />
          <SourceChip name="SANRAL" />
          <SourceChip name="Transnet" />
          <SourceChip name="Municipal / ad-hoc (planned)" variant="muted" />
          <SourceChip name="Custom sources (on request)" variant="muted" />
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="glass-panel p-8 space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold">How TenderTool works</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <Step
            step="1"
            title="Collect"
            text="Bots / scrapers fetch from official portals on a schedule."
          />
          <Step
            step="2"
            title="Clean"
            text="We normalise fields like buyer, source, sector, location, deadlines."
          />
          <Step
            step="3"
            title="Enrich"
            text="We prepare the content for AI summaries and keyword search."
          />
          <Step
            step="4"
            title="Deliver"
            text="We show it in the web app, and will later send alerts / exports."
          />
        </div>
      </div>

      {/* DIFFERENTIATORS */}
      <div className="glass-panel p-8 space-y-5">
        <h2 className="text-xl md:text-2xl font-semibold">What makes us different</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DiffCard
            title="Built for SA format"
            text="Understands Department / Entity naming, odd locations, SCM-style notices."
          />
          <DiffCard
            title="Freshness first"
            text="Designed to re-fetch and spot closing-date changes."
          />
          <DiffCard
            title="Secure login"
            text="Uses AWS Cognito for authentication — no plain-text passwords."
          />
          <DiffCard
            title="Lecturer-backed"
            text="Developed as part of an IIE Varsity College WIL system."
          />
        </div>
      </div>

      {/* ROADMAP */}
      <div className="glass-panel p-8 space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold">What&apos;s coming next</h2>
        <p className="text-slate-200/75">
          We’re actively working on the user experience you saw on the Home page.
        </p>
        <ul className="space-y-2 text-sm">
          <RoadmapItem status="done" label="AI tender summariser" />
          <RoadmapItem status="progress" label="Analytics with Quicksight" />
          <RoadmapItem status="planned" label="More websites" />
          <RoadmapItem status="planned" label="AI Summarizer for Documents" />
          <RoadmapItem status="planned" label="Supplier profile (CSD / B-BBEE link)" />
        </ul>
      </div>

      {/* CONTACT STRIP */}
      <div className="glass-panel p-5 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
        <p className="text-slate-200/75">
          Need to add another publisher, or integrate with your internal system?
        </p>
        <p className="text-slate-50/90">
          Email: <span className="text-cyan-200">support@techsphere.africa</span>
        </p>
      </div>
    </div>
  );
}

/* ===== small components ===== */

function AboutStat({ label, value, hint }) {
  return (
    <div
      className="glass-panel p-4"
      style={{ "--panel-bg": 0.03, "--panel-ol": 0.25, "--panel-thickness": "2px" }}
    >
      <div className="text-2xl font-bold text-slate-50">{value}</div>
      <div className="text-[0.6rem] uppercase tracking-wide text-slate-200/50 mt-1">{label}</div>
      {hint ? <div className="text-[0.55rem] text-slate-200/35 mt-1">{hint}</div> : null}
    </div>
  );
}

function SourceChip({ name, variant = "normal" }) {
  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border backdrop-blur-sm";
  if (variant === "muted") {
    return (
      <span className={`${base} bg-white/0 border-white/5 text-slate-200/55`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400/40" />
        {name}
      </span>
    );
  }
  return (
    <span className={`${base} bg-cyan-500/10 border-cyan-300/30 text-cyan-50`}>
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-200" />
      {name}
    </span>
  );
}

function Step({ step, title, text }) {
  return (
    <div
      className="glass-panel p-4 space-y-2"
      style={{ "--panel-bg": 0.04, "--panel-ol": 0.25, "--panel-thickness": "2px" }}
    >
      <span className="inline-flex w-7 h-7 rounded-full bg-slate-950/35 border border-cyan-400/50 items-center justify-center text-xs font-semibold text-cyan-100">
        {step}
      </span>
      <div className="text-sm font-semibold text-slate-50">{title}</div>
      <p className="text-xs text-slate-200/65 leading-relaxed">{text}</p>
    </div>
  );
}

function DiffCard({ title, text }) {
  return (
    <div
      className="glass-panel p-4 space-y-2"
      style={{ "--panel-bg": 0.03, "--panel-ol": 0.18, "--panel-thickness": "2px" }}
    >
      <div className="text-sm font-semibold text-slate-50">{title}</div>
      <p className="text-xs text-slate-200/65 leading-relaxed">{text}</p>
    </div>
  );
}

function RoadmapItem({ status, label }) {
  let dot = "bg-slate-500/40";
  if (status === "done") dot = "bg-emerald-400";
  if (status === "progress") dot = "bg-amber-300";
  return (
    <li className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      <span className="text-slate-100/85">{label}</span>
      {status === "done" && (
        <span className="text-[0.6rem] uppercase tracking-wide text-emerald-200/80">done</span>
      )}
      {status === "progress" && (
        <span className="text-[0.6rem] uppercase tracking-wide text-amber-200/80">
          in progress
        </span>
      )}
    </li>
  );
}
