# MiniLedger — Product Requirements Document

**Version:** 1.5  
**Status:** Implementation-ready  
**Last reviewed:** 22 October 2026  
**Platform:** Android (React Native + Expo)  
**Companion specifications:** [`architecture.md`](./architecture.md) defines technical contracts; [`design.md`](./design.md) defines the interface, tokens, accessibility and motion.  
**Primary goal:** Deliver the internship assignment completely, then release a safe, polished personal lending tracker on Google Play from the same codebase.

---

## 0. Document precedence and terminology

**Precedence:** `prd.md` governs product behavior, business rules and acceptance → `architecture.md` governs technical contracts (APIs, data, security) → `design.md` governs visual and interaction design. If two documents appear to conflict, the higher-precedence document wins and the lower one must be corrected; implementers must not invent behavior to bridge a gap. [`implementation.md`](./implementation.md) sequences the work and tracks progress; it defines no behavior.

**Glossary (use these terms everywhere — UI, code, API, tests):**

| Term | Meaning |
|---|---|
| **User** | The signed-in account owner. The only kind of registered account. |
| **Person** (plural **people**) | Someone the user lends money to or borrows money from: a friend, relative, colleague, landlord, shopkeeper, anyone. A person is a **name label inside one user's ledger**, not an app user, and has no login, contact details or verification. Code identifiers: `Person`, `people`, `personId`, `personName`. |
| **Loan** | One obligation between the user and one person, with a direction, principal, loan date and due date. |
| **Direction** | `LENT` (the user gave money; the person owes the user) or `BORROWED` (the user received money; the user owes the person). |
| **Principal** | The original loan amount. |
| **Repayment** | A record of money moving back against a loan. For `LENT` it is money **received** by the user; for `BORROWED` it is money **paid back** by the user. |
| **Outstanding** | Principal minus the sum of the loan's repayments. Never negative. |
| **Settle / Mark as repaid** | Record one repayment equal to the full outstanding amount. |
| **Today** | The current calendar date in the user's stored IANA timezone (see FR-05). |

The internship brief's "friend name" is the **person name** (`personName` in the API); the README states this mapping for evaluators.

---

## 1. Product overview

**MiniLedger** is a lightweight personal ledger for tracking money **lent to** and **borrowed from** other people. It records who is involved, the original amount, when repayment is due, and all repayments made so far. It helps users see outstanding balances and overdue amounts without spreadsheets or chat-history searches.

MiniLedger is **a recordkeeping tool**, not a lender, payment processor, collection service, credit-score provider, or shared settlement platform. The app does not move money, verify that a payment occurred, contact anyone automatically, or require the people in the ledger to register.

### 1.1 Problem

Informal personal loans are often tracked mentally or in chat messages. Users forget due dates, lose track of partial repayments, and cannot quickly answer "How much am I owed?" or "How much do I owe?"

### 1.2 Product goals

1. Record a loan in a short, understandable flow (target: under 10 seconds for a returning user whose person is already saved).
2. Present accurate, unambiguous summaries for lent and borrowed money.
3. Make partial and full repayments easy to record and audit.
4. Surface overdue loans clearly without shaming or contacting anyone automatically.
5. Satisfy every mandatory internship requirement, including mock phone OTP logged by the backend.
6. Provide a secure, low-maintenance public Android release using real **email OTP**, without Firebase or paid SMS.

### 1.3 Success criteria

- All mandatory assignment scenarios pass from a clean local setup.
- No cross-user access to people, loans, repayments, or summaries.
- Every loan and summary reflects repayments correctly; no negative outstanding balances.
- Core flows (sign in, add loan, repay, review summary) are usable on common Android screen sizes.
- The Google Play build contains **no reachable mock OTP authentication**.
- A new evaluator can understand, install, run, and test the assignment with clear repository instructions (README is written during development).

---

## 2. Users and boundaries

**Primary users:** Students, roommates, families, colleagues, and individuals who occasionally lend or borrow money and want a private personal record.

**V1 boundaries:**
- India-first; display and record money in **INR (₹)** only. Store exact amounts in **integer paise**; no floating-point financial calculations.
- One account owns its own records. A **person** is a name in the user's ledger, not another registered user. Two users who record each other are completely independent ledgers.
- No bank integrations, payments, debt enforcement, or automatic messages.
- Internet is required for sign-in and every ledger read/write; receipt photos are device-local.
- Android is the initial release target. An iOS release is not part of V1.
- English-only UI copy in V1; person names and notes accept any Unicode script.

