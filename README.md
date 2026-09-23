# Clean handoff between specialized agents

Local chat demo of an application-owned handoff from a Sales agent to a Support agent.

## User contract

- The user stays in one chat interface.
- The application, not the model, resolves the destination agent.
- Only an allowlisted destination and the minimum approved context are transferred.
- The UI shows when a handoff starts, succeeds, or needs recovery.
- The demo does not present the switch as a native Agent Studio agent-to-agent feature.

## Local use

1. From the parent `Algolia Projects` folder, copy the shared `.env.example` to `.env`.
2. Fill in the application ID, product index, Agent Studio key, management/indexing keys, and Agent Studio provider/model. Do not fill in the generated support index or agent IDs.
3. Run `npm run provision`. It verifies the product index, creates and seeds the support index, and creates or updates the Sales and Support agents through the direct Agent Studio API. Generated IDs and index names are written back to the shared `.env` and to the ignored `provisioned.env` file.
4. The script writes `ALGOLIA_SUPPORT_INDEX` and both agent IDs into the shared `.env`, preserving the credentials you supplied. Set `PUBLISH_AGENTS=true` or pass `--publish` when the drafts are ready to publish.
5. Start the Next.js app with `npm run dev`, then open `http://localhost:3000`. For a production-style local check, run `npm run build && npm start`.
6. Ask Sales a plan question, then use the application’s Support switch. Inspect the transfer state, active agent label, and recovery behavior.

`npm run provision -- --dry-run` prints the plan without contacting Algolia. `--skip-index` leaves the support index alone; `--skip-agents` leaves both agents alone. The script uses the direct Agent Studio API and Algolia Search indexing endpoints; it does not use DocSearch.

To update the linked Vercel project after provisioning, export a Vercel access token in the shell and add `--sync-vercel`: `VERCEL_TOKEN=... npm run provision -- --publish --sync-vercel`. This updates production, preview, and development with only runtime values; management and indexing keys are never uploaded. A new deployment is required for Vercel environment changes to take effect.

The server owns the Agent Studio IDs and API key. The browser only sends the allowlisted route name and the approved handoff packet. The demo records handoff status, latency, context size, and recovery locally in the browser; this is not production telemetry.

The app uses the Next.js App Router and server-side Route Handlers, so it can run locally or on Vercel. Add the same server-only environment variables to the Vercel project; do not expose them as `NEXT_PUBLIC_*` values.

## Checks

Run `npm test` for the repository checks. With the app running, the browser can exercise a normal message, the Sales-to-Support handoff, retry after an error, and cancellation while a request is in flight. Without `.env` values, the UI reports that provider calls are not configured instead of fabricating a response.

See [SPEC.md](SPEC.md) for the implementation contract.
