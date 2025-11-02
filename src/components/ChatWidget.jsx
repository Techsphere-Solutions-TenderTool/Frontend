// src/components/ChatWidget.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { askChatbot } from "../lib/chatbot";
import { textToSpeech } from "../lib/polly";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { from: "user", text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askChatbot(text);
      const botMsg = { from: "bot", text: reply || "…" };
      setMessages((p) => [...p, botMsg]);

      // auto-speak, best-effort
      try {
        const audioBase64 = await textToSpeech(reply);
        new Audio("data:audio/mp3;base64," + audioBase64).play().catch(() => {});
      } catch {}
    } catch (err) {
      setMessages((p) => [
        ...p,
        { from: "bot", text: "Sorry, I couldn't process that right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  // Render into body so it's never clipped by page layout/overflow
  return createPortal(
    <>
      {/* Floating Button */}
      {!open && (
        <button
          type="button"
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] bg-cyan-500 hover:bg-cyan-600 text-white p-4 rounded-full shadow-xl"
        >
          💬
        </button>
      )}

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[92vw] z-[9999] bg-slate-900 text-white shadow-2xl
        transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="TenderTool Assistant"
        aria-modal="true"
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">TenderTool Assistant</h3>
            <button
              type="button"
              className="px-2 py-1 rounded hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✖
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-300/70">
                Ask anything about tenders, publishers, or deadlines.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg max-w-[90%] break-words ${
                    m.from === "user" ? "bg-cyan-600 ml-auto" : "bg-slate-700"
                  }`}
                >
                  {m.text}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 p-2 rounded bg-slate-800 border border-slate-600 outline-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 px-3 rounded"
            >
              {loading ? "…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
