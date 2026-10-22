# MiniLedger — Implementation Plan

**Version:** 1.1 · **Last updated:** 22 October 2026 · **Assignment deadline:** 24 October 2026

This file sequences the work and tracks progress. It **adds no rules**: behavior comes from [`prd.md`](./prd.md), technical contracts from [`architecture.md`](./architecture.md), UI from [`design.md`](./design.md). If implementation reveals a spec problem, fix the spec first, then log it in the deviation log below.

**Working rules**
- One phase at a time; a phase is done only when every exit criterion passes.
- Each task references the spec section it implements. Ship tests with the code they cover.
- CI (arch §12.2) stays green on `main`.
- Development device: a physical Android phone over USB (`adb reverse tcp:4000 tcp:4000`).

---

## Status board

| Phase | Outcome | Status | Started | Done |
|---|---|---|---|---|
| 0 | Repository foundations | Done except the on-phone check | 22 Oct 2026 | |
| 1 | P0 backend | Done | 22 Oct 2026 | 22 Oct 2026 |
| 2 | P0 Android → **assignment can be submitted** | Code done; on-device run pending | 22 Oct 2026 | |
| 3 | Complete ledger (V1 finance) | Code done; on-device run pending | 22 Oct 2026 | |
| 4 | Production auth and account lifecycle | Code done; live Resend check needs the production key | 22 Oct 2026 | |
| 5 | Receipts, themes and polish | Code done; on-device QA and dark logo assets pending | 22 Oct 2026 | |
| 6 | Deployment and Play release → **production ready** | Repository side done; cloud accounts, store listing and release pending | 22 Oct 2026 | |

---

## Phase 0 — Repository foundations

**Goal:** an empty but fully wired monorepo where every later task has a home.

- [x] pnpm workspace with `apps/mobile`, `apps/api`, `packages/shared`, `web/` (arch §3); ESLint, Prettier, TypeScript strict, `.editorconfig`, `.gitignore`
- [x] `packages/shared`: `money.ts` (arch §4.4), `dates.ts` (arch §4.5), `text.ts` (arch §4.1), error codes (arch §6.6), Zod schemas and DTO types (arch §6.2–6.5), with Vitest tests (arch §12.1 Money, Dates)
- [x] `apps/api` skeleton: ESM, `config/env.ts` with fail-closed validation (arch §7.1, §11.1), pino with redaction, request ID, helmet, JSON limits, 404 and error handler (arch §10.1), `GET /health`
- [x] Prisma 7 setup (arch §11.1) and the **complete** schema: all tables, indexes, composite FKs, CHECK constraints (arch §4.1–4.3)
- [x] `docker-compose.yml` (PostgreSQL 16, host port 5433, plus `miniledger_test`) and `.env.example`
- [x] Expo app skeleton: Expo Router, light token registry (design §2.1, §3, §4), application IDs per profile (arch §11.2), `allowBackup: false`
- [x] CI workflow (arch §12.2) and README skeleton — first GitHub run pending a pushed remote

**Exit criteria**
- `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test` pass locally and in CI.
- `prisma migrate dev` applies cleanly on a fresh database; `prisma migrate diff` reports no drift.
- The API refuses to start with a missing or short secret, or with `AUTH_MODE=assignment` when `RENDER` is set.
- The Expo app launches on the phone and reaches `GET /health` on the local API.

---

## Phase 1 — P0 backend

**Goal:** every API the assignment needs, with production-grade correctness.

