// src/pages/Stats.jsx
import { getStats } from "../lib/api";
import React, { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
// if you already have this hook/context, use it; if not, you can remove the login-aware bits
import { useAuth } from "../contexts/AuthContext";

// helper: map raw location text to a SA province
function classifyProvince(raw) {
  if (!raw || !raw.trim()) return "Not specified";
  const text = raw.toLowerCase();

  // western cape
  if (
    text.includes("western cape") ||
    text.includes("cape town") ||
    text.includes("stellenbosch") ||
    text.includes("paarl") ||
    text.includes("george")
  ) {
    return "Western Cape";
  }

  // eastern cape
  if (
    text.includes("eastern cape") ||
    text.includes("gqeberha") ||
    text.includes("port elizabeth") ||
    text.includes("east london") ||
    text.includes("mthatha")
  ) {
    return "Eastern Cape";
  }

  // northern cape
  if (
    text.includes("northern cape") ||
    text.includes("kimberley") ||
    text.includes("upington")
  ) {
    return "Northern Cape";
  }

  // kwazulu-natal
  if (
    text.includes("kwazulu") ||
    text.includes("kzn") ||
    text.includes("kwa zulu") ||
    text.includes("durban") ||
    text.includes("pietermaritzburg") ||
    text.includes("umhlanga")
  ) {
    return "KwaZulu-Natal";
  }

  // gauteng
  if (
    text.includes("gauteng") ||
    text.includes("johannesburg") ||
    text.includes("sandton") ||
    text.includes("pretoria") ||
    text.includes("tshwane") ||
    text.includes("ekurhuleni") ||
    text.includes("soweto") ||
    text.includes("midrand")
  ) {
    return "Gauteng";
  }

  // free state
  if (
    text.includes("free state") ||
    text.includes("bloemfontein") ||
    text.includes("mangaung")
  ) {
    return "Free State";
  }

  // mpumalanga
  if (
    text.includes("mpumalanga") ||
    text.includes("nelspruit") ||
    text.includes("mbombela") ||
    text.includes("witbank")
  ) {
    return "Mpumalanga";
  }

  // limpopo
  if (
    text.includes("limpopo") ||
    text.includes("polokwane") ||
    text.includes("thohoyandou")
  ) {
    return "Limpopo";
  }

  // north west
  if (
    text.includes("north west") ||
    text.includes("mahikeng") ||
    text.includes("mafikeng") ||
    text.includes("klerksdorp") ||
    text.includes("rustenburg")
  ) {
    return "North West";
  }

  // if nothing matched
  return "Other";
}

const PROVINCE_ORDER = [
  "Gauteng",
  "KwaZulu-Natal",
  "Western Cape",
  "Eastern Cape",
  "Free State",
  "Mpumalanga",
  "Limpopo",
  "North West",
  "Northern Cape",
  "Other",
  "Not specified",
];

// map source ids to names
function prettySource(idOrName) {
  if (!idOrName) return "Unknown source";
  // numeric ids from your DB
  if (idOrName === "2" || idOrName === 2) return "Eskom";
  if (idOrName === "4" || idOrName === 4) return "Transnet";
  if (idOrName === "3" || idOrName === 3) return "SANRAL";
  // if your scrapers start sending real names, just return that
  return typeof idOrName === "string" && idOrName.length > 2
    ? idOrName
    : `Source ${idOrName}`;
}

const COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#E11D48",
];

