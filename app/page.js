import Script from 'next/script';

export default function Page() {
  return (
    <main className="demo-page">
      <section className="demo-copy" aria-labelledby="demo-title">
        <h1 id="demo-title">Routing between specialized agents</h1>

        <div className="usage-notes" aria-label="How to use the demo">
          <div className="usage-note">
            <span className="usage-number">01</span>
            <div><strong>Ask Sales</strong><span>Try a plan, product, or implementation question.</span></div>
          </div>
          <div className="usage-note">
            <span className="usage-number">02</span>
            <div><strong>Switch to Support</strong><span>Transfer the latest question, a concise summary, and approved context only.</span></div>
          </div>
          <div className="usage-note">
            <span className="usage-number">03</span>
            <div><strong>See the routing</strong><span>The application resolves the destination and keeps recovery visible.</span></div>
          </div>
        </div>
      </section>

      <Script
        src="/embed.js"
        data-open="desktop"
        data-title="Ask the specialists"
        data-intro="Start with Sales. If your question needs account help, we can bring Support into the same conversation."
        data-user-id="demo-user-01"
        data-tenant-id="northstar-demo"
        data-plan="growth"
        data-position="right"
        strategy="afterInteractive"
      />
    </main>
  );
}
