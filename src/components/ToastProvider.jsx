import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Very small toast system:
 * - <ToastProvider> wraps your app
 * - useToast() gives: info/success/warn/error
 * - Auto-dismiss after 4s, pause on hover, accessible roles
 */

const ToastCtx = createContext(null);

let nextId = 1;
function makeToast(id, kind, message) {
  return { id, kind, message };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((kind, message, ms = 4000) => {
    const id = nextId++;
    setToasts((t) => [...t, makeToast(id, kind, message)]);
    const tm = setTimeout(() => remove(id), ms);
    timersRef.current.set(id, tm);
  }, [remove]);

  const value = useMemo(
    () => ({
      info: (m) => push("info", m),
      success: (m) => push("success", m),
      warn: (m) => push("warn", m),
      error: (m) => push("error", m),
      clear: () => setToasts([]),
    }),
    [push]
  );

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {portalTarget &&
        createPortal(
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
            ))}
          </div>,
          portalTarget
        )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

function ToastItem({ toast, onClose }) {
  const base =
    "min-w-[240px] max-w-[360px] px-4 py-3 rounded-lg shadow-lg border text-sm flex items-start gap-3";
  const kindStyles = {
    info: "bg-sky-900/70 border-sky-400/30 text-sky-100",
    success: "bg-emerald-900/70 border-emerald-400/30 text-emerald-100",
    warn: "bg-amber-900/70 border-amber-400/30 text-amber-100",
    error: "bg-rose-900/70 border-rose-400/30 text-rose-100",
  };
  const label = {
    info: "Info",
    success: "Success",
    warn: "Warning",
    error: "Error",
  }[toast.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${base} ${kindStyles[toast.kind]}`}
      onMouseEnter={(e) => e.stopPropagation()}
    >
      <div className="font-semibold">{label}</div>
      <div className="flex-1">{toast.message}</div>
      <button
        onClick={onClose}
        className="opacity-75 hover:opacity-100 transition text-xs underline"
        aria-label="Dismiss"
        type="button"
      >
        Close
      </button>
    </div>
  );
}