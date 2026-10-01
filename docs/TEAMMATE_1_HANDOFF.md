# Teammate 1 implementation

The landing-page feature grid uses three equal-width cards for Live Interpreter Relay, Vision AI, and Audit Trail at desktop widths. It keeps the existing mobile and tablet breakpoints.

## Authorization and data changes

- `lib/auth.ts`: `requireStaff()`, `requireInterpreter()`, `requireKioskOrStaff(sessionId)`, and `requireSessionAccess(sessionId)`. Staff requests use the cookie-based Supabase client and hospital RLS. Interpreters must be assigned to a session. Kiosk requests use service-role only after validating the stored token hash, session, expiration, and revocation.
- Every patient-data API has an access check. Proxy returns JSON 401 for logged-out API requests and routes portal users by their stored profile role. Server layouts enforce roles and patient pairing as well.
- LiveKit tokens accept a session room ID; names and identities come from the authorized profile or kiosk. Unconfigured video returns 503.
- `/api/session` creates sessions only with POST. Hospital and creator come from the profile. Admission requires a separate bed label. GET uses exact normalized bed matching and never creates or resets a session. There are no in-memory or fabricated patient fallbacks.
- QR codes are generated locally. `POST /api/session/[id]/pairing` creates a five-minute secret. `/pair#<secret>` keeps it out of server logs and referrers. The tablet explicitly exchanges it at `POST /api/kiosk/pair` for a session-specific httpOnly cookie. A database transaction prevents secret reuse. Access expires after 12 hours or discharge.
- The events DELETE route is removed. “Hide Earlier” filters the current transcript view; “Show full audit history” restores it. Migration triggers reject UPDATE, DELETE, and TRUNCATE, including privileged writes.
- Evaluation credentials on all three portal screens appear only with `NEXT_PUBLIC_DEMO_MODE=true`. This flag never bypasses authentication.
- Migration 006 reconciles `created_by`, adds/backfills `bed_label` and `requested_at`, prevents duplicate active beds, restricts profile authorization fields, and scopes event inserts to authorized actors and sessions.
- The seed creates random session IDs, supplies `created_by` and bed labels, preserves active sessions on rerun, and uses the same hospital name as migration 003.

## Applying the changes

1. Apply migrations 001–006 in order to a fresh Supabase project, or migration 006 to an existing database at 005. Migration 006 closes older duplicate active beds while retaining their audit events; review existing bed labels before rollout.
2. Configure the Supabase URL, anon key, and service-role key in `.env.local`. Configure LiveKit credentials and URL for actual calls. Use HTTPS for production kiosk cookies.
3. Run `bun run seed:prod` against the intended demo project. These evaluation accounts are for the demo environment.
4. Sign in as staff, admit/select a bed, generate a QR code, scan it on the tablet, and press “Pair this tablet”. Create a new pairing link after expiry or consumption.

## Integration with Teammate 2

The stricter video checks require a persisted interpreter assignment. Migration 006 supplies `claim_session(session_id)`, and the acceptance UI calls the authorized `/api/session/[id]/claim` endpoint before navigating. A losing claim returns 409. Assigned interpreters change call status through `set_interpreter_session_status(target_id, new_status)`; direct interpreter table updates are disabled. These are the minimum integration changes needed for the authorization rules.

Teammate 2 should use `requested_at`, retain server authorization on new API routes, and build on the claim RPC. Existing browser broadcasts and public Supabase Realtime topics still need authorization and hospital isolation; API authorization does not secure those topics. Duplicate broadcasts, acknowledgement, timeout consistency, and reliable server event persistence remain that teammate’s work.

## Verification

`bun run check:security` applies every migration to fresh embedded PostgreSQL, with locally bootstrapped Supabase auth/storage schemas and roles. It checks hospital RLS, profile role/hospital protection, audit retention, pairing replay denial, exclusive interpreter ownership, and discharge revocation. This verifies SQL behavior; it does not provision or test a hosted Supabase project.

Logged-out HTTP requests to the API routes were checked against the local Next server. TypeScript and a production Webpack build were checked. The default Turbopack build encountered the machine’s unconfigured Node shim in a CSS worker. The existing lint failures from `Date.now()` during dashboard rendering remain in the Teammate 5 scope.

To repeat the HTTP checks with a running server, use `bun run check:security http://localhost:3100`. The Playwright CLI callback at `scripts/check-feature-layout.playwright.js` verifies the desktop row, mobile width, and anonymous portal; its desktop screenshot is `docs/feature-cards-desktop.png`.

A hosted fresh-project demo and live Supabase/LiveKit call cannot be verified until project credentials are configured. Those integrations and the remaining teammates’ tasks are required before describing the application as ready for a hospital pilot.
