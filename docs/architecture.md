# MiniLedger — Technical Architecture Specification

**Version:** 1.2  
**Status:** Implementation-ready  
**Last reviewed:** 22 October 2026  
**Targets:** Android (React Native + Expo), Node.js REST API, PostgreSQL  
**Companion specifications:** [`prd.md`](./prd.md) defines behavior and acceptance; [`design.md`](./design.md) defines the interface, light/dark tokens, accessibility and motion; [`implementation.md`](./implementation.md) sequences the work.

---

## 0. Architecture contract

MiniLedger is a **personal recordkeeping app**, not a payment or lending platform. Implement the following without substitution:

1. **One pnpm monorepo, one mobile app, one Express API, one PostgreSQL schema.** Modular monolith; no microservices, message brokers, queues, GraphQL, Firebase, Redis or Google OAuth.
2. **Assignment** uses mock **phone OTP printed in local Node.js server logs**; **production** uses real **email OTP via Resend**. Both use the same OTP engine and the same app-owned sessions. `AUTH_MODE` is decided **server-side only**.
3. **Local assignment and public production use separate databases and credentials.** A publicly reachable API never offers phone OTP.
4. **All money is exact integer paise.** `LENT` and `BORROWED` are never netted. `totalLent`, `totalRepaid` and `overdueAmount` keep the PRD meanings (lent loans only).
5. **PostgreSQL is the source of truth** for users, people, loans, repayments, OTP challenges and sessions. Every financial write is transactional, serialized per loan, and safe to retry.
6. **Receipts are strictly device-local.** No receipt bytes, paths, identifiers or photo metadata reach the backend.
7. **No offline ledger reads or writes in V1.** Only local receipts are available offline.
8. **Hard deletes everywhere.** No soft-delete columns, no undo.
9. **Terminology:** `person` / `people` everywhere in code, API and UI (see PRD §0).
10. **No background jobs.** Housekeeping runs inline in the requests that create the data (§7.2).

**Precedence:** PRD (product/business behavior) → this document (technical contracts) → DESIGN (UI/UX). If documents conflict, the higher one wins and the lower one must be fixed; never silently invent behavior.

---

## 1. System topology

```text
                  ASSIGNMENT (local)                       PRODUCTION (Google Play)
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │ Expo Android dev/preview build│        │ Signed Android release (AAB)  │
       │ Phone → OTP entry             │        │ Email → OTP entry             │
       └───────────────┬───────────────┘        └──────────────┬────────────────┘
                       │ HTTP (dev only) / JSON                │ HTTPS / JSON
                       ▼                                       ▼
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │ Local Node.js Express API     │        │ Render Node.js Express API    │
       │ AUTH_MODE=assignment          │        │ AUTH_MODE=production          │
       │ OTP printed to terminal       │        │ OTP emailed via Resend        │
       └───────────────┬───────────────┘        └──────────────┬────────────────┘
                       ▼                                       ▼
       ┌───────────────────────────────┐        ┌───────────────────────────────┐
       │ Local PostgreSQL (Docker)     │        │ Neon PostgreSQL (Free plan)   │
       └───────────────────────────────┘        └───────────────────────────────┘

       On each Android device: app-private receipt files, derived from user/loan IDs.
       No photo transfer to Express / Render / Neon / Resend.
```

**Request path:** App → API → request ID → auth → Zod validation → controller → service (rules, authorization) → repository (Prisma / parameterized SQL) → PostgreSQL. Only the backend calls Resend.

**Deployment reality:** Render Free sleeps after 15 minutes idle (cold starts of up to about a minute) and has an ephemeral filesystem. Acceptable for evaluation and hobby use, **not** a reliability guarantee. Never store app data on Render's disk.

---

## 2. Technology and responsibilities

| Area | V1 choice | Rule |
|---|---|---|
| Mobile | React Native + Expo + TypeScript; Expo Router | Android app, navigation, native behaviors |
| UI | React Native components, `react-native-svg`, `lucide-react-native` | Semantic components consuming `design.md` tokens; no web UI framework |
| Server state | TanStack Query | In-memory cache and invalidation; **no persisted cache, no offline mutation queue** |
| Local UI state | React state / context | Theme, forms; no global state library |
| Forms | React Hook Form + Zod (schemas from `packages/shared`) | Same validation rules and messages as the API |
| IDs on device | `expo-crypto` `randomUUID()` | Client-generated IDs for new records (§5.1) |
| Credentials | `expo-secure-store` | Access token, refresh token, current user ID |
| Preferences | AsyncStorage | Only `miniledger:theme` and `miniledger:receiptNoticeSeen` |
| Receipts | `expo-image-picker`, `expo-image-manipulator`, `expo-file-system` | One compressed JPEG per loan in app-private document storage |
| API | Node.js LTS + Express + TypeScript (ESM) | Versioned JSON REST API |
| Persistence | PostgreSQL 16+ with Prisma ORM / Migrate (v7 pattern) | Transactions, constraints, migrations |
| Validation | Zod at the API boundary | Reject bad input before domain logic |
| Auth tokens | `jose` (HS256 JWT) + opaque refresh tokens | Revocable server sessions |
| Logging | `pino` | Structured, redacted JSON logs |
| Email | Resend Node SDK | Production OTP only |
| Tests | **Vitest** for `api` and `shared`; **jest-expo** for mobile unit tests; Supertest for HTTP | Expo's supported runner on mobile; one runner per package |
| Hosting | Render Free web service + Neon Free PostgreSQL | Upgrade when reliability requires |
| Distribution | Expo EAS Build → Google Play | Separate assignment/production profiles |

**Version policy:** Use current stable releases at implementation time, commit `pnpm-lock.yaml`, and use the package versions the installed Expo SDK recommends (`npx expo install`). Do not hard-code unverified versions in docs.

---

## 3. Repository structure

```text
miniledger/
├── apps/
│   ├── mobile/
│   │   ├── app/                                   # Expo Router (screen IDs from design.md)
│   │   │   ├── _layout.tsx                        # Providers: theme, query, session; S01 routing
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in.tsx                    # S02
│   │   │   │   └── verify-otp.tsx                 # S03
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx                    # Home, People, Settings
│   │   │   │   ├── index.tsx                      # S04 summary + S05 loan list
│   │   │   │   ├── people.tsx                     # S09
│   │   │   │   └── settings.tsx                   # S12
│   │   │   ├── loans/
│   │   │   │   ├── new.tsx                        # S06 (accepts ?personId=)
│   │   │   │   ├── [id]/index.tsx                 # S07
│   │   │   │   ├── [id]/edit.tsx                  # S06 edit
│   │   │   │   ├── [id]/receipt.tsx               # S11 viewer
│   │   │   │   ├── [id]/repayments/new.tsx        # S08 (sheet presentation)
│   │   │   │   └── [id]/repayments/[repaymentId].tsx  # S08 edit
│   │   │   ├── people/[id].tsx                    # S10
│   │   │   └── settings/delete-account.tsx        # S12 deletion flow
│   │   ├── src/
│   │   │   ├── components/                        # Design-system components (design.md §7)
│   │   │   ├── features/{auth,dashboard,loans,repayments,people,receipts,settings}/
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts                  # fetch wrapper, auth, refresh, timeouts
│   │   │   │   ├── query-client.ts
│   │   │   │   ├── session-store.ts               # secure-store access
│   │   │   │   └── receipt-store.ts
│   │   │   ├── theme/                             # tokens, provider, fonts
│   │   │   └── assets/                            # SVG illustrations only
│   │   ├── app.config.ts
│   │   ├── eas.json
│   │   └── package.json
│   └── api/
│       ├── src/
│       │   ├── app.ts                             # Express app + middleware order
│       │   ├── server.ts                          # listen, graceful shutdown
│       │   ├── config/env.ts                      # Zod-validated environment
│       │   ├── lib/{prisma.ts,clock.ts,jwt.ts,crypto.ts,mailer.ts,logger.ts,dates.ts}
│       │   ├── middleware/{request-id.ts,require-auth.ts,error-handler.ts}
│       │   ├── modules/{auth,users,people,loans,repayments,summary}/
│       │   └── routes.ts                          # mounts /health and /v1 module routers
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/                        # includes raw-SQL CHECK constraints
│       ├── prisma.config.ts                       # CLI datasource = DIRECT_URL
│       ├── tests/{unit,integration,fixtures}/
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── schemas/                           # Zod request/response schemas
│       │   ├── contracts/                         # DTO types, error codes
│       │   ├── money.ts                           # parse/format paise
│       │   ├── dates.ts                           # YYYY-MM-DD validation and arithmetic
│       │   ├── text.ts                            # name normalization, code-point length
│       │   └── index.ts
│       └── package.json
├── web/                                           # static privacy + deletion-request pages
│   ├── privacy.html
│   └── delete-account.html
├── .github/workflows/ci.yml
├── docker-compose.yml                             # db service
├── pnpm-workspace.yaml
├── .env.example                                   # placeholders only
├── docs/{prd.md,design.md,architecture.md,implementation.md}
└── package.json
```

