---
status: accepted
---

# Incident notifications: in-app + email only for v1

Operations Manager only uses the web app, not a mobile app, so mobile push doesn't apply to them. Incident notifications for v1 are delivered via Supabase Realtime (an immediate in-app alert on the web dashboard) plus email; SMS and mobile push are explicitly out of scope for v1.

## Considered Options

SMS (via Twilio or similar) was rejected for v1 to avoid an added paid dependency and failure mode. It can be added later without restructuring the Incident model, since notification delivery is a side effect of Incident creation, not part of its identity.
