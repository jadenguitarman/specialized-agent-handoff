# Specification

## Contract

Honor the user contract in `README.md`: one chat surface, application-owned destination resolution, minimum context transfer, visible recovery, and no claim of native agent-to-agent handoff.

## Scope

Build a local chat demo with separate direct Agent Studio Sales and Support agents. Sales can request a narrowly defined switch; the application resolves and validates the destination before calling Support.

## Required behavior

- Keep Sales and Support agent IDs server-side.
- Validate a route name against an allowlist.
- Transfer the latest question, concise summary, and approved user/tenant context only.
- Show handoff progress and active-agent state.
- Handle unknown destinations, missing context, timeouts, rate limits, retry, and cancellation.
- Record handoff completion, handoff latency, context size, and recovery locally.

## Non-goals

No arbitrary agent IDs, secret transfer, full production identity system, or native Agent Studio handoff claim.

## Provisioning

`npm run provision` verifies the product index, creates and seeds a small support index, and creates or updates the Sales and Support agents through Agent Studio API v1. `ALGOLIA_INDEXING_API_KEY` is used only for index writes; `ALGOLIA_AGENT_STUDIO_MANAGEMENT_API_KEY` is used only for agent create/update/publish; `ALGOLIA_AGENT_STUDIO_API_KEY` remains the runtime completion key. The script never needs an Admin API key. `--dry-run`, `--skip-index`, `--skip-agents`, and `--publish` control the operation.

## Acceptance

A user can move from Sales to Support without restarting the chat, and every destination and context value is validated by the application. The Next.js app serves the browser demo and handles provider calls in Node.js Route Handlers compatible with Vercel.