**Layering:** router → Zod schema → controller (HTTP mapping only) → service (rules, ownership, transactions) → repository. Controllers contain no money math or SQL. `packages/shared` is **pure TypeScript** whose only runtime dependency is Zod; it never imports Prisma, Express, `jose` or secrets.

**Package names:** `@miniledger/mobile`, `@miniledger/api`, `@miniledger/shared`. **Android application ID:** `com.surajmishra.miniledger` (production), `com.surajmishra.miniledger.dev` (development/preview).

---

## 4. Data model and invariants

### 4.1 Tables

All IDs are UUIDs. **People, loans and repayments receive their ID from the client** in the create request (§5.1); all other IDs are generated by the API with `crypto.randomUUID()`. All timestamps are `timestamptz` in UTC. Column names are snake_case in SQL and camelCase in Prisma (`@map`).

**Character limits** (person name 80, display name 60, notes 500) count **Unicode code points** after normalization, matching PostgreSQL `varchar(n)`. Shared Zod schemas check `[...value].length`; the mobile character counters use the same helper (`shared/text.ts`).

**`users`**

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | |
| `identifier_type` | enum `PHONE`, `EMAIL` | `PHONE` only in assignment, `EMAIL` only in production |
| `identifier` | text | Canonical form (§7.2). Unique with `identifier_type` |
| `display_name` | varchar(60) null | Trimmed; empty string stored as null |
| `timezone` | text, default `'Asia/Kolkata'` | Canonical IANA name (§4.5) |
| `created_at`, `updated_at` | timestamptz | |

**`people`**

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | Client-generated |
| `user_id` | uuid FK → users, **ON DELETE CASCADE** | |
| `name` | varchar(80) | Trimmed, internal whitespace collapsed to one space, NFC-normalized; 1–80 code points |
| `name_key` | text | `name.toLowerCase()`; used for matching, search and sort |
| `archived_at` | timestamptz null | Non-null = archived |
| `created_at`, `updated_at` | timestamptz | |

Constraints: `UNIQUE (id, user_id)` (target of a composite FK). **No uniqueness on name.**

**`loans`**

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | Client-generated |
| `user_id` | uuid FK → users, ON DELETE CASCADE | |
| `person_id` | uuid | Composite FK `(person_id, user_id)` → `people(id, user_id)` **ON DELETE NO ACTION** |
| `direction` | enum `LENT`, `BORROWED` | |
| `principal_paise` | bigint | `CHECK (principal_paise > 0 AND principal_paise <= 1000000000)` |
| `loan_date` | date | ≤ today at write time |
| `due_date` | date | Any valid date in range (§4.5) |
| `note` | varchar(500) null | |
| `version` | integer, default 1 | +1 on every change to the loan or its repayments |
| `last_activity_at` | timestamptz | Set on create and on every change to the loan or its repayments |
| `created_at`, `updated_at` | timestamptz | |

Constraints: `UNIQUE (id, user_id)`.

**`repayments`**

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | Client-generated (server-generated for settle) |
| `user_id` | uuid FK → users, ON DELETE CASCADE | |
| `loan_id` | uuid | Composite FK `(loan_id, user_id)` → `loans(id, user_id)` **ON DELETE CASCADE** |
| `amount_paise` | bigint | `CHECK (amount_paise > 0 AND amount_paise <= 1000000000)` |
| `paid_on` | date | ≤ today at write time |
| `note` | varchar(500) null | |
| `created_at`, `updated_at` | timestamptz | |

Invariant (enforced under the loan lock, §5.2): `SUM(amount_paise) ≤ loans.principal_paise` per loan.

**`otp_challenges`** (also the source of OTP rate limits, §7.2)

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | Returned to the client as `challengeId` |
| `purpose` | enum `LOGIN`, `REAUTH` | `REAUTH` = account-deletion confirmation |
| `identifier_type` | enum `PHONE`, `EMAIL` | |
| `identifier` | text | Canonical destination |
| `ip_hash` | text | HMAC-SHA-256(`OTP_HMAC_SECRET`, client IP), hex |
| `session_id` | uuid null FK → sessions, ON DELETE CASCADE | Required for `REAUTH`, null for `LOGIN` |
| `code_digest` | text | HMAC-SHA-256 (§7.2), hex |
| `attempts` | integer default 0 | Wrong-code count; max 5 |
| `state` | enum `PENDING`, `ACTIVE`, `CONSUMED`, `INVALIDATED`, `FAILED` | §7.2 |
| `expires_at` | timestamptz | `created_at + 5 min` |
| `created_at`, `updated_at` | timestamptz | |

Expiry is evaluated from `expires_at` at read time; there is no `EXPIRED` state.

**`sessions`**

| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | JWT `sid` |
| `user_id` | uuid FK → users, ON DELETE CASCADE | |
| `refresh_token_digest` | text UNIQUE | HMAC-SHA-256 of the current refresh token |
| `previous_refresh_token_digest` | text UNIQUE null | Digest of the token replaced at the last rotation |
| `rotated_at` | timestamptz null | Time of the last rotation |
| `refresh_expires_at` | timestamptz | `min(now + 30 days, absolute_expires_at)`, reset on each rotation |
| `absolute_expires_at` | timestamptz | `created_at + 90 days`; never extended |
| `revoked_at` | timestamptz null | |
| `revoke_reason` | enum `LOGOUT`, `REPLAY_DETECTED` null | |
| `created_at`, `updated_at` | timestamptz | |

### 4.2 Referential integrity and deletion

- **Account deletion** is one `DELETE FROM users WHERE id = $1`. Cascades remove people, loans, repayments and sessions (→ reauth challenges). `loans → people` uses `NO ACTION` (checked at end of statement), so the cascade succeeds because both rows go in the same statement. In the same transaction, anonymize the user's `LOGIN` challenges (`identifier_type`, `identifier` match): set `identifier = 'deleted'` and `state = INVALIDATED`. The rows keep counting toward the per-IP and daily limits and are removed by housekeeping within 24 h.
- **Loan deletion** cascades its repayments.
- **Person deletion** fails with SQLSTATE `23503` if any loan references the person; map it to `409 PERSON_HAS_LOANS`. Never pre-check and delete in separate statements.
- **Owner consistency:** the composite FKs guarantee a loan references only its owner's person, and a repayment only its owner's loan. Services also scope every query by the session's `userId`; the client never sends `userId`.
- Prisma cannot express `CHECK` constraints: create migrations with `prisma migrate dev --create-only`, append the `CHECK` SQL, then apply. Commit the SQL.

### 4.3 Indexes

- `users (identifier_type, identifier)` unique.
- `people (user_id, archived_at, name_key, id)`.
- `loans (user_id, due_date, id)`, `loans (user_id, last_activity_at DESC, id DESC)`, `loans (user_id, person_id)`.
- `repayments (loan_id, paid_on DESC, created_at DESC)`, `repayments (user_id)`.
- `otp_challenges (identifier_type, identifier, created_at DESC)`, `otp_challenges (ip_hash, created_at DESC)`, `otp_challenges (created_at)`.
- `sessions (user_id)`; unique indexes on both refresh digests.

