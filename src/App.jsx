// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import Navbar from "./components/Navbar.jsx";
import UserPrefsSheet from "./components/UserPrefsSheet.jsx";

import Home from "./pages/Home.jsx";
import TendersPage from "./routes/TendersPage.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";

export const PrefsContext = React.createContext(null);

export default function App() {
  const auth = useAuth();

  const [showPrefs, setShowPrefs] = useState(false);

  const [prefs, setPrefs] = useState({
    name: "",
    location: "",
    notifications: "none",
    categories: []
  });

  const [savedTenders, setSavedTenders] = useState([]);

  const storageKey = auth.isAuthenticated
    ? `tt_prefs_${auth.user?.profile?.email ?? "user"}`
    : null;
  const savedKey = auth.isAuthenticated
    ? `tt_saved_${auth.user?.profile?.email ?? "user"}`
    : null;

  // ✅ Load prefs on login (DB first, then localStorage)
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setPrefs({
        name: "",
        location: "",
        notifications: "none",
        categories: []
      });
      setSavedTenders([]);
      return;
    }

    // ✅ Load from localStorage first
    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setPrefs((prev) => ({ ...prev, ...parsed }));
        } catch (_) {}
      }
    }

    if (savedKey) {
      const rawSaved = localStorage.getItem(savedKey);
      if (rawSaved) {
        try {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) setSavedTenders(parsed);
        } catch (_) {}
      }
    }

    // ✅ Then pull from backend database
    async function loadBackendPrefs() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_TENDER_API_URL}/user/preferences?email=${auth.user?.profile?.email}`,
          {
            headers: {
              Authorization: auth.user?.access_token
                ? `Bearer ${auth.user.access_token}`
                : ""
            }
          }
        );

        const data = await res.json();

        if (data) {
          setPrefs((prev) => ({
            ...prev,
            location: data.location || "",
            categories: data.categories || []
          }));
        }
      } catch (err) {
        console.error("Failed to load backend prefs", err);
      }
    }

    loadBackendPrefs();
  }, [auth.isAuthenticated, storageKey, savedKey]);

  // ✅ Persist updates to localStorage
  useEffect(() => {
    if (auth.isAuthenticated && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    }
  }, [prefs, auth.isAuthenticated, storageKey]);

  useEffect(() => {
    if (auth.isAuthenticated && savedKey) {
      localStorage.setItem(savedKey, JSON.stringify(savedTenders));
    }
  }, [savedTenders, auth.isAuthenticated, savedKey]);

  const ctxValue = useMemo(
    () => ({
      prefs,
      setPrefs,
      savedTenders,
      setSavedTenders,
      addSavedTender: (id) => {
        if (!id) return;
        setSavedTenders((cur) =>
          cur.includes(id) ? cur : [...cur, id]
        );
      },
      removeSavedTender: (id) => {
        if (!id) return;
        setSavedTenders((cur) => cur.filter((x) => x !== id));
      },
      canSave: auth.isAuthenticated,
      openPrefs: () => setShowPrefs(true),
    }),
    [prefs, savedTenders, auth.isAuthenticated]
  );

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-100 bg-tech-pro">
        Signing you in…
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-red-200 bg-slate-950">
        <p>Auth error: {auth.error.message}</p>
        <button onClick={() => auth.signinRedirect()} className="btn btn-primary">
          Try sign in again
        </button>
      </div>
    );
  }

  return (
    <PrefsContext.Provider value={ctxValue}>
      <BrowserRouter>
        <div className="min-h-screen bg-tech-pro">
          <Navbar onOpenPrefs={() => setShowPrefs(true)} />
          <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tenders" element={<TendersPage />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Routes>
          </main>
        </div>

        {showPrefs && (
          <UserPrefsSheet onClose={() => setShowPrefs(false)} />
        )}
      </BrowserRouter>
    </PrefsContext.Provider>
  );
}