---

## 3. Scope and priorities

| Priority | Feature | Release / rationale |
|---|---|---|
| **P0 — Assignment** | Mock phone-number login and server-logged OTP | Required for locally run assignment build |
| **P0 — Assignment** | Add a loan with person name, amount, and due date | Required |
| **P0 — Assignment** | Mark a loan as repaid (from a minimal loan detail screen) | Required |
| **P0 — Assignment** | Summary API: total lent, total repaid, overdue amount | Required |
| **P0 — Assignment** | React Native phone/OTP screens, loan list with overdue highlighting, add form, summary card | Required |
| **P0 — Assignment** | Node.js + TypeScript + PostgreSQL | Required |
| **P1 — Public V1** | Real email OTP login | Required for safe public use |
| **P1 — Public V1** | Record both lent and borrowed money | Agreed extension |
| **P1 — Public V1** | Partial repayments and repayment history | Agreed extension |
| **P1 — Public V1** | People directory and per-person balances | Agreed extension |
| **P1 — Public V1** | Loan edit/delete, search, sorting, filters, detail view | Usability and correction |
| **P1 — Public V1** | Locally stored receipt photos (optional on each loan) | Agreed privacy/cost choice |
| **P1 — Public V1** | Dark mode and system-theme option | Required before public release; not required for P0 |
| **P1 — Public V1** | Validation, automated tests, account deletion, privacy and error states | Reliability and release readiness |

**Not in V1:** SMS delivery; Firebase; Google Sign-In; automatic reminders/notifications; WhatsApp messaging; PDF/CSV exports; biometric lock; cloud receipt storage/sync; analytics dashboards or charts; multiple currencies; recurring loans; interest calculation; loan approval by the other person; money transfer; offline ledger reads or writes; a web app; subscriptions or monetization; phone-contact import.

**Scope rule:** P0 is delivered and tested first. P1 features must never delay the mandatory assignment submission. There is one codebase, not two separate products. P0 may ship light theme only.

---

## 4. User journeys

### 4.1 Sign in

**Assignment mode (local only):** User enters a phone number → requests OTP → backend generates a six-digit OTP and prints it to the server logs → user reads it from the running server terminal → enters OTP → backend verifies it and signs the user in. The phone number is **not actually verified**; this is intentional for the assignment.

**Production mode:** User enters an email address → requests OTP → backend emails a six-digit OTP through Resend → user enters OTP → backend verifies it and signs the user in. New identities create accounts automatically. Existing identities return to their own records.

**Both modes:** The same OTP generation/verification rules and session system apply. The backend, not the app UI, controls which mode is enabled. The production environment **must reject** phone OTP requests.

### 4.2 Lend money

Home → **Add loan** → select **I lent** → choose an existing person or type a new name → enter amount and due date (required) → optionally edit loan date, add a note, and attach one receipt photo → save → loan appears in the list and updates summaries.

### 4.3 Borrow money

Same flow as above with **I borrowed** selected. The app clearly describes the balance as money **you owe**, not money owed to you.

### 4.4 Record a repayment

Open a loan → **Record repayment** → enter amount, date, and optional note → save → outstanding balance, status, history, and summaries update. **Mark as repaid** records a repayment equal to the full remaining balance after confirmation.

### 4.5 Review and correct records

Home → summary card at the top, then the loans that need attention (overdue first); Loans → the complete searchable/filterable list; People → each person's lent and borrowed balances; Loan details → full repayment history and edit/delete actions. Users can correct or remove an incorrectly entered repayment or loan, with confirmation for destructive actions.

### 4.6 Delete account

Settings → **Delete account** → read what will be deleted → receive a fresh OTP → enter it and confirm → all server data is erased, the app clears local receipts and credentials, and returns to sign-in.

---

## 5. Functional requirements

### FR-01 — Authentication and accounts

1. Support exactly one enabled login method per backend environment:
   - `assignment`: mock **phone OTP** printed to backend logs.
   - `production`: real **email OTP** sent through Resend.
