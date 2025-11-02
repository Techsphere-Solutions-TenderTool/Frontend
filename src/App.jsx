// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import ToastProvider, { useToast } from "./components/ToastProvider.jsx";
import Navbar from "./components/Navbar.jsx";
import UserPrefsSheet from "./components/UserPrefsSheet.jsx";
import TenderDetailsPage from "./routes/TenderDetailsPage.jsx";
import Home from "./pages/Home.jsx";
import TendersPage from "./routes/TendersPage.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import ChatWidget from "./components/ChatWidget.jsx";   // ✅ add this import

// Context
import { PrefsContext } from "./contexts/PrefsContext.js";

function AppInner() {
  const auth = useAuth();
  const toast = useToast();
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

  useEffect(() => {
    if (import.meta.env.MODE !== "production") toast.info("Toast system ready.");
  }, [toast]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setPrefs({ name: "", location: "", notifications: "none", categories: [] });
      setSavedTenders([]);
      return;
    }

    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try { setPrefs((p) => ({ ...p, ...JSON.parse(raw) })); } catch {}
      }
    }
    if (savedKey) {
      const raw = localStorage.getItem(savedKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSavedTenders(parsed);
        } catch {}
      }
    }

    (async () => {
      try {
        const base = import.meta.env.VITE_TENDER_API_URL || import.meta.env.VITE_API_BASE_URL || "";
        if (!base) return;
        const res = await fetch(
          `${base.replace(/\/+$/, "")}/user/preferences?email=${encodeURIComponent(email)}`,
          { headers: { Authorization: accessToken ? `Bearer ${accessToken}` : "" } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setPrefs((prev) => ({
            ...prev,
            location: data.location || "",
            categories: data.categories || [],
          }));
        }
      } catch {}
    })();
  }, [auth.isAuthenticated, storageKey, savedKey, email, accessToken]);

  useEffect(() => {
    if (auth.isAuthenticated && storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(prefs)); } catch {}
    }
  }, [prefs, auth.isAuthenticated, storageKey]);

  useEffect(() => {
    if (auth.isAuthenticated && savedKey) {
      try { localStorage.setItem(savedKey, JSON.stringify(savedTenders)); } catch {}
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
      removeSavedTender: (id) => setSavedTenders((cur) => cur.filter((x) => x !== id)),
      canSave: auth.isAuthenticated,
      openPrefs: () => setShowPrefs(true),
      notifyLoginNeeded: () => toast.warn("Login to add favourites."),
    }),
    [prefs, savedTenders, auth.isAuthenticated, toast]
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

        {/* ✅ Global floating widget: appears on every route, stays fixed on scroll */}
        <ChatWidget />
      </BrowserRouter>
    </PrefsContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
