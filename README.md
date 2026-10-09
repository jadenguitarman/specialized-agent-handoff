# Clean handoff between specialized agents

Local chat demo of an application-owned handoff from a Sales agent to a Support agent.

## Embed on an article page

The same demo is available as a floating, single-script widget. Host this repository (or its deployment) and add the following to the article page. Replace the URL with the real deployment URL; the repository does not assume one.

```html
<script
  src="https://YOUR-DEMO-DOMAIN.example/embed.js"
  data-api-base="https://YOUR-DEMO-DOMAIN.example"
  data-open="desktop"
  data-title="Ask the specialists"
  data-user-id="article-demo-user"
  data-tenant-id="article-demo"
  data-plan="growth"
  defer
></script>
```

The script creates a shadow-DOM launcher and chat panel, so its styles do not leak into the article. `data-api-base` is required when the article and demo are on different origins. Configure the server with `EMBED_ALLOWED_ORIGINS=https://your-blog.example` (comma-separated for multiple origins); the API does not allow arbitrary cross-origin callers. The default identity values in the script are demo fixtures—use server-authenticated context before treating this as a production identity boundary.

Set `data-open="desktop"` to keep the chat panel open as a right-side rail on desktop while returning to the launcher-and-overlay pattern on mobile. Omit it, or use another value, for the normal click-to-open widget at every viewport size.

The launcher supports Markdown responses, context selectors, Agent Studio transfer-tool calls, visible transfer states, cancellation, and responsive mobile layout. The widget calls `/api/chat` and `/api/transfer` on the configured API base.

## User contract

- The user stays in one chat interface.
- Each agent can request an allowlisted transfer tool for the opposite specialist.
- The application executes the transfer and sends the destination only the current conversation plus its deterministic specialist opening.
- The UI shows when a transfer starts, succeeds, or needs recovery.

## Local use

1. From the parent `Algolia Projects` folder, copy the shared `.env.example` to `.env`.
2. Fill in the application ID, product index, Agent Studio key, management/indexing keys, and Agent Studio provider/model. Do not fill in the generated support index or agent IDs.
3. Run `npm run provision`. It verifies the product index, creates and seeds the support index, and creates or updates the Sales and Support agents through the direct Agent Studio API. Generated IDs and index names are written back to the shared `.env` and to the ignored `provisioned.env` file.
4. The script writes `ALGOLIA_SUPPORT_INDEX` and both agent IDs into the shared `.env`, preserving the credentials you supplied. Set `PUBLISH_AGENTS=true` or pass `--publish` when the drafts are ready to publish.
5. Start the Next.js app with `npm run dev`, then open `http://localhost:3000`. For a production-style local check, run `npm run build && npm start`.
6. Ask a question, use the context selector to start a fresh specialist conversation, and ask a cross-domain question to exercise the transfer tool. Inspect the transfer state and recovery behavior.

`npm run provision -- --dry-run` prints the plan without contacting Algolia. `--skip-index` leaves the support index alone; `--skip-agents` leaves both agents alone. The script uses the direct Agent Studio API and Algolia Search indexing endpoints; it does not use DocSearch.

To update the linked Vercel project after provisioning, export a Vercel access token in the shell and add `--sync-vercel`: `VERCEL_TOKEN=... npm run provision -- --publish --sync-vercel`. This updates production, preview, and development with only runtime values; management and indexing keys are never uploaded. A new deployment is required for Vercel environment changes to take effect.

The server owns the Agent Studio IDs and API key. The browser only sends the allowlisted agent route and validated conversation messages; the server decides which opposite specialist may receive a transfer. The demo does not collect production telemetry.

The app uses the Next.js App Router and server-side Route Handlers, so it can run locally or on Vercel. Add the same server-only environment variables to the Vercel project; do not expose them as `NEXT_PUBLIC_*` values.

## Checks

Run `npm test` for the repository checks. With the app running, the browser can exercise Markdown responses, context switching, transfer to the opposite specialist, retry after an error, and cancellation while a request is in flight. Without `.env` values, the UI reports that provider calls are not configured instead of fabricating a response.

See [SPEC.md](SPEC.md) for the implementation contract.
