// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import Navbar from "./components/Navbar.jsx";
import UserPrefsSheet from "./components/UserPrefsSheet.jsx";

// your pages
import Home from "./pages/Home.jsx";
import TendersPage from "./routes/TendersPage.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";

// we export this so other components (later: TendersPage, TenderDetail)
// can call useContext(PrefsContext) to read/update
export const PrefsContext = React.createContext(null);

export default function App() {
  const auth = useAuth();

  // sheet open/close
  const [showPrefs, setShowPrefs] = useState(false);

  // shared state that lives AS LONG AS the app is running
  const [prefs, setPrefs] = useState({
    name: "",
    location: "",
    notifications: "none",
  });
  const [savedTenders, setSavedTenders] = useState([]); // array of tender IDs

  // figure out the "storage key" based on who is logged in
  const storageKey = auth.isAuthenticated
    ? `tt_prefs_${auth.user?.profile?.email ?? "user"}`
    : null;
  const savedKey = auth.isAuthenticated
    ? `tt_saved_${auth.user?.profile?.email ?? "user"}`
    : null;

  // on login → load user prefs + saved tenders from localStorage
  useEffect(() => {
    if (!auth.isAuthenticated) {
      // if not logged in, we can clear UI-level saved items
      setPrefs({
        name: "",
        location: "",
        notifications: "none",
      });
      setSavedTenders([]);
      return;
    }

    // load prefs
    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setPrefs((prev) => ({ ...prev, ...parsed }));
        } catch (_) {
          // ignore bad JSON
        }
      }
    }

    // load saved tenders
    if (savedKey) {
      const rawSaved = localStorage.getItem(savedKey);
      if (rawSaved) {
        try {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) {
            setSavedTenders(parsed);
          }
        } catch (_) {
          // ignore
        }
      }
    }
  }, [auth.isAuthenticated, storageKey, savedKey]);

  // whenever prefs change → persist (only if logged in)
  useEffect(() => {
    if (auth.isAuthenticated && storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(prefs));
    }
  }, [prefs, auth.isAuthenticated, storageKey]);

  // whenever saved tenders change → persist
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
      // helper: add/remove
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
      canSave: auth.isAuthenticated, // 👈 only logged in users may save
      openPrefs: () => setShowPrefs(true),
    }),
    [prefs, savedTenders, auth.isAuthenticated]
  );

  // handle auth states
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
              {/* later: <Route path="/tenders/:id" element={<TenderDetail />} /> */}
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
