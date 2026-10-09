import Script from 'next/script';

export default function Page() {
  return (
    <main className="demo-page">
      <section className="demo-copy" aria-labelledby="demo-title">
        <p className="demo-eyebrow">Application-owned routing · Direct Agent Studio calls</p>
        <h1 id="demo-title">Move the question, not the whole identity.</h1>
        <p className="demo-intro">
          A practical handoff between specialized agents. Start with Sales, then move to Support without restarting the conversation or passing along the user’s entire history.
        </p>

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
            <div><strong>Watch the boundary</strong><span>The application resolves the destination and keeps recovery visible.</span></div>
          </div>
        </div>

        <p className="demo-caption">On desktop, Support stays open beside this explanation. On mobile, tap the chat button to open it over the page.</p>
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
