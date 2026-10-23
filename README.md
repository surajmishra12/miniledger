# MiniLedger

An Android app for keeping track of money you lend and borrow.

## Requirements

- Node.js 22 and pnpm 10
- Docker Desktop
- Android Studio (Android SDK) and an Android phone with USB debugging on

## Run

**1. Install and start the database**

```bash
pnpm install
pnpm db:up
```

**2. Start the backend**

```bash
cp .env.example apps/api/.env
pnpm --filter @miniledger/api prisma:migrate:dev
pnpm --filter @miniledger/api dev
```

In `apps/api/.env`, replace the three secrets with random values first (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).

**3. Run the app** (in a second terminal, phone connected by USB)

```bash
adb reverse tcp:4000 tcp:4000
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:4000/v1 npx expo run:android
```

On PowerShell, set the variable with `$env:EXPO_PUBLIC_API_URL="http://localhost:4000/v1"` before `npx expo run:android`.

**4. Sign in** with any 10-digit mobile number. The 6-digit code is printed in the backend terminal.
