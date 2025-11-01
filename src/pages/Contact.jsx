// src/pages/Contact.jsx
import React, { useState } from "react";
import { useAuth } from "react-oidc-context";

export default function Contact() {
  const auth = useAuth();
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  // try get logged-in user details
  const userEmail = auth?.user?.profile?.email ?? "";
  const userName =
    auth?.user?.profile?.name ??
    auth?.user?.profile?.given_name ??
    auth?.user?.profile?.preferred_username ??
    "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (sending) return;

    const form = new FormData(e.currentTarget);
    const name = form.get("name");
    const email = form.get("email");
    const message = form.get("message");

    setSending(true);
    setStatus("");

    // if you have your API plugged in:
    // we'll try POST to /contact on your API base, but fail gracefully
    const base = import.meta.env.VITE_API_BASE_URL;

    try {
      if (base) {
        await fetch(`${base}/contact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            message,
            // nice extra: include oidc subject if logged in
            user_sub: auth?.user?.profile?.sub ?? null,
            source: "tendertool-contact-form",
          }),
        });
      } else {
        // fallback – at least log it
        console.log("Contact form:", { name, email, message });
      }

      setStatus("Thanks! We’ll get back to you shortly.");
      e.currentTarget.reset();
    } catch (err) {
      console.error("Contact submit failed:", err);
      setStatus("We couldn't send your message right now. Please try again.");
    } finally {
      setSending(false);
      // auto-hide success after 4s
      setTimeout(() => setStatus(""), 4000);
    }
  }

  return (
    <div className="space-y-8">
      {/* header card */}
      <div
        className="glass-panel p-8 rounded-xl"
        style={{ "--panel-bg": 0.1, "--panel-ol": 0.58, "--panel-thickness": "3px" }}
      >
        <h1 className="h1-pro">Contact Techsphere Solutions</h1>
        <p className="mt-2 opacity-90 max-w-2xl">
          Have a question, feature idea, or partnership opportunity? Send us a note and the team
          behind TenderTool will reply.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* left: form */}
        <div className="glass-panel p-6" style={{ "--panel-bg": 0.09, "--panel-ol": 0.5 }}>
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Send us a message</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* row 1 – name + email */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-slate-200/70">
                  Name<span className="text-pink-300 ml-1">*</span>
                </label>
                <input
                  name="name"
                  defaultValue={userName}
                  required
                  className="input bg-slate-950/30 border-slate-200/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  placeholder="Your full name"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-slate-200/70">
                  Email<span className="text-pink-300 ml-1">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={userEmail}
                  required
                  className="input bg-slate-950/30 border-slate-200/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* message */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-slate-200/70">
                Message<span className="text-pink-300 ml-1">*</span>
              </label>
              <textarea
                name="message"
                rows={5}
                required
                className="textarea bg-slate-950/30 border-slate-200/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 min-h-[150px]"
                placeholder="Tell us what you’re working on, or which source you want us to add…"
              />
              <p className="text-[0.7rem] text-slate-300/50">We usually respond within 1 working day.</p>
            </div>

            {/* button + status */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={sending}
                className={`btn btn-primary glow-cta min-w-[120px] ${
                  sending ? "opacity-70 pointer-events-none" : ""
                }`}
              >
                {sending ? "Sending…" : "Submit"}
              </button>

              {status && (
                <span
                  className={`text-sm ${
                    status.startsWith("Thanks") ? "text-emerald-300" : "text-amber-200"
                  }`}
                >
                  {status}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* right: company info */}
        <div className="glass-panel p-6">
          <h2 className="text-xl md:text-2xl font-semibold">Company details</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <span className="opacity-70 mr-1">Company:</span> Techsphere Solutions
            </li>
            <li>
              <span className="opacity-70 mr-1">Product:</span> TenderTool (SA public-sector focus)
            </li>
            <li>
              <span className="opacity-70 mr-1">Email:</span>
              <a className="link text-cyan-200 hover:text-cyan-100" href="mailto:info@techsphere.example">
                info@techsphere.example
              </a>
            </li>
            <li>
              <span className="opacity-70 mr-1">Support:</span>
              <a className="link text-cyan-200 hover:text-cyan-100" href="mailto:support@techsphere.example">
                support@techsphere.example
              </a>
            </li>
            <li>
              <span className="opacity-70 mr-1">Data corrections:</span>
              <a className="link text-cyan-200 hover:text-cyan-100" href="mailto:data@techsphere.example">
                data@techsphere.example
              </a>
            </li>
          </ul>

          <div className="border-t border-white/5 my-5" />

          <h3 className="text-base font-semibold mb-1">What we’re building</h3>
          <p className="text-sm opacity-85">
            A unified, web-accessible tender discovery and analysis platform, powered by a serverless AWS
            pipeline and designed for fast, precise filtering and actionable insights.
          </p>

          <a href="/tenders" className="btn btn-outline ts mt-4">
            Explore Tenders
          </a>

          <p className="text-[0.65rem] text-slate-400 mt-5 leading-relaxed">
            Please don’t send passwords or confidential bid documents via this form.
          </p>
        </div>
      </div>
    </div>
  );
}