### 4.4 Money

**Wire format in requests:** `amount` is a **string** of decimal rupees, e.g. `"5000"`, `"5000.5"`, `"5000.50"`.

**Parser (`shared/money.ts`, `parseRupeesToPaise`):**
1. Reject non-strings and strings longer than 16 characters; trim whitespace.
2. Must match `^\d+(\.\d{1,2})?$`. This rejects `""`, `".5"`, `"5."`, `"-5"`, `"1e3"`, `"1,000"`, `"₹500"` and more than two decimals. Leading zeros are allowed (`"007.50"` → 750).
3. `paise = int(integerPart) × 100 + int(fraction padded to 2 digits)` with integer arithmetic only (never `parseFloat`).
4. Reject `paise === 0` and `paise > 1_000_000_000` (₹1,00,00,000.00).
5. Return a JS `number` (always a safe integer). The API converts to `BigInt` for Prisma.

**Responses:** integer JSON numbers named `…Paise`, or the summary field names. Aggregates read from PostgreSQL (`SUM` returns `numeric`) are converted after checking `Number.isSafeInteger`; otherwise throw `INTERNAL_ERROR`. Never serialize a raw `bigint`.

**Display (`formatPaise`, shared, no `Intl` dependency):** `₹` + Indian grouping (last three digits, then pairs: `₹1,25,000`) + `.pp` only when `paise % 100 ≠ 0` (`₹250.50`, `₹250`). The mobile amount input holds the **raw typed string**; formatting is presentation only and never parsed back.

**Formulas (per direction; definitions in PRD FR-05):**

```text
repaid(loan)       = Σ repayments.amount_paise for the loan
outstanding(loan)  = principal_paise − repaid(loan)            (≥ 0 by invariant)
repaymentStatus    = REPAID   if outstanding = 0
                     PARTIAL  if 0 < repaid < principal
                     UNPAID   if repaid = 0
isOverdue(loan)    = outstanding > 0 AND due_date < today
daysOverdue(loan)  = isOverdue ? (today − due_date) in days : 0

totalLent     = Σ principal (LENT)          totalBorrowed       = Σ principal (BORROWED)
totalRepaid   = Σ repaid (LENT)             totalReturned       = Σ repaid (BORROWED)
outstandingLent = totalLent − totalRepaid   outstandingBorrowed = totalBorrowed − totalReturned
overdueAmount = Σ outstanding of overdue LENT loans
overdueBorrowed = Σ outstanding of overdue BORROWED loans
```

No stored status, overdue flag or balance column. The Home hero shows `outstandingLent` ("You are owed").

### 4.5 Dates and timezone

- `loan_date`, `due_date`, `paid_on` are PostgreSQL `date`. Wire format is exactly `YYYY-MM-DD`. Validation (`shared/dates.ts`): regex `^\d{4}-\d{2}-\d{2}$`, a real calendar date (leap years included), within **2000-01-01 … 2099-12-31**.
- **Today** is computed only on the server: `new Intl.DateTimeFormat('en-CA', { timeZone: user.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(clock.now())`. The clock is injectable for tests. Clients never send "today".
- **Timezone validation:** `new Intl.DateTimeFormat('en-US', { timeZone: tz })` must not throw; store `resolvedOptions().timeZone`.
  - `POST /v1/auth/otp/verify` accepts optional `timezone`. If valid, it is stored (on create and on every login). If missing or invalid it is ignored (new users get `Asia/Kolkata`); login never fails because of the timezone.
  - `PATCH /v1/me` with an invalid `timezone` returns `422 VALIDATION_FAILED`.
  - The app sends `PATCH /v1/me { timezone }` on launch/resume when the device timezone differs from `me.timezone`.
- **Rules:**
  - `loanDate` defaults to today; must be ≤ today.
  - `dueDate` is required; may be in the past and may be earlier than `loanDate` (the app shows a non-blocking hint).
  - `paidOn` defaults to today; must be ≤ today; may be earlier than `loanDate` (non-blocking hint).
  - Due today is **not** overdue.
- Every summary, loan and loan-list response includes `asOfDate` (the "today" used), so the UI never computes overdue status itself.

---

## 5. Retry-safe financial mutations

### 5.1 Client-generated IDs (duplicate protection)

Creates of people, loans and repayments carry an `id` (UUID) generated by the app. The primary key makes every retry safe without extra tables or headers.

- **Client:** generate the ID when the form opens (`expo-crypto` `randomUUID()`), keep it for every submit of that form (retries, timeouts, the 401-refresh retry), and discard it only after a confirmed success. A changed form after a failed attempt keeps the same ID.
- **Server (inside the create transaction):**
  1. `SELECT` the row by `id` (any owner).
  2. **Not found** → validate, resolve the person if needed, insert → `201` with the new resource.
  3. **Found, owned by this user, same content** → `200` with the current resource and no change (a retry of a request that already succeeded).
  4. **Found but owned by another user, or different content** → `409 ID_CONFLICT`.
  5. If the insert hits a primary-key violation (SQLSTATE `23505`, a concurrent duplicate), roll back and re-run step 1 in a fresh transaction.
- **"Same content"** compares the normalized request with the stored row:
  - person: `name`;
  - loan: `direction`, `principalPaise`, `loanDate`, `dueDate`, `note`, and the person (`personId` equal, or the stored person's `name_key` equal to the requested name's key);
  - repayment: `loanId`, `amountPaise`, `paidOn`, `note`.
- **Settle** needs no ID: under the loan lock it records the outstanding amount once and is a no-op when already settled, so retries and concurrent requests produce at most one repayment.

### 5.2 Per-loan serialization

Every operation that changes a loan's principal, direction or repayments runs in one interactive transaction (`prisma.$transaction(async (tx) => …)`) and first takes the loan lock with a parameterized raw query:

```sql
SELECT id, principal_paise, direction, version
FROM loans WHERE id = $1 AND user_id = $2
FOR UPDATE;
```

No row → `404 NOT_FOUND`. Then read `COALESCE(SUM(amount_paise), 0)` for the loan and apply:

| Operation | Rule under lock | On success |
|---|---|---|
| Add repayment | `amount ≤ principal − repaid` else `409 AMOUNT_EXCEEDS_OUTSTANDING` (`details.maxAmountPaise`) | insert; `version+1`, `last_activity_at=now` |
| Edit repayment | `newAmount ≤ principal − (repaid − oldAmount)` else `409 AMOUNT_EXCEEDS_OUTSTANDING` | update; `version+1`, `last_activity_at` |
| Delete repayment | — | delete; `version+1`, `last_activity_at` |
| Settle | `outstanding = 0` → return the current loan with `repayment: null`, no change. Else insert a repayment of exactly `outstanding` | `version+1`, `last_activity_at` |
| Edit loan | body `version` must equal the stored one, else `409 RECORD_CHANGED` (`details.currentVersion`); new principal ≥ repaid, else `409 PRINCIPAL_BELOW_REPAID` (`details.minAmountPaise`); direction change requires zero repayments, else `409 DIRECTION_LOCKED` | update; `version+1`, `last_activity_at` |
| Delete loan | — | delete (repayments cascade) |

- **Person checks** on loan create, and on loan edit **only when `personId` changes**: `SELECT … FROM people WHERE id=$1 AND user_id=$2 FOR SHARE`. Missing → `404 NOT_FOUND`; archived → `409 PERSON_ARCHIVED`. `FOR SHARE` blocks a concurrent archive until the loan commits. Editing other fields of a loan whose person is archived is allowed.
- Use `$queryRaw` tagged templates only (parameterized). `$queryRawUnsafe` / `$executeRawUnsafe` are forbidden.
- The app never applies optimistic updates to money. It shows progress, keeps the form on failure, and invalidates queries only after a confirmed response.
- **Ambiguous outcome** (timeout or network loss during a mutation):
  - Create: retry with the **same ID** (§5.1).
  - Settle: retry; a second settle is a no-op.
  - `DELETE`: retry; `404` on the retry counts as success.
  - `PATCH /v1/loans/:id`: retry with the same body. On `409 RECORD_CHANGED`, refetch the loan; if every submitted field already equals the server value, treat the save as successful; otherwise show the "changed on another device" dialog.
  - `PATCH` repayment: values are absolute, so a plain retry is safe.