- [x] Assignment OTP: `auth/config`, `otp/request`, `otp/verify` with normalization, advisory lock, cooldown and limits counted from `otp_challenges`, attempts, inline housekeeping, logged code (arch §7.2)
- [x] Sessions: JWT access tokens, `require-auth`, refresh rotation with previous-digest grace and replay revocation, logout (arch §7.3)
- [x] `GET /v1/me`, `PATCH /v1/me` (timezone, display name) (arch §4.5, §6.3)
- [x] People: `GET /v1/people` (search), `POST /v1/people` with client ID (arch §5.1, §6.3)
- [x] Loans: `POST /v1/loans` with client ID and person resolution (arch §5.1, §6.4); `GET /v1/loans` with all filters, sorts and cursor (arch §6.5); `GET /v1/loans/:id`; `POST /v1/loans/:id/settle` under the loan lock (arch §5.2)
- [x] `GET /v1/summary` (arch §4.4, §6.2)
- [x] Integration tests on real PostgreSQL (arch §12.1: Calculation, People, Isolation, Auth (assignment), Sessions, Retry safety for people/loans/settle, Contract) — 64 API tests

**Exit criteria**
- HTTP-only walkthrough: request OTP → read it in the log → verify → create loans with `personName` → settle one → the summary shows the PRD FR-05 lent figures exactly.
- Concurrency tests pass: concurrent settles create one repayment; concurrent same-ID creates insert once.
- User A gets `404` for every User B resource.

---

## Phase 2 — P0 Android → assignment can be submitted

**Goal:** every assignment requirement works end to end. Light theme only.

