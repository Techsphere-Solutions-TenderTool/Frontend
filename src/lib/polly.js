// src/lib/polly.js

/**
 * Determines the URL to call:
 * - In Vite dev: use "/polly" so you can proxy in vite.config.js (avoids CORS).
 * - In build/prod: use VITE_POLLY_API_URL from .env.
 */
function getPollyUrl() {
  if (import.meta.env.DEV) return "/polly";
  const u = (import.meta.env.VITE_POLLY_API_URL || "").trim();
  if (!u) {
    throw new Error(
      "VITE_POLLY_API_URL is not set. Add it to your .env and restart the dev server."
    );
  }
  return u;
}

/**
 * Attempts to extract a Base64 MP3 string from multiple common Lambda shapes.
 * Accepts: plain base64 text, {audioBase64}, {body: base64}, {body: '{"audioBase64": "..."}'}, {data:{audioBase64}}.
 */
function extractBase64(bodyText) {
  // Plain base64?
  if (/^[A-Za-z0-9+/=\s]+$/.test(bodyText) && bodyText.trim().length > 200) {
    return bodyText.trim();
  }

  // JSON shapes
  try {
    const j = JSON.parse(bodyText);

    if (typeof j?.audioBase64 === "string") return j.audioBase64;

    if (typeof j?.body === "string") {
      // body could itself be base64
      if (/^[A-Za-z0-9+/=\s]+$/.test(j.body) && j.body.trim().length > 200) {
        return j.body.trim();
      }
      // or body might be a stringified JSON containing audioBase64
      try {
        const inner = JSON.parse(j.body);
        if (typeof inner?.audioBase64 === "string") return inner.audioBase64;
      } catch {
        // not JSON; ignore
      }
    }

    if (typeof j?.data?.audioBase64 === "string") return j.data.audioBase64;
  } catch {
    // Not JSON; ignore
  }

  return null;
}

/**
 * Calls your API Gateway -> Polly Lambda and returns a Base64 MP3 string.
 * @param {string} text - The text to synthesize.
 * @param {object} opts - Optional options to forward (e.g., voiceId, engine).
 */
export async function textToSpeech(text, opts = {}) {
  const url = getPollyUrl();

  const payload = {
    text: String(text ?? ""),
    ...opts,
  };

  // Abort if the endpoint hangs too long
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json,text/plain,*/*",
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      keepalive: true,
    });
  } catch (netErr) {
    clearTimeout(timeout);
    throw new Error(
      `Network/CORS error calling Polly endpoint: ${netErr?.message || netErr}`
    );
  }

  clearTimeout(timeout);

  // Read once as text; we’ll parse from there
  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch (e) {
    throw new Error(`Could not read Polly response body: ${e?.message || e}`);
  }

  if (!res.ok) {
    // Surface meaningful JSON error if present
    try {
      const maybe = JSON.parse(bodyText);
      const msg = maybe?.message || maybe?.error || bodyText || `HTTP ${res.status}`;
      throw new Error(`Polly request failed (${res.status}): ${msg}`);
    } catch {
      throw new Error(`Polly request failed (${res.status}): ${bodyText || "no body"}`);
    }
  }

  const b64 = extractBase64(bodyText);
  if (!b64) {
    throw new Error("Could not find audioBase64 in Polly response.");
  }
  return b64;
}
