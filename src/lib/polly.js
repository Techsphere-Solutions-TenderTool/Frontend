// src/lib/polly.js

/**
 * Determines the URL to call:
 * - In Vite dev: use "/polly" so you can proxy in vite.config.js (avoids CORS).
 * - In build/prod: use VITE_POLLY_API_URL from .env.
 */
function getPollyUrl() {
  if (import.meta.env.DEV) {
    console.log("🎤 Using Polly dev proxy at /polly");
    return "/polly";
  }

  const u = (import.meta.env.VITE_POLLY_API_URL || "").trim();
  if (!u) {
    console.error(
      "❌ VITE_POLLY_API_URL is not set. Text-to-speech will not work. Add it to .env file:"
    );
    console.error("   VITE_POLLY_API_URL=https://your-polly-endpoint");
    throw new Error(
      "VITE_POLLY_API_URL is not configured. Add it to your .env file."
    );
  }

  console.log("🎤 Using Polly endpoint:", u);
  return u;
}

/**
 * Attempts to extract a Base64 MP3 string from multiple common Lambda shapes.
 * Accepts: plain base64 text, {audioBase64}, {body: base64}, {body: '{"audioBase64": "..."}'}, {data:{audioBase64}}.
 */
function extractBase64(bodyText) {
  if (!bodyText || typeof bodyText !== "string") return null;

  // Plain base64? (must have some minimum length)
  if (/^[A-Za-z0-9+/=\s]+$/.test(bodyText) && bodyText.trim().length > 200) {
    console.log("✅ Found base64 audio (plain text)");
    return bodyText.trim();
  }

  // JSON shapes
  try {
    const j = JSON.parse(bodyText);

    // Direct audioBase64
    if (typeof j?.audioBase64 === "string") {
      console.log("✅ Found base64 audio (j.audioBase64)");
      return j.audioBase64;
    }

    // body field
    if (typeof j?.body === "string") {
      // body could itself be base64
      if (/^[A-Za-z0-9+/=\s]+$/.test(j.body) && j.body.trim().length > 200) {
        console.log("✅ Found base64 audio (j.body)");
        return j.body.trim();
      }
      // or body might be a stringified JSON containing audioBase64
      try {
        const inner = JSON.parse(j.body);
        if (typeof inner?.audioBase64 === "string") {
          console.log("✅ Found base64 audio (j.body -> audioBase64)");
          return inner.audioBase64;
        }
      } catch {
        // not JSON; ignore
      }
    }

    // Nested data structure
    if (typeof j?.data?.audioBase64 === "string") {
      console.log("✅ Found base64 audio (j.data.audioBase64)");
      return j.data.audioBase64;
    }

    // Try common Lambda response wrapper
    if (typeof j?.payload?.audioBase64 === "string") {
      console.log("✅ Found base64 audio (j.payload.audioBase64)");
      return j.payload.audioBase64;
    }
  } catch (e) {
    console.warn("Could not parse response as JSON:", e.message);
  }

  return null;
}

/**
 * Calls your API Gateway -> Polly Lambda and returns a Base64 MP3 string.
 * @param {string} text - The text to synthesize.
 * @param {object} opts - Optional options to forward (e.g., voiceId, engine).
 * @returns {Promise<string>} Base64-encoded MP3 audio
 */
export async function textToSpeech(text, opts = {}) {
  let url;
  try {
    url = getPollyUrl();
  } catch (err) {
    // Polly not configured - this is OK, just don't play audio
    throw new Error(`Polly not configured: ${err.message}`);
  }

  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty");
  }

  const payload = {
    text: String(text).trim(),
    ...opts,
  };

  // Abort if the endpoint hangs too long
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);

  let res;
  try {
    console.log("🎤 Calling Polly for text synthesis...");
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

    if (netErr.name === "AbortError") {
      throw new Error("Polly request timeout (took more than 15 seconds)");
    }

    throw new Error(`Network/CORS error calling Polly: ${netErr?.message || netErr}`);
  }

  clearTimeout(timeout);

  // Read once as text; we'll parse from there
  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch (e) {
    throw new Error(`Could not read Polly response: ${e?.message || e}`);
  }

  if (!res.ok) {
    // Surface meaningful JSON error if present
    try {
      const maybe = JSON.parse(bodyText);
      const msg =
        maybe?.message || maybe?.error || maybe?.errorMessage || bodyText || `HTTP ${res.status}`;
      throw new Error(`Polly error (${res.status}): ${msg}`);
    } catch (parseErr) {
      if (parseErr.message.includes("Polly error")) throw parseErr;
      throw new Error(`Polly error (${res.status}): ${bodyText || "no response body"}`);
    }
  }

  const b64 = extractBase64(bodyText);
  if (!b64) {
    console.error("❌ Could not extract audioBase64 from response:", bodyText.substring(0, 200));
    throw new Error(
      "Invalid Polly response: could not find audioBase64. Check your Polly Lambda configuration."
    );
  }

  console.log("✅ Audio synthesized successfully");
  return b64;
}

/**
 * Check if Polly is configured and reachable (for diagnostics)
 */
export async function checkPollyHealth() {
  let url;
  try {
    url = getPollyUrl();
  } catch {
    return { configured: false, message: "VITE_POLLY_API_URL not set" };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);

    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello", meta: { health_check: true } }),
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    const bodyText = await res.text();
    const hasBase64 = extractBase64(bodyText) !== null;

    return {
      configured: true,
      reachable: res.ok,
      status: res.status,
      hasAudio: hasBase64,
      message: res.ok && hasBase64 ? "Polly is healthy" : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      message: `Error: ${err.message}`,
    };
  }
}