# Clean handoff between specialized agents

Technical demo for an application-owned handoff from a Sales agent to a Support agent while keeping the user in one chat interface.

## Planned demo

- Separate direct Agent Studio agents for Sales and Support.
- A narrowly defined `switch_agent` event or tool.
- Server-side destination allowlist and agent-ID resolution.
- Short context transfer from Sales to Support.
- Visible handoff state, failure handling, retry, and cancellation.
- Local measurements for handoff completion, handoff latency, context size, and recovery.

The application owns the switch. The demo should not present this as a native Agent Studio agent-to-agent feature.
