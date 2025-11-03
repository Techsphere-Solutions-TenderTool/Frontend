// src/lib/chatbot.js

/**
 * Enhanced client for your Chatbot Lambda behind API Gateway.
 * - Timeout via AbortController
 * - Helpful error messages (API GW / Lambda / CORS)
 * - Flexible reply extraction for common response shapes
 * - Configuration validation
 */

const CHATBOT_URL = (import.meta.env.VITE_CHATBOT_API_URL || "").trim();

// Validate configuration on load
if (typeof window !== "undefined") {
  if (!CHATBOT_URL) {
    console.error(
      "❌ VITE_CHATBOT_API_URL is not configured. Chatbot will not work. Add it to .env file:"
    );
    console.error("   VITE_CHATBOT_API_URL=https://your-api-endpoint");
  } else {
    console.log("✅ Chatbot endpoint configured:", CHATBOT_URL);
  }
}

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

    // Also try common nested structures
    if (typeof j?.data?.reply === "string") return j.data.reply;
    if (typeof j?.data?.message === "string") return j.data.message;
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
      "VITE_CHATBOT_API_URL is not set in your .env file. Please add it and restart the dev server."
    );
  }

  if (!message || !message.trim()) {
    throw new Error("Message cannot be empty");
  }

  const { timeoutMs = 20000, meta } = opts;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  let res;
  try {
    console.log("📤 Sending message to:", CHATBOT_URL);
    res = await fetch(CHATBOT_URL, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json,text/plain,*/*",
      },
      body: JSON.stringify({ message: message.trim(), meta }),
      signal: ctrl.signal,
      keepalive: true,
    });
  } catch (err) {
    clearTimeout(timer);

    // Check what type of error
    if (err.name === "AbortError") {
      throw new Error(`Request timeout (>${timeoutMs}ms). Chatbot took too long to respond.`);
    }

    const msg = err?.message || String(err);
    if (msg.includes("CORS")) {
      throw new Error(
        `CORS error: The chatbot endpoint may not be configured to accept requests from this domain. Check API Gateway CORS settings.`
      );
    }

    throw new Error(`Network error: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // API Gateway/Lambda errors often embed JSON
    try {
      const j = JSON.parse(text || "{}");
      const msg = j?.message || j?.error || j?.errorMessage || text || `HTTP ${res.status}`;
      throw new Error(`Chatbot error (${res.status}): ${msg}`);
    } catch (parseErr) {
      if (parseErr.message.includes("Chatbot error")) throw parseErr;
      throw new Error(`Chatbot error (${res.status}): ${text || "no response body"}`);
    }
  }

  const reply = parseReply(text);
  console.log("📥 Received reply:", reply.substring(0, 100) + "...");
  return reply;
}

/**
 * Check if chatbot is configured and reachable (for diagnostics)
 */
export async function checkChatbotHealth() {
  if (!CHATBOT_URL) {
    return { configured: false, message: "VITE_CHATBOT_API_URL not set" };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);

    const res = await fetch(CHATBOT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "ping", meta: { health_check: true } }),
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    return {
      configured: true,
      reachable: res.ok,
      status: res.status,
      message: res.ok ? "Chatbot is healthy" : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      message: `Error: ${err.message}`,
    };
  }
}