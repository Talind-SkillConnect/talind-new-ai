# Phase 1: Talind authorization security review and test plan

## State
**Draft / untested against a database. Do not apply to talind-production or merge without
isolated SQL + API regression tests and approval.**

Confirmed source of truth: Supabase project talind-production,
ref cghmnsukgaqdryqrktzd; live Vercel site www.talindeducation.com.

## What is proposed
1. A separate \`account_roles\` table, assigned by the trusted signup trigger. A browser
   role switch or client-provided \`p_requester_role\` cannot grant paid/free privileges.
   The four existing accounts' primary categories can be backfilled from their original
   signup metadata; legacy extra role profiles are not deleted.
2. Preserve the existing direct-contact RPC names while enforcing their authorization
   in the database. Anonymous direct RPC execution is removed. The old RPC cannot
   bypass accepted quote + membership + both agreements for teacher-to-learner contact.
3. Require an active membership to initiate paid matches and send restricted messages.
   A teacher without membership may reply to an incoming learner message; replying
   does not unlock quotes or the learner's contact details.
4. Block forged role/context during connection creation; guard status changes and
   prevent the provider from accepting their own quote.
5. Restrict the auth signup trigger's direct EXECUTE permission and lock the
   \`set_updated_at\` function search path.

## Files and order
- \`supabase/migrations/20261014_01_locked_roles_contact_access.sql\`
- \`supabase/migrations/20261014_02_match_messaging_and_quotes.sql\`
- \`supabase/tests/phase1_security_regression.sql\`

Apply 01 then 02 only in a **disposable Supabase test database** that mirrors the
current production schema and routines. Test 01's backfill on a sanitized schema
that includes auth users with valid primary-role metadata.

**Important:** Supabase currently reports no registered project migrations.
A new database branch may therefore require a verified baseline of the existing
schema, triggers, grants and policies. Do not assume a fresh branch mirrors all
production tables. The Supabase branch was quoted at USD 0.01344/hour; request
explicit cost approval before creating it.

## Static review corrections (14 October 2026)
- Fixed the dollar-quote delimiter of `target_has_role` in migration 02.
- Denied learner-to-learner direct contact disclosure in migration 01.
- Enforced match actor/audit identity on INSERT and UPDATE, and restricted quotes to INR.
- Extended SQL regression fixtures for these security cases.
- **Static review is not SQL execution:** database compatibility, RLS under real JWTs, and UI integration are unverified.

## Required automated tests
1. SQL regression script exits with a passing notice and rolls back all synthetic
   accounts, profile records, messages and connections.
2. Anonymous callers cannot execute contact RPCs or signup trigger functions.
3. A teacher cannot impersonate a learner, including by adding a legacy secondary
   \`role_profiles\` row or tampering with user metadata.
4. Only a legitimate learner can use the learner's free contact privilege.
5. An unpaid teacher cannot initiate learner chat, create paid-service connections,
   submit a quote, or accept a quote.
6. A teacher can reply after an incoming learner message without a membership, but
   still cannot view learner contact details without consent and paid membership.
7. A paid teacher can submit a positive quote; only the learner/guardian can accept;
   both professional/guardian agreements are required to unlock learner contact.
8. Institution and training-provider paid initiation is blocked until membership.
9. A third party cannot view/send messages or update a connection.
10. Admin/service operations continue to work, and all existing user records remain.

## Required end-to-end checks (browser + API)
- Use test accounts created **only in the test branch**.
- Make direct PostgREST requests with signed-in JWTs, bypassing website buttons, to
  validate the actual INSERT/UPDATE RLS policies and trigger protections.
- Try invalid requests to \`/rest/v1/rpc/get_match_contact\` and
  \`/rest/v1/rpc/get_match_contact_v2\` with a forged requester role.
- Test fresh signup, email confirmation, password reset, existing-account login.
- Confirm teacher job seeking remains free; learner-initiated messaging remains free.
- Verify valid teacher inbound replies do not inadvertently create a paid membership.
- Verify an existing user can still upload/view/download/remove a private document
  and that ownership boundaries remain intact.
- Check Supabase security advisor and runtime logs after patching.

## Known product decisions to confirm before release
- Learner-to-published-teacher contact is free and currently direct (no quote needed).
- Teacher-to-learner details require accepted quote, active membership and both
  engagement agreements; the legacy RPC must not override this rule.
- Institution / training-provider initiation and chat require membership, even if
  the client UI previously offered an unrestricted chat button.
- One account has one server-authorized primary category. Supporting multi-role
  accounts later requires an explicit admin-managed entitlement model.

## Production release gates
- Take a recoverable production database backup/checkpoint and document rollback.
- Review the branch/test results and update UI error messages if needed.
- Check the deployed site is using the same production Supabase project.
- Apply approved migrations in order, then rerun permission tests.
- Roll out Vercel code only if needed; avoid unrelated changes.
- Enable Supabase leaked-password protection in Auth settings, subject to plan
  availability; this is an Auth configuration change, not included in SQL.
- Do not merge this PR or change live production without a separate approval.

## Scope intentionally excluded
- Duplicate skill record cleanup (1,001 records for one normalized skill).
- Publishing profile records or altering matching behavior.
- Billing gateway or automatic membership activations.
- Storage bucket/policy rewrites and upload tests.
