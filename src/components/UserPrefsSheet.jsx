// src/components/UserPrefsSheet.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { PrefsContext } from "../contexts/PrefsContext.js";
import { useAuth } from "react-oidc-context";

export default function UserPrefsSheet({ onClose }) {
  const auth = useAuth();

  // Hooks must always be called – even if context is missing.
  const ctx = useContext(PrefsContext);

  const [form, setForm] = useState({
    name: "",
    location: "",
    notifications: "none",
    categories: [],
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { prefs, setPrefs, savedTenders } = ctx || {};

  // Keep form in sync with global prefs safely
  useEffect(() => {
    if (ctx && prefs) {
      setForm(prefs);
    }
  }, [ctx, prefs]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = async () => {
    if (!auth.isAuthenticated) {
      setErrorMsg("You must be logged in to save preferences.");
      return;
    }

    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload = {
        email: auth.user?.profile?.email,
        location: form.location,
        notifications: form.notifications,
        name: form.name,
        categories: form.categories || [],
      };

      const res = await fetch(`${import.meta.env.VITE_TENDER_API_URL}/user/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: auth.user?.access_token ? `Bearer ${auth.user.access_token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setSaving(false);
        setErrorMsg("Server rejected the update. Please try again.");
        return;
      }

      setPrefs(form);
      setSuccessMsg("Preferences saved successfully ");
      setSaving(false);

      setTimeout(() => {
        setSuccessMsg("");
        onClose?.();
      }, 1800);
    } catch (err) {
      console.error("Failed to save prefs", err);
      setSaving(false);
      setErrorMsg("Error updating preferences. Please try again.");
    }
  };

  // Memoized list
  const CATEGORIES = useMemo(
    () => [
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
    ],
    []
  );

  //  Safe context check AFTER hooks - updated 
  if (!ctx) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-3">
      <div
        className="glass-panel w-full max-w-3xl p-6 space-y-5 rounded-2xl border border-cyan-400/15 shadow-2xl"
        style={{ "--panel-bg": 0.15 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-50">Your TenderTool Profile</h3>
            <p className="text-slate-200/60 text-sm mt-1">
              Tell us what province and categories you care about and we’ll show you the right
              tenders.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-200 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        {!auth.isAuthenticated && (
          <p className="text-sm text-amber-100/90 bg-amber-500/10 border border-amber-200/30 rounded-md px-3 py-2">
            You are not logged in. Log in to save tenders and keep your preferences.
          </p>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-300/30 text-emerald-100 text-sm px-3 py-2 rounded-md">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-300/30 text-red-100 text-sm px-3 py-2 rounded-md">
            {errorMsg}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xs uppercase text-slate-200/70 tracking-wide">
              Name (optional)
              <input
                name="name"
                value={form.name || ""}
                onChange={onChange}
                className="input w-full mt-1"
                placeholder="e.g. Khatija"
              />
            </label>

            <label className="block text-xs uppercase text-slate-200/70 tracking-wide">
              Location / Province
              <input
                name="location"
                value={form.location || ""}
                onChange={onChange}
                className="input w-full mt-1"
                placeholder="e.g. Durban, KZN"
              />
            </label>

            <label className="block text-xs uppercase text-slate-200/70 tracking-wide">
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

            <div className="bg-slate-900/40 rounded-lg p-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase text-slate-200/70">Saved tenders</span>
                <span className="text-sm font-semibold text-slate-50">{savedTenders?.length ?? 0}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-200/70 mb-2 tracking-wide">
              Tender Categories (choose one or more)
            </label>

            <div className="max-h-60 overflow-y-auto pr-2 space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                {CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-slate-200 text-sm">
                    <input
                      type="checkbox"
                      className="accent-cyan-400"
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
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn btn-outline ts text-sm">
            Cancel
          </button>
          <button
            onClick={onSave}
            className="btn btn-primary text-sm"
            disabled={!auth.isAuthenticated || saving}
            title={auth.isAuthenticated ? "" : "Log in to save preferences"}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

