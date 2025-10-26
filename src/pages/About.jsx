export default function About() {
  return (
    <div className="space-y-8">
      <div className="glass-panel p-8 rounded-xl" style={{ '--panel-bg': .10, '--panel-ol': .55, '--panel-thickness': '3px' }}>
        <h1 className="h1-pro">About Techsphere TenderTool</h1>
        <p className="mt-3 leading-relaxed opacity-90">
          TenderTool automates the discovery and analysis of public-sector tenders, continuously
          monitoring government and state-owned entity sources, notifying teams of relevant
          opportunities, and surfacing insights.
        </p>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <AboutPoint
            title="Tender Discovery Engine"
            text="Crawls multiple publishing sites using key search terms to identify relevant opportunities."
          />
          <AboutPoint
            title="Content Management"
            text="Normalises and categorises tenders for accurate filtering and better relevance."
          />
          <AboutPoint
            title="Analysis & Decisions"
            text="Supports quick assessments and bid/no-bid decisions, with scope for trend analysis."
          />
        </div>
      </div>

      <div className="glass-panel p-8">
        <h2 className="text-2xl md:text-3xl font-semibold">Built for the real SA landscape</h2>
        <p className="mt-2 opacity-90">
          While the majority of tenders appear on the central eTenders portal, many departments
          and municipalities publish on their own sites—so there is no single source of truth.
          TenderTool unifies these sources for you.
        </p>
      </div>

      <div className="glass-panel p-8">
        <h2 className="text-2xl md:text-3xl font-semibold">Architecture & Delivery</h2>
        <p className="mt-2 opacity-90">
          We implement a modern, serverless-first approach on AWS (EventBridge → Lambda →
          S3 → ETL → Postgres → API Gateway) and present a responsive web UI so users can
          access TenderTool from anywhere.
        </p>
        <div className="mt-4">
          <a href="/tenders" className="btn btn-primary glow-cta">Start Browsing</a>
        </div>
      </div>
    </div>
  );
}

function AboutPoint({ title, text }) {
  return (
    <div className="glass-panel p-5" style={{ '--panel-bg': .11, '--panel-ol': .48 }}>
      <div className="text-lg md:text-xl font-semibold">{title}</div>
      <p className="opacity-80 mt-1">{text}</p>
    </div>
  );
}