---

## 6. REST API contract

Base path `/v1` (plus `/health`). JSON only, UTF-8. Request bodies require `Content-Type: application/json` (else `415`) and are limited to **16 KB** (else `413`). Protected endpoints require `Authorization: Bearer <accessToken>`. All request and response schemas live in `packages/shared/src/schemas` and are the single source for API validation and mobile forms.

### 6.1 Conventions

- **Status codes:** `200` read/update/settle/verify and create replays; `201` create; `204` delete and logout (empty body); errors per §6.6.
- **Timestamps:** ISO 8601 UTC with milliseconds (`2026-10-22T09:15:00.000Z`). **Dates:** `YYYY-MM-DD`.
- **Nullable fields** are present with `null` in responses, never omitted. In `PATCH` bodies an omitted field is unchanged and `null` clears it (nullable fields only).
- **Unknown body fields** are rejected (`z.strictObject`) with `422 VALIDATION_FAILED`.
- **Pagination (loan lists only):** query `limit` (1–50, default 20) and `cursor`; response `{ items, nextCursor: string | null, asOfDate, timezone }`. The cursor is opaque base64url JSON `{ v: 1, sort, after: [...] }` holding the last row's sort key. Undecodable, or `sort` differs from the request → `422 INVALID_CURSOR`. The client resets to page one whenever filters change and de-duplicates appended rows by `id` (a date rollover between pages can shift a loan's group).
- **Unpaginated lists:** `GET /v1/people` returns every matching person; `LoanDetailDto.repayments` contains every repayment of the loan.
- **Never** return Prisma rows, digests, session internals or other users' data.

### 6.2 DTOs

```ts
type UserDto = {
  id: string;
  identifierType: 'PHONE' | 'EMAIL';
  identifier: string;                 // canonical, the user's own
  displayName: string | null;
  timezone: string;
  createdAt: string;
};

type PersonDto = {
  id: string;
  name: string;
  archived: boolean;
  archivedAt: string | null;
  owesYouPaise: number;               // Σ outstanding, LENT loans with this person
  youOwePaise: number;                // Σ outstanding, BORROWED loans with this person
  loanCount: number;
  createdAt: string;
  updatedAt: string;
};

type LoanDto = {
  id: string;
  person: { id: string; name: string; archived: boolean };
  direction: 'LENT' | 'BORROWED';
  principalPaise: number;
  repaidPaise: number;
  outstandingPaise: number;
  repaymentStatus: 'UNPAID' | 'PARTIAL' | 'REPAID';
  isOverdue: boolean;
  daysOverdue: number;
  loanDate: string;
  dueDate: string;
  note: string | null;
  version: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  asOfDate: string;
};

type RepaymentDto = {
  id: string; loanId: string; amountPaise: number; paidOn: string;
  note: string | null; createdAt: string; updatedAt: string;
};

type LoanDetailDto = LoanDto & {
  repayments: RepaymentDto[];         // all, newest first: paid_on DESC, created_at DESC, id DESC
};

type SummaryDto = {
  totalLent: number; totalRepaid: number; overdueAmount: number; outstandingLent: number;
  totalBorrowed: number; totalReturned: number; outstandingBorrowed: number; overdueBorrowed: number;
  currency: 'INR'; unit: 'paise'; asOfDate: string; timezone: string;
};

type TokenPairDto = {
  accessToken: string; accessTokenExpiresAt: string;
  refreshToken: string; refreshTokenExpiresAt: string;
};

type ChallengeDto = {
  challengeId: string; expiresAt: string; resendAvailableAt: string;
  maskedDestination: string;          // "s•••@example.com" | "+91 ••••••3210"
};
```

### 6.3 Endpoint map

