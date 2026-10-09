import Script from 'next/script';

export default function Page() {
  return (
    <main className="demo-page">
      <section className="demo-copy" aria-labelledby="demo-title">
        <h1 id="demo-title">Routing between specialized agents</h1>

        <p className="usage-intro">Chat with these agents - they'll defer to each other's specialties when appropriate.</p>

        <div className="usage-notes" aria-label="Specialist capabilities">
          <div className="usage-note">
            <span className="usage-number">01</span>
            <div><strong>Product Specialist</strong><span>Find and compare electronics, computers, home theater, cameras, audio, and connected-home products.</span></div>
          </div>
          <div className="usage-note">
            <span className="usage-number">02</span>
            <div><strong>Customer Support Specialist</strong><span>Help with SAML access, plan changes, and API-key permissions.</span></div>
          </div>
        </div>
      </section>

      <Script
        src="/embed.js"
        data-open="desktop"
        data-position="right"
        strategy="afterInteractive"
      />
    </main>
  );
}
