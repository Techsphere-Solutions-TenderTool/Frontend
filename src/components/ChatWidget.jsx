// src/components/ChatWidget.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { askChatbot } from "../lib/chatbot";
import { textToSpeech } from "../lib/polly";

// Suggested quick replies
const QUICK_REPLIES = [
  "How do I find tenders in my province?",
  "What are the latest tenders closing?",
  "Tell me about ESKOM tenders",
  "How do I save a tender?",
  "What categories are available?",
];

// Simple markdown to React
function parseMarkdown(text) {
  return text
    .split("\n")
    .map((line, i) => {
      // Bold: **text**
      line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Italic: *text*
      line = line.replace(/\*(.*?)\*/g, "<em>$1</em>");
      // Links: [text](url)
      line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: #22d3ee; text-decoration: underline;">$1</a>');
      return <div key={i} dangerouslySetInnerHTML={{ __html: line }} />;
    });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setShowSuggestions(messages.length === 0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, messages.length]);

  // Auto-play audio for bot messages (optional, user can toggle)
  const playAudio = async (text, messageId) => {
    if (!audioEnabled || playingAudioId) return;

    try {
      setPlayingAudioId(messageId);
      const audioBase64 = await textToSpeech(text);
      const audio = new Audio("data:audio/mp3;base64," + audioBase64);
      
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => {
        console.warn("⚠️ Audio playback error");
        setPlayingAudioId(null);
      };
      
      await audio.play();
    } catch (err) {
      console.warn("⚠️ Text-to-speech failed:", err.message);
      setPlayingAudioId(null);
    }
  };

  async function sendMessage(text = null) {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    // Hide suggestions after first message
    setShowSuggestions(false);

    const userMsg = { from: "user", text: messageText, id: Date.now() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    try {
      console.log("🤖 Sending to chatbot:", messageText);
      const reply = await askChatbot(messageText);
      console.log("✅ Chatbot reply:", reply);

      const botMsgId = Date.now();
      const botMsg = { from: "bot", text: reply || "…", id: botMsgId };
      setMessages((p) => [...p, botMsg]);

      // Auto-play audio for bot responses (best-effort)
      if (audioEnabled && reply) {
        setTimeout(() => playAudio(reply, botMsgId), 300);
      }
    } catch (err) {
      console.error("❌ Chatbot error:", err);
      const errorMsg = err.message || "Something went wrong";
      setMessages((p) => [
        ...p,
        {
          from: "bot",
          text: `**Oops!** I couldn't process that right now.\n\n**Error:** ${errorMsg}`,
          isError: true,
          id: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  function handleSuggestionClick(suggestion) {
    sendMessage(suggestion);
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
          className="fixed bottom-6 right-6 z-[9999] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95"
        >
          💬
        </button>
      )}

      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-full md:max-w-[400px] z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl
        transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="TenderTool Assistant"
        aria-modal="true"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-cyan-600 to-blue-600 p-4 shadow-lg">
            <div className="flex-1">
              <h3 className="text-lg font-bold">TenderTool Assistant</h3>
              <p className="text-xs text-cyan-100/70">AI-powered tender helper</p>
            </div>
            <button
              type="button"
              className="p-1 rounded hover:bg-white/20 transition-colors ml-2 flex-shrink-0"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              title="Close (ESC)"
            >
              ✖
            </button>
          </div>

          {/* Audio Toggle */}
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-300">Audio responses</span>
            <button
              type="button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                audioEnabled
                  ? "bg-cyan-500 text-white hover:bg-cyan-600"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
              aria-label={audioEnabled ? "Disable audio" : "Enable audio"}
            >
              {audioEnabled ? "🔊 ON" : "🔇 OFF"}
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                <div className="text-5xl mb-3">👋</div>
                <p className="text-sm text-slate-300 max-w-xs">
                  Hello! I'm here to help you find and understand tenders. What would you like to know?
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`p-3 rounded-lg max-w-[85%] break-words text-sm leading-relaxed ${
                      m.from === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none"
                        : m.isError
                        ? "bg-red-900/30 border border-red-500/50 text-red-100 rounded-bl-none"
                        : "bg-slate-700 text-slate-100 rounded-bl-none"
                    }`}
                  >
                    {m.from === "bot" ? parseMarkdown(m.text) : m.text}
                  </div>
                  {m.from === "bot" && audioEnabled && !m.isError && (
                    <button
                      type="button"
                      onClick={() => playAudio(m.text, m.id)}
                      disabled={playingAudioId !== null}
                      className="ml-2 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors flex-shrink-0 text-lg"
                      title="Play audio"
                      aria-label="Play audio response"
                    >
                      {playingAudioId === m.id ? "🔊" : "🔈"}
                    </button>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 p-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {showSuggestions && messages.length === 0 && (
            <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Suggested questions:</p>
              <div className="space-y-2">
                {QUICK_REPLIES.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={loading}
                    className="w-full text-left text-xs p-2.5 rounded bg-slate-700/50 hover:bg-slate-600 hover:border-cyan-400 border border-transparent disabled:opacity-50 transition-all text-slate-200 hover:text-white font-medium"
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700 bg-slate-900">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="flex-1 p-2.5 rounded bg-slate-800 border border-slate-600 focus:border-cyan-400 focus:outline-none text-sm placeholder-slate-400 transition-colors disabled:opacity-50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                disabled={loading}
                maxLength="500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 rounded font-semibold text-sm transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
                title="Send message (Enter)"
              >
                {loading ? "…" : "Send"}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Press <kbd className="bg-slate-800 px-1 rounded">Enter</kbd> to send or <kbd className="bg-slate-800 px-1 rounded">ESC</kbd> to close</p>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}