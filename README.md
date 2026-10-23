<p align="center">
  <img src="apps/mobile/assets/brand/logo.png" alt="MiniLedger logo" width="180" />
</p>

# MiniLedger

An Android app for keeping track of money you lend to, and borrow from, people.

**Stack:** React Native + Expo (app) · Node.js + TypeScript + Express (API) · PostgreSQL + Prisma (database) · pnpm monorepo.

## Prerequisites

- Node.js 22 LTS and pnpm 10 (`npm i -g pnpm`)
- Docker Desktop (runs the local PostgreSQL)
- Android Studio (for the Android SDK) and an Android phone with USB debugging on, or an emulator

## Run it locally

Run every command from the repository root unless a step says otherwise.

### 1. Install

```bash
pnpm install
```

### 2. Database

```bash
pnpm db:up
```

This starts PostgreSQL 16 in Docker on host port **5433** and creates the `miniledger` and `miniledger_test` databases. Stop it with `docker compose down`.

### 3. Backend

Create the API's environment file from the template:

```bash
cp .env.example apps/api/.env              # PowerShell: Copy-Item .env.example apps/api/.env
```

Open `apps/api/.env` and replace each of the three secrets with its own random value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Apply the migrations and start the API:

```bash
pnpm --filter @miniledger/api prisma:migrate:dev
pnpm --filter @miniledger/api dev
```

Check it: [http://localhost:4000/health](http://localhost:4000/health) returns `{"status":"ok",...}`. Keep this terminal open; **sign-in codes are printed here**.

### 4. App

Plug in the phone (Developer options → USB debugging), then in a second terminal:

```bash
adb devices                       # the phone must show as "device"
adb reverse tcp:4000 tcp:4000     # lets the phone reach the API as localhost
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:4000/v1 npx expo run:android
```

On PowerShell, set the variable first: `$env:EXPO_PUBLIC_API_URL="http://localhost:4000/v1"`, then run `npx expo run:android`.

The first build installs a development app on the phone and takes 10–20 minutes. After that, start it with `npx expo start --dev-client` (same variable) and open **MiniLedger (Dev)** on the phone. Expo Go is not supported: this project uses Expo SDK 58.

If the app can't connect after you replug the phone, run `adb reverse tcp:4000 tcp:4000` and `adb reverse tcp:8081 tcp:8081` again.

### 5. Sign in

Enter any 10-digit Indian mobile number. The 6-digit code appears in the API terminal:

```text
INFO: MiniLedger mock OTP [<challengeId>] for +919876543210: 940700
```

<details>
<summary><strong>Windows build troubleshooting</strong></summary>

- Set `ANDROID_HOME` to `%LOCALAPPDATA%\Android\Sdk` and `JAVA_HOME` to Android Studio's `jbr` folder, and add `%ANDROID_HOME%\platform-tools` to `PATH`. In PowerShell these last only for the current window.
- If the build fails in `react-native-reanimated` with `ninja: error: mkdir(...)`, the file paths are too long for CMake 3.22. Install CMake 3.31.6 (Android Studio → SDK Tools, or `sdkmanager "cmake;3.31.6"`) and add this line to `apps/mobile/android/local.properties` (again after any `expo prebuild --clean`):

  ```properties
  cmake.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk\\cmake\\3.31.6
  ```

</details>

## Tests and checks

```bash
pnpm test           # shared, API (integration, against miniledger_test) and app unit tests
pnpm lint
pnpm typecheck
pnpm format:check
```

The database from step 2 must be running for the API tests.

## Try the API

With the API running, the assignment flow works with `curl`. Amounts are sent as rupee strings and returned as integer **paise** (`500000` = ₹5,000).

```bash
# 1. Request a code; it prints in the API terminal. The response has a challengeId.
curl -X POST http://localhost:4000/v1/auth/otp/request \
  -H "Content-Type: application/json" -d '{"identifier":"9876543210"}'

# 2. Verify it; keep tokens.accessToken from the response.
curl -X POST http://localhost:4000/v1/auth/otp/verify \
  -H "Content-Type: application/json" -d '{"challengeId":"<challengeId>","code":"<code>"}'

# 3. Add a loan: person name, amount, due date. "id" is any new UUID (makes retries safe).
curl -X POST http://localhost:4000/v1/loans \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"id":"0b8c3f8e-1d0a-4a4e-9a51-4f0c7f6d2a11","personName":"Rahul","amount":"5000","dueDate":"2026-10-30"}'

# 4. Mark it repaid.
curl -X POST http://localhost:4000/v1/loans/<loanId>/settle \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" -d '{}'

# 5. Summary: totalLent, totalRepaid, overdueAmount (lent loans), plus borrowed figures.
curl http://localhost:4000/v1/summary -H "Authorization: Bearer <accessToken>"
```

| Endpoint                                                | Purpose                                                   |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `POST /v1/auth/otp/request`, `/otp/verify`              | Mock phone OTP sign-in                                    |
| `GET`, `POST /v1/loans`                                 | List (overdue first; filters, search, sort) and add loans |
| `GET`, `PATCH`, `DELETE /v1/loans/:id`                  | Loan detail, edit, delete                                 |
| `POST /v1/loans/:id/settle`                             | Mark as repaid                                            |
| `POST /v1/loans/:id/repayments`                         | Record a partial repayment                                |
| `GET /v1/summary`                                       | Totals                                                    |
| `GET`, `POST /v1/people`, `GET`, `PATCH /v1/people/:id` | People and their separate balances                        |

All endpoints and the error format: [`docs/architecture.md` §6](docs/architecture.md).

## Notes for evaluators

- The brief's "friend name" is `personName` in `POST /v1/loans`; the app calls anyone you lend to a **person**.
- OTP: 6 digits, valid 5 minutes, 60-second resend cooldown, 5 attempts, 5 codes per hour per number.
- Money is stored as integer paise; repeated or concurrent requests never double-record a loan or repayment.
- Receipt photos (the bonus) stay on the phone, compressed and stripped of metadata; they are never uploaded.

## Project layout

```text
apps/api         Express REST API, Prisma schema and migrations
apps/mobile      Expo React Native app
packages/shared  Validation, money/date helpers and API contracts used by both
docs/            Product, architecture, design, implementation and deployment docs
web/             Public privacy and account-deletion pages
```

Production deployment, the Play Store build and operations: [`docs/deployment.md`](docs/deployment.md).
