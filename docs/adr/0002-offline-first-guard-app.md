---
status: accepted
---

# Offline-first Guard mobile app

Guards patrol locations with unreliable connectivity (basements, remote lots), and a Checkpoint scan or Incident must never be lost — route-order validation ("you missed a Checkpoint, go back") needs to keep working without a live connection. The Guard app caches the active Shift's Route/Checkpoint manifest locally, validates scan order on-device, and queues scans/incidents/GPS pings locally, syncing to Supabase once connectivity returns.

We chose offline-first over assuming connectivity despite the added engineering cost: a Guard unable to log a Checkpoint in a dead zone defeats the product's core promise of provable patrol completion.

## Consequences

Needs a local persistence layer on-device (e.g. SQLite or WatermelonDB) and a sync/conflict-resolution strategy for out-of-order writes reaching the server — chosen at implementation time, not fixed by this ADR.
