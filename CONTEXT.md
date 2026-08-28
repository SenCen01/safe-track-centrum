# Safe Track Centrum

Domain glossary for the security guard patrol management platform.

## Language

### Roles

**Guard**:
Field staff who works Shifts, walks Patrols, scans Checkpoints, and logs Incidents. Uses the mobile app.
_Avoid_: Officer, security guard (use Guard alone)

**Operations Manager**:
Internal staff who monitors live Guard locations on the web app, receives Incident alerts, reviews Daily Activity Reports, and assigns Guards to Shifts. Scoped to the Site(s) they're assigned to (many-to-many: one Operations Manager can cover several Sites, one Site can have several Operations Managers). Cannot also hold the Admin role.
_Avoid_: Manager, dispatcher

**Admin**:
Internal staff who manages Guard and Operations Manager accounts, creates Client/Site records, and assigns Guards to Shifts. Unrestricted visibility across all Sites company-wide. Does not handle billing. Cannot also hold the Operations Manager role.
_Avoid_: Owner, super admin

**Client**:
The property owner/manager associated with a Site. Currently a passive record only — Clients do not use the software or receive any communications in v1; this may change later.
_Avoid_: Customer, account

### Patrol structure

**Site**:
A physical property under patrol. Currently one-to-one with a Client.
_Avoid_: Property, location (when referring to the top-level place)

**Route**:
The ordered sequence of Checkpoints defined for a Site that a Patrol must follow. Exactly one Route per Site for v1.
_Avoid_: Path, circuit

**Checkpoint**:
A fixed physical point on a Site's Route, marked with a QR code that a Guard scans to prove presence.
_Avoid_: Waypoint, station, stop

**Shift**:
A Guard's scheduled work period at exactly one Site. Contains one or more Patrols.
_Avoid_: Session

**Patrol**:
One walk of a Site's Route by a Guard within a Shift, complete once every Checkpoint in the Route has been scanned in order. A Patrol can also end **Incomplete**, when a Guard ends the Shift before finishing the Route (requires explicit confirmation); the Operations Manager can see this happened. Multiple Patrols occur per Shift.
_Avoid_: Round, sweep

**Incident**:
A notable event a Guard logs, distinct from routine Checkpoint scans, that immediately notifies the Operations Manager and is also included in that Shift's Daily Activity Report. Can be logged at any point during a Shift, whether or not a Patrol is currently active.
_Avoid_: Alert (an Alert is the notification an Incident triggers, not the Incident itself)

**Daily Activity Report (DAR)**:
The report generated once per Shift, rolling up every Patrol and Incident that occurred during that Shift.
_Avoid_: Summary, log
