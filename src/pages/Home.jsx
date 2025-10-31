// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { listTenders } from "../lib/api";
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
} from "recharts";

export default function Home() {
  const [tenders, setTenders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedBuyers, setSelectedBuyers] = useState(new Set());

  useEffect(() => {
    async function fetchAllTenders() {
      try {
        const resp = await listTenders({ limit: 200, offset: 0 });
        if (!resp || typeof resp !== "object") {
          throw new Error("Invalid API response — expected JSON");
        }

        const items = resp.items ?? resp.results ?? resp ?? [];
        setTenders(items);
        setTotal(resp.total ?? items.length);
        
        // Initialize all categories and buyers as selected
        const allCategories = new Set(items.map(t => t.category || "Uncategorized"));
        const allBuyers = new Set(items.map(t => t.buyer || "Unknown Buyer"));
        setSelectedCategories(allCategories);
        setSelectedBuyers(allBuyers);
        
        setLoading(false);
      } catch (err) {
        console.error("API Error:", err);
        setError(err.message);
        setLoading(false);
      }
    }

    fetchAllTenders();
  }, []);

  // 🧮 Aggregate stats
  const openTenders = tenders.filter((t) => t.status === "Open").length;
  const closingSoon = tenders.filter((t) => t.status === "Closing Soon").length;

  const allTendersByCategory = Object.entries(
    tenders.reduce((acc, t) => {
      const key = t.category || "Uncategorized";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Filter categories based on selection
  const tendersByCategory = allTendersByCategory.filter(item => 
    selectedCategories.has(item.name)
  );

  const allTendersByBuyer = Object.entries(
    tenders.reduce((acc, t) => {
      const key = t.buyer || "Unknown Buyer";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Filter buyers based on selection
  const tendersByBuyer = allTendersByBuyer.filter(item => 
    selectedBuyers.has(item.name)
  );

  const tendersByLocation = Object.entries(
    tenders.reduce((acc, t) => {
      const key = t.location || "Unknown Location";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899"];

  // Toggle category selection
  const toggleCategory = (categoryName) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // Toggle buyer selection
  const toggleBuyer = (buyerName) => {
    setSelectedBuyers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(buyerName)) {
        newSet.delete(buyerName);
      } else {
        newSet.add(buyerName);
      }
      return newSet;
    });
  };

  // Get color for a specific category
  const getCategoryColor = (categoryName) => {
    const index = allTendersByCategory.findIndex(item => item.name === categoryName);
    return COLORS[index % COLORS.length];
  };

  // Get color for a specific buyer
  const getBuyerColor = (buyerName) => {
    const index = allTendersByBuyer.findIndex(item => item.name === buyerName);
    return COLORS[index % COLORS.length];
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div
        className="glass-panel p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 glow-inner rounded-xl"
        style={{ "--panel-bg": 0.1, "--panel-ol": 0.6, "--panel-thickness": "3px" }}
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
            <a href="/tenders" className="btn btn-primary glow-cta">
              Browse Tenders
            </a>
            <a href="/contact" className="btn btn-outline ts">
              Talk to Us
            </a>
          </div>
        </div>
        <img
          src="/techsphere-logo.png"
          alt="Techsphere Solutions"
          className="h-24 w-24 md:h-32 md:w-32"
        />
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

      {/* 📊 Dashboard Section */}
      <div className="glass-panel p-8 rounded-xl mt-10 space-y-8">
        <h2 className="text-2xl font-semibold text-slate-100">
          Tender Statistics Overview
        </h2>

        {loading ? (
          <p className="text-gray-400 text-lg">Loading dashboard...</p>
        ) : error ? (
          <p className="text-red-400">Error: {error}</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="Total Tenders" value={total} color="indigo" />
              <StatCard title="Open Tenders" value={openTenders} color="green" />
              <StatCard title="Closing Soon" value={closingSoon} color="yellow" />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Published Status (Bar) */}
              <ChartPanel title="Tenders by Published Status">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: "Open", value: openTenders },
                      { name: "Closing Soon", value: closingSoon },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#4F46E5" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              {/* Category (Pie) with Custom Legend */}
              <ChartPanel title="Tenders by Category">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={tendersByCategory}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {tendersByCategory.map((entry) => (
                            <Cell 
                              key={entry.name} 
                              fill={getCategoryColor(entry.name)} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom Interactive Legend */}
                  <div className="lg:w-48 space-y-2">
                    {allTendersByCategory.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => toggleCategory(item.name)}
                        className={`w-full flex items-center gap-2 p-2 rounded transition-all text-left ${
                          selectedCategories.has(item.name)
                            ? 'bg-white/10 opacity-100'
                            : 'bg-white/5 opacity-40'
                        } hover:bg-white/15`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCategoryColor(item.name) }}
                        />
                        <span className="text-xs text-slate-100 flex-1">
                          {item.name}
                        </span>
                        <span className="text-xs text-slate-300 font-semibold">
                          {item.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </ChartPanel>

              {/* Buyer (Pie) with Custom Legend */}
              <ChartPanel title="Tenders by Buyer">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={tendersByBuyer}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={100}
                          label
                        >
                          {tendersByBuyer.map((entry) => (
                            <Cell 
                              key={entry.name} 
                              fill={getBuyerColor(entry.name)} 
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom Interactive Legend */}
                  <div className="lg:w-48 space-y-2">
                    {allTendersByBuyer.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => toggleBuyer(item.name)}
                        className={`w-full flex items-center gap-2 p-2 rounded transition-all text-left ${
                          selectedBuyers.has(item.name)
                            ? 'bg-white/10 opacity-100'
                            : 'bg-white/5 opacity-40'
                        } hover:bg-white/15`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getBuyerColor(item.name) }}
                        />
                        <span className="text-xs text-slate-100 flex-1">
                          {item.name}
                        </span>
                        <span className="text-xs text-slate-300 font-semibold">
                          {item.value}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </ChartPanel>

              {/* Location (Pie) - No Legend */}
              <ChartPanel title="Tenders by Location">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tendersByLocation}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      {tendersByLocation.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ title, desc, tag }) {
  const tagClass =
    tag === "Sources"
      ? "chip chip-cyan"
      : tag === "Filtering"
      ? "chip chip-blue"
      : tag === "Details"
      ? "chip chip-magenta"
      : "chip chip-violet";

  return (
    <div
      className="glass-panel p-5"
      style={{ "--panel-bg": 0.11, "--panel-ol": 0.52, "--panel-thickness": "2px" }}
    >
      <div className={tagClass}>{tag}</div>
      <h3 className="text-lg md:text-xl font-semibold text-slate-100 mt-2">
        {title}
      </h3>
      <p className="mt-1 text-slate-300">{desc}</p>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colorMap = {
    indigo: "bg-indigo-100 text-indigo-900",
    green: "bg-green-100 text-green-900",
    yellow: "bg-yellow-100 text-yellow-900",
  };
  return (
    <div className={`rounded-xl shadow p-6 text-center ${colorMap[color]}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-slate-100">{title}</h3>
      {children}
    </div>
  );
}