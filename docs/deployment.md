# MiniLedger — Deployment and operations

Production uses email OTP (Resend), Neon PostgreSQL and a Render web service. Phone OTP is refused on any hosted server. Full rules: [`architecture.md` §11](architecture.md).

## Production API

1. **Neon:** create a project (PostgreSQL 17) and copy the **pooled** URL (`DATABASE_URL`) and the **direct** URL (`DIRECT_URL`), both with `sslmode=require`.
2. **Resend:** verify the `surajmishra.me` domain (SPF/DKIM records) so mail can be sent as `miniledger@surajmishra.me` and create an API key with sending access only.
3. **GitHub:** create the `production` environment (Settings → Environments) with required reviewers, the secret `DIRECT_URL` and the variable `BACKUP_AGE_RECIPIENT` (public key from `age-keygen`; keep the private key offline).
4. **Migrate:** Actions → _Migrate production database_ → type `migrate`. Always run this before deploying code that needs a new schema; the server never migrates on boot.
5. **Render:** New → Blueprint → this repository. `render.yaml` defines the service; enter the secrets it asks for (`DATABASE_URL`, `PUBLIC_API_ORIGIN`, `RESEND_API_KEY` and three different 32+ byte secrets from `openssl rand -base64 48`). The API refuses to start if any value is missing, weak or unsafe.
6. **Custom domain:** Render → the service → Settings → Custom Domains → add `miniledger-api.surajmishra.me`, then at your DNS provider add `CNAME miniledger-api → miniledger-api.onrender.com` (the exact target Render shows). Render issues the HTTPS certificate once DNS resolves.
7. **Verify:** `curl https://miniledger-api.surajmishra.me/health`; a phone number on `/v1/auth/otp/request` must return `422`; an email address must receive a code.
8. **Pages:** Settings → Pages → Source _GitHub Actions_, custom domain `miniledger.surajmishra.me` (DNS `CNAME miniledger → <github-user>.github.io`), Enforce HTTPS. The _Pages_ workflow publishes `web/`.

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
- **Store-review sign-in:** set `REVIEW_ACCOUNT_EMAIL=playreview@surajmishra.me` and a random 6-digit `REVIEW_ACCOUNT_CODE` on Render (no repeated or sequential digits). That email signs in with that code and receives no email. Give both in Play Console → App access. Remove the two variables to turn it off.
- Play Console: describe MiniLedger as a personal record-keeping tool that does not offer or arrange loans; fill in Data Safety to match [`web/privacy.html`](../web/privacy.html) (email address, user-entered financial records, encrypted in transit, deletable; no sharing); add the deletion URL `https://miniledger.surajmishra.me/delete-account.html`; give reviewers a dedicated test mailbox in App access.

## Operations

- **Health:** `GET /health` (no database access). Render's health check uses it; don't add keep-alive pingers. Free instances sleep and cold-start in about a minute; the app shows "Connecting…" meanwhile.
- **Backups:** the _Backup production database_ workflow runs weekly (and on demand), encrypts a `pg_dump` with `age` and keeps it as an artifact for 30 days. Restore: `age -d -i key.txt <file> > db.dump && pg_restore --no-owner -d "$DIRECT_URL" db.dump`. Test a restore into a scratch Neon branch before launch.
- **Monitoring:** Render logs (request ID, route, status and duration only; no bodies, tokens, codes or names), Neon usage and the Resend dashboard (bounces, the 100/day free quota; the API stops at `OTP_DAILY_SEND_LIMIT=90`).
- **Account deletion requests by email:** reply to the account address and delete only after confirmation from it ([`web/delete-account.html`](../web/delete-account.html)).
