# CRM release checklist

This branch is a prerelease. Do not merge or promote it until the coordinated application/database release is validated.

1. Verify the target Supabase and Vercel projects and environment names without printing secret values.
2. Export a fresh private database/roles/Auth/Storage backup, restore to an isolated environment and verify integrity.
3. Reconcile migration-history differences; do not repair history or apply all files blindly.
4. Rehearse the new migrations against the restored snapshot. Existing payment processing and the new receipt queue require a coordinated cutover, not simultaneous old/new writers.
5. Confirm Google OAuth configuration/consent, approved WhatsApp templates, the master-owner identifiers and OpenClaw's idempotency header contract.
6. Test on isolated provider sandbox accounts. A preview must not inherit production write credentials.
7. Agree on a short maintenance window, drain existing operations, migrate and promote together, then verify before reopening writes and scheduled work.
8. Do not automatically roll back to the old writer after the new payment/receipt states have been used. Prefer an reviewed forward fix or maintenance while reconciling.

`codex/crm-prerelease-20260927` has automatic Git deployment disabled in `vercel.json`. Other branches retain their existing deployment behavior. A manual preview can be created after its isolated environment is configured.

Credentials, backups and detailed private audit evidence are excluded from this public repository and CLI upload.
