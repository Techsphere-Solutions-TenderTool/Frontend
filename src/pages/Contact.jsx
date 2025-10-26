import { useState } from "react";

export default function Contact() {
  const [status, setStatus] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name");
    const email = form.get("email");
    const message = form.get("message");
    setStatus("Thanks! We’ll get back to you shortly.");
    e.currentTarget.reset();
    setTimeout(() => setStatus(""), 4000);
    console.log("Contact form:", { name, email, message });
  }

  return (
    <div className="space-y-8">
      <div className="glass-panel p-8 rounded-xl" style={{ '--panel-bg': .10, '--panel-ol': .58, '--panel-thickness': '3px' }}>
        <h1 className="h1-pro">Contact Techsphere Solutions</h1>
        <p className="mt-2 opacity-90">
          Have a question, feature idea, or partnership opportunity? We’d love to hear from you.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel p-6" style={{ '--panel-bg': .09, '--panel-ol': .50 }}>
          <h2 className="text-xl md:text-2xl font-semibold">Send us a message</h2>
          <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
            <label className="form-control">
              <span className="label-text">Name</span>
              <input name="name" className="input input-bordered bg-white/10" required />
            </label>
            <label className="form-control">
              <span className="label-text">Email</span>
              <input name="email" type="email" className="input input-bordered bg-white/10" required />
            </label>
            <label className="form-control">
              <span className="label-text">Message</span>
              <textarea name="message" rows={5} className="textarea textarea-bordered bg-white/10" required />
            </label>
            <button className="btn btn-primary glow-cta" type="submit">Submit</button>
            {status && <div className="text-success text-sm">{status}</div>}
          </form>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl md:text-2xl font-semibold">Company details</h2>
          <ul className="mt-3 space-y-2">
            <li><span className="opacity-70">Company:</span> Techsphere Solutions</li>
            <li><span className="opacity-70">Product:</span> TenderTool</li>
            <li>
              <span className="opacity-70">Email:</span>{" "}
              <a className="link" href="mailto:info@techsphere.example">info@techsphere.example</a>
            </li>
            <li><span className="opacity-70">Website:</span> <a className="link" href="#" onClick={e=>e.preventDefault()}>techsphere.example</a></li>
          </ul>

          <div className="divider my-6"></div>

          <h3 className="text-lg md:text-xl font-semibold">What we’re building</h3>
          <p className="mt-1 opacity-90">
            A unified, web-accessible tender discovery and analysis platform, powered by a serverless AWS
            pipeline and designed for fast, precise filtering and actionable insights.
          </p>

          <a href="/tenders" className="btn btn-outline ts mt-4">Explore Tenders</a>
        </div>
      </div>
    </div>
  );
}
