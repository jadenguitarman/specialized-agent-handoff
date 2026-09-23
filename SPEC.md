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

## Acceptance

A user can move from Sales to Support without restarting the chat, and every destination and context value is validated by the application.
