import React, { useEffect } from "react";
import useDebouncedValue from "../hooks/useDebouncedValue.js";

// Keep in sync with TendersPage.jsx
const CATEGORIES = [
  "Construction & Civil",
  "Distribution",
  "Generation",
  "Corporate",
  "Engineering",
  "IT & Software",
  "Security",
  "Cleaning & Hygiene",
  "Medical & Healthcare",
  "Consulting & Training",
  "Transport & Fleet",
  "Facilities & Maintenance",
  "Electrical & Energy",
];

// Normalization + category slugging to match TendersPage filtering
const norm = (v) =>
  String(v || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function categorySlug(s) {
  const n = norm(s);
  if (!n) return "";
  if (/(construction|civil)/.test(n)) return "construction-civil";
  if (/distribution/.test(n)) return "distribution";
  if (/generation/.test(n)) return "generation";
  if (/corporate/.test(n)) return "corporate";
  if (/engineering/.test(n)) return "engineering";
  if (/(it|software)/.test(n)) return "it-software";
  if (/security/.test(n)) return "security";
  if (/(clean|hygiene)/.test(n)) return "cleaning-hygiene";
  if (/(medical|health)/.test(n)) return "medical-healthcare";
  if (/(consult|training)/.test(n)) return "consulting-training";
  if (/(transport|fleet)/.test(n)) return "transport-fleet";
  if (/(facilit|maintain)/.test(n)) return "facilities-maintenance";
  if (/(electrical|energy)/.test(n)) return "electrical-energy";
  return n;
}

/**
 * TenderFilters
 * Props:
 *  - value:   { q, source, category, location, closingAfter, closingBefore, sort, page }
 *  - onChange(next)
 *  - defaults (optional): fully populated default filter object used by Reset
 */
export default function TenderFilters({ value, onChange, defaults }) {
  const {
    q = "",
    source = "",
    category = "",
    location = "",
    closingAfter = "",
    closingBefore = "",
    sort = "-published_at",
  } = value || {};

  // Debounce q (search)
  const debouncedQ = useDebouncedValue(q, 350);
  useEffect(() => {
    if (debouncedQ !== q) onChange({ ...value, q: debouncedQ, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const upd = (patch) => onChange({ ...value, ...patch });

  // Category select options use display labels, but we keep comparison stable by storing the label,
  // and letting TendersPage convert to slug during filtering (same as there).
  const handleCategory = (e) => {
    const label = e.target.value;
    // keep label in state; server/client filtering in TendersPage handles slug
    upd({ category: label, page: 1 });
  };

  return (
    <div className="glass-panel p-4 grid md:grid-cols-3 gap-3">
      {/* Search */}
      <input
        className="input input-bordered bg-white/10"
        placeholder="Search title/description/buyer…"
        value={q}
        onChange={(e) => upd({ q: e.target.value })}
      />

      {/* Publisher */}
      <select
        className="select select-bordered bg-white/10"
        value={source}
        onChange={(e) => upd({ source: e.target.value, page: 1 })}
      >
        <option value="">All publishers</option>
        <option value="etenders">National eTenders</option>
        <option value="eskom">ESKOM</option>
        <option value="sanral">SANRAL</option>
        <option value="transnet">Transnet</option>
      </select>

      {/* Category */}
      <select
        className="select select-bordered bg-white/10"
        value={category}
        onChange={handleCategory}
      >
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Location contains */}
      <input
        className="input input-bordered bg-white/10"
        placeholder="Location contains (e.g. Durban, KZN, Western Cape)"
        value={location}
        onChange={(e) => upd({ location: e.target.value, page: 1 })}
      />

      {/* Sort */}
      <select
        className="select select-bordered bg-white/10"
        value={sort}
        onChange={(e) => upd({ sort: e.target.value, page: 1 })}
      >
        <option value="-published_at">Newest</option>
        <option value="published_at">Oldest</option>
        <option value="closing_at">Closing soonest</option>
        <option value="-closing_at">Closing latest</option>
      </select>

      {/* Closing range */}
      <label className="flex items-center gap-2">
        <span className="w-28 opacity-80">Closing from</span>
        <input
          type="date"
          className="input input-bordered w-full bg-white/10"
          value={closingAfter}
          onChange={(e) => upd({ closingAfter: e.target.value, page: 1 })}
        />
      </label>

      <label className="flex items-center gap-2">
        <span className="w-28 opacity-80">Closing to</span>
        <input
          type="date"
          className="input input-bordered w-full bg-white/10"
          value={closingBefore}
          onChange={(e) => upd({ closingBefore: e.target.value, page: 1 })}
        />
      </label>

      {/* Footer actions */}
      <div className="col-span-full flex flex-wrap gap-2 justify-between">
        <div className="opacity-70 text-sm self-center">
          Tip: search waits for you to stop typing.
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() =>
              onChange(
                defaults || {
                  q: "",
                  source: "",
                  category: "",
                  location: "",
                  closingAfter: "",
                  closingBefore: "",
                  sort: "-published_at",
                  page: 1,
                }
              )
            }
          >
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
}