- [x] `api-client` with timeouts, single-flight refresh and retry; secure session storage; per-form client IDs (arch §5.1, §7.3, §9.2)
- [x] S01 launch routing, S02 phone sign-in, S03 OTP (design §6)
- [x] Home: S04 summary card at the top (hero, borrowed strip, assignment summary group) and the S05 loan list below it with overdue highlighting, infinite scroll, search, filters and sort (pulled forward from Phase 3)
- [x] S06 Add loan with `PersonPicker`, amount, due date, direction and More details (loan date, note — pulled forward from Phase 3)
- [x] S07: amounts, due status, progress, repayment history, `Mark as repaid` dialog
- [x] Minimal S12: Sign out
- [x] Brand assets (design §1.2): icon, adaptive foreground, splash mark and logo in `apps/mobile/assets/brand/` and wired in `app.config.ts`
- [ ] Monochrome themed icon (`adaptive-monochrome.png`) — waiting for the asset
- [ ] Core components: buttons, `TextField`, `MoneyField`, `DateField`, `OtpInput`, `PersonPicker`, `LoanRow`, `StatusChip`, `SummaryHero`, `Metric`, `EmptyState`, `InlineNotice`, `ConfirmDialog`, `Snackbar` (design §7)
- [ ] Loading, cold-start, offline and error states for these screens (design §9.1, §9.4)
- [ ] README: what MiniLedger is, setup, reading the OTP from the log, API examples (the brief's "friend name" = `personName`), running tests, running on a phone

**Exit criteria (assignment gate)**
- Every PRD §10 **P0** checkbox passes from a clean checkout following only the README.
- On the phone: sign in → add two loans (one past due) → overdue row highlighted → mark one repaid → summary card matches `GET /v1/summary`.
- A double tap or an airplane-mode retry on Save creates exactly one loan.

---

## Phases 3–6

### Phase 3 — Complete ledger (V1 finance)

**Goal:** all ledger features of the public V1.

- [x] Backend: `PATCH`/`DELETE /v1/loans/:id` (version, direction lock, principal minimum), repayment create/edit/delete under the loan lock, people `GET/PATCH/DELETE /:id` (arch §5.2, §6.3)
- [x] S04 borrowed strip, `overdueBorrowed` line, metric taps that set the list filters (done in Phase 2)
- [x] S05 search, direction/status filters, sort sheet, no-results state (done in Phase 2)
- [x] S06 direction control, More details (loan date, note), edit mode with all error handling
- [x] Full S07 (person link, overflow edit/delete, repayment row Edit/Remove), S08 record/edit repayment (full-screen), S13 confirmations
- [x] S09 People tab (Active/Archived, search, add person, same-name warning), S10 Person detail (balances, loans, rename, archive/unarchive, delete without loans, `Add loan with <name>`)
- [x] Error copy for every code in design §9.4
- [x] Integration tests for the new endpoints, including the repayment cases of Retry safety (82 API tests), and mobile unit tests (17)

**Exit criteria**
- Every PRD §7 edge case is demonstrable in the app.
- Loan detail, People, Home and the summary API agree after any sequence of create, repay, edit, remove and delete.
- No repayment can exceed the principal, including under concurrent requests.

### Phase 4 — Production auth and account lifecycle

**Goal:** the backend is safe to expose publicly.

- [x] Production mode: Resend adapter with timeout and failure handling, daily cap (arch §7.2, §11.1)
- [x] S02 email variant driven by `/v1/auth/config`; S03 email copy
- [x] `POST /v1/auth/reauth/request` and `DELETE /v1/me {challengeId, code}` with cascade (arch §4.2, §7.2–7.3)
- [x] Full S12: account, display name, your data, privacy links, app version, deletion flow (design §6 S12); Appearance arrives with themes in Phase 5
- [x] Tests: Auth (production) group in arch §12.1 with a mocked Resend client (fake `fetch`), account deletion (96 API tests)

**Exit criteria**
- Against a local server in production mode: phone OTP → `422`; Resend failure → `503` and no active challenge; deleting an account makes old tokens `401` and leaves no rows for that user.
- Startup fails for each misconfiguration listed in arch §7.1.

### Phase 5 — Receipts, themes and polish

**Goal:** the app meets the full design quality bar.

- [x] S11 receipts: capture, compression, cache-then-move on save, attach/replace/remove, pinch-zoom viewer, one-time disclosure, cleanup on loan delete / 404 / account deletion (arch §8)
- [x] Dark and Use device setting themes on every screen, status bar and root window (design §2.2–2.5, §7.2); Appearance selector live; dark splash (onyx + full-colour mark)
- [ ] Dark logo variants (`mark-dark.png`, `logo-dark.png`, design §1.2) — waiting for the assets; the full-colour mark is used meanwhile
- [x] Motion, haptics and reduced motion (design §8): no press scale, slide or push animation when the OS removes animations
- [x] Empty states and optional illustrations (design §9.2, §10)
- [x] Accessibility: TalkBack labels, 48dp targets, contrast audit in both themes as unit tests (design §11)
- [ ] On-phone checks: 200% font, TalkBack pass, performance (design §11–12) — needs the device
- [x] Android permissions: camera only; storage, media and audio permissions blocked (arch §10.1)

**Exit criteria**
- Design QA gates A, B and C (design §13) are fully checked, with screenshots of every screen in both themes.
- A receipt survives an app restart, and a second account on the device never sees it.

### Phase 6 — Deployment and Play release → production ready

**Goal:** a publicly available, supportable Android app.

- [ ] Neon project (pooled and direct URLs); Resend with `mail.surajmishra.me` verified; Render web service with the production env (arch §11)
- [x] Protected manual migration workflow (`.github/workflows/migrate.yml`) and Render Blueprint (`render.yaml`)
- [ ] First `prisma migrate deploy` against Neon (arch §11.3) — needs the Neon project
- [x] Weekly encrypted backup workflow (`backup.yml`, `pg_dump` + `age`, 30-day artifacts)
- [ ] One tested restore (arch §13) — needs the Neon project
- [x] `web/privacy.html` and `web/delete-account.html` written, Pages workflow added, linked in Settings (arch §10.2)
- [ ] Pages custom domain `miniledger.surajmishra.me` configured — needs the pushed repository and DNS
- [x] `eas.json` profiles; `app.config.ts` refuses a production build without a public HTTPS API URL; production manifest checked (no storage/audio permissions, release build blocks cleartext)
- [ ] EAS production AAB built and verified (arch §11.2) — needs the Expo account
- [ ] Play Console: listing (described as a personal record-keeping tool that does not offer or arrange loans), Data Safety, financial-features declaration, deletion URL, reviewer test mailbox (arch §7.4)
- [ ] Internal testing track, then the full manual smoke test (arch §12.3)
- [ ] If Play Console requires a closed test for this app, run it (12 testers, 14 days) before applying for production
- [x] README: production deployment and operations

**Exit criteria (production gate)**
- Every PRD §10 **P1** checkbox and every arch §15 checkbox passes.
- The smoke test passes on the internal-track build against production.
- **→ Submit to Google Play.**

---

## Assignment submission (due 24 October 2026)

Submit as soon as Phase 2 passes; record again later only if it adds value before the deadline.

- [ ] GitHub repository is public; README verified from a fresh clone
- [ ] 2–3 minute recording (Loom or Google Drive), screen-mirroring the phone next to the API terminal (e.g. `scrcpy`):
  1. Request a code and show the OTP printed in the server log; sign in.
  2. Summary card at the top and the list with an overdue entry highlighted.
  3. Add an entry (person name, amount, due date); show the summary update.
  4. Mark an entry repaid; show the summary update.
  5. Briefly show validation (e.g. ₹0 rejected) and `pnpm test` passing.
  6. If Phase 5 is done: attach a receipt photo (bonus) and mention it stays on the device.
- [ ] If the Play build is not approved in time, offer the evaluator internal-testing access (needs their Google account email)
- [ ] Email the GitHub link and recording link

---

## Deviation log

Record every case where implementation needed a spec change. Update the spec in the same commit.

| Date | Phase | Change | Reason | Spec section updated |
|---|---|---|---|---|
| 22 Oct 2026 | 0 | Expo routes live in `apps/mobile/src/app/` | Expo SDK 58 template default | arch §3 |
| 22 Oct 2026 | 0 | Local PostgreSQL on host port 5433 | Port 5432 already used by a local PostgreSQL install | arch §3, README |
| 22 Oct 2026 | 0 | Shared package exports TS source via conditions; esbuild bundles shared and API for production | Lets Metro, tsx and Vitest use source while Node runs plain JS | arch §3 |
| 22 Oct 2026 | 0 | Prisma pinned to 7.10.1, TypeScript to 6.0.3 | npm `latest` for Prisma is an 8.0 release candidate; typescript-eslint supports TS < 6.1 | — |
| 22 Oct 2026 | 1 | OTP cooldown ignores `FAILED` challenges | Otherwise a failed email delivery would block the retry for 60 s | arch §7.2 |
| 22 Oct 2026 | 1 | Timezones keep the supplied canonical name | ICU's `resolvedOptions()` returns the legacy `Asia/Calcutta` for `Asia/Kolkata` | arch §4.5 |
| 22 Oct 2026 | 2 | Sign-in routes are top-level (`sign-in`, `verify-otp`); signed-in screens live in an `(app)` group behind `Stack.Protected` | Expo Router's documented auth-guard pattern | arch §3 |
| 22 Oct 2026 | 2 | Forms use component state + the shared Zod schemas; React Hook Form not used | Forms are small; one less dependency to explain | arch §2 |
| 22 Oct 2026 | 2 | Typed routes disabled | Generated route types are git-ignored, so CI typecheck could not rely on them | — |
| 22 Oct 2026 | 3 | S08 is always a full-screen route (`loans/[id]/repayments/new`, `/[repaymentId]`) | Design allows full screen; one presentation avoids keyboard/large-text sheet issues | design S08 |
| 22 Oct 2026 | 4 | Resend is called through its REST API with `fetch` instead of the SDK | A real 10 s abort (`AbortSignal.timeout`), an idempotency key per challenge, and one less dependency | arch §2 |
| 22 Oct 2026 | 5 | Receipts are attached from Add loan and Loan details only; S07 never shows "Receipt unavailable" | The file is the only index (arch §8), so a missing file is indistinguishable from "never attached" | design S07, S11 |
| 22 Oct 2026 | 5 | Camera permission declared explicitly; storage/media/audio permissions blocked | The photo picker needs no permission; keeps the Data Safety form minimal | arch §10.1 |