2. OTPs are six digits, cryptographically generated, valid for **5 minutes**, single-use, and invalidated when replaced by a newer OTP for the same destination.
3. Enforce a **60-second resend cooldown** per destination, a maximum of **5 verification attempts per OTP**, and server-side request limits by destination and IP (exact limits in `architecture.md` §7.2).
4. Store only keyed hashes of OTPs (never plaintext) at rest. **Production never logs OTP values**.
5. A successful verification creates or finds the user and establishes a persistent session. The app stays signed in across restarts until the session expires (30 days without use, or 90 days after sign-in at most), the user signs out, or the account is deleted.
6. All ledger APIs require authentication and enforce ownership on every resource.
7. Provide sign-out and **delete account**. Deletion always requires a fresh OTP sent to the account's identifier. Deletion removes the user's account, people, loans, repayments and sessions from the server, and the app clears that user's local receipt files.
8. Assignment and production use **separate databases**. A phone-based assignment identity is never merged with an email-based production identity.
9. A user's identifier (phone or email) cannot be changed in V1. Users may set an optional display name (up to 60 characters).

**Acceptance:** An evaluator can see the OTP in local server logs and sign in; a production user receives an email OTP; an unauthenticated or other user's request cannot read or modify a record; production refuses phone OTP requests even when invoked directly with `curl`.

### FR-02 — People

1. Create a person inline while adding a loan or from the People screen. **Name is required**: 1–80 characters after trimming and collapsing internal whitespace; any Unicode script. No phone, email, contact-book access or photo.
2. List and search people (case-insensitive substring match on name) and show each person's **owes you** (outstanding lent) and **you owe** (outstanding borrowed) balances separately. Never show a netted balance.
3. Rename a person without changing loan or repayment history.
4. Archive or unarchive a person. Archived people are hidden from the default People list and the loan form's person picker, remain visible on their historical loans and in an explicit **Archived** view, and cannot receive new loans until unarchived.
5. A person can be permanently deleted **only if they have no loans**; otherwise the app explains that archiving is the alternative.
6. Names are not unique: two different people may share a name. While typing a name, the app shows existing matches so the user can choose one or deliberately add another person with the same name.

**Acceptance:** Loans remain linked to the correct person after a rename; a person with loans cannot be deleted; data from another user is never exposed.

### FR-03 — Loans

1. Each loan has: owner, person, direction (`LENT` or `BORROWED`), principal, loan date, due date, optional note (up to 500 characters), and created/updated timestamps.
2. **Required inputs:** person (existing or new), principal **greater than ₹0 and at most ₹1,00,00,000.00 (₹1 crore)**, and a valid due date. Loan date defaults to today, may be edited for historical loans, and cannot be after today (a loan records money that already changed hands). Past due dates are allowed. All dates must fall between 1 January 2000 and 31 December 2099. The due date may be earlier than the loan date (the app shows a non-blocking hint).
3. Amounts accept at most **two decimal places** and are stored as integer paise. The API rejects zero, negative, malformed, or over-limit amounts.
4. If direction is omitted in the API request, it defaults to `LENT` (assignment compatibility). The mobile form always sends an explicit direction, defaulting the control to **I lent**.
5. Editable after creation: principal, loan date, due date, note, and person (any non-archived person of the same user). Direction can be changed **only while the loan has no repayments**; otherwise the user must delete and re-create the loan.
6. A principal edit below the sum already repaid is rejected with a message stating the minimum allowed amount.
7. If two devices edit the same loan, the second save based on outdated data is rejected and the user reviews the latest version (no silent overwrite).
8. Deleting a loan requires confirmation and **permanently** removes the loan and all its repayments. Totals update immediately; nothing is retained for undo.
9. Every loan query is scoped to the authenticated user; IDs alone never grant access.

**Acceptance:** A saved lent or borrowed loan appears in the right category; edits immediately update its balance; illegal principal reductions, stale edits and cross-user writes are rejected.

### FR-04 — Repayments and status