| Method + route | Auth | Request | Success |
|---|---|---|---|
| `GET /health` | Public | — | `200 {status:"ok", version}`; no DB query |
| `GET /v1/auth/config` | Public | — | `200 {authMode, identifierType, otpLength:6, otpTtlSeconds:300, resendCooldownSeconds:60}` |
| `POST /v1/auth/otp/request` | Public | `{identifier}` | `200 ChallengeDto` |
| `POST /v1/auth/otp/verify` | Public | `{challengeId, code, timezone?}` | `200 {user: UserDto, tokens: TokenPairDto, isNewUser}` |
| `POST /v1/auth/refresh` | Refresh token in body | `{refreshToken}` | `200 TokenPairDto` |
| `POST /v1/auth/logout` | Access | — | `204` |
| `POST /v1/auth/reauth/request` | Access | `{}` | `200 ChallengeDto` (code sent to the user's own identifier) |
| `GET /v1/me` | Access | — | `200 UserDto` |
| `PATCH /v1/me` | Access | `{displayName?: string\|null, timezone?: string}` | `200 UserDto` |
| `DELETE /v1/me` | Access | `{challengeId, code}` from `reauth/request` | `204` |
| `GET /v1/summary` | Access | — | `200 SummaryDto` |
| `GET /v1/loans` | Access | Query §6.5 | `200 {items: LoanDto[], nextCursor, asOfDate, timezone}` |
| `POST /v1/loans` | Access | §6.4 | `201 LoanDto` (`200` on replay) |
| `GET /v1/loans/:id` | Access | — | `200 LoanDetailDto` |
| `PATCH /v1/loans/:id` | Access | `{version, personId?, direction?, amount?, loanDate?, dueDate?, note?: string\|null}` (≥ 1 field besides `version`) | `200 LoanDto` |
| `DELETE /v1/loans/:id` | Access | — | `204` |
| `POST /v1/loans/:id/settle` | Access | `{paidOn?, note?}` | `200 {loan: LoanDto, repayment: RepaymentDto \| null}` |
| `POST /v1/loans/:id/repayments` | Access | `{id, amount, paidOn?, note?}` | `201 {loan: LoanDto, repayment: RepaymentDto}` (`200` on replay) |
| `PATCH /v1/loans/:id/repayments/:repaymentId` | Access | `{amount?, paidOn?, note?: string\|null}` | `200 {loan: LoanDto, repayment: RepaymentDto}` |
| `DELETE /v1/loans/:id/repayments/:repaymentId` | Access | — | `204` |
| `GET /v1/people` | Access | `search?` (1–80), `archived?` (`false` default = active only; `true` = archived only) | `200 {items: PersonDto[]}` sorted by `name_key, id` |
| `POST /v1/people` | Access | `{id, name}` | `201 PersonDto` (`200` on replay) |
| `GET /v1/people/:id` | Access | — | `200 PersonDto` |
| `PATCH /v1/people/:id` | Access | `{name?, archived?: boolean}` | `200 PersonDto` |
| `DELETE /v1/people/:id` | Access | — | `204`; `409 PERSON_HAS_LOANS` if loans exist |

Any `:id` that is malformed, nonexistent or owned by another user → `404 NOT_FOUND`. **No receipt endpoint exists.**

### 6.4 Create loan — person resolution

Body (`z.strictObject`):

```ts
{
  id: string;                 // client-generated uuid (§5.1)
  personId?: string;          // uuid
  personName?: string;        // 1–80 code points after normalization
  createNewPerson?: boolean;  // default false; only with personName
  direction?: 'LENT' | 'BORROWED';   // default 'LENT'
  amount: string;             // §4.4
  loanDate?: string;          // default today; ≤ today
  dueDate: string;
  note?: string | null;       // ≤ 500 code points
}
```

Exactly one of `personId` or `personName` must be present (otherwise `422 VALIDATION_FAILED`). Resolution happens inside the create transaction:

1. `personId` → must exist for this user (`404`) and be active (`409 PERSON_ARCHIVED`).
2. `personName` with `createNewPerson: true` → always create a new person (server-generated ID).
3. `personName` otherwise → normalize to `name_key` and look up **active** people with an equal `name_key`:
   - 0 matches → create the person.
   - 1 match → reuse it.
   - ≥ 2 matches → `409 PERSON_AMBIGUOUS` with `details.candidates: [{id, name}]`.

The app sends `personId`, or `personName` + `createNewPerson: true` when the user chose **Add "<name>" as new person**. Minimal request (documented in the README for evaluators):

```http
POST /v1/loans
Authorization: Bearer <token>
Content-Type: application/json

{ "id": "0b8c3f8e-1d0a-4a4e-9a51-4f0c7f6d2a11", "personName": "Rahul", "amount": "5000.00", "dueDate": "2026-10-30" }
```

Example `LoanDto` after ₹2,000 repaid:

```json
{
  "id": "0b8c3f8e-1d0a-4a4e-9a51-4f0c7f6d2a11",
  "person": { "id": "a3f1c2d4-5b6e-4f70-8a9b-0c1d2e3f4a5b", "name": "Rahul", "archived": false },
  "direction": "LENT",
  "principalPaise": 500000,
  "repaidPaise": 200000,
  "outstandingPaise": 300000,
  "repaymentStatus": "PARTIAL",
  "isOverdue": false,
  "daysOverdue": 0,
  "loanDate": "2026-10-22",
  "dueDate": "2026-10-30",
  "note": null,
  "version": 2,
  "lastActivityAt": "2026-10-22T09:20:00.000Z",
  "createdAt": "2026-10-22T09:15:00.000Z",
  "updatedAt": "2026-10-22T09:20:00.000Z",
  "asOfDate": "2026-10-22"
}
```

Example `SummaryDto` (the PRD FR-05 example):

```json
{
  "totalLent": 800000, "totalRepaid": 500000, "overdueAmount": 300000, "outstandingLent": 300000,
  "totalBorrowed": 400000, "totalReturned": 100000, "outstandingBorrowed": 300000, "overdueBorrowed": 0,
  "currency": "INR", "unit": "paise", "asOfDate": "2026-10-22", "timezone": "Asia/Kolkata"
}
```

### 6.5 Loan list query

| Param | Values | Default |
|---|---|---|
| `direction` | `LENT`, `BORROWED` | all |
| `status` | `outstanding` (outstanding > 0, includes overdue), `overdue`, `repaid` | all |
| `search` | 1–80 code points, normalized exactly like `name_key` (trim, collapse whitespace, NFC, lowercase), substring match on `name_key` with `%`, `_`, `\` escaped. `GET /v1/people?search=` uses the same rule | none |
| `personId` | uuid (person detail) | none |
| `sort` | `attention`, `dueDate`, `recent` | `attention` |
| `limit`, `cursor` | §6.1 | 20 |

Sort keys (keyset-paginated, tie-broken by `id`):

- `attention`: `(bucket ASC, due_date ASC, id ASC)`; `bucket = 0` overdue, `1` outstanding not overdue, `2` repaid.
- `dueDate`: `(due_date ASC, id ASC)`.
- `recent`: `(last_activity_at DESC, id DESC)`.

Implementation: one parameterized SQL query joining people and a per-loan `SUM` of repayments (scoped by `user_id`), computing `outstanding` and `bucket` with the server's `today`, applying filters **before** the keyset condition, and fetching `limit + 1` rows to determine `nextCursor`. The summary is one conditional-aggregate query. Person balances are computed in the people query.

### 6.6 Errors

Envelope (never stack traces, SQL or secrets):

```json
{
  "error": {
    "code": "AMOUNT_EXCEEDS_OUTSTANDING",
    "message": "The repayment is more than the remaining balance.",
    "fieldErrors": { "amount": "Maximum is ₹3,000" },
    "details": { "maxAmountPaise": 300000 },
    "requestId": "9f1c…"
  }
}
```

`fieldErrors` and `details` are always present (`{}` when empty). **Rule:** `422` = the request is invalid by itself; `409` = it is valid but conflicts with current server state.

| HTTP | Code | When |
|---|---|---|
| 400 | `MALFORMED_JSON` | Body is not parseable JSON |
| 400 | `OTP_INVALID` | Wrong code, or the challenge is unknown, consumed, superseded, failed, or for another purpose/session. `details.attemptsRemaining` when a wrong code was counted |
| 400 | `OTP_EXPIRED` | Challenge past `expires_at` |
| 400 | `OTP_ATTEMPTS_EXCEEDED` | 5 wrong attempts reached |
| 401 | `UNAUTHENTICATED` | Missing, invalid or expired access token; session revoked or expired; user deleted |
| 401 | `REFRESH_TOKEN_INVALID` | Unknown, expired, revoked or replayed refresh token |
| 404 | `NOT_FOUND` | Unknown route or resource, or another user's resource |
| 409 | `ID_CONFLICT` | Create with an existing ID but different content or another owner (§5.1) |
| 409 | `PERSON_AMBIGUOUS` | Name matches 2+ active people (`details.candidates`) |
| 409 | `PERSON_ARCHIVED` | New or reassigned loan targets an archived person |
| 409 | `PERSON_HAS_LOANS` | Deleting a person with loans |
| 409 | `AMOUNT_EXCEEDS_OUTSTANDING` | Repayment over the remaining balance (`details.maxAmountPaise`) |
| 409 | `PRINCIPAL_BELOW_REPAID` | Principal edit below repaid (`details.minAmountPaise`) |
| 409 | `DIRECTION_LOCKED` | Direction change on a loan with repayments |
| 409 | `RECORD_CHANGED` | Stale `version` on loan edit (`details.currentVersion`) |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 16 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Body without `application/json` |
| 422 | `VALIDATION_FAILED` | Schema/field errors: amount, dates, lengths, IDs, identifier format or type for the mode, timezone, unknown fields, missing person reference |
| 422 | `INVALID_CURSOR` | Undecodable cursor or a cursor for another sort |
| 429 | `OTP_RESEND_COOLDOWN` | < 60 s since the last challenge for this destination (`Retry-After`) |
| 429 | `RATE_LIMITED` | OTP request limit reached (`Retry-After`) |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
| 503 | `OTP_DELIVERY_FAILED` | Resend rejected or timed out |
| 503 | `OTP_DAILY_LIMIT_REACHED` | Global daily send cap reached (production) |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable |

Error codes are exported from `packages/shared/contracts/error-codes.ts`; the app maps codes (not messages) to `design.md` §9.4 copy.

---

## 7. OTP authentication and sessions

### 7.1 Mode isolation — non-negotiable

| | Assignment | Production |
|---|---|---|
| `AUTH_MODE` | `assignment` | `production` |
| Identifier | Indian mobile number, canonical `+91XXXXXXXXXX` | Email address |
| Delivery | Line in the local server log | Resend, verified sender domain |
| Ownership verified | **No** | Yes (mailbox access) |
| Database | Local PostgreSQL | Neon production project |
| Mobile build | `development` / `preview` profile | `production` profile (AAB, HTTPS) |
| OTP in logs | Yes (only that line) | **Forbidden** |

**Startup fails closed** (process exits non-zero) when:
- `AUTH_MODE` is missing or not one of the two values;
- `AUTH_MODE=assignment` and (`NODE_ENV=production` or the `RENDER` environment variable is set);
- `AUTH_MODE=production` and any of `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PUBLIC_API_ORIGIN` is missing, or `DATABASE_URL` lacks `sslmode=require`;
- any secret in §11.1 is missing or shorter than 32 bytes, or two secrets are equal.

No query parameter, header or body field can change the mode. A request whose identifier type does not match the mode → `422 VALIDATION_FAILED` (`fieldErrors.identifier`). Play reviewers use a real test mailbox (§7.4), never a bypass.

### 7.2 OTP lifecycle

**Normalization:**
- Phone: remove spaces, hyphens and parentheses; must match `^(?:\+?91)?([6-9]\d{9})$`; canonical `+91` + 10 digits.
- Email: trim, lowercase, ≤ 254 chars, valid per Zod `email()`; no provider-specific rewriting.

**Request** (`otp/request` for `LOGIN`; `reauth/request` for `REAUTH`, where the destination is the session user's identifier and `session_id` is set). One transaction:
1. `SELECT pg_advisory_xact_lock(hashtext(identifier_type || ':' || identifier))` so concurrent requests for one destination are serialized.
2. **Housekeeping:** delete up to 100 `otp_challenges` rows with `created_at < now − 24 h`.
3. **Limits**, counted from `otp_challenges` (all purposes and states unless noted):

   | Limit | Rule | Error |
   |---|---|---|
   | Cooldown | Latest challenge for this identifier and purpose is younger than 60 s | `429 OTP_RESEND_COOLDOWN` |
   | Per identifier | ≥ 5 challenges for the identifier in the last 60 min | `429 RATE_LIMITED` |
   | Per IP | ≥ 20 challenges with this `ip_hash` in the last 60 min | `429 RATE_LIMITED` |
   | Daily (production only) | ≥ `OTP_DAILY_SEND_LIMIT` (default 90) non-`FAILED` challenges since 00:00 UTC | `503 OTP_DAILY_LIMIT_REACHED` |

   `Retry-After` = seconds until the oldest counted row leaves the window.
4. Set existing `PENDING`/`ACTIVE` challenges for the identifier and purpose to `INVALIDATED`; insert the new challenge as `PENDING` with `code_digest = HMAC-SHA-256(OTP_HMAC_SECRET, challengeId + ":" + code)`. The code is `crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')`.

Then deliver, outside the transaction:
- assignment: `logger.info` writes `MiniLedger mock OTP [<challengeId>] for <identifier>: <code>`;
- production: Resend email (subject "Your MiniLedger code"; body contains only the code and "expires in 5 minutes"), 10 s timeout.

On success set `ACTIVE` and return `ChallengeDto`. On failure set `FAILED` and return `503 OTP_DELIVERY_FAILED`. Never report success for an undelivered code.

**Verification** (shared by `otp/verify` and `DELETE /v1/me`; its own transaction, challenge row `FOR UPDATE`):
1. Not found, wrong purpose, or (`REAUTH`) a different session → `OTP_INVALID`.
2. `state ≠ ACTIVE` → `OTP_INVALID`. `expires_at ≤ now` → `OTP_EXPIRED`. `attempts ≥ 5` → `OTP_ATTEMPTS_EXCEEDED`.
3. Compare digests with `crypto.timingSafeEqual`. On mismatch: `attempts + 1`; if it is now 5, set `INVALIDATED` and return `OTP_ATTEMPTS_EXCEEDED`, else `OTP_INVALID` with `attemptsRemaining`. Commit the increment even though the response is an error.
4. On match set `CONSUMED`, then:
   - `LOGIN`: find or create the user (`INSERT … ON CONFLICT (identifier_type, identifier) DO NOTHING`, then `SELECT`), apply `timezone` (§4.5), delete up to 100 sessions that are revoked or past `absolute_expires_at`, create a session, issue tokens.
   - `REAUTH` (account deletion): in a second transaction, delete the account (§4.2). If that fails, the user requests a new code.

Guessing is bounded by 5 attempts per code and 5 codes per hour per identifier.

**Logging:** never log codes (except the assignment line), full identifiers, tokens, `Authorization` headers or request bodies of auth/finance routes. Production logs may contain `maskedDestination` only.

### 7.3 Sessions

- **Access token:** JWT HS256 signed with `JWT_SECRET`; `iss=miniledger-api`, `aud=miniledger-mobile`, `sub=userId`, `sid=sessionId`, `iat`, `exp = iat + 15 min`. `require-auth` verifies signature, `iss`, `aud`, `exp`, then loads the session with its user in one query and rejects it if missing, revoked or past `absolute_expires_at` (`401 UNAUTHENTICATED`).
- **Refresh token:** 32 random bytes, base64url. Stored only as `HMAC-SHA-256(REFRESH_TOKEN_HMAC_SECRET, token)`.
- **Rotation** (`POST /v1/auth/refresh`; one transaction; find the session whose current **or** previous digest matches, `FOR UPDATE`):
  1. No session → `401 REFRESH_TOKEN_INVALID`.
  2. Revoked, `refresh_expires_at ≤ now` or past `absolute_expires_at` → `401 REFRESH_TOKEN_INVALID`.
  3. Matches the **current** digest → `previous = current`, `current = new`, `rotated_at = now`, `refresh_expires_at = min(now + 30 d, absolute_expires_at)`; return the new pair.
  4. Matches the **previous** digest:
     - within **30 s** of `rotated_at` (a lost refresh response) → replace `current` with a new token, keep `previous` and `rotated_at`, return the new pair;
     - later → replay: set `revoked_at`, `revoke_reason = REPLAY_DETECTED`, return `401 REFRESH_TOKEN_INVALID`.
- **Client:** tokens and the current user ID live in `expo-secure-store`. One in-flight refresh at a time (shared promise). On app start: unexpired access token → use it; otherwise refresh, then `GET /v1/me`. `REFRESH_TOKEN_INVALID` → clear credentials and caches, go to sign-in. Network errors never sign the user out.
- **Logout:** `POST /v1/auth/logout` revokes the session (`LOGOUT`). The client clears tokens and the query cache even if the call fails offline.
- **Account deletion** always requires a fresh code: `reauth/request`, then `DELETE /v1/me {challengeId, code}`.

### 7.4 Play review access

Provide reviewers a real dedicated test mailbox (credentials in Play Console app-access instructions). Never return OTPs in API responses, never publish an OTP console, never allow-list an account.

---

## 8. Local receipt storage

**One optional photo per loan, device-only.** It is an attachment, not a server upload.

```text
<Paths.document>/receipts/<userId>/<loanId>/receipt.jpg     # saved receipt
<Paths.cache>/receipt-pending-<loanId>.jpg                  # picked while the loan is unsaved
```

- **The filesystem is the index.** Paths derive from `userId` and `loanId`, both validated against the UUID regex before any path is built. "Has receipt" = the file exists.
- **Capture:** `expo-image-picker` with `exif: false`, `quality: 1`; then `expo-image-manipulator` resizes the longest edge to ≤ **1600 px** and saves JPEG at quality **0.7**. If the result exceeds **1.5 MB**, retry at 1200 px / 0.6; if still too large, show an error. Re-encoding drops EXIF/GPS metadata (verify in testing). Typical result 200–500 KB.
- **New loan:** the processed image goes to the cache path (the loan ID is already known, §5.1). After `POST /v1/loans` succeeds (`201` or `200`), move it to the saved path. If the move fails, the loan stays saved and S07 shows `Loan saved. Receipt couldn't be saved on this device.` Never fail the loan or upload the image. An abandoned form leaves only an OS-managed cache file.
- **Existing loan:** attach/replace writes `receipt.tmp.jpg` in the loan folder, deletes the old `receipt.jpg`, then renames. Remove deletes the loan folder.
- **Cleanup:** delete the loan folder after a successful loan delete and when `GET /v1/loans/:id` returns `404`; delete `receipts/<userId>` after a successful account deletion (a failure is ignored because receipts are only ever shown for their own `userId`). Sign-out keeps receipts; they reappear only for the same user.
- **Backup:** `android.allowBackup: false` in `app.config.ts`, so receipts and secure-store data are excluded from Android backup, matching the "not backed up" disclosure.
- **Disclosure:** before the first attachment show the `design.md` S11 notice once (`miniledger:receiptNoticeSeen`).
- Use the current `expo-file-system` `File` / `Directory` / `Paths` API. Never put a `file://` path in an API call or log.

---

## 9. Mobile architecture

### 9.1 Navigation

Routes are listed in §3 and map to `design.md` S01–S13. Three tabs (Home with summary and loan list, People, Settings); **Add loan** is a FAB/header action, never a tab. Android back closes sheets, then pops the stack; a dirty form asks before discarding.

### 9.2 Data flow

1. **`api-client.ts`:** base URL from `EXPO_PUBLIC_API_URL`; adds `Authorization` and `X-Request-Id` (uuid).
   - **Timeouts:** the UI shows "Connecting…" after **3 s**; the request aborts after **75 s** (covers a Render cold start).
   - **401:** on `UNAUTHENTICATED` from a protected route, run the single-flight refresh and retry the original request **once** with the same body (so a create keeps its ID).
2. **Query keys:** `['me']`, `['summary']`, `['loans', filters]`, `['loan', id]`, `['people', filters]`, `['person', id]`, `['authConfig']`.
   - Queries retry twice on network/5xx errors only; mutations never auto-retry.
   - On a confirmed mutation, invalidate `summary`, `loans`, the affected `loan`, `people` and the affected `person`.
   - Clear the whole cache on sign-out, account deletion and user change.
3. **Freshness:** refetch active queries when the app returns to the foreground, and invalidate `summary`/`loans`/`people` at local midnight.
4. **Lists:** `FlatList` with `keyExtractor = id`, `onEndReached` pagination and de-duplication by `id`; switch to FlashList only if profiling shows a need.
5. **Mode UI:** `GET /v1/auth/config` decides phone vs email on S02. The build profile only sets the API URL.

### 9.3 Theming

- One token registry in `src/theme/tokens.ts` with `light` and `dark` maps copied exactly from `design.md` §2. Components never use raw hex values.
- Preference `light | dark | system` in `miniledger:theme`; default `light`. `system` follows `useColorScheme()`.
- Status/navigation bar styles, sheets, dialogs and SVGs follow the active theme.
- **P0 ships light only** (the Appearance setting may be hidden); dark and system are required for the public V1 release.
- Animations use Reanimated or the native driver, honor reduced motion, and follow `design.md` §8.

---

## 10. Security and privacy

### 10.1 API baseline

- **Middleware order:** request-id → pino-http (redacted) → `helmet` → JSON body parser (16 KB, strict) → routes → 404 → error handler.
- **CORS:** disabled (no `Access-Control-*` headers); there is no browser client.
- **Proxy trust:** `app.set('trust proxy', TRUST_PROXY_HOPS)` with `1` on Render and `0` locally; `req.ip` is the only IP source for `ip_hash`.
- **Timeouts:** server request timeout 30 s; Prisma interactive transaction timeout 10 s.
- **HTTPS:** production is HTTPS only (Render-terminated TLS); Neon uses `sslmode=require`.
- **Authorization:** every query is scoped by `user_id` from the session; cross-user access returns `404`.
- **Secrets:** server secrets never reach the app or Git. `EXPO_PUBLIC_*` holds only the API URL.
- **Logging:** pino `redact` covers `req.headers.authorization`, `req.body`, `*.refreshToken`, `*.accessToken`, `*.code`, `*.identifier`. Log request ID, method, route template, status, duration, error code and environment.
- **Permissions:** camera and photo access only, requested contextually. No contacts, location, SMS, analytics or crash SDKs.

### 10.2 Deletion and privacy

- **In-app deletion** (S12): `reauth/request`, then `DELETE /v1/me {challengeId, code}`. On `204` delete local receipts, credentials and cache.
- **External deletion** (Play policy): `web/delete-account.html` explains in-app deletion and offers an email request path to the support address. Requests are honored only after the requester proves control of the account email (a confirmation reply from that address). Never delete because someone typed an email into a form.
- **Hosting:** `web/privacy.html` and `web/delete-account.html` on GitHub Pages at `miniledger.surajmishra.me`; linked from Settings and the Play listing.
- **Disclosures:** `privacy.html` states that Neon holds the identifier, display name, timezone, people, loans and repayments; that Resend processes the email address to deliver OTPs; that receipts never leave the device and are excluded from backup. It must match the Play Data Safety form.

---

## 11. Environments, secrets and builds

### 11.1 Server environment (validated by `config/env.ts` at startup)

| Variable | Assignment | Production | Notes |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | |
| `AUTH_MODE` | `assignment` | `production` | §7.1 |
| `PORT` | `4000` | Render-provided | Listen on `0.0.0.0` |
| `DATABASE_URL` | local URL | Neon **pooled** URL, `sslmode=require` | Runtime (driver adapter) |
| `DIRECT_URL` | same as above | Neon **direct** URL | CLI migrations only; not read at runtime |
| `JWT_SECRET` | required | required | ≥ 32 random bytes |
| `OTP_HMAC_SECRET` | required | required | ≥ 32 bytes, distinct; also keys `ip_hash` |
| `REFRESH_TOKEN_HMAC_SECRET` | required | required | ≥ 32 bytes, distinct |
| `RESEND_API_KEY` | — | required | |
| `RESEND_FROM_EMAIL` | — | required | `MiniLedger <no-reply@mail.surajmishra.me>` (verified subdomain) |
| `PUBLIC_API_ORIGIN` | — | required | `https://<service>.onrender.com` |
| `OTP_DAILY_SEND_LIMIT` | — | default `90` | Below Resend Free's 100/day |
| `TRUST_PROXY_HOPS` | `0` | `1` | |
| `LOG_LEVEL` | `debug` | `info` | |

`.env.example` lists every variable with placeholders. Real `.env` files are git-ignored.

**Prisma 7 configuration:** `prisma.config.ts` sets `datasource.url = env('DIRECT_URL')` for CLI commands. At runtime `lib/prisma.ts` constructs `new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })` using `@prisma/adapter-pg`. The API package uses ESM (`"type": "module"`). If a different Prisma major is installed, follow its official equivalent without changing the behavior (pooled runtime URL, direct migration URL).

### 11.2 Mobile build profiles (`eas.json`)

| Profile | Application ID | `EXPO_PUBLIC_API_URL` | Notes |
|---|---|---|---|
| `development` | `com.surajmishra.miniledger.dev` | `http://localhost:4000/v1` with `adb reverse tcp:4000 tcp:4000` (USB), or the PC's LAN IP | Cleartext allowed only here |
| `preview` | `com.surajmishra.miniledger.dev` | Evaluator's local/private server | Internal APK |
| `production` | `com.surajmishra.miniledger` | `https://<service>.onrender.com/v1` | Signed AAB; cleartext disabled |

Separate application IDs let both builds coexist. Before release, verify the production AAB has no cleartext permission and no local URL, and that sign-in shows email.

### 11.3 Deployment flow

**Local assignment:**
1. `pnpm install --frozen-lockfile`; `docker compose up -d db`.
2. Copy `.env.example` to `apps/api/.env` (assignment values); `pnpm --filter @miniledger/api prisma:migrate:dev`.
3. `pnpm --filter @miniledger/api dev` and read OTPs in that terminal.
4. Phone connected by USB with debugging on: `adb reverse tcp:4000 tcp:4000`, then `pnpm --filter @miniledger/mobile android`.
5. `pnpm test` runs all suites.

**Production:**
1. Create the Neon project (pooled + direct URLs), verify `mail.surajmishra.me` in Resend, create the Render web service (build: `pnpm install --frozen-lockfile && pnpm --filter @miniledger/shared build && pnpm --filter @miniledger/api build`; start: `node dist/server.js`; health check `/health`).
2. Run `prisma migrate deploy` with `DIRECT_URL` from a protected manual GitHub Actions workflow **before** deploying code that needs the schema. Never migrate on server boot.
3. Deploy; verify `/health`, that `curl` phone OTP returns `422`, and real email delivery.
4. Build the production AAB with EAS; test on the Play internal track.
5. Publish the privacy/deletion pages, complete Data Safety and financial-features declarations, add reviewer access.

**Free-tier caveats:** Render cold starts (~1 min); Neon suspends idle compute (fast resume); Resend Free advertises 3,000 emails/month and 100/day. Budget by OTP sends; upgrade hosting if cold starts hurt real users.

---

## 12. Testing and CI

### 12.1 Automated coverage

| Group | Mandatory cases |
|---|---|
| Money | `"0"`, `"0.00"`, `"-5"`, `".5"`, `"5."`, `"1e3"`, `"1,000"`, `"500.123"`, `"5000.5"` → 500050, `"007.50"` → 750, `"10000000.00"` → 1e9, `"10000000.01"` rejected, 17-char string rejected; `formatPaise` grouping and decimals |
| Dates | Leap day 2028-02-29 valid, 2027-02-29 invalid, range bounds, due today vs yesterday, timezone boundary (23:30 vs 00:30 IST), invalid timezone in verify vs PATCH |
| Calculation | Unpaid, partial, settled, overdue partial, fully repaid past due, principal edit, repayment edit/removal, loan delete, PRD FR-05 example exactly |
| People | Name normalization, code-point limits, 0/1/2+ match resolution, `createNewPerson`, archived target, delete with/without loans, rename keeps loans |
| Isolation | User A cannot read or mutate User B's people, loans, repayments, summary; composite FKs reject cross-user references at the DB level; an ID owned by B → `409 ID_CONFLICT` without leaking data |
| Auth (assignment) | OTP logged, phone normalization, email rejected, expiry, cooldown, per-identifier and per-IP limits, 5-attempt lockout, superseded challenge, reuse, logout |
| Sessions | Refresh rotation, grace path, replay revocation, unknown token, idle and absolute expiry, revoked session → `401` |
| Auth (production) | Phone rejected, Resend success/failure (mocked), daily cap, deletion with a wrong/expired/valid code, deletion cascade and challenge anonymization |
| Retry safety | Same ID + same content → `200` replay; same ID + different content → `409`; concurrent same-ID creates insert once; concurrent settles create one repayment; 10 concurrent repayments with distinct IDs never exceed principal |
| Contract | Every error code's status and envelope, pagination and `INVALID_CURSOR`, strict bodies, 413/415, DTO shapes against shared Zod schemas |
| Mobile (jest-expo) | Money/date/text helpers, ID lifecycle per form, receipt path derivation and UUID guards, refresh single-flight |

**Integration tests** run against a real PostgreSQL (Docker service in CI) with migrations applied; each test file uses a fresh schema or truncation. The clock is injected; Resend is mocked; no real OTP is sent.

### 12.2 CI (`.github/workflows/ci.yml`)

On PR and push: install (frozen) → lint (ESLint) → format check (Prettier) → typecheck → unit tests → PostgreSQL service + `prisma migrate deploy` + `prisma migrate diff` (fails on drift) → integration tests → build shared + API → `npx expo export --platform android` (bundle check) → secret scan (gitleaks). No store publishing from CI. Production migration is a separate manual workflow with protected secrets.

### 12.3 Manual release smoke test

- Fresh install: request OTP, sign in, sign out, sign in again; restart keeps the session.
- Lent and borrowed loans; partial repayment; settle; edit and remove a repayment; summaries and overdue badges correct; change the device date past midnight and resume.
- People: same-name handling, rename, archive (hidden from picker, visible on loans), delete blocked with loans.
- Receipt: attach, restart, view, replace, remove; deny permission; a second account on the same device sees no receipts.
- Themes on every screen; system theme switching; 200% font; TalkBack; small screen.
- Airplane mode during save, then retry: exactly one record. Cold-start the API: "Connecting…" appears, then success.
- Delete account: code requested and entered, success, the API rejects the old tokens, receipts gone.
- `curl` phone OTP against production → `422`. Privacy and deletion links work. Reviewer mailbox works.

---

## 13. Operations and failure handling

- **`/health`:** returns `{status, version}` without touching the database. Don't build a keep-alive pinger.
- **Housekeeping** is inline and bounded (≤ 100 rows per request): old OTP challenges on each OTP request (§7.2), dead sessions on each login (§7.2). Correctness never depends on it.
- **Errors:** Resend or DB failures return safe `503`s. A mutation timeout is an unknown outcome handled per §5.2.
- **Monitoring:** Render logs and metrics, Neon usage, Resend dashboard (bounces, quota). Check manually for unusual OTP volume.
- **Backups:** a weekly `pg_dump` from a trusted machine or protected workflow, encrypted (e.g. `age`), stored outside the repository, kept 30 days; test a restore before public launch. Neon's free restore window is not a disaster-recovery plan.
- No uptime SLA is promised.

---

## 14. Implementation plan

Phases, scope per phase, exit criteria and progress tracking live in [`implementation.md`](./implementation.md). It sequences this specification and adds no rules of its own.

---

## 15. Architecture acceptance checklist

- [ ] Fresh checkout runs assignment mode on local PostgreSQL; OTP is in the backend log; Android signs in.
- [ ] `POST /v1/loans` with `id`, `personName`, `amount`, `dueDate` works; `totalLent`, `totalRepaid`, `overdueAmount` match the PRD in integer paise.
- [ ] Production rejects phone OTP under every input; startup fails closed on misconfiguration.
- [ ] Email OTP: real delivery, expiry, attempts, cooldown, limits, keyed digests only.
- [ ] Composite FKs and service scoping enforce ownership; foreign IDs return 404.
- [ ] Client-generated IDs and per-loan locks are proven by concurrent integration tests on real PostgreSQL.
- [ ] Dates are calendar dates computed in the user's timezone; `asOfDate` is in every relevant response.
- [ ] Receipts never leave the device, are per-user, excluded from backup, and cleaned up on delete.
- [ ] Every error code in §6.6 is tested.
- [ ] All `design.md` screens work in light and dark themes (dark: release gate, not P0).
- [ ] Render + Neon + Resend run with isolated credentials and no local persistence.
- [ ] Migrations, CI, smoke test, privacy and deletion flows are complete.

---

## 16. References (checked October 2026)

These support the decisions above; they do not authorize scope changes. Re-check provider limits before release.

- [Render Free instances](https://render.com/docs/free) — spin-down and ephemeral filesystem.
- [Neon Free plan: 1 GB per project](https://neon.com/blog/neon-free-plan-1-gb-per-project) — storage, compute hours and limits.
- [Prisma ORM v7 PostgreSQL connector](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) — `prisma.config.ts`, driver adapter, pooled vs direct URLs.
- [Resend pricing](https://resend.com/pricing) — free sending limits.
- [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) — `File`, `Directory`, `Paths`.
- [Expo environment variables](https://docs.expo.dev/guides/environment-variables/) and [EAS environments](https://docs.expo.dev/eas/environment-variables/).
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).

---

## 17. Changelog

**v1.2 (22 October 2026)** — simplifications with no feature change:
- Client-generated IDs replace the idempotency-key header and `idempotency_records` table; settle is naturally idempotent.
- OTP limits are counted from `otp_challenges` (with `ip_hash`); `rate_limit_buckets` removed.
- Refresh rotation tracks the previous digest on `sessions`; `used_refresh_tokens` removed.
- Account deletion takes `{challengeId, code}` directly; `reauth/verify`, `authenticated_at`, `recentAuthUntil` and `REAUTH_REQUIRED` removed.
- Loan cursor reduced to `{v, sort, after}`; `CURSOR_EXPIRED` removed. People list and repayment history are unpaginated.
- Inline bounded housekeeping replaces the maintenance module. Receipt staging uses the OS cache.
- Home combines the summary and the loan list (three tabs).
- Application IDs set to `com.surajmishra.miniledger`; sender and pages use `surajmishra.me`; USB `adb reverse` for local development.

**v1.1 (22 October 2026)** — friends → people; full schema, DTOs, endpoints, errors, sessions, OTP limits, receipts, CI; implementation sequence moved to `implementation.md`.
