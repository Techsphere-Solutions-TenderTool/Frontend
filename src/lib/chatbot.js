// src/lib/chatbot.js

/**
 * Minimal client for your Chatbot Lambda behind API Gateway.
 * - Timeout via AbortController
 * - Helpful error messages (API GW / Lambda / CORS)
 * - Flexible reply extraction for common response shapes
 */

const CHATBOT_URL = (import.meta.env.VITE_CHATBOT_API_URL || "").trim();

function parseReply(rawText) {
  // Accept a few common shapes: {reply}, {body:{reply}}, {message}, string
  try {
    const j = JSON.parse(rawText);

    if (typeof j?.reply === "string") return j.reply;

    if (typeof j?.body === "string") {
      try {
        const inner = JSON.parse(j.body);
        if (typeof inner?.reply === "string") return inner.reply;
        if (typeof inner?.message === "string") return inner.message;
      } catch {
        // body might be plain text
        if (j.body) return String(j.body);
      }
    }

    if (typeof j?.message === "string") return j.message;
    if (typeof j === "string") return j;
  } catch {
    // not JSON; treat as plain text
  }
  return rawText || "Sorry, I don't have a reply.";
}

/**
 * Ask the chatbot.
 * @param {string} message - user message
 * @param {{ timeoutMs?: number, meta?: any }} [opts]
 * @returns {Promise<string>} reply text
 */
export async function askChatbot(message, opts = {}) {
  if (!CHATBOT_URL) {
    throw new Error(
      "VITE_CHATBOT_API_URL is not set. Add it to your .env and restart the dev server."
    );
  }

  const { timeoutMs = 15000, meta } = opts;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(CHATBOT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json,text/plain,*/*",
      },
      body: JSON.stringify({ message, meta }),
      signal: ctrl.signal,
      keepalive: true,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`Network/CORS error calling Chatbot: ${err?.message || String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // API Gateway/Lambda errors often embed JSON
    try {
      const j = JSON.parse(text || "{}");
      const msg = j?.message || j?.error || text || `HTTP ${res.status}`;
      throw new Error(`Chatbot request failed (${res.status}): ${msg}`);
    } catch {
      throw new Error(`Chatbot request failed (${res.status}): ${text || "no body"}`);
    }
  }

  return parseReply(text);
}
