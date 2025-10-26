import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTender, getDocuments, getContacts, subscribeToTender } from "../lib/api.js";

export default function TenderDetailsPage() {
  const { id } = useParams();
  const [tender, setTender] = useState(null);
  const [docs, setDocs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [subMsg, setSubMsg] = useState("");

  useEffect(() => {
    let dead = false;
    setLoading(true); setErr(null);
    Promise.all([getTender(id), getDocuments(id), getContacts(id)])
      .then(([t, d, c]) => { if (!dead) { setTender(t); setDocs(d || []); setContacts(c || []); } })
      .catch(e => { if (!dead) setErr(String(e)); })
      .finally(()=> { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [id]);

  async function handleSubscribe() {
    const email = prompt("Enter your email for updates on this tender (SNS stub):");
    if (!email) return;
    setSubMsg("Subscribing…");
    try {
      const resp = await subscribeToTender({ email, tenderId: id });
      setSubMsg(resp.message || "Subscribed!");
    } catch (e) {
      setSubMsg(String(e));
    }
    setTimeout(()=>setSubMsg(""), 2500);
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-error">Error: {err}</div>;
  if (!tender) return <div className="p-6">Not found.</div>;

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{tender.title}</h1>
            <p className="opacity-80 mt-1">{tender.buyer || "—"} • <span className="uppercase">{tender.source}</span></p>
            <p className="opacity-70 text-sm mt-2">
              Published {tender.published_at?.slice(0,10) || "TBA"} • Closing {tender.closing_at?.slice(0,10) || "TBA"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={handleSubscribe}>Subscribe</button>
            <Link to="/tenders" className="btn btn-ghost">← Back</Link>
          </div>
        </div>
        {subMsg && <div className="mt-2 text-sm opacity-80">{subMsg}</div>}
        {tender.description && <p className="mt-4 leading-relaxed">{tender.description}</p>}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Documents</h2>
            <span className="opacity-70 text-sm">{docs.length} file(s)</span>
          </div>
          <div className="mt-3 grid gap-3">
            {docs.length === 0 && <div className="opacity-70">None available.</div>}
            {docs.map((d) => (
              <a key={d.id || d.url} href={d.url || "#"} target="_blank" rel="noreferrer"
                 className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.title || "Document"}</div>
                  <div className="text-xs opacity-70">{d.format || ""} {d.datePublished ? `• ${d.datePublished.slice(0,10)}` : ""}</div>
                </div>
                <span className="btn btn-xs btn-primary">Open</span>
              </a>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <div className="mt-3 grid gap-3">
            {contacts.length === 0 && <div className="opacity-70">No contacts published.</div>}
            {contacts.map((c, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="font-medium">{c.name || "Contact"}</div>
                <div className="text-sm opacity-80">{c.role || ""}</div>
                <div className="text-sm mt-1">
                  {c.email && <a className="link" href={`mailto:${c.email}`}>{c.email}</a>}{" "}
                  {c.telephone && <span className="opacity-80">• {c.telephone}</span>}
                  {c.url && <span className="opacity-80"> • <a className="link" href={c.url} target="_blank" rel="noreferrer">Website</a></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
