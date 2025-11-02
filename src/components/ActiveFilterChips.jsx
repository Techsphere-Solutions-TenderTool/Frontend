import React from "react";

// Chips for the filters used on TendersPage
// Expects: { q, source, category, location, closingAfter, closingBefore, sort, page }
export default function ActiveFilterChips({ filters, onChange }) {
  const labelMap = {
    q: "Query",
    source: "Publisher",
    category: "Category",
    location: "Location",
    closingAfter: "Closing from",
    closingBefore: "Closing to",
  };

  const entries = Object.entries(filters).filter(([k, v]) =>
    ["q", "source", "category", "location", "closingAfter", "closingBefore"].includes(k) &&
    v != null &&
    String(v).trim() !== ""
  );

  if (!entries.length) return null;

  function clearKey(k) {
    const next = { ...filters, [k]: "", page: 1 };
    onChange(next);
  }

  function clearAll() {
    const next = {
      ...filters,
      q: "",
      source: "",
      category: "",
      location: "",
      closingAfter: "",
      closingBefore: "",
      page: 1,
    };
    onChange(next);
  }

  return (
    <div className="glass-panel p-3 flex flex-wrap gap-2 items-center">
      {entries.map(([k, v]) => (
        <span key={k} className="badge badge-outline brand gap-1 px-3 py-2">
          <span className="opacity-80">{labelMap[k]}:</span>{" "}
          <strong>{String(v)}</strong>
          <button
            className="ml-1 btn btn-xs btn-ghost"
            onClick={() => clearKey(k)}
            aria-label={`Clear ${labelMap[k]}`}
            title={`Clear ${labelMap[k]}`}
          >
            ×
          </button>
        </span>
      ))}
      <button className="btn btn-xs btn-outline ts ml-auto" onClick={clearAll}>
        Clear all
      </button>
    </div>
  );
}
