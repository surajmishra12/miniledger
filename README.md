<p align="center">
  <img src="apps/mobile/assets/brand/logo.png" alt="MiniLedger logo" width="200" />
</p>

# MiniLedger

A small Android app for keeping track of money you lend to (and borrow from) people, built for the Full Stack Development internship assignment and designed to ship on Google Play from the same codebase.

- **Backend:** Node.js + TypeScript + Express + PostgreSQL (Prisma)
- **App:** React Native + Expo (Expo Router), TypeScript
- **Specs:** [`docs/prd.md`](docs/prd.md), [`docs/architecture.md`](docs/architecture.md), [`docs/design.md`](docs/design.md), progress in [`docs/implementation.md`](docs/implementation.md)

> Status: the assignment scope is complete (Phases 1–2), plus the full V1: partial repayments, editing and deleting loans and repayments, a People tab (Phase 3), production email sign-in and account deletion (Phase 4), device-only receipt photos (the bonus), Light / Dark / Use device setting themes, haptics and reduced motion (Phase 5).

## Repository layout

```text
apps/api         Express REST API, Prisma schema and migrations
apps/mobile      Expo React Native app
packages/shared  Validation, money/date helpers and API contracts used by both
web/             Public privacy and account-deletion pages (GitHub Pages)
docs/            Product, architecture, design and implementation documents
render.yaml      Render Blueprint for the production API
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

5. Run the app. The simplest way is **Expo Go** over Wi-Fi (no cable or native build):
   1. Install Expo Go from the Play Store; connect the phone to the same Wi-Fi as the computer.
   2. Create `apps/mobile/.env` with your computer's LAN IP:

      ```dotenv
      EXPO_PUBLIC_API_URL=http://192.168.1.14:4000/v1
      ```

   3. `pnpm --filter @miniledger/mobile start` and scan the QR code with Expo Go.
      If the phone cannot connect, allow Node.js through Windows Firewall on private networks (ports 4000 and 8081).

   Alternatively, with a USB-connected phone (USB debugging on):

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

| Endpoint                                                | Purpose                               |
| ------------------------------------------------------- | ------------------------------------- |
| `GET /health`                                           | Liveness                              |
| `GET /v1/auth/config`                                   | Sign-in mode (`assignment` → phone)   |
| `POST /v1/auth/otp/request`, `/otp/verify`              | Mock phone OTP sign-in                |
| `POST /v1/auth/refresh`, `/logout`                      | Rotate or end the session             |
| `GET`, `PATCH /v1/me`                                   | Account, timezone, display name       |
| `POST /v1/auth/reauth/request`, `DELETE /v1/me`         | Delete the account with a fresh code  |
| `GET`, `POST /v1/people`                                | People and their separate balances    |
| `GET`, `PATCH`, `DELETE /v1/people/:id`                 | One person: rename, archive, delete   |
| `GET`, `POST /v1/loans`                                 | List (filters, sorts) and add loans   |
| `GET`, `PATCH`, `DELETE /v1/loans/:id`                  | Loan detail, edit (`version`), delete |
| `POST /v1/loans/:id/settle`                             | Mark as repaid                        |
| `POST /v1/loans/:id/repayments`                         | Record a partial repayment            |
| `PATCH`, `DELETE /v1/loans/:id/repayments/:repaymentId` | Edit or remove a repayment            |
| `GET /v1/summary`                                       | Totals                                |

Errors always use one envelope: `{"error":{"code","message","fieldErrors","details","requestId"}}`. Full contracts: [`docs/architecture.md` §6](docs/architecture.md).

## Notes for evaluators

- The brief's "friend name" is the `personName` field of `POST /v1/loans` (MiniLedger calls anyone you lend to a **person**).
- OTP rules: 6 digits, valid 5 minutes, 60-second resend cooldown, 5 attempts, 5 codes per hour per number.
- Money is stored as integer paise; concurrent or repeated requests never double-record a loan or repayment.
- Receipt photos (the bonus) are saved only on the phone, compressed and stripped of metadata; they are never uploaded.

## Production deployment

Production uses email OTP (Resend), Neon PostgreSQL and a Render web service. Phone OTP is refused on any hosted server. Full rules: [`docs/architecture.md` §11](docs/architecture.md).

1. **Neon:** create a project (PostgreSQL 17) and copy the **pooled** URL (`DATABASE_URL`) and the **direct** URL (`DIRECT_URL`), both with `sslmode=require`.
2. **Resend:** verify the `mail.surajmishra.me` domain (SPF/DKIM records) and create an API key with sending access only.
3. **GitHub:** create the `production` environment (Settings → Environments) with required reviewers, the secret `DIRECT_URL` and the variable `BACKUP_AGE_RECIPIENT` (public key from `age-keygen`; keep the private key offline).
4. **Migrate:** Actions → _Migrate production database_ → type `migrate`. Always run this before deploying code that needs a new schema; the server never migrates on boot.
5. **Render:** New → Blueprint → this repository. `render.yaml` defines the service; enter the secrets it asks for (`DATABASE_URL`, `PUBLIC_API_ORIGIN`, `RESEND_API_KEY` and three different 32+ byte secrets from `openssl rand -base64 48`). The API refuses to start if any value is missing, weak or unsafe.
6. **Verify:** `curl https://<service>.onrender.com/health`; a phone number on `/v1/auth/otp/request` must return `422`; an email address must receive a code.
7. **Pages:** Settings → Pages → Source _GitHub Actions_, custom domain `miniledger.surajmishra.me` (DNS `CNAME miniledger → <github-user>.github.io`), Enforce HTTPS. The _Pages_ workflow publishes `web/`.

## Android release (EAS)

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init                       # links the project (adds the EAS project ID)
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest submit -p android --profile production   # uploads to the internal track as a draft
```

- Set the real API URL in `eas.json` (`EXPO_PUBLIC_API_URL`) if the Render service name differs. `app.config.ts` refuses to build `production` with a non-HTTPS or local URL.
- Production uses the application ID `com.surajmishra.miniledger`; development builds use `.dev`, so both can be installed side by side.
- The Android manifest requests the camera only (plus internet and vibration); storage, media and audio permissions are blocked.
- Play Console: describe MiniLedger as a personal record-keeping tool that does not offer or arrange loans; fill in Data Safety to match [`web/privacy.html`](web/privacy.html) (email address, user-entered financial records, encrypted in transit, deletable; no sharing); add the deletion URL `https://miniledger.surajmishra.me/delete-account.html`; give reviewers a dedicated test mailbox in App access.

## Operations

- **Health:** `GET /health` (no database access). Render's health check uses it; don't add keep-alive pingers. Free instances sleep and cold-start in about a minute; the app shows "Connecting…" meanwhile.
- **Backups:** the _Backup production database_ workflow runs weekly (and on demand), encrypts a `pg_dump` with `age` and keeps it as an artifact for 30 days. Restore: `age -d -i key.txt <file> > db.dump && pg_restore --no-owner -d "$DIRECT_URL" db.dump`. Test a restore into a scratch Neon branch before launch.
- **Monitoring:** Render logs (request ID, route, status and duration only; no bodies, tokens, codes or names), Neon usage and the Resend dashboard (bounces, the 100/day free quota; the API stops at `OTP_DAILY_SEND_LIMIT=90`).
- **Account deletion requests by email:** reply to the account address and delete only after confirmation from it ([`web/delete-account.html`](web/delete-account.html)).
