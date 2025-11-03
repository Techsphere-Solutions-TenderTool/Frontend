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
import ChatWidget from "./components/ChatWidget.jsx";


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

  // Notify devs that toast is wired up (dev mode only)
  useEffect(() => {
    if (import.meta.env.MODE !== "production") {
      toast.info("Toast system ready.");
    }
  }, [toast]);

  // Load localStorage and backend preferences
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

    // Load local prefs
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPrefs((prev) => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.warn("Failed to parse local prefs:", err);
      }
    }

    // Load saved tenders
    if (savedKey) {
      try {
        const raw = localStorage.getItem(savedKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSavedTenders(parsed);
          }
        }
      } catch (err) {
        console.warn("Failed to parse saved tenders:", err);
      }
    }

    // Load preferences from backend
    const fetchPrefs = async () => {
      try {
        const base =
          import.meta.env.VITE_TENDER_API_URL || import.meta.env.VITE_API_BASE_URL || "";
        if (!base) return;

        const url = `${base.replace(/\/+$/, "")}/user/preferences?email=${encodeURIComponent(email)}`;
        const res = await fetch(url, {
          headers: {
            Authorization: accessToken ? `Bearer ${accessToken}` : "",
          },
        });

        if (!res.ok) {
          console.warn("Backend preferences fetch failed:", res.status);
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
        console.error("Error fetching backend preferences:", err);
      }
    };

    fetchPrefs();
  }, [auth.isAuthenticated, storageKey, savedKey, email, accessToken]);

  // Persist preferences to localStorage
  useEffect(() => {
    if (auth.isAuthenticated && storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(prefs));
      } catch (err) {
        console.error("Failed to save prefs:", err);
      }
    }
  }, [prefs, auth.isAuthenticated, storageKey]);

  // Persist saved tenders to localStorage
  useEffect(() => {
    if (auth.isAuthenticated && savedKey) {
      try {
        localStorage.setItem(savedKey, JSON.stringify(savedTenders));
      } catch (err) {
        console.error("Failed to save savedTenders:", err);
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
      notifyLoginNeeded: () => toast.warn("Login to add favourites."),
    }),
    [prefs, savedTenders, auth.isAuthenticated, toast]
  );

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
        Signing you in…
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-red-200 bg-slate-950">
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

        {/* ✅ Global floating tools */}
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
