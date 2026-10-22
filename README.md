<p align="center">
  <img src="apps/mobile/assets/brand/logo.png" alt="MiniLedger logo" width="200" />
</p>

# MiniLedger

A small Android app for keeping track of money you lend to (and borrow from) people, built for the Full Stack Development internship assignment and designed to ship on Google Play from the same codebase.

- **Backend:** Node.js + TypeScript + Express + PostgreSQL (Prisma)
- **App:** React Native + Expo (Expo Router), TypeScript
- **Specs:** [`docs/prd.md`](docs/prd.md), [`docs/architecture.md`](docs/architecture.md), [`docs/design.md`](docs/design.md), progress in [`docs/implementation.md`](docs/implementation.md)

> Status: backend complete for the assignment (Phase 1); the Android screens follow in Phase 2.

## Repository layout

```text
apps/api         Express REST API, Prisma schema and migrations
apps/mobile      Expo React Native app
packages/shared  Validation, money/date helpers and API contracts used by both
docs/            Product, architecture, design and implementation documents
```

## Prerequisites

- Node.js 22 LTS and pnpm 10 (`npm i -g pnpm`)
- Docker Desktop (local PostgreSQL)
- Android Studio (Android SDK) and an Android phone with USB debugging, or an emulator

## Run locally (assignment mode)

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start PostgreSQL (host port **5433**):

   ```bash
   pnpm db:up
   ```

3. Create `apps/api/.env` from [`.env.example`](.env.example) and replace the three secrets with separate random values:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

4. Apply database migrations and start the API:

   ```bash
   pnpm --filter @miniledger/api prisma:migrate:dev
   pnpm --filter @miniledger/api dev
   ```

   Check it: `http://localhost:4000/health` returns `{"status":"ok",...}`.

5. Run the app on a USB-connected phone:

   ```bash
   adb reverse tcp:4000 tcp:4000
   pnpm --filter @miniledger/mobile android
   ```

## Tests and checks

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

Integration tests use the `miniledger_test` database created automatically by the Docker container.

## Try the API (assignment mode)

With the API running (`pnpm --filter @miniledger/api dev`), every step below can be done with `curl`. Amounts are sent as rupee strings and returned as integer **paise** (`500000` = ₹5,000).

1. **Request an OTP** for an Indian mobile number:

   ```bash
   curl -X POST http://localhost:4000/v1/auth/otp/request \
     -H "Content-Type: application/json" -d '{"identifier":"9876543210"}'
   ```

   The response contains a `challengeId`. The 6-digit code is printed in the **API terminal**:

   ```text
   INFO: MiniLedger mock OTP [<challengeId>] for +919876543210: 940700
   ```

2. **Verify it** to sign in; keep `tokens.accessToken`:

   ```bash
   curl -X POST http://localhost:4000/v1/auth/otp/verify \
     -H "Content-Type: application/json" \
     -d '{"challengeId":"<challengeId>","code":"940700"}'
   ```

3. **Add a loan** (friend name, amount, due date). `id` is any new UUID chosen by the client, which makes retries safe:

   ```bash
   curl -X POST http://localhost:4000/v1/loans \
     -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
     -d '{"id":"0b8c3f8e-1d0a-4a4e-9a51-4f0c7f6d2a11","personName":"Rahul","amount":"5000","dueDate":"2026-10-30"}'
   ```

4. **Mark it repaid**: `POST /v1/loans/<loanId>/settle` with body `{}`.
5. **Summary**: `GET /v1/summary` returns `totalLent`, `totalRepaid` and `overdueAmount` (lent loans only), plus borrowed figures.
6. **List loans**: `GET /v1/loans` (overdue first; `?status=overdue`, `?direction=LENT`, `?search=rah`, `?sort=dueDate|recent`, cursor pagination).

| Endpoint                                     | Purpose                             |
| -------------------------------------------- | ----------------------------------- |
| `GET /health`                                | Liveness                            |
| `GET /v1/auth/config`                        | Sign-in mode (`assignment` → phone) |
| `POST /v1/auth/otp/request`, `/otp/verify`   | Mock phone OTP sign-in              |
| `POST /v1/auth/refresh`, `/logout`           | Rotate or end the session           |
| `GET`, `PATCH /v1/me`                        | Account, timezone, display name     |
| `GET`, `POST /v1/people`                     | People and their separate balances  |
| `GET`, `POST /v1/loans`, `GET /v1/loans/:id` | Loans                               |
| `POST /v1/loans/:id/settle`                  | Mark as repaid                      |
| `GET /v1/summary`                            | Totals                              |

Errors always use one envelope: `{"error":{"code","message","fieldErrors","details","requestId"}}`. Full contracts: [`docs/architecture.md` §6](docs/architecture.md).

## Notes for evaluators

- The brief's "friend name" is the `personName` field of `POST /v1/loans` (MiniLedger calls anyone you lend to a **person**).
- OTP rules: 6 digits, valid 5 minutes, 60-second resend cooldown, 5 attempts, 5 codes per hour per number.
- Money is stored as integer paise; concurrent or repeated requests never double-record a loan or repayment.
