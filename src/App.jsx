// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import Navbar from "./components/Navbar.jsx";
import UserPrefsSheet from "./components/UserPrefsSheet.jsx";
import TenderDetailsPage from "./routes/TenderDetailsPage.jsx";
import Home from "./pages/Home.jsx";
import TendersPage from "./routes/TendersPage.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";

// ⬅️ context is now in its own file (fixes react-refresh rule)
import { PrefsContext } from "./contexts/PrefsContext.js";

export default function App() {
  const auth = useAuth();

  const [showPrefs, setShowPrefs] = useState(false);

  const [prefs, setPrefs] = useState({
    name: "",
    location: "",
    notifications: "none",
    categories: [],
  });

  const [savedTenders, setSavedTenders] = useState([]);

  const email = auth.user?.profile?.email ?? "user";
  const accessToken = auth.user?.access_token ?? "";

  const storageKey = auth.isAuthenticated ? `tt_prefs_${email}` : null;
  const savedKey = auth.isAuthenticated ? `tt_saved_${email}` : null;

  // Load prefs & saved tenders (localStorage first, then backend)
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setPrefs({
        name: "",
        location: "",
        notifications: "none",
        categories: [],
      });
      setSavedTenders([]);
      return;
    }

    // localStorage → prefs
    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setPrefs((prev) => ({ ...prev, ...parsed }));
        } catch (err) {
          console.warn("Failed to parse local prefs", err);
        }
      }
    }

    // localStorage → saved tenders
    if (savedKey) {
      const rawSaved = localStorage.getItem(savedKey);
      if (rawSaved) {
        try {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) setSavedTenders(parsed);
        } catch (err) {
          console.warn("Failed to parse saved tenders", err);
        }
      }
    }

    // backend → prefs
    async function loadBackendPrefs() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_TENDER_API_URL}/user/preferences?email=${email}`,
          {
            headers: {
              Authorization: accessToken ? `Bearer ${accessToken}` : "",
            },
          }
        );

        // tolerate non-200s
        if (!res.ok) {
          // optional soft warning; not a failure
          console.warn("Backend prefs request not OK:", res.status);
          return;
        }

        const data = await res.json();
        if (data) {
          setPrefs((prev) => ({
            ...prev,
            location: data.location || "",
            categories: data.categories || [],
          }));
        }
      } catch (err) {
        console.error("Failed to load backend prefs", err);
      }
    }

    loadBackendPrefs();
  }, [
    auth.isAuthenticated,
    storageKey,
    savedKey,
    email,         // include used values in deps
    accessToken,   // include used values in deps
  ]);

  // Persist prefs to localStorage
  useEffect(() => {
    if (auth.isAuthenticated && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
      } catch (err) {
        console.error("Failed to persist prefs", err);
      }
    }
  }, [prefs, auth.isAuthenticated, storageKey]);

  // Persist saved tenders to localStorage
  useEffect(() => {
    if (auth.isAuthenticated && savedKey) {
      try {
        localStorage.setItem(savedKey, JSON.stringify(savedTenders));
      } catch (err) {
        console.error("Failed to persist saved tenders", err);
      }
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
        setSavedTenders((cur) => (cur.includes(id) ? cur : [...cur, id]));
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
              <Route path="/tenders/:id" element={<TenderDetailsPage />} />
            </Routes>
          </main>
        </div>

        {showPrefs && <UserPrefsSheet onClose={() => setShowPrefs(false)} />}
      </BrowserRouter>
    </PrefsContext.Provider>
  );
}