1. A loan has **zero or more** repayments, each with amount, payment date, optional note (up to 500 characters), and created/updated timestamps.
2. A repayment amount must be **greater than zero and no more than the current outstanding balance** (when editing, the repayment's own previous amount is available again). The payment date must not be after today. A payment date earlier than the loan date is allowed with a non-blocking hint.
3. Users may edit or remove a repayment to correct mistakes. Outstanding balance is recalculated after every change.
4. **Mark as repaid** records one repayment for the exact remaining balance, dated today (the API also accepts an earlier valid date; the V1 app always uses today, and the user can edit the repayment afterwards). It never flips a flag while leaving amounts inconsistent. Marking an already repaid loan changes nothing.
5. Derived repayment status:
   - `UNPAID`: no repayments recorded;
   - `PARTIAL`: total repaid is greater than zero and less than principal;
   - `REPAID`: outstanding is zero.
6. **Overdue** is a separate derived condition, not a status: outstanding is greater than zero **and** the due date is before today. A loan due today is not overdue. Days overdue = today − due date, in calendar days.
7. Two quick taps, retries after a timeout, or concurrent requests must never create duplicate repayments or exceed the principal.

**Acceptance:** A ₹5,000 lent loan with ₹2,000 repaid shows ₹3,000 outstanding and status `PARTIAL`; marking it repaid records the remaining ₹3,000; a fully repaid loan is never counted as overdue.

### FR-05 — Dashboard and financial summaries

Provide an authenticated summary endpoint and a home-screen summary card. All figures use the user's existing loans (deleted loans no longer exist), expressed as **integer paise in the API** and formatted as INR in the UI.

| Metric | Exact definition |
|---|---|
| `totalLent` | Sum of principals of all `LENT` loans, including fully repaid loans |
| `totalRepaid` | Sum of repayments on `LENT` loans (money received) |
| `outstandingLent` | `totalLent − totalRepaid` |
| `overdueAmount` | Sum of **outstanding** amounts of overdue `LENT` loans |
| `totalBorrowed` | Sum of principals of all `BORROWED` loans |
| `totalReturned` | Sum of repayments on `BORROWED` loans (money paid back) |
| `outstandingBorrowed` | `totalBorrowed − totalReturned` |
| `overdueBorrowed` | Sum of outstanding amounts of overdue `BORROWED` loans |
| `peopleOwingYou` / `peopleYouOwe` | Number of distinct people with an outstanding `LENT` / `BORROWED` balance |
| `lentLoans` / `overdueLoans` | Number of `LENT` loans / of overdue `LENT` loans |
| `dueSoonLent` / `dueSoonBorrowed` | Sum of outstanding amounts of `LENT` / `BORROWED` loans that are not overdue and due today through today + 6 |
| `dueSoonLoans` | Number of loans (both directions) counted in `dueSoonLent` + `dueSoonBorrowed` |

**Assignment compatibility:** The required fields `totalLent`, `totalRepaid`, and `overdueAmount` **always refer to lent loans**, so borrowed activity never alters their meaning.

**Example:** Lent ₹5,000 due yesterday with ₹2,000 received; lent ₹3,000 fully repaid; borrowed ₹4,000 due next week with ₹1,000 returned. Then `totalLent = ₹8,000`, `totalRepaid = ₹5,000`, `outstandingLent = ₹3,000`, `overdueAmount = ₹3,000`, `totalBorrowed = ₹4,000`, `totalReturned = ₹1,000`, `outstandingBorrowed = ₹3,000`, `overdueBorrowed = ₹0`.

**Dates and "today":** Loan, due and payment dates are **calendar dates** (no time of day). "Today" is computed by the server from the user's stored IANA timezone. The app sends the device timezone at sign-in and updates it when the device timezone changes; if none is provided, `Asia/Kolkata` is used. Every summary and loan response states the date it was computed for, so badges and totals always agree.

**Acceptance:** Aggregate values remain exact after create, edit, delete, partial repayment, repayment correction, and date rollover; lent and borrowed figures never mix.

### FR-06 — Loan list, search, sorting and filtering

1. Show loans with person name, direction, original amount, outstanding amount, due date, and clear overdue/repaid state.
2. Overdue items are highlighted using both **text and color**, never color alone.
3. Search by person name (case-insensitive substring). Filter by direction (`All`, `Lent`, `Borrowed`) and state (`All`, `Outstanding`, `Overdue`, `Repaid`). `Outstanding` includes overdue loans.
4. Sort options:
   - **Needs attention** (default): overdue loans first, then other outstanding loans, then repaid loans; within each group, earliest due date first.
   - **Due date**: earliest due date first.
   - **Recent activity**: most recently created or changed (including repayment changes) first.
5. Provide a first-use empty state and a no-results state with a way to clear filters.

**Acceptance:** Filtering and searching never change the totals; overdue loans are identifiable without opening them.

### FR-07 — Local receipt attachment

1. A user may **optionally attach one photo to a loan**, using the camera or photo picker, and may view, replace, or remove it.
2. The image is compressed and copied into the app's **persistent, private device storage** (not a temporary cache), associated with the current user ID and loan ID, keeping receipt text legible.
3. **Receipt photos and local file paths are never sent to the backend.**
4. Receipts persist across app restarts but **are not backed up or synced** and may be lost after uninstall, clearing app data, or changing devices. The app explains this once before the first attachment.
5. A signed-in user never sees another user's local photos. The app deletes a loan's receipt after the loan is deleted, and all of a user's receipts after their account is deleted.
6. Denied camera/gallery permission or a missing file never prevents the rest of the loan from loading or saving.

**Assignment bonus clarification:** The optional assignment item says "upload a photo of a receipt". V1 provides an **on-device attachment**, not a remote upload, and does not claim to implement a server-side upload endpoint.

### FR-08 — UI, navigation, and interaction

1. Core screens: Sign-in; OTP verification; Home (summary card at the top, then loans needing attention); Loans (the full list); Add sheet (lent or borrowed); Add/Edit loan; Loan detail with repayment history; Record/Edit repayment; People list; Person detail; Settings/account; account deletion.
2. Visual direction: **Terracotta & Cream** light theme and **Onyx & Ember** dark theme, derived from the MiniLedger logo and specified in `design.md`.
3. Keep primary actions discoverable (**Add loan**, **Record repayment**). Make **Lent** vs **Borrowed** visible throughout.
4. Accessible tap targets, readable text, labels for icons, correct keyboards, inline form errors, confirmation dialogs for destructive actions, and loading/success/error/empty states.
5. **Theme:** P0 requires the light theme. Public V1 requires Light, Dark and Use device setting, with light as the first-run default.
6. Network failures show actionable retry messaging and never discard form input; ledger reads and writes require a connection.

**Acceptance:** All P0 flows work on Android; layouts adapt to small phones; data is understandable without interpreting colors alone.

### FR-09 — Privacy and account management

1. Users can view their identifier, set a display name, sign out, and delete their account.
2. Explain what is stored in the cloud (account identifier, display name, timezone, people, loans, repayments) versus only on the device (receipt photos).
3. Do not request contacts, location, or SMS permissions; camera/photo access is requested only when the user invokes that feature.
4. Before public distribution, provide a privacy policy page, in-app account deletion, and a public web page explaining how to request deletion without the app.
5. Never put loan details in logs, OTP emails (which contain only the code and its expiry), or analytics. V1 has no analytics SDK.

---

## 6. Minimum API capabilities

Exact routes and schemas are in `architecture.md` §6. These capabilities are mandatory:

- Request and verify OTP for the enabled auth mode; refresh and end a session; request a deletion code.
- Read and update the current account; delete it with all associated records.
- Create/list/read/update/delete loans; mark a loan as fully repaid.
- Add/list/edit/delete repayments for a loan.
- Create/list/read/update (rename, archive)/delete people, with per-person balances.
- **Return a summary with `totalLent`, `totalRepaid`, and `overdueAmount`**, plus the supplementary metrics in FR-05.

Contract requirements: one error format with stable codes, correct HTTP status codes, server-side ownership checks and business rules, and duplicate-safe financial mutations.

---

## 7. Key states, edge cases, and safeguards

| Scenario | Required behavior |
|---|---|
| Newly registered user | All amounts ₹0; clear empty states and Add action |
| Due today | Not overdue |
| Past-due loan with partial repayment | Overdue amount equals **remaining balance**, not principal |
| Fully repaid past-due loan | Not overdue |
| Same person on lent and borrowed loans | Show balances separately; never net or offset them |
| Two people with the same name | Allowed; user explicitly chooses an existing one or adds another |
| Repayment exceeds outstanding | Reject without changing data |
| Edit principal below recorded repayments | Reject, stating the minimum allowed amount |
| Change direction of a loan with repayments | Reject; explain delete and re-create |
| Loan edited on another device | Reject the stale edit; show the latest version |
| Duplicate save from double tap or network retry | Exactly one loan/repayment is recorded |
| Other user's record ID | Treated as not found; no contents exposed |
| Delete a person with loans | Reject; offer archive |
| New loan for an archived person | Reject; offer unarchive |
| OTP expired, wrong, reused, or attempts exhausted | Reject with a specific reason and resend guidance |
| Email delivery fails | Never claim the OTP was sent; allow retry |
| Free-tier cold start or offline | Show progress and retry; never a silent failed submission |
| Local receipt missing | Show "Receipt unavailable on this device" without breaking the loan |
| Sign-in on another device | Cloud data appears; previous device's receipts do not |
| Account deletion | Always requires a fresh OTP; wrong or expired code deletes nothing |
| Date rollover while the app is open | Overdue badges and totals update on next refresh or app resume |

---

## 8. Non-functional requirements

**Correctness and integrity**
- Exact integer-paise arithmetic; no negative balances, overpayments or inconsistent aggregates.
- Financial mutations are atomic and safe to retry; concurrent mutations on one loan are serialized.
- Database migrations and enforced referential integrity, including owner consistency between people, loans and repayments.

**Security**
- HTTPS for the deployed API; passwordless OTP and secure, revocable sessions.
- Ownership checked server-side on every query and mutation.
- Production cannot be switched to mock OTP by any client input.
- Secrets never shipped in the app or committed to Git.
- Durable OTP throttling; no OTP logging in production.

**Reliability and usability**
- Correct loading, offline, retry, and error states. Free-tier cold starts are communicated, not presented as failures.
- No real-time sync, notifications, or offline write capability.
- Responsive Android layouts and accessible overdue indicators.

**Data and privacy**
- Receipts stay on the device; financial records live in the user's account in PostgreSQL.
- Permanent, complete account deletion and transparent disclosures.

**Testing**
- Unit tests for money parsing, balances, overdue computation, date boundaries, and validation.
- API integration tests against real PostgreSQL for OTP/session flows, CRUD, account isolation, retry safety, concurrency and all summary fields.
- Manual Android smoke tests per `architecture.md` §12.3.

---

## 9. Environments and release requirements

### Assignment / local evaluation

- Backend runs locally with `AUTH_MODE=assignment` against an **isolated local PostgreSQL database**.
- OTP is printed in the running Node.js process logs, as the assignment requires.
- Provide a locally installable Android build or reproducible Expo development workflow pointing to the local API.
- README explains starting the database and backend, reading the OTP from logs, calling the required APIs, and running tests.
- Never publicly deploy a mock-OTP environment.

### Production / Google Play

- Same source, with `AUTH_MODE=production` **enforced by the server**.
- Email OTP via **Resend**; no mock OTP path exists.
- Node.js API on **Render**; **Neon PostgreSQL** for data. Receipts remain on-device.
- Separate production database and credentials; free hosting is a cost choice, **not an uptime guarantee**.
- Release only after authentication security, account deletion, privacy policy, deletion-request page, permissions, store declarations and reviewer access instructions are ready.
- The assignment submission never depends on Google Play approval.

---

## 10. Acceptance and release checklist

### Assignment — required (P0)

- [ ] Node.js + TypeScript REST API uses PostgreSQL.
- [ ] Phone input requests a generated OTP; OTP appears in server logs.
- [ ] OTP verification establishes an authenticated session.
- [ ] Add-loan API accepts person name, amount, and due date.
- [ ] A loan can be marked repaid and no longer counts as outstanding or overdue.
- [ ] Summary endpoint returns accurate `totalLent`, `totalRepaid`, `overdueAmount`.
- [ ] React Native login and OTP verification screens work.
- [ ] React Native loan list visibly highlights overdue entries.
- [ ] Add-loan form and home summary card work.
- [ ] Setup and test steps can be reproduced from a clean checkout.
- [ ] **Submission (due 24 October 2026):** public GitHub link with a README on how to run it, and a 2–3 minute screen recording (Loom or Google Drive) of the app working, including the OTP appearing in the server log.

### Product V1 — extension and public release (P1)

- [ ] Production email OTP login works without Firebase or SMS.
- [ ] Phone OTP is rejected by the production server.
- [ ] Lent and borrowed loans are independently represented.
- [ ] Partial repayments, settlement, and repayment corrections are accurate.
- [ ] People, loan details, search, filters, sorting, edits, archive and delete safeguards work.
- [ ] Optional receipt photo stays local, persists after restart, and is labeled device-only.
- [ ] Light, dark and system themes work on every screen.
- [ ] Validation, rate limits, isolation, retry safety, concurrency and tests pass.
- [ ] No sensitive data leaks across accounts or into logs.
- [ ] Privacy policy, in-app deletion and external deletion-request page are complete.
- [ ] Android release is tested and ready for Google Play submission.

---

## 11. Dependencies, constraints, and risks

| Dependency / risk | V1 decision or mitigation |
|---|---|
| Mock OTP is not real identity verification | Local assignment only; never public |
| Free-tier API cold starts | Show loading/retry; reassess hosting if real usage grows |
| Resend deliverability, quota, sender-domain verification | Verified sending domain, delivery monitoring, rate limits |
| Receipt loss on uninstall/device change | Device-only warning; no implied backup |
| Shared device or account switches | Receipts scoped by user ID; never shown across accounts |
| User-entered records may be inaccurate | Edit/delete controls; no claim that MiniLedger verifies debts or payments |
| Extra features could delay the assignment | P0 first, then P1 incrementally |
| Google Play approval and compliance | Validate requirements before publication; not a grading prerequisite |

---

## 12. Decisions frozen for V1

1. **Scope:** Assignment requirements + borrowed tracking + partial repayments + people directory + loan correction/search/sort + local receipts + dark mode + production readiness.
2. **Terminology:** "person/people" everywhere in UI, API and code.
3. **Mobile:** React Native, Expo, TypeScript; Android first.
4. **Backend:** Node.js, Express, TypeScript; PostgreSQL with Prisma.
5. **Authentication:** Shared OTP engine; mock phone OTP in local assignment mode; Resend email OTP in production; server-enforced mode; app-owned sessions.
6. **Deletion:** Hard deletes for loans, repayments, people and accounts. No soft delete, no undo.
7. **Hosting:** Render Free API + Neon Free PostgreSQL initially, subject to provider limits.
8. **Receipts:** On-device persistent private storage only.
9. **Visual direction:** Terracotta & Cream (light, default) and Onyx & Ember (dark), derived from the MiniLedger logo, per `design.md`.

**Definition of done:** The project meets the internship specification exactly, core flows and financial calculations are reliable, public authentication is real and secure, and the Android app is polished enough to publish without exposing mock authentication or misleading users about receipt storage.

---

## 13. Changelog

**v1.1 (22 October 2026)**
- Renamed "friend" to **person/people** across the product; added a glossary.
- Added `implementation.md` as the phase plan and progress tracker.
- Defined precedence; fixed companion-document filenames to lowercase.
- Fixed limits: person name 1–80 chars, notes ≤500 chars, display name ≤60 chars, principal ≤₹1 crore.
- Defined editable loan fields, direction lock, stale-edit rejection, and permanent (hard) deletion.
- Defined person archive/delete rules, same-name handling and archived-person restrictions.
- Defined timezone source, days overdue, and the three sort orders.
- Added a fresh OTP for account deletion and session lifetime (30 days idle / 90 days max).
- Home shows the summary card at the top followed by the full loan list (matches the brief); no separate Loans tab.
- Made dark mode a P1 public-release requirement; P0 may ship light only.

**v1.5 (22 October 2026)**
- Navigation becomes five bottom slots: Home, People, Add, Loans, Settings. Home shows the summary card and the loans needing attention (overdue first); the complete list moves to the Loans tab. The centre Add button asks *lent or borrowed* first, then opens the loan form.
- The summary adds four counts for context (`peopleOwingYou`, `peopleYouOwe`, `lentLoans`, `overdueLoans`); the existing figures and their meanings are unchanged.
- (v1.6) The summary adds the due-this-week figures `dueSoonLent`, `dueSoonBorrowed` and `dueSoonLoans` for the Home *Due this week* tile.