export default function Stats() {
  const { user } = useAuth?.() || { user: null };

  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // for province chart (option A)
  const [provinceCounts, setProvinceCounts] = useState(null);

  // focus
  const [focus, setFocus] = useState(() => {
    // you can later load user prefs from API
    return ["Services", "Construction", "KwaZulu-Natal"];
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // 1) get AWS aggregated stats
        const res = await fetch(
          import.meta.env.VITE_API_BASE_URL + "/stats"
        );
        if (!res.ok) throw new Error("Could not load stats");
        const json = await res.json();
        if (!cancelled) {
          setStats(json);
        }

        // 2) OPTIONAL: get some tenders to guess provinces
        // we only do this to make the province chart look nice
        try {
          const res2 = await fetch(
            import.meta.env.VITE_API_BASE_URL + "/tenders?limit=200&offset=0"
          );
          if (res2.ok) {
            const json2 = await res2.json();
            const items =
              json2.items || json2.results || (Array.isArray(json2) ? json2 : []);
            const bucket = {};
            for (const t of items) {
              const prov = classifyProvince(t.location);
              bucket[prov] = (bucket[prov] || 0) + 1;
            }
            // ensure all 9 provinces exist
            for (const p of PROVINCE_ORDER) {
              if (!bucket[p]) bucket[p] = 0;
            }
            if (!cancelled) setProvinceCounts(bucket);
          }
        } catch (e) {
          // if province fetch fails, we just don't show that chart
          console.warn("Could not load tenders for province stats:", e.message);
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setErr(e.message);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // derived data
  const byCategory = useMemo(() => {
    if (!stats?.by_category) return [];
    // group tail into "Other"
    const sorted = [...stats.by_category].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const otherCount = rest.reduce((sum, r) => sum + r.count, 0);
    if (otherCount > 0) {
      top.push({ category: "Other categories", count: otherCount });
    }
    return top;
  }, [stats]);

  const bySource = useMemo(() => {
    if (!stats?.by_source) return [];
    return stats.by_source.map((s, idx) => ({
      name: prettySource(s.source),
      value: s.count,
      color: COLORS[idx % COLORS.length],
    }));
  }, [stats]);

  const provinceData = useMemo(() => {
    if (!provinceCounts) return null;
    return PROVINCE_ORDER.map((p, idx) => ({
      name: p,
      value: provinceCounts[p] || 0,
      fill: COLORS[idx % COLORS.length],
    }));
  }, [provinceCounts]);

  // tiny line chart data (closing pressure)
  const closingData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Today", value: stats.closing_1d || 0 },
      { name: "Next 7 days", value: stats.closing_7d || 0 },
      { name: "All open", value: stats.open || 0 },
    ];
  }, [stats]);

  const toggleFocus = (item) => {
    setFocus((prev) =>
      prev.includes(item)
        ? prev.filter((x) => x !== item)
        : [...prev, item]
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div
          className="glass-panel p-8 rounded-xl"
          style={{ "--panel-bg": 0.08, "--panel-ol": 0.4 }}
        >
          <h1 className="h1-pro">Live Tender Insights</h1>
          <p className="opacity-70 mt-2">Loading latest data…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-6">
        <div
          className="glass-panel p-8 rounded-xl"
          style={{ "--panel-bg": 0.08, "--panel-ol": 0.4 }}
        >
          <h1 className="h1-pro">Live Tender Insights</h1>
          <p className="text-red-300 mt-3">
            We couldn’t load the stats right now. Please try again in a bit.
          </p>
        </div>
      </div>
    );
  }

  const generatedAt = stats?.generated_at
    ? new Date(stats.generated_at).toLocaleString()
    : "—";

  return (
    <div className="space-y-8">
      {/* hero */}
      <div
        className="glass-panel p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 rounded-xl"
        style={{ "--panel-bg": 0.1, "--panel-ol": 0.6, "--panel-thickness": "3px" }}
      >
        <div>
          <h1 className="h1-pro">Live Tender Insights</h1>
          <p className="mt-2 opacity-90">
            Overview of current public-sector opportunities across your connected sources.
          </p>
          <p className="mt-3 text-xs uppercase tracking-wide opacity-60">
            Data refreshed daily · Last build: {generatedAt}
          </p>
        </div>
        <img
          src="/techsphere-logo.png"
          alt="Techsphere Solutions"
          className="h-20 w-20 md:h-28 md:w-28 opacity-95"
        />
      </div>

      {/* My focus (only if logged in) */}
      {user && (
        <div
          className="glass-panel p-5 rounded-xl"
          style={{ "--panel-bg": 0.08, "--panel-ol": 0.45 }}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Your focus areas
            </h2>
            <p className="text-xs opacity-60">Click to toggle highlights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Services", "Construction", "Goods & Services", "KZN", "Gauteng"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => toggleFocus(item)}
                  className={`px-3 py-1 rounded-full text-sm transition ${
                    focus.includes(item)
                      ? "bg-teal-500/90 text-slate-950"
                      : "bg-slate-900/40 text-slate-100"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid md:grid-cols-4 gap-6">
        <KpiCard
          title="Total opportunities"
          value={stats?.total ?? 0}
          desc="All tenders currently in the system."
        />
        <KpiCard
          title="Open right now"
          value={stats?.open ?? 0}
          desc="Still accepting bids."
        />
        <KpiCard
          title="Closing today"
          value={stats?.closing_1d ?? 0}
          desc="Action these first."
          tone="warning"
        />
        <KpiCard
          title="Closing in 7 days"
          value={stats?.closing_7d ?? 0}
          desc="Plan your week around these."
          tone="accent"
        />
      </div>

      {/* main chart area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* by category */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-100">
              Opportunities by sector / category
            </h2>
            <span className="text-xs opacity-60">Top sectors today</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" stroke="#cbd5f5" />
                <YAxis
                  dataKey="category"
                  type="category"
                  stroke="#cbd5f5"
                  width={140}
                />
                <Tooltip
                  contentStyle={{ background: "#020617", border: "1px solid #0f172a" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                  {byCategory.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={
                        focus.some((f) =>
                          entry.category?.toLowerCase().includes(f.toLowerCase())
                        )
                          ? "#14B8A6"
                          : COLORS[index % COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs opacity-70">
            These are the sectors publishing the most opportunities right now. Focus sectors you
            selected are highlighted in teal.
          </p>
          <LegendLike
            items={byCategory.map((c, idx) => ({
              label: c.category,
              color: COLORS[idx % COLORS.length],
            }))}
          />
        </div>

        {/* by source */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Top issuing bodies</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bySource}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={80}
                  label
                >
                  {bySource.map((entry, idx) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#020617", border: "1px solid #0f172a" }}
                  labelStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs opacity-70">
            Biggest contributors right now. If you mostly work with Eskom or Transnet, check these
            daily.
          </p>
          <LegendLike items={bySource} />
        </div>
      </div>

      {/* second row: closing pressure + province */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* closing pressure (line) */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Closing pressure</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={closingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="#cbd5f5" />
                <YAxis stroke="#cbd5f5" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#020617", border: "1px solid #0f172a" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#14B8A6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#14B8A6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs opacity-70">
            This shows how many tenders are expiring soon. When “Today” or “Next 7 days” spikes,
            prioritise those.
          </p>
        </div>

        {/* provinces */}
        {provinceData ? (
          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-100">Where tenders are based</h2>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={provinceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" stroke="#cbd5f5" angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke="#cbd5f5" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#020617", border: "1px solid #0f172a" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {provinceData.map((p, idx) => (
                      <Cell key={p.name} fill={p.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs opacity-70">
              Provinces are estimated from the tender location text. “Other” covers towns not mapped
              to a province, and “Not specified” are tenders without a location.
            </p>
          </div>
        ) : (
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-slate-100">Where tenders are based</h2>
            <p className="text-sm opacity-60 mt-2">
              Couldn’t load location-based stats right now.
            </p>
          </div>
        )}
      </div>

      {/* export / table */}
      <div
        className="glass-panel p-5 rounded-xl flex flex-col md:flex-row items-center md:justify-between gap-4"
        style={{ "--panel-bg": 0.07, "--panel-ol": 0.38 }}
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Need to share this with your team?
          </h3>
          <p className="text-xs opacity-60">
            Download the raw counts or print this page as a report.
          </p>
        </div>
        <div className="flex gap-3">
          {user ? (
            <>
              <button className="btn btn-outline ts text-sm">Download CSV</button>
              <button
                className="btn btn-primary glow-cta text-sm"
                onClick={() => window.print()}
              >
                Print snapshot
              </button>
            </>
          ) : (
            <p className="text-xs opacity-70">
              Sign in to export
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, desc, tone = "default" }) {
  const toneClass =
    tone === "warning"
      ? "bg-amber-500/10 border-amber-400/30"
      : tone === "accent"
      ? "bg-teal-500/10 border-teal-400/30"
      : "bg-slate-900/20 border-white/10";
  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{title}</p>
      <p className="text-3xl font-bold mt-2 text-slate-50">{value}</p>
      <p className="text-xs opacity-60 mt-2">{desc}</p>
      <p className="text-[10px] opacity-40 mt-3">Data refreshed daily</p>
    </div>
  );
}

function LegendLike({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {items.map((it) => (
        <div key={it.label || it.name} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ background: it.color || "#fff" }}
          />
          <span className="text-xs opacity-80">{it.label || it.name}</span>
        </div>
      ))}
    </div>
  );
}
