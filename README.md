# Clean handoff between specialized agents

Local chat demo of an application-owned handoff from a Sales agent to a Support agent.

## User contract

- The user stays in one chat interface.
- The application, not the model, resolves the destination agent.
- Only an allowlisted destination and the minimum approved context are transferred.
- The UI shows when a handoff starts, succeeds, or needs recovery.
- The demo does not present the switch as a native Agent Studio agent-to-agent feature.

## Planned local use

1. Copy `.env.example` to `.env` and fill in the required values.
2. Install the project dependencies.
3. Start the local app with `npm run dev`.
4. Ask Sales a plan question, then ask a Support question such as a SAML troubleshooting question.
5. Inspect the transfer state, the active agent label, and the recovery behavior for a failed handoff.

See [SPEC.md](SPEC.md) for the implementation contract.
