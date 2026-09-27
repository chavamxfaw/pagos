# Calendar security regressions

No test invokes Google or sends invitations. No production URLs or `.env` are used.

## Shared local Supabase

`node lib/calendar/local-api.test.mjs` reads CLI status in memory and refuses any API other than `127.0.0.1:54421` / DB port `54422`. It creates its own users/contacts/calendars, checks contact approval, ownership, idempotency and fenced work claims, and deletes only those generated fixtures. It never rotates or signs out the demo account.

`booking.test.sql` and `recovery.test.sql` use rollback-only fixtures. These cover spoofed guest email, explicit/idempotent owner approval, destination immutability, overlapping reservations, backoff, ten poison jobs versus the eleventh job, review after five attempts, stale-worker fencing, and cancellation intent. Permission catalog assertions are supplemented by actual denied calls in the isolated suite below; permissions have not been broadened.

## Isolated engine / concurrency tests

`permissions.test.mjs` and `concurrency.test.mjs` intentionally target only Docker container `pagos-calendar-audit-isolated`, through its Unix socket. No host port is exposed. Bootstrap from an empty disposable PostgreSQL using:

1. `lib/calendar/fixtures/bootstrap.sql` (synthetic roles/tables only).
2. Migration `20260911030906_calendar_booking.sql`.
3. Migration `20260911034719_calendar_booking_destination_snapshot.sql`.
4. Migration `20260927173326_calendar_verified_contacts_recovery_queue.sql`.

Run `node --test lib/calendar/permissions.test.mjs lib/calendar/concurrency.test.mjs`. There are 12 actual anon/authenticated denial cases in fresh backends, plus synchronized reservation and competing-worker races. Existing fixtures are not loaded. The container used on 2026-09-27 is `public.ecr.aws/supabase/postgres:17.6.1.111`, `--network none`, with `plpgsql,plpgsql_check,pgaudit` shared preloads and `supautils` session preload. To reuse its already-initialized schema, start that exact stopped container with `docker start pagos-calendar-audit-isolated`; do not reapply the bootstrap. Other project containers are out of scope.

## ENV-01: scope and remaining uncertainty

The earlier shared Supabase run terminated a backend with signal 11 during the final anonymous `DO` block after privileged function execution/role switching. This was an engine failure, not a valid access denial. We did **not** repeatedly reproduce it on the shared DB.

The original test passed on the same PostgreSQL 17.6 image in an isolated minimal schema: (a) without preloads, (b) with `supautils`, and (c) with `plpgsql_check`, `pgaudit`, and `supautils`. Thus the exact engine/extension cause is **not confirmed**. Do not claim the underlying runtime defect has been fixed. The revised test separates denied function execution into fresh sessions and retains privilege assertions; both updated SQL suites and 11 real Data API checks passed against shared local Supabase without a crash. Isolated negative/concurrency suite passed 13/13.

Before production rollout, use a provider-supported patched PostgreSQL version and rerun these regressions in staging; do not copy local preload overrides to production or disable security extensions to make tests pass. Supabase's 2026-09-25 PostgreSQL 15.19/17.11 advisory should be assessed separately; its btree_gist float/NaN index concern is not the UUID/range exclusion index here.

## Recovery behavior

Jobs have exclusive claim tokens. Each failed attempt receives exponential backoff (2,4,8,16 minutes); the fifth failure enters owner review and retains the occupied interval. Expired leases (15 minutes) are fenced before retry. Cancellation retries remain cancellations and never recreate events. `retryBooking` is an authenticated owner action that releases one reviewed job for retry. Public cancellation never overrides an active lease or retry backoff.

Google operations have a 60-second absolute budget measured from the database claim, propagated through refresh-token, lookup, all free/busy calls, and writes. Immediately before each POST/DELETE (after refresh-token work), the worker rechecks its live database claim and deadline. Inactive owners are quarantined, not perpetually selected. This bounds normal processing well below the lease; it does **not** create an atomic transaction with Google. An already accepted/in-flight remote request or an OS suspension precisely across the final check/write boundary remains a distributed-systems limitation; use the stable Google event ID and operational reconciliation rather than claiming exactly-once external execution.

Guest details remain on the booking; a public request creates no CRM contact and matches no existing email. Historical links remain `legacy_unverified` for review without destructive unlinking. Owner approval explicitly chooses an existing CRM contact and records actor/time; changing an already approved association is rejected.
