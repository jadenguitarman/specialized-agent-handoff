# AGENTS.md

Read `README.md` first. It is the user contract. Read `SPEC.md` before changing behavior.

## Behavior

- Keep the demo focused on direct Agent Studio usage. Do not add DocSearch.
- Keep destination resolution and authorization in the application, not in the browser or model.
- Transfer only the minimum approved context; never commit secrets.
- Treat the switch as application-owned, not as a native Agent Studio handoff.
- Label fixture data and local measurements honestly; do not make production claims.
- Make the smallest change that satisfies the request and update `SPEC.md` when behavior changes.

Before handing off work, run the documented checks and exercise success, unknown destination, timeout, retry, and cancellation paths.
