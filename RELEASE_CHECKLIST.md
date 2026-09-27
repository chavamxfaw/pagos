# CRM release checklist

## Production cutover — 2026-09-27

Application commit `f3abfc4` was manually deployed to production after the authorized maintenance window and the eleven September database migrations. Production deployment: `dpl_AJu3FLivREnCmkQ6aAYV7VyzDMSg`. The existing public domain remains `https://pagos.sitios-dev.info`.

The private backup and exact migration execution mapping are retained outside this repository. Historical customer, order and payment row digests were unchanged. The new receipt queue started empty; historical receipts were not queued. Local verification passed 66 unit/mock/permission tests, lint and TypeScript; isolated preview and production builds passed.

Google OAuth consent/brand publication and a real connection remain pending. New sender-aware WhatsApp templates remain pending. The legal notice is explicitly a draft without a public address. No live charge or customer message was used as a test, and an authenticated end-to-end production walkthrough remains required.

**Do not redeploy the old `main` commit or roll back the application alone against the migrated database.** The source was published on `codex/crm-prerelease-20260927`; `main` has not been merged. Future releases must use compatible code and reconcile migration names before applying anything: the migration API assigned execution timestamps, as already happened in the older migration history.

## Checklist for future coordinated releases

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
