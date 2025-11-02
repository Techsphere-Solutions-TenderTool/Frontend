// src/components/UserPrefsSheet.jsx
import React, { useContext, useState, useEffect } from "react";
import { PrefsContext } from "../App.jsx";
import { useAuth } from "react-oidc-context";

export default function UserPrefsSheet({ onClose }) {
  const auth = useAuth();
  const ctx = useContext(PrefsContext);

  if (!ctx) return null;

  const { prefs, setPrefs, savedTenders, canSave } = ctx;

  const [form, setForm] = useState(prefs);

  useEffect(() => {
    setForm(prefs);
  }, [prefs]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    if (!auth.isAuthenticated) return;

    try {
      const payload = {
        email: auth.user?.profile?.email,
        location: form.location,
        categories: form.categories || []
      };

      await fetch(`${import.meta.env.VITE_TENDER_API_URL}/user/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth.user?.access_token
            ? `Bearer ${auth.user.access_token}`
            : ""
        },
        body: JSON.stringify(payload)
      });

      setPrefs(form);
      onClose?.();
      alert("Preferences saved successfully");
    } catch (err) {
      console.error("Failed to save prefs", err);
      alert("Error updating preferences.");
    }
  };

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
    "Electrical & Energy"
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-full max-w-md p-5 space-y-4" style={{ "--panel-bg": 0.15 }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-50">
            Your TenderTool Profile
          </h3>
          <button
            onClick={onClose}
            className="text-slate-200 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {!auth.isAuthenticated && (
          <p className="text-sm text-amber-100/90 bg-amber-500/10 border border-amber-200/30 rounded-md px-3 py-2">
            You are not logged in. Log in to save tenders and keep your preferences.
          </p>
        )}

        <div className="space-y-3">
          <label className="block text-xs uppercase text-slate-200/70">
            Name (optional)
            <input
              name="name"
              value={form.name || ""}
              onChange={onChange}
              className="input w-full mt-1"
              placeholder="e.g. Khatija"
            />
          </label>

          <label className="block text-xs uppercase text-slate-200/70">
            Location / Province
            <input
              name="location"
              value={form.location || ""}
              onChange={onChange}
              className="input w-full mt-1"
              placeholder="e.g. Durban, KZN"
            />
          </label>

          <label className="block text-xs uppercase text-slate-200/70">
            Notifications
            <select
              name="notifications"
              value={form.notifications || "none"}
              onChange={onChange}
              className="select dark-select w-full mt-1"
            >
              <option value="none">Don’t send me alerts</option>
              <option value="daily">Daily digest</option>
              <option value="closing">Only when a tender is closing</option>
            </select>
          </label>

          {/* ✅ Updated Tender Industry Categories */}
          <div className="mt-4">
            <label className="block text-xs uppercase text-slate-200/70 mb-1">
              Tender Categories (choose one or more)
            </label>

            {CATEGORIES.map((cat) => (
              <label key={cat} className="flex items-center gap-2 text-slate-200 text-sm mb-1">
                <input
                  type="checkbox"
                  checked={form.categories?.includes(cat) || false}
                  onChange={(e) => {
                    setForm((prev) => {
                      const current = new Set(prev.categories || []);
                      if (e.target.checked) current.add(cat);
                      else current.delete(cat);
                      return { ...prev, categories: [...current] };
                    });
                  }}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-200/70">
              Saved tenders
            </span>
            <span className="text-sm font-semibold text-slate-50">
              {savedTenders?.length ?? 0}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline ts text-sm">
            Cancel
          </button>
          <button
            onClick={onSave}
            className="btn btn-primary text-sm"
            disabled={!auth.isAuthenticated}
            title={auth.isAuthenticated ? "" : "Log in to save preferences"}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

