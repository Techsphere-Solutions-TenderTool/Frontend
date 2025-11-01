// src/components/UserPrefsSheet.jsx
import React, { useContext, useState, useEffect } from "react";
import { PrefsContext } from "../App.jsx";
import { useAuth } from "react-oidc-context";

export default function UserPrefsSheet({ onClose }) {
  const auth = useAuth();
  const ctx = useContext(PrefsContext);

  // if for some reason context is missing
  if (!ctx) {
    return null;
  }

  const {
    prefs,
    setPrefs,
    savedTenders,
    canSave,
  } = ctx;

  // local draft so we don't update context on every keystroke
  const [form, setForm] = useState(prefs);

  useEffect(() => {
    setForm(prefs);
  }, [prefs]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSave = () => {
    // push to context (this will also persist to localStorage from App.jsx)
    setPrefs(form);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-full max-w-md p-5 space-y-4" style={{ "--panel-bg": 0.15 }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-50">
            Your TenderTool profile
          </h3>
          <button
            onClick={onClose}
            className="text-slate-200 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* if not logged in */}
        {!auth.isAuthenticated && (
          <p className="text-sm text-amber-100/90 bg-amber-500/10 border border-amber-200/30 rounded-md px-3 py-2">
            You are not logged in. Log in to save tenders and keep your
            preferences.
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
        </div>

        {/* saved tenders overview */}
        <div className="bg-slate-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-slate-200/70">
              Saved tenders
            </span>
            <span className="text-sm font-semibold text-slate-50">
              {savedTenders?.length ?? 0}
            </span>
          </div>
          <p className="text-[0.7rem] text-slate-300/60 mt-1">
            These are stored per account. You can save from the tender list /
            detail screen.
          </p>
          {!canSave && (
            <p className="text-[0.65rem] text-amber-200/90 mt-2">
              Log in to enable saving.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline ts text-sm">
            Cancel
          </button>
          <button
            onClick={onSave}
            className="btn btn-primary text-sm"
            disabled={!auth.isAuthenticated}
            title={
              auth.isAuthenticated
                ? ""
                : "Log in to save preferences"
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
