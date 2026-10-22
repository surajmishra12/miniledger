# MiniLedger — Product Design Specification

**Version:** 1.3  
**Status:** Implementation-ready  
**Last reviewed:** 22 October 2026  
**Platform:** Android • React Native + Expo  
**Themes:** Light (P0 and default), Dark and Use device setting (required for public V1)  
**Visual identity:** Forest & Ivory (light) · Obsidian & Emerald (dark)  
**Companion documents:** [`prd.md`](./prd.md) (behavior and scope), [`architecture.md`](./architecture.md) (implementation and API contracts)  
**Terminology:** "person / people" for anyone in the user's ledger (PRD §0). The word "friend" never appears in UI copy.

---

## 0. Design contract

This document is the **single source of truth for MiniLedger's visual language and user-facing interaction design**. Implement the product requirements in `prd.md` without adding features merely because they would look appealing in a mockup. Where this document discusses an interaction, the PRD controls its business rules. Architecture, API and library choices belong in `architecture.md`.

**Non-negotiables**

1. **Financial clarity over decoration.** At a glance, users must distinguish *money owed to them* from *money they owe*, original amount from outstanding balance, and overdue from partially paid.
2. **Fast recurring flows.** A returning user with a saved person should be able to record a loan in about 10 seconds; minimize steps and re-entry.
3. **Premium restraint.** Warm ivory in light mode; neutral obsidian and graphite in dark mode. Use intentional typography, rhythm, carefully placed emerald accents and subtle, purposeful animation. Avoid fintech clichés, busy gradients, 3D coins, charts without analytical value and overloaded dashboards.
4. **Accessible by design.** Contrast, labels, targets, legible scaling, feedback and reduced motion are required in **both** themes.
5. **Android-native behavior.** Respect system bars, keyboard, back navigation, haptics, permissions, safe areas and loading/error conventions.
6. **Privacy and integrity.** Receipts are local-only. Never imply transactions were verified, processed or synchronized. Never show a success state before the server confirms a financial mutation.
7. **Performance is a design constraint.** The app should remain responsive on modest Android phones and during Render free-tier cold starts; prefer static composition to visual effects.
8. **One design system, not two unrelated themes.** Both modes use identical component geometry, information hierarchy, accessibility and interaction behavior; color and elevation map deliberately to each theme. Dark-mode backgrounds must be **neutral black/charcoal, never green-tinted**.

**Design-review question:** Can the user answer “Who owes what, how much remains, and what can I do next?” within a few seconds without explanation?

**Precedence:** `prd.md` (features, calculations, business behavior) → `architecture.md` (packages, storage, API contracts, error codes) → `design.md` (visual and interaction behavior). If a conflict is found, the higher document wins and this one is corrected. No new feature is authorized by an illustration, mockup, or screen sketch.

---

## 1. Brand and art direction

### 1.1 Personality

**Quietly confident, human, reliable, warm, precise.** Think a beautifully laid-out personal notebook with modern financial rigor, not a trading terminal or playful wallet app.

- **Forest & Ivory (light):** warm, airy and reassuring. **Obsidian & Emerald (dark):** true neutral black/charcoal backgrounds, selective green accents and high-quality tonal layering. The dark UI should feel like a beautifully finished native Android app, not a green filter over light mode.
- Money amounts are editorial focal points, never competing with multiple equally loud cards.
- Use hairline separation, meaningful whitespace and tonal surfaces before adding elevation.
- Corners are modestly rounded; avoid exaggerated pill-shaped *everything*.
- Every screen has one unmistakable primary next action, and usually no more than one strong accent surface.

### 1.2 Brand system

- **Name:** `MiniLedger` with title case; no unnecessary tagline on transactional screens.
- **Wordmark:** Plus Jakarta Sans SemiBold with tight but natural spacing; system font fallback if the custom font is unavailable.
- **Mark:** A minimal geometric ledger-book / folded-page monogram suggesting two balanced vertical strokes. One-color vector. No coins, banknotes, cartoon mascot, generic gradient wallet or prominent rupee symbol as logo.
- **App icon:** Deep forest background `#103D35`; ivory monogram `#F7F8F4`; generous negative space, works at small launcher sizes. Android adaptive icon foreground should be a single vector form centered within the safe area.
- **Imagery:** Product UI is largely iconographic and typographic. Never insert stock photos on dashboard, loans or people screens. The app should be attractive when every optional illustration is disabled. For light mode, SVG fills use warm ivory/forest; for dark mode, SVG backgrounds are transparent and strokes use neutral gray plus a restrained mint/emerald accent.

### 1.3 Tone and microcopy

Plain, neutral, supportive, specific. Use **Lent**, **Borrowed**, **You are owed**, **You owe**, **Received**, **Paid back**, **Remaining**, **Due today**, **3 days overdue**. Do **not** label lent money as “profit”, borrowed money as “loss”, or automatically characterize a person as a defaulter.

Examples:

| Context | Preferred microcopy | Avoid |
|---|---|---|
| Lent balance | `You are owed` | `Earnings`, `Income` |
| Borrowed balance | `You owe` | `Loss` |
| Repayment on lent loan | `Record money received` | `Collect payment` |
| Repayment on borrowed loan | `Record money paid back` | `Receive money` |
| Overdue | `8 days overdue` | `Failed payment`, `Defaulter` |
| Empty loans | `No loans yet. Add one to start keeping track.` | `You have no transactions!!!` |
| Receipt label | `Saved on this device only` | `Securely backed up` |
| Offline save | `You're offline. Connect to save this change.` | `Something went wrong` |
| Person field label | `Lent to` / `Borrowed from` | `Friend`, `Customer`, `Debtor` |
| People tab / list | `People` | `Friends`, `Contacts` |
| Backend startup | `Connecting to MiniLedger… This can take a moment.` | `Syncing transactions` |

Use Indian date conventions for clarity: list rows `22 Oct 2026` (omit the year when it is the current year: `22 Oct`), full detail `22 October 2026`; display INR with Indian grouping (`₹1,25,000`) and two decimal places only when paise are non-zero (`₹250.50`, never `₹250.00`). Formatting uses the shared `formatPaise` helper (`architecture.md` §4.4). Never use unexplained +/- signs as the sole distinction between directions.

**Due-status labels (exact, singular/plural aware):** `Due today`, `Due tomorrow`, `Due in N days` (N ≥ 2), `1 day overdue`, `N days overdue`, `Repaid`. Lists use these labels; the detail screen adds the absolute date (`Due 30 October 2026`). `N` comes from server `daysOverdue` / `dueDate` and `asOfDate`, never from the device clock.

---

## 2. Design tokens: color

Use **semantic tokens**, never scatter raw hex values through components. The source colors below are design targets; adjustments are acceptable only to improve verified accessibility without changing the art direction.

### 2.1 Light theme (default)

| Token | Hex | Intended use |
|---|---|---|
| `canvas` | `#F7F8F4` | Main app background; warm ivory |
| `surface` | `#FFFFFF` | Cards, fields, sheets |
| `surfaceMuted` | `#F0F3ED` | Segmented controls, subtle grouped areas |
| `surfaceRaised` | `#FFFFFF` | Dialogs, menus, overlays |
| `textPrimary` | `#172A27` | Titles, values, body |
| `textSecondary` | `#51645E` | Labels, dates, explanatory text |
| `textTertiary` | `#6D7B76` | Decorative/de-emphasized only; use with contrast checks |
| `outline` | `#DAE3DC` | Dividers, input borders |
| `brandForest` | `#103D35` | Feature / summary card |
| `brandPrimary` | `#12654F` | Buttons, active tabs, links, focus indicators |
| `brandPressed` | `#0A503D` | Pressed primary controls |
| `onBrand` | `#FFFFFF` | Text on `brandPrimary` buttons |
| `onHero` | `#FFFFFF` | Main text and amounts on the dark forest summary card |
| `onHeroMuted` | `#D4E6DC` | Supporting text on the forest summary card |
| `brandSubtle` | `#E2F1E9` | Secondary selection surfaces |
| `successText` | `#136C4F` | Repaid/received status text |
| `successSurface` | `#E9F6ED` | Repaid state background |
| `dangerText` | `#A7443B` | Overdue/destructive labels |
| `dangerSurface` | `#FFF0ED` | Overdue state background |
| `borrowedText` | `#8A531B` | Borrowed informational accent |
| `borrowedSurface` | `#FFF3DF` | Borrowed informational background |
| `focusRing` | `#12654F` | Visible keyboard/assistive focus |
| `scrim` | `#000000` @ 48% | Modal backdrop |

### 2.2 Dark theme — Obsidian & Emerald (revised)

**Critical art-direction correction:** Use truly **neutral black and charcoal** for the full-screen canvas, cards, fields, bottom navigation, sheets, menus, and dialogs. **Do not tint those surfaces forest-green or teal.** Green is reserved for the primary CTA, active selections, a few status details and the **single optional featured balance card**. Black must remain the dominant perceived color across the screen. The theme should evoke refined Android dark mode—not a neon trading dashboard.

| Token | Hex | Intended use |
|---|---|---|
| `canvas` | `#0B0D0F` | Full-screen near-black background; all safe-area regions |
| `surface` | `#171A1E` | Cards, form fields and grouped rows; neutral charcoal |
| `surfaceMuted` | `#20252A` | Segmented controls, selected-neutral chips, secondary list areas |
| `surfaceRaised` | `#262C32` | Sheets, dialogs and menus; a discernible neutral elevation step |
| `textPrimary` | `#F4F6F7` | Headlines, amounts, main body text; soft white |
| `textSecondary` | `#BBC3C8` | Dates, field labels and descriptions |
| `textTertiary` | `#9CA7AF` | Nonessential metadata only; never rely on it for required instructions |
| `outline` | `#3B444B` | Thin neutral charcoal-gray separators, focused card boundaries |
| `brandForest` | `#075A45` | **Only** the featured Home balance card / narrow featured accent region |
| `brandPrimary` | `#44D7A6` | Bright-but-controlled emerald/mint actions, active indicators and links |
| `brandPressed` | `#2FB98B` | Pressed primary control |
| `onBrand` | `#071B13` | Text/icons on mint buttons; dark foreground is mandatory |
| `onHero` | `#FFFFFF` | Large amount and title on featured forest card |
| `onHeroMuted` | `#D0F2E2` | Smaller descriptive text on featured forest card |
| `brandSubtle` | `#163229` | Small selected-state pills or compact accent background **only** |
| `successText` | `#81E2B5` | Repaid/received text and icons |
| `successSurface` | `#193229` | Small settled status chips, not full-page sections |
| `dangerText` | `#FFAD9F` | Overdue/destructive labels |
| `dangerSurface` | `#392321` | Small overdue status chips |
| `borrowedText` | `#F5CC8C` | Borrowed informational text, not an error |
| `borrowedSurface` | `#352C20` | Small borrowed information chips |
| `focusRing` | `#44D7A6` | Keyboard/assistive focus boundary |
| `scrim` | `#000000` @ 68% | Modal/sheet backdrop; transparent enough for spatial context |

**Dark-mode layering specification:**

- App background / headers / system-bar backing: `canvas` (`#0B0D0F`). **Never use `brandForest` as a page background.**
- Ordinary content card / loan row / email or amount field: `surface` (`#171A1E`). A thin `outline` separator should provide structure without glowing edges or strong drop shadows.
- Secondary control tracks and subdued sub-panels: `surfaceMuted` (`#20252A`), with an active state that is either a neutral raised segment or a small emerald highlight. Don't paint entire segmented control backgrounds green.
- Elevated pop-ups and sheets: `surfaceRaised` (`#262C32`). Dim the background without a frosted or colored blur effect.
- Hero on Home: one contained `brandForest` card is acceptable and visually intentional, as in the approved visual direction. Prefer a flat, richly colored surface; if a gradient is desired, it must be **extremely subtle and confined to this card**, never the whole screen. All other financial metrics stay on neutral charcoal cards or directly on canvas.
- The dark-mode color distribution should read as **predominantly near-black + neutral gray**, with emerald used as a functional accent rather than ambient lighting. Avoid turquoise-tinted gray, glowing borders, green nav bars and large green background illustrations.

### 2.3 Semantic color rules

- **Primary green is for actions, not for every monetary value.** Neutral primary text is the default for amounts.
- **Overdue** = danger surface + readable text + `Overdue` wording + optional warning icon; *never color only*.
- **Repaid** = success text/tonal pill + explicit `Repaid` label.
- **Borrowed** is a category, not an error. Use warm amber subtly, not alarming red.
- **Lent** is a category, not guaranteed profit. Use forest/brand subtle with an arrow-direction icon and label.
- **Hero card contrast:** Use `onHero` and `onHeroMuted` over `brandForest`, **not** `onBrand` in dark mode; dark `onBrand` is deliberately deep green for mint buttons. The hero is the **only** acceptable large green surface in dark mode.
- **No visual netting** of lent vs borrowed accounts in summaries or per-person balances.
- Never use opacity-reduced body text as a shortcut. All textual colors must be measured against their *actual* local background. Dark `textPrimary` should appear white, not mint; dark backgrounds should appear charcoal, not green.

**Contrast rules:** Aim for WCAG AA: 4.5:1 minimum for normal text, 3:1 for large text and meaningful control boundaries/icons. Calculated pairings for this palette: light `onBrand` / `brandPrimary` ≈ **7.0:1**; dark `onBrand` / `brandPrimary` ≈ **9.8:1**; dark `textPrimary` / `canvas` ≈ **18.0:1**; dark `textSecondary` / `surface` ≈ **9.8:1**; dark `onHero` / `brandForest` ≈ **8.2:1**. Contrast must still be re-checked for every actual component state. Light `textTertiary` is not suitable for small, essential text on ivory; use `textSecondary` instead.

### 2.4 Theme behavior

- **First-run theme:** Light. Provide a settings selector: `Light` / `Dark` / `Use device setting`.
- **Release gating:** P0 (assignment) ships the light theme only and may hide the Appearance selector. Dark and Use device setting are required for the public V1 release; every rule in this document applies to them from that point.
- Switching modes updates **all** surfaces, Android status/navigation bar icon appearance, text, icons, focused fields, modal scrims and local illustrations without reloading or losing form state. The bottom bar, keyboard surroundings, status bar and any full-screen loading surface must be neutral near-black in dark mode.
- On dark screens, use light on dark for primary text; on light screens, use dark on light. Prefer native, theme-aware date pickers and keyboard/system UI without forcing custom skins.
- Persist theme preference locally; when `Use device setting` is selected, react to OS appearance changes.
- Do not force dark screenshots behind light dialogs or vice versa. No light flashes during app startup/navigation.
- Respect user's OS high-contrast and reduced-motion choices where exposed by the platform.

### 2.5 Mode parity and color budget

| UI element | Light mode | Dark mode | Invariant |
|---|---|---|---|
| Full-screen background | Warm ivory `canvas` | Neutral obsidian `canvas` | Same information order |
| Ordinary cards and loan rows | White `surface` | Charcoal `surface` | Same size, spacing and content |
| Main featured Home card | Deep forest `brandForest` | Contained emerald-forest `brandForest` | Same single leading amount |
| Text and key monetary amounts | Forest-charcoal `textPrimary` | Soft white `textPrimary` | Amounts stay neutral, apart from contextual labels |
| Primary save/continue button | Forest green | Mint/emerald | High-contrast label and 48dp+ target |
| Segmented control track | Light neutral | Neutral `surfaceMuted` | Only active thumb/indicator gets accent |
| Tabs, search, inputs, sheets | Ivory/white neutrals | Black/gray neutrals | No surrounding green tint |
| Due/overdue/repaid indicators | Semantic accent chips | Small semantic accent chips | Status words always visible |
| Empty-state SVG | Ivory + forest strokes | Gray + restrained mint strokes | Decorative, never essential |

**Theme parity rule:** Each layout must have the same navigational and functional affordances in both themes. Dark mode may not replace card hierarchy with glowing outlines, high-saturation neon, colored shadows or larger/denser widgets.

---

## 3. Typography and data presentation

### 3.1 Type families

- **Primary:** `Plus Jakarta Sans` for UI headings and normal content if size/weight assets are optimized; use a stable Android system-sans fallback when unavailable.
- **Figures:** Same family with **tabular numerals** where supported, or a numeric-compatible fallback; avoid ultra-light or condensed numeral styles.
- **Weights:** Regular 400; Medium 500; SemiBold 600; Bold 700. Avoid more than four weights.
- **Font loading:** Bundle only required weights; allow fallback immediately. No loading screen just to load fonts.

### 3.2 Type scale (Android scalable `sp`)

| Role | Size / line height | Weight | Example |
|---|---|---|---|
| Hero amount | 34 / 40 | 700 | `₹12,500` on summary |
| Screen title | 27 / 34 | 700 | `People` |
| Section title | 19 / 26 | 600 | `Recent activity` |
| Card amount | 22 / 29 | 700 | `₹5,000` |
| Body / field text | 16 / 24 | 400–500 | Details, form values |
| Row title | 15 / 22 | 600 | Person name |
| Secondary body | 14 / 21 | 400–500 | Due dates and sublabels |
| Small overline / chip | 12 / 17 | 600 | `OVERDUE` / eyebrow |
| Buttons | 15 / 22 | 600 | `Save loan` |

- Scale text with Android accessibility font-size settings; don't disable font scaling to preserve layout. At larger sizes, allow labels to wrap, monetary figures to shrink **only when necessary**, and cards to reflow to one column.
- Support long person names (up to 80 characters), Indic characters, and mixed scripts without clipping. Test with 200% system font scaling.
- Financial amounts are aligned and formatted consistently. On detail screens, show **original**, **repaid/returned**, and **remaining** as separate labeled amounts.
- Never truncate an important amount with an ellipsis. Expand/wrap the container or use a controlled smaller figure size for very large values.

---

## 4. Layout, spacing and geometry

**Base unit:** 4dp, with a restrained 8pt-derived spacing system.

| Token | Value | Use |
|---|---:|---|
| `space1` | 4dp | Micro gaps |
| `space2` | 8dp | Icon-to-label, row micro-layout |
| `space3` | 12dp | Grouped items |
| `space4` | 16dp | Internal card space |
| `space5` | 20dp | Screen gutter on phones |
| `space6` | 24dp | Major component spacing |
| `space8` | 32dp | Section separation |
| `space10` | 40dp | Hero breathing space |
| `radiusSm` | 8dp | Chips/compact controls |
| `radiusMd` | 12dp | Inputs, simple list containers |
| `radiusLg` | 16dp | Cards and modals |
| `radiusXl` | 22dp | Statement/hero card and main sheets |
| `radiusFull` | 999dp | Avatar initials / dot indicators |

- **Screen horizontal gutters:** 20dp on standard phones; 16dp on ≤360dp width; cap content width at ~600dp on large devices, centered rather than stretched.
- **Touch targets:** At least **48 × 48dp** for tappable controls, including small icon buttons (visible glyph can be 20–24dp).
- **Buttons:** 52dp height (48dp minimum); 12dp radius; primary full-width for forms, content-width where appropriate.
- **Inputs:** 54–56dp minimum field body, external 14sp label above, 8dp label gap; error/helper below.
- **Cards:** 16–20dp padding; tonal separation and 1dp low-contrast outline before shadow; dark theme uses borders/tonal elevation instead of bright shadows.
- **List rows:** approx. 72–88dp depending on secondary metadata; no forced fixed height if text scales.
- **Bottom bar:** 3 destinations with icon + text; 64dp visual height **plus bottom safe-area inset**. Active indication is tonal, not a huge colorful blob.
- **Sticky bottom actions:** Must sit above system/keyboard insets and leave sufficient list bottom padding. Never cover the last entry or form field.
- **Small phones:** At 320–360dp wide, avoid a four-metric dashboard grid. Reflow to one/two columns while preserving hierarchy.
- **Edge-to-edge:** Support Android 15/16 system bar behavior; draw page backgrounds behind bars but place touch controls within safe insets. Verify both gesture and three-button navigation.

### 4.1 Surface hierarchy

1. App canvas: warm ivory in light mode / **neutral obsidian black** in dark mode.
2. Content surfaces: white cards in light / **neutral charcoal cards and fields** in dark.
3. One higher-emphasis hero card per screen **when needed**, not repeated everywhere.
4. Bottom sheet/dialog elevated above backdrop with a **neutral charcoal raised layer** in dark mode.
5. No heavy nested boxes; use whitespace and hairline dividers between closely related values.

### 4.2 Layout sketches (structural, not literal styling)

```text
HOME (scrolls as one list)
┌────────────────────────┐
│ MiniLedger         [🔍]│
│ ┌────────────────────┐ │   ← S04 summary (scrolls away)
│ │ YOU ARE OWED       │ │
│ │ ₹12,500            │ │
│ │ Remaining to be... │ │
│ └────────────────────┘ │
│ You owe      ₹4,500    │
│ Total lent · Repaid ·  │
│ Overdue owed to you    │
│ Loans            Sort ▾│   ← S05 list header (sticky)
│ All | Lent | Borrowed  │
│ All Outstanding Overdue│
│ ┌────────────────────┐ │
│ │ Rahul        ₹3,000│ │
│ │ Lent • 8 days overdue│
│ └────────────────────┘ │
│ Priya ...              │
│            [+ Add loan]│
│ Home   People  Settings│
└────────────────────────┘
```

These indicate **information order**, not equally weighted blocks or a requirement for charts/avatars. Real screens must respect device widths and safe areas.

---

## 5. Navigation and information architecture

### 5.1 Primary navigation

Three bottom destinations: **Home** (`house`), **People** (`users-round`), **Settings** (`settings-2`). Labels are always visible. Active tab uses `brandPrimary` (light) or `brandPrimary` mint (dark), an active label and a subtle indicator; inactive items use secondary text.

- **Home:** the summary card at the top (S04) followed by the complete, searchable and filterable loan list (S05) in one scrolling screen.
- **People:** everyone in the ledger and their separate lent/borrowed balances.
- **Settings:** appearance, account, local-storage explanation, privacy, sign-out/delete.
- **Create loan:** persistent **`+ Add loan` extended FAB** on Home, above the bottom bar; it may collapse to a + icon while scrolling down and expand on scroll up. Person detail offers `Add loan with <name>`.
- **Nested screens:** Add/Edit loan, Loan detail, Record/Edit repayment, Person detail, OTP verification, receipt viewer, account deletion (route map in `architecture.md` §3). Nested screens use a clear back affordance and system back support.

**Never** use a tab item purely to display a floating + symbol, hamburger navigation, double navigation bars, or swipe-only essential actions.

### 5.2 Interaction hierarchy

- Use **full screens** for Add/Edit loan and any long form. A large bottom sheet with a keyboard often causes cramped or inaccessible inputs.
- Use **medium sheet** for simple repayment entry, with full-screen fallback on small devices / large text settings.
- Use **dialog** for confirmation and destructive choices; use bottom sheets for choosing attachments or choosing sort/filter if it adds clarity.
- Use **back behavior** expected on Android. A dirty form prompts discard confirmation; an unchanged form backs out immediately.
- Preserve list scroll/search/filter when returning from details. Preserve partially entered text when switching keyboard focus or opening an attachment picker.

---

## 6. Screen-by-screen specifications

Each screen has a defined purpose, top-level hierarchy, actions, states and accessibility. Do not treat wireframe examples as proof of exact business values.

### S01 — Launch / authentication routing

**Purpose:** Get the returning user to their data quickly.

- Brand-colored or theme-aware background and restrained logo mark; no elaborate splash sequence.
- Keep the native splash visible while reading stored credentials and theme (no light flash in dark mode).
- Routing: stored access token still valid → Home. Expired → one silent refresh → Home. `REFRESH_TOKEN_INVALID` or no credentials → Sign-in.
- Show a lightweight loading state only while session recovery is genuinely in progress; never flicker between sign-in and dashboard.
- If the refresh cannot reach the server (offline or timeout), stay on the launch surface with `Couldn't connect. Check your connection and try again.` and `Retry`, not a dead spinner. Do not sign the user out for network errors.

### S02 — Sign-in (production and assignment)

**Purpose:** Acquire one identifier and initiate OTP with minimal friction.

- Center-aligned, compact logo near upper quarter; title: **`Your money, clearly tracked.`** and one sentence of supporting copy.
- The variant is chosen by `GET /v1/auth/config` (`identifierType`), never by a hidden toggle. **Never show a method selector.** While the config loads, show the layout with a disabled CTA; on failure show the connection error with `Retry`.
- Production (`EMAIL`): **Email address** input (`keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`), `Continue with email` CTA, note `We'll send you a one-time code. No password needed.`
- Assignment (`PHONE`): **Mobile number** input with a fixed, non-editable `+91` prefix and a 10-digit field (`keyboardType="phone-pad"`, `autoComplete="tel"`); `Send code` CTA; visible note `Assignment mode: find your code in the local server logs.` Never describe the number as verified.
- Validate locally with the shared schema before submitting: `Enter a valid email address` / `Enter a 10-digit mobile number`.
- Keyboard-safe layout; CTA shows `Sending…` and is disabled during the request.
- Error copy per §9.4 (cooldown, rate limit, delivery failure).
- No social sign-in icons, unnecessary illustrations, permissions, or two-screen onboarding carousel.
- Privacy policy accessible via quiet text link.

### S03 — Verify OTP

**Purpose:** Confirm the identifier without confusing the user.

- Heading `Enter verification code`; supporting line `We sent a 6-digit code to s•••@example.com` (email) or `Check the server logs for the code sent to +91 ••••••3210` (assignment). The masked value comes from `maskedDestination`.
- One logical text input (`OtpInput`) presented as **six cells**, not six separate fields. Digits only, `autoComplete="one-time-code"`, paste and editing from any position supported.
- **Submission:** auto-submit exactly once when the sixth digit is entered; a visible `Verify` button is always present. Both are disabled while a request is in flight, so no duplicate requests occur.
- Show `Code expires in 4:59` (from `expiresAt`) and `Resend code in 0:42` counting down to `resendAvailableAt`, then an enabled `Resend code` link. Provide `Change email` / `Change number`.
- Errors appear inline below the cells (copy in §9.4). Wrong code: keep the digits selected for quick replacement and show remaining attempts. Expired or attempts exhausted: clear the cells and emphasize `Resend code`.
- The same screen is reused in deletion mode (S12), which disables auto-submit.
- Never claim an email was delivered if the backend reported failure. Cells announce as one field (`Verification code, 4 of 6 digits entered`); digits are not read aloud on focus changes.

### S04 — Home summary

**Purpose:** Answer the big questions in 2–3 seconds, then flow straight into the loan list (S05) on the same screen.

**Order from top to bottom:**

1. Quiet header: `MiniLedger` mark/name and the S05 search icon button. No greeting, notification bell or profile photo.
2. **Primary statement card:** Deep forest surface (light) / **one isolated emerald-forest card on a near-black page** (dark), `YOU ARE OWED` small overline; large **outstanding lent** amount; supporting descriptor `Remaining to be received`.
3. **Borrowed summary strip/card:** `You owe` + outstanding borrowed amount, distinctly separated, warm informational accent only.
4. **Assignment-required summary group:** three compact labeled figures `Total lent` (`totalLent`), `Repaid to you` (`totalRepaid`), `Overdue owed to you` (`overdueAmount`). Show overdue even when zero. On compact widths use stacked rows rather than microtype. When `overdueBorrowed > 0`, show one extra line under the borrowed strip: `₹X overdue` in borrowed styling.
5. **The loan list (S05)** directly below; the summary scrolls away and the S05 list header becomes sticky.
6. **Add loan** FAB; the list has enough bottom padding that the FAB never covers the last row.

- **Empty account** (no loans): replace items 2–5 with one composed empty state and an `Add your first loan` CTA; no sheet of zeros.
- **Metric taps** set the S05 filters in place and scroll to the list: the hero → `Lent` + `Outstanding`; `You owe` → `Borrowed` + `Outstanding`; `Overdue owed to you` → `Lent` + `Overdue`. The summary figures never change with filters.
- Pull-to-refresh refetches the summary and the list.
- No pie charts, spending graphs, total “net worth”, bank/account-link prompts or fake activity.

### S05 — Loan list (on Home, below the summary)

**Purpose:** See every entry, find a loan quickly and identify what needs attention.

- Sticky list header: `Loans` title and a `Sort` button. The search icon in the Home header expands into a search field for person names (debounced 300 ms) and scrolls to the list.
- First segmented control: **All / Lent / Borrowed**. Under it, horizontally scrollable status chips: **All / Outstanding / Overdue / Repaid**. `Outstanding` includes overdue loans.
- `Sort` control (bottom sheet with radio options): **Needs attention** (default), **Due date**, **Recent activity**. Semantics in PRD FR-06.
- Row anatomy (`LoanRow`):
  - left: person initials in a subtle circle (§11 initials rule) and **person name**;
  - second line: direction chip `Lent` / `Borrowed` + due-status label (§1.3);
  - right: **remaining balance** bold; when partially repaid, a smaller `of ₹5,000` beneath it;
  - status chip `Overdue` or `Repaid` as text, never an unlabeled dot.
- Row tap opens Loan details. No swipe actions.
- Do not show a total count (the API does not provide one). Filters, search and scroll position are preserved on back.
- Infinite scroll using `nextCursor`, de-duplicated by loan ID; footer spinner while loading more. Changing a filter, search or sort reloads from the first page.
- No matches: `No matching loans` / `Try another name or filter.` + `Clear filters`. First use: the §9.2 first-login empty state.

### S06 — Add / Edit loan

**Purpose:** Make the core 10-second task efficient and hard to enter incorrectly.

**Full-screen form, field order:**

1. Header `Add loan` / `Edit loan`, back control.
2. Large **direction segmented control** (`DirectionSwitch`): `I lent` / `I borrowed` with arrow icons, default `I lent`.
3. **Person** (`PersonPicker`), labelled `Lent to` or `Borrowed from` according to direction:
   - Tapping opens a searchable, alphabetical list of **active** people from `GET /v1/people`.
   - As the user types, matching people appear first; the last row is always `+ Add "<typed name>" as new person`.
   - Choosing an existing person sends `personId`; choosing the add row sends `personName` + `createNewPerson: true`. The person is created in the same save request; no separate setup trip.
   - Opened from Person detail (`?personId=`), the field is prefilled.
   - In **edit mode** the add row is hidden: a loan can only be moved to an existing active person (create the person first from People if needed).
4. **Amount** (`MoneyField`): label `Original amount`, `₹` prefix, `decimal-pad` keyboard. Holds the raw typed string; shows grouped formatting only when not focused. Max two decimals enforced while typing.
5. **Due date** (`DateField`): required, native date picker, displayed as `30 October 2026`. Past dates allowed.
6. Collapsible **More details**: loan date (defaults today; picker maximum is today), note (multiline, 500-character limit with counter from 450), receipt photo (S11).
7. Fixed safe-area-aware bottom primary action `Save loan` / `Save changes`.

**Micro-interactions and rules:**

- All required inputs are visible without opening More details.
- Inline errors under fields on blur and submit; focus the first invalid field; never erase valid input after an error.
- If the due date is earlier than the loan date, show the non-blocking hint `Due date is before the loan date.`
- Save shows `Saving…` and is disabled while in flight. The form's record ID is reused for every retry (`architecture.md` §5.1), so retrying can never create a duplicate. On success navigate to Loan detail (replacing the form) and show the `Loan saved` snackbar.
- On network error, keep all fields and the picked receipt and show the inline offline notice with `Try again`. Never claim the receipt is attached before the loan is saved.
- `ID_CONFLICT` (an earlier attempt already saved with different details): §9.4 dialog, opening the saved loan.
- **Edit mode:**
  - Direction is disabled when the loan has repayments, with helper `Direction can't change after repayments are recorded.`
  - `PRINCIPAL_BELOW_REPAID` shows `Amount can't be less than ₹2,000 already repaid.` under Amount.
  - `RECORD_CHANGED` shows a dialog `This loan was changed on another device.` with `Review latest` (reloads the form with server data).
  - `PERSON_ARCHIVED` shows `This person is archived. Unarchive them to add loans.` under Person.
- Back with unsaved changes asks `Discard changes?` (`Keep editing` / `Discard`); back with no changes leaves immediately.

### S07 — Loan details and history

**Purpose:** Show evidence of the record and one clear next action.

- Header with person name (tappable → Person detail) + overflow menu (`Edit loan`, `Delete loan`); direction chip immediately visible.
- Financial hierarchy: **Remaining ₹X** (largest), then two columns `Original ₹Y` / `Received ₹Z` (lent) or `Original ₹Y` / `Paid back ₹Z` (borrowed).
- Due-status line: due-status label (§1.3) plus absolute date; never rely on hue alone.
- **Repayment progress bar** (linear, `repaidPaise / principalPaise`) with the labelled amounts beside it; no circular chart.
- **Primary CTA:** `Record repayment`. **Secondary:** `Mark as repaid`. Both only when outstanding > 0. Fully repaid loans show the `All settled.` state instead of enabled buttons.
- **Repayment history:** newest first, each row with date, amount, note (if any) and an overflow menu `Edit` / `Remove`. All repayments are shown. No invented payment-method or verification badges.
- **Receipt area (if present):** small thumbnail with `Saved on this device only` label; tap to open private full-screen viewer. If missing, show `Receipt unavailable on this device` while keeping loan detail usable. On a different device, do not show a phantom cloud receipt or a broken remote URL.
- Optional note appears after the financial section, not ahead of it. Destructive delete requires confirmation that includes financial-history implications.

### S08 — Record / edit repayment

**Purpose:** Record partial or full money movement without arithmetic mistakes.

- Use a focused bottom sheet on normal phones; full-screen presentation if keyboard, large text or small viewport makes the sheet cramped.
- Context header `Record money received` for lent / `Record money paid back` for borrowed; small line `Remaining ₹3,000`.
- Amount input (`MoneyField`, empty by default) with a `Use full amount` chip that fills the remaining balance.
- Date defaults to today; picker maximum is today. If it is before the loan date, show the non-blocking hint `This is before the loan date.` Optional note (500 characters).
- Primary action `Save repayment`. Errors: `Enter an amount greater than ₹0`; `AMOUNT_EXCEEDS_OUTSTANDING` → `Maximum is ₹3,000.`
- When editing, the maximum shown is the remaining balance plus this repayment's current amount; title `Edit repayment`.
- On success close the sheet, refresh detail and summary, and show `Repayment saved`. On failure keep the values.
- **Mark as repaid** (from S07) is a confirmation dialog, not this sheet: `Record ₹3,000 as received?` (lent) or `Record ₹3,000 as paid back?` (borrowed), dated today, actions `Cancel` / `Mark as repaid`.
- Warnings are plain language, never raw error codes.

### S09 — People

**Purpose:** Locate a person and view obligations without collecting contacts.

- Title `People`; search field (case-insensitive, debounced 300 ms) and an `Add person` header action.
- Segmented control **Active / Archived** (default Active).
- Each row (`PersonRow`): initials circle, name, and up to two separate figures: `Owes you ₹X` (when `owesYouPaise > 0`) and `You owe ₹Y` (when `youOwePaise > 0`); `Settled` when both are zero. Never a netted figure; never imply the person uses the app.
- `Add person` opens a small dialog with one required field `Name` (1–80 characters). If an active person with the same name exists, show `You already have someone named Rahul.` with `Add anyway` / `Cancel`. No contact permission, email or phone.
- No search results: `No matching people` + `Clear search`. Empty Active list: §9.2 empty state.

### S10 — Person detail

**Purpose:** Understand all loans with one person.

- Header with the name and an overflow menu: `Rename`, `Archive` / `Unarchive`, and `Delete person` (shown only when `loanCount = 0`).
- Two separate figure groups `They owe you` and `You owe them`; never netted.
- Their loans from `GET /v1/loans?personId=…&sort=attention` as `LoanRow`s, with infinite scroll.
- Primary action `Add loan with <name>` opens S06 with the person prefilled (hidden while archived; an archived banner shows `Archived. Unarchive to add loans.` with `Unarchive`).
- Archive confirmation: `Archive Rahul?` + `They'll be hidden from your people list and the loan form. Their loans stay in your history.`
- Rename uses the same name rules and returns to this screen with the new name everywhere.

### S11 — Receipt picker / viewer

**Purpose:** Attach supporting evidence without cloud hosting.

- From Add/Edit loan or Loan details, show an action sheet: `Take photo`, `Choose photo`, `Cancel` (and `Remove receipt` if attached).
- Ask for camera/gallery permissions **only when the user chooses** the corresponding action; show a helpful OS Settings path if denied.
- Show one-time, concise disclosure before first attachment: **`Receipt photos are saved only on this device. They won't appear if you reinstall the app or switch phones.`** One clear `Continue` action.
- Confirm the selected image with a fit preview, `Replace` / `Remove`, and a small `Saved on this device only` label. Compression keeps receipt text legible (parameters in `architecture.md` §8).
- If the loan saved but the receipt could not be stored, S07 shows a persistent `InlineNotice` (not a snackbar): `Loan saved. Receipt couldn't be saved on this device.`
- Full-screen viewer: pinch-to-zoom and native back; only one photo per loan in V1.
- Local file missing after reinstall/account switch: graceful placeholder; never assume a URL exists. Switching accounts must never leak another user's local receipt.

### S12 — Settings, account, and appearance

**Purpose:** Offer trust, control and low-effort customization.

Grouped sections in this order:

1. **Appearance:** `Light`, `Dark`, `Use device setting` with current selection indicated. A simple row/selector is enough; do not construct an elaborate theme-preview screen.
2. **Account:** signed-in email (production) or mobile number (assignment, no "verified" label); editable `Display name` row (optional, up to 60 characters). The identifier cannot be changed.
3. **Your data:** `Loans and repayments are stored in your account. Receipt photos stay on this device only.`
4. **Privacy and support:** `Privacy policy`, `How to delete your data` (external page), app version.
5. **Sign out** (neutral; confirmation `Sign out?` — receipts stay on this device for when you sign back in); **Delete account** at the bottom in danger text, visually separated.

**Account deletion flow** (`settings/delete-account`):
1. Explanation screen: `Delete your account?` + `This permanently deletes your people, loans and repayments from MiniLedger, and removes receipt photos from this device. This can't be undone.` Actions `Cancel` / `Send code`.
2. `Send code` requests a code for the account's own identifier, then shows S03 in deletion mode: heading `Confirm it's you`, line `Enter the code to permanently delete your account.`, **no auto-submit**, and a destructive `Delete account` button (enabled when six digits are entered) plus `Cancel`.
3. Success: clear local data and return to Sign-in with `Your account was deleted.` OTP errors use §9.4 copy. Offline or failure: stay on the screen; never show deletion as complete.

Signing out clears tokens and cached data; another account signing in on the device never sees this user's receipts.

### S13 — Destructive confirmations

- **Delete loan:** `Delete this loan?` + `This will remove its repayment history and update your totals.` Actions `Cancel` / `Delete loan`.
- **Remove repayment:** `Remove this repayment?` + `The remaining balance will increase.` Actions `Cancel` / `Remove`.
- **Mark as repaid:** exact remaining amount, direction-aware (S08).
- **Archive person:** S10 copy. **Delete person** (no loans): `Delete Rahul?` + `This can't be undone.` Actions `Cancel` / `Delete`.
- **Delete account:** S12 flow; never a single tap.
- **Discard changes:** S06 copy.
- Use platform-appropriate dialog/sheet, not a custom full-screen animation. Always emphasize the safe action over a destructive one.

---

### 6.1 Light/dark visual treatment by screen

The approved concept boards communicate **composition and restraint**, not literal screen copy, counts, avatars or additional features. The detailed screen requirements above remain authoritative. Use the same page structures in both themes, and apply these screen-specific art-direction decisions:

| Screen | Light — Forest & Ivory | Dark — Obsidian & Emerald |
|---|---|---|
| S01 Launch | Warm ivory background; forest mark | Near-black background; mint/ivory mark; **no green wash** |
| S02 Sign-in | Spacious ivory canvas, white field, forest CTA | Obsidian canvas, charcoal email field, mint CTA; no large green leaves |
| S03 OTP | Ivory page, white 6-cell containers, visible focus | Obsidian page, charcoal cells, thin neutral borders and mint focused cell |
| S04 Home | Forest featured balance, white secondary cards | **One green featured balance** on black canvas; all other cards graphite |
| S05 Loan list | White grouped loan rows on warm canvas | Charcoal rows on black; neutral separators, compact semantic overdue chip |
| S06 Add/Edit | White/ivory form; forest direction active control | Charcoal fields, graphite segmented track, emerald active thumb and CTA |
| S07 Loan detail | White financial summary, subtle progress | Black canvas + graphite detail panels; progress track gray, fill emerald |
| S08 Repayment | White focused bottom sheet, forest CTA | Raised graphite sheet, gray numeric field, mint CTA, no green sheet backdrop |
| S09 People | Warm canvas, understated initials avatars | Black canvas, charcoal rows, muted slate avatars, restrained mint for active |
| S10 Person detail | White split balances, forest micro-accents | Graphite balance groups; use white figures, emerald only for select status |
| S11 Receipt | White local-only information and media viewer | Dark viewer controls on neutral black; don't tint images/receipts green |
| S12 Settings | Grouped white settings cards with readable dividers | Neutral charcoal grouped rows; Light/Dark/System selector with small mint active state |
| S13 Confirmations | White modal, neutral Cancel and restrained danger | Raised charcoal modal, clear white body, coral danger, neutral Cancel |

**Priority on smaller phones:** Keep the primary amount, direction, and next action visible; move secondary figures into sequential rows and allow longer labels to wrap. Never solve density by reducing text below accessible sizes.

---

## 7. Reusable component specification

| Component | Required behavior | Visual treatment |
|---|---|---|
| `AppHeader` | Screen title, back/utility actions, insets | Open space, no giant app bar shadow |
| `PrimaryButton` | Loading, disabled, focus, pressed, error retry | 52dp, brand fill, readable text |
| `SecondaryButton` | Non-primary action | Outline or tonal fill; no shadow |
| `TextField` | Label, hint, validation, accessibility | 56dp body, 12dp radius, visible active border |
| `MoneyField` | Raw string value, `decimal-pad`, max 2 decimals, formatted when unfocused | Amount-focused typography; no value clipping |
| `DateField` | Native accessible picker, optional min/max | Calendar icon + visible date string |
| `DirectionSwitch` | Lent/Borrowed explicit, accessible, can be disabled with helper | Selected tinted background, labels + icon |
| `PersonPicker` | Search active people (alphabetical), `Add "<name>" as new person` row | Sheet/list with initials rows |
| `OtpInput` | One logical 6-digit field, paste/autofill, single auto-submit | Six cells, visible focus |
| `SummaryHero` | One most important amount | Forest tonal card + prominent type |
| `Metric` | Label + formatted amount | Minimal, no unnecessary icon for each |
| `LoanRow` | Person, direction, remaining, due status | Large hit target; text status, subtle separator |
| `StatusChip` | Text + semantic color + screen-reader label | Compact pill, adequate contrast |
| `PersonRow` | Name + separate owes-you / you-owe amounts | Initials avatar, no fake profile pictures |
| `Snackbar` | Low-risk success only, 4 s, announced to TalkBack | Raised surface above FAB and insets |
| `FilterChips` | Selected state, horizontal scroll/focus | Small radius, no reliance on color alone |
| `BottomTabBar` | 3 labeled destinations | Safe-area aware, lightweight active marker |
| `LoanFAB` | Add action, scroll behavior | Extended `+ Add loan`, primary fill |
| `BottomSheet` | Back/keyboard/dismiss, focus trap | Raised surface, radius 22dp top corners |
| `ConfirmDialog` | Explicit irreversible message and choices | Small, legible, safe default |
| `InlineNotice` | Offline/receipt/security info | Icon + plain-language text; not toast-only |
| `EmptyState` | One-line explanation + one action | Sparse illustration optional |
| `Skeleton` | Initial loading shape | Stable layout; no long shimmer loops |

### 7.1 Component states

All interactive components must define **default, pressed, focused, disabled, loading, error and success** (where applicable). Use short state transitions. A disabled button must be visibly disabled but not disappear. A control that has an unresolved API request must prevent duplicate submission.

**Forms:** persistent field labels, visible validation below inputs, error announced to accessibility services, return-to-first-error on submit, no relying only on red borders.

**Toasts/snackbars:** Only for low-risk feedback (`Loan saved`); errors that require a next action stay on screen. Never use toast alone to tell someone a destructive or financial action failed.

---

### 7.2 Dark-theme component rules (required)

- **App shell and tab bar:** `canvas` behind content and system insets; bottom bar may use `surface`, separated by a subtle neutral top divider. Selected icon/text mint; other icons monochrome gray.
- **Cards:** `surface` background; mostly flat and softly outlined. No green borders around neutral cards. The featured balance card is the one intentional exception.
- **Inputs and OTP slots:** `surface` with `outline` border; focused border `focusRing`, optional 1–2dp focus outline. Validation error uses `dangerText` plus a specific message; no colored field flood-fill.
- **Primary actions:** mint `brandPrimary` background with dark `onBrand` label; secondary actions are neutral charcoal with primary text or subtle outline.
- **Segmented controls:** neutral `surfaceMuted` track; active state through position, contrast and a small mint/forest treatment, not a bright green full-width bar.
- **Chips and statuses:** compact dark tonal backgrounds. Only the status text/icon receives a bright semantic color; chips never become oversized attention magnets.
- **Avatars/initials:** neutral dark grays or quiet muted blue/slate tones; no randomized rainbow gradient. Do not imply social profile photos are required.
- **Sheets and dialogs:** `surfaceRaised`, neutral handle/divider, black scrim, soft white text. No translucent jade glass or green shadow.
- **Skeletons and progress indicators:** neutral gray shimmer/static placeholder; emerald progress only where it communicates real progress. Avoid a permanently pulsing background.
- **Financial values:** white by default. Label `You owe` / `You are owed` explicitly; never paint the whole number green/red as the only cue.

A designer or agent must reject dark-theme screenshots in which the **base background, most card surfaces or bottom navigation appear forest-green, teal, or tinted mint**. This is a visual defect, not a valid alternate theme.

---

## 8. Motion, touch and haptics

### 8.1 Motion grammar

Animation is about **continuity and feedback**, not spectacle. Use smooth native/UI-thread animations when appropriate, but avoid animating every row at once.

| Transition | Target duration | Behavior |
|---|---:|---|
| Button press | 90–140ms | Tiny scale/opacity/tonal adjustment; no bounce |
| Tab switch | 140–200ms | Indicator settles; content changes without dramatic slide |
| Screen push/pop | 220–300ms | Native-stack direction and Android back consistency |
| Bottom sheet open/close | 220–300ms | Controlled vertical spring, no overshoot |
| Chip/segment selection | 120–180ms | Background and label state shift |
| Financial amount update | 180–300ms | Crossfade or restrained count change only on confirmed data |
| Success confirmation | 120–200ms | Subtle check/label fade, no confetti |
| Illustration appearance | 180–240ms | One-time fade, no looping movement |

- Animate **opacity and transforms** whenever possible; avoid repeated JavaScript-driven layout animation of long lists, heavy blurs or animated shadows.
- Prevent content from jumping when data loads: skeletons use stable dimensions; text wraps deliberately.
- No movement is required to understand state changes.
- Respect OS **Reduce motion**: remove scale/parallax/counting animations, keep only essential short fades or instant state changes.
- On lower-end devices, degrade nonessential animation rather than blocking interaction or delaying API operations.

### 8.2 Haptics

- Light haptic on meaningful confirmation or selected toggle **if platform support and user preferences allow**.
- Small success haptic after confirmed save; soft warning on destructive confirmation if appropriate.
- Never vibrate on every keystroke, row scroll, or background refresh. Silent/no-haptic remains fully understandable.

### 8.3 Gestures

- Support standard vertical scroll, Android back, pull-to-refresh on list/dashboard and pinch zoom for receipts.
- Never make a financial destructive action swipe-only or rely on hidden gestures.
- Avoid nested horizontal/vertical scrolling conflicts; filter row may scroll horizontally, list scrolls vertically.

---

## 9. Network, loading, empty and error experience

### 9.1 Cold starts and slow networks

Render's free service can wake slowly. Design explicitly for this without pretending the app is processing payments:

1. **0–3 s:** show data already in the in-memory query cache (from this app session only), otherwise a stable skeleton. Never show an empty dashboard as if the user has zero loans while loading.
2. **After 3 s:** show the non-blocking `InlineNotice` `Connecting to MiniLedger… This can take a moment.`
3. **After 75 s (request timeout) or a network error:** show `Couldn't connect. Check your connection and try again.` with `Retry`. Keep entered forms.
4. **Mutation in flight:** button shows `Saving…`, other submit actions are disabled; success only on server confirmation. Retrying an ambiguous mutation is always safe (`architecture.md` §5.1–5.2), so the user can press `Try again` without risking duplicates.

These are UX patterns, not a guaranteed time-to-connect SLA. Offline support is **viewing local receipt files of loans already on screen only**; no offline ledger data or edits.

### 9.2 Empty state matrix

| State | Copy | Action |
|---|---|---|
| First login, no loans | `A clearer way to keep track.` / `Record money you've lent or borrowed.` | `Add your first loan` |
| No people | `Your people will appear here.` / `Add someone you lend to or borrow from.` | `Add person` |
| No archived people | `No archived people.` | — |
| Search yields no people | `No matching people` | `Clear search` |
| Search yields nothing | `No matching loans` / `Try another name or filter.` | `Clear filters` |
| No repayments | `No repayments recorded yet.` | `Record repayment` if outstanding |
| Fully repaid | `All settled.` / `No balance remains on this loan.` | `View history` |
| Receipt missing | `Receipt unavailable on this device.` | `Replace receipt` if editable |
| Load error | `Couldn't load your loans.` | `Retry` |
| Network unavailable on save | `You're offline. Connect to save this change.` | `Try again` |

### 9.3 Error and success rules

- Field validation errors appear directly below field with specific fix (`Enter an amount greater than ₹0`).
- Authentication errors distinguish invalid/expired OTP, rate limit and delivery failure without account enumeration.
- Destructive actions have persistent confirmation and post-action feedback.
- Avoid generic `Oops!`; use clear user-facing facts and a next step.
- Do not auto-discard an unsaved form when a request fails.
- For date rollover (midnight/timezone) overdue state must update on next refresh/resume, with no stale contradictory label.

### 9.4 Error copy by API code

The app maps `error.code` (`architecture.md` §6.6) to copy; it never displays server `message` text or raw codes. `VALIDATION_FAILED` shows `fieldErrors` under the matching fields (the shared Zod schemas produce the same messages locally).

| Code | Where | Copy |
|---|---|---|
| `OTP_INVALID` with `attemptsRemaining` | S03 | `That code isn't right. N attempts left.` |
| `OTP_INVALID` without `attemptsRemaining` | S03 | `This code is no longer valid. Request a new one.` |
| `OTP_EXPIRED` | S03 | `This code has expired. Request a new one.` |
| `OTP_ATTEMPTS_EXCEEDED` | S03 | `Too many incorrect attempts. Request a new code.` |
| `OTP_RESEND_COOLDOWN` | S02/S03 | `Please wait N seconds before requesting another code.` |
| `RATE_LIMITED` | Any | `Too many attempts. Try again in N minutes.` (from `Retry-After`) |
| `OTP_DELIVERY_FAILED` | S02/S03 | `We couldn't send the code. Please try again.` |
| `OTP_DAILY_LIMIT_REACHED` | S02/S03 | `Sign-in is temporarily unavailable. Please try again tomorrow.` |
| `UNAUTHENTICATED` | Any | Handled silently by one token refresh and retry (`architecture.md` §9.2); shown only if the refresh fails as below |
| `REFRESH_TOKEN_INVALID` | Any | Return to Sign-in with `Your session ended. Please sign in again.` |
| `AMOUNT_EXCEEDS_OUTSTANDING` | S08 | `Maximum is ₹X.` |
| `PRINCIPAL_BELOW_REPAID` | S06 | `Amount can't be less than ₹X already repaid.` |
| `DIRECTION_LOCKED` | S06 | `Direction can't change after repayments are recorded.` |
| `RECORD_CHANGED` | S06 | Dialog `This loan was changed on another device.` → `Review latest` (only after the client check in `architecture.md` §5.2 confirms it was not this device's own earlier save) |
| `PERSON_ARCHIVED` | S06 | `This person is archived. Unarchive them to add loans.` |
| `PERSON_AMBIGUOUS` | S06 | Not expected from the app (it always sends `personId` or `createNewPerson`); if received, reopen the picker |
| `PERSON_HAS_LOANS` | S10 | `This person has loans. Archive them instead.` |
| `NOT_FOUND` | Detail screens | `This item no longer exists.` and navigate back; refresh lists |
| `ID_CONFLICT` | S06/S08/S09 | Dialog `This was already saved.` with `View` (opens the existing loan, repayment's loan or person) and refresh lists |
| `INVALID_CURSOR` | Lists | No message; reload the list from the first page |
| `SERVICE_UNAVAILABLE` / `INTERNAL_ERROR` / network / timeout | Any | `Couldn't connect. Check your connection and try again.` + `Retry` |
| Any other code (`MALFORMED_JSON`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `VALIDATION_FAILED` for a field not on screen, unknown codes) | Any | `Something didn't work. Please try again.` and keep the form; these indicate a client bug and are logged in development builds |

---

## 10. Illustration, SVG and icon guidance

**Priority:** UI quality first. Use custom vectors only where they make an empty or onboarding screen more human; no illustration is needed for every feature.

### 10.1 Icons

- Use a **consistent 2dp-ish stroke line-icon family** (e.g., Lucide) throughout; ship icons as scalable vectors (React Native SVG-compatible), never emoji or rasterized icon PNGs in core UI.
- Standard visual sizes: **20dp** beside compact labels, **22–24dp** in tab actions, **28–32dp** in empty-state line art; interactive wrapper at least **48dp**.
- Useful icons: `arrow-up-right` for lent, `arrow-down-left` for borrowed (confirm arrow semantics with label), `calendar-days`, `check-check`, `search`, `plus`, `receipt`, `pencil`, `trash-2`, `chevron-left`, `more-horizontal`, `shield-check`.
- Icons are supporting cues, never the only carrier of meaning. Provide accessibility labels for icon-only buttons.

### 10.2 Deliberate SVG illustrations (optional, small)

Define **exactly two** reusable empty-state concepts if time permits; both must work in light and dark mode by consuming tokens, not hard-coded colors:

1. **`EmptyLedgerIllustration`** — front-on outline of a slim ledger notebook, two understated horizontal entries, a small circular check. Canvas ~156×126dp; light-theme forest strokes and pale fills; dark-theme gray strokes with just a small mint accent, no green backing rectangle. Use on the empty Home screen; do not repeat it on the same page.
2. **`EmptyPeopleIllustration`** — two overlapping rounded initial circles with a gentle connecting stroke. Canvas ~128×104dp; no faces, no stock people. Use only on an empty People screen.

**Vector construction rules:** 1.5–2dp line weight, round line caps, no more than 3 tonal fills, plenty of whitespace, no detailed texture, gradients, glows, blur filters, animated paths or heavyweight Lottie bundles. Export as viewBox-based vectors, not screenshots. The illustrations are optional enhancements; screens remain complete without them. Do not create a decorative logo as a third competing hero illustration.

### 10.3 Decorative hero treatment

One possible enhancement: a low-opacity, abstract **single curved leaf/ledger-line motif** placed in the far upper-right of the Home forest statement card (the **only** decorative green area on dark screens). It must be ornamental (accessibility-hidden), stay clear of text, occupy less than one-quarter of card area and never reduce amount contrast. Remove it if it causes clipping, contrast or frame-time regressions.

---

## 11. Accessibility and localization quality bar

- **Contrast:** WCAG AA minimums: 4.5:1 normal text, 3:1 large text and meaningful nontext control boundaries. Verify combinations in both themes, disabled vs enabled states and fields on local surfaces.
- **Target size:** At least **48×48dp** per Android accessibility guidance; sufficient gap between destructive and safe targets.
- **Font scaling:** Verify default, 130%, 160%, **200%**; no clipped balances, form buttons, OTP input, filter controls or bottom navigation labels. Use scrollable layouts and adaptive line breaking.
- **TalkBack:** Every action has role/name/state; financial figures should read with helpful descriptions, e.g. `Rahul, lent, remaining three thousand rupees, eight days overdue`. OTP entry is one logical six-digit field. Screen changes and validation errors are announced appropriately.
- **Focus order:** Header → summary → content → primary action. In sheets/dialogs, focus remains within the overlay and returns to trigger on dismissal.
- **Motion sensitivity:** Respect Android accessibility reduce motion preferences when available; no essential information conveyed only through motion or haptics.
- **Color independence:** Overdue, direction, disabled and selected states use text and/or icon/shape, not hue alone.
- **System UI:** Dynamic status/nav icon contrast, safe-area insets, device cutouts, keyboard and Android back gesture handled correctly. On edge-to-edge Android, never obscure a field or sticky CTA with nav bars.
- **Language:** English-first UI, India-first INR. Person names accept Unicode (including Devanagari); choose a font with suitable fallback. **Initials rule:** take the first grapheme of the first and last words (one grapheme if the name is a single word), using `Intl.Segmenter` when available or a grapheme-splitting fallback, never the first UTF-16 unit; uppercase only where the script has case. Do not use flags for currency.
- **Readable formatting:** Use Indian grouping, correct singular/plural (`1 day`, `2 days`), absolute date on details and meaningful due labels in lists. Do not rely on red/green to indicate who pays whom.
- **Accessibility checks:** Run Android Accessibility Scanner and real TalkBack walkthrough, not only visual review.

---

## 12. Performance and visual quality requirements

### 12.1 Measurable product-UX targets (targets, not unverified promises)

- Responsive interactions: button/toggle pressed state perceived immediately, aiming for **<100ms** local feedback independent of network.
- Most lightweight transitions should maintain **~60fps on mainstream test devices** and remain usable on lower-end devices; eliminate unnecessary visual effects if profiling finds dropped frames.
- Avoid long synchronous computations on the JS thread and unnecessary rerenders of full loan lists; scroll performance matters more than animated counts.
- Lists use virtualization for real data volumes; do not render dozens of heavy row components off-screen.
- Image thumbnails use local, reasonably compressed files; never render multi-megabyte original receipts inside scrolling rows or dashboard cards.
- Use vector icons and a very small number of bundled fonts/assets. No auto-playing video, webview, animated background mesh, extensive gradients, glow/bloom, tinted backdrop blur or heavy shadows.
- Avoid loading placeholder flicker and tab resets; preserve scroll, focused inputs and keyboard intent during navigation.
- Offline or delayed backend must never freeze taps, block Android back, or erase draft form values.
- Theme toggles and navigation must not flash an incorrect theme or run a full-screen redraw animation.

### 12.2 Quality-assurance device matrix

Test, at minimum:

| Context | Scenarios |
|---|---|
| Compact Android phone (320–360dp) | 80-character person name, ₹1,00,00,000 and ₹1,25,000.50, keyboard, sheet, two-column collapse |
| Typical phone (393–412dp) | All primary flows, normal theme switching |
| Larger screen / tall phone | Max-width restraint, no stretched cards, visible primary action |
| Light + Dark + System | Every screen, field, dialog, overlays, status/nav bars |
| Gesture and 3-button nav | Content not obscured; correct back behaviors |
| Large font + TalkBack | Focus, labels, OTP, date/amount input and list status |
| Slow 3G / sleeping backend | Loading, reconnection, duplicate-submit protection |
| Offline | Explicit error/retained draft; local receipt still viewable when opened from local context |
| Long lists | Smooth scroll and correct filtering |
| First-time/empty + real-world data | Contrast, correctness, wrapping, overdue vs settled |

---

## 13. Implementation handoff: design QA gates

An AI coding agent or developer must verify these gates **screen by screen**; never mark a screen complete solely because it renders on an emulator.

### Gate A — visual fidelity

- [ ] Forest & Ivory light theme applied consistently; Obsidian & Emerald dark theme uses neutral black/charcoal `canvas`, `surface`, `surfaceMuted`, and `surfaceRaised` throughout.
- [ ] One primary visual hierarchy on each screen; no generic all-equal card grid. Dark Home has **at most one large green featured card**; no green ambient backgrounds elsewhere.
- [ ] Spacing, typography, radii, labels and button geometry follow tokens.
- [ ] Amounts and loan direction are unmistakable; overdue labels visible without color.
- [ ] Screens feel calm, breathable and native—not a miniature desktop dashboard.
- [ ] Optional custom SVGs never obscure or compete with the data.

### Gate B — interaction correctness

- [ ] Sign-in variants match backend environment; production cannot surface mock OTP UI.
- [ ] Keyboard never hides active field or Save button; date picker and modal work with Android back.
- [ ] Create and repayment forms preserve drafts on recoverable errors; prevent double submits.
- [ ] Loan detail, summary and people screens tell a consistent balance story after edits/repayments.
- [ ] Every API error code in §9.4 shows the specified copy.
- [ ] Deletion flows have explicit confirmation and correctly described consequences.
- [ ] Receipt warning and missing-photo state clearly express local-only storage.
- [ ] Empty/search/no-connection/loading/cold-start states are implemented, not left as blanks.

### Gate C — accessibility and polish

- [ ] Contrast audited in both modes for all critical text and meaningful controls; dark CTA text is dark on mint and default dark-theme financial text is off-white.
- [ ] ≥48dp tap targets, TalkBack labels, logical focus, and 200% font-scale usability.
- [ ] Standard Android back/gesture/3-button navigation and edge-to-edge safe areas.
- [ ] Reduced motion respected; animations smooth, subtle, and nonblocking.
- [ ] Visual regression review performed with screenshots of **all** screens in both light and dark modes, including a side-by-side scan for unwanted green-tinted charcoal in dark mode.
- [ ] Performance tested on at least one modest Android device or emulator profile.

**Definition of design done:** Every core scenario from `prd.md` is easy to understand, visually cohesive in both themes, accessible with basic assistive technology, fast under normal conditions, and honest about network/receipt behavior.

---

## 14. Scope boundaries and source references

**Intentionally not designed in V1:** Push notification inbox/bell, WhatsApp chasing tools, reminders, interest or EMIs, bank connection, payment processing, dynamic charts, multi-currency, credit scoring, cloud receipt storage, biometric lock, AI assistant or a premium-subscription flow. Adding screens for these would contradict `prd.md`.

**Standards / engineering references:**

- Android accessibility guidance (48dp targets and accessible descriptions): https://developer.android.com/guide/topics/ui/accessibility/apps
- Android edge-to-edge, system insets and gesture navigation: https://developer.android.com/develop/ui/views/layout/edge-to-edge
- Android 16 edge-to-edge behavior: https://developer.android.com/about/versions/16/behavior-changes-16
- WCAG 2.2 contrast and non-text requirements: https://www.w3.org/TR/WCAG22/
- Android Material 3 type and accessible theme principles: https://developer.android.com/codelabs/m3-design-theming

**Versioning rule:** Changes to product behavior belong first in `prd.md`; changes to palette/screen hierarchy/interaction belong here; implementation choices belong in `architecture.md`. No divergence between documents is allowed without an explicit update.

**v1.1 design revision (22 October 2026):** Retain the approved Forest & Ivory light mode and screen geometry; replace the previous dark green-tinted canvas/cards with neutral near-black and graphite. Constrain emerald to CTA/focus/status accents and a single optional featured balance card. Add theme parity and per-screen treatment rules. This supersedes all dark-green backgrounds shown in earlier visual concepts.

**v1.2 revision (22 October 2026):**
- "Friends" renamed to **People** throughout: tab, S09 People, S10 Person detail, `PersonRow`, `PersonPicker`, `EmptyPeopleIllustration`, `Lent to` / `Borrowed from` labels.
- Precedence aligned with the PRD; companion filenames lowercase.
- Light theme is the P0 requirement; dark/system are public-release gates.
- Exact due-status labels, money display rule and initials rule.
- S01 routing, S02 variant selection via `/v1/auth/config`, S03 single auto-submit and countdowns.
- S04 data sources and metric-tap filters; S05 three sort options and no total count.
- S06 person picker behavior, edit-mode errors (direction lock, stale edit, archived person, principal minimum).
- S07–S08 labels, progress bar decided, repayment history, Mark as repaid dialog.
- S09/S10 Active/Archived view, same-name warning, delete only without loans.
- S12 display name, deletion flow with re-verification.
- Cold-start timings (3 s / 75 s), in-memory-only cache, §9.4 error copy by API code.

**v1.3 revision (22 October 2026):**
- Home now shows the summary card at the top followed by the complete loan list (S05), matching the assignment brief; the separate Loans tab is removed (three tabs: Home, People, Settings).
- Retries rely on client-generated record IDs; `ID_CONFLICT` copy added; idempotency, reauth-window and cursor-expiry copy removed.
- Repayment history shows all repayments; account deletion always asks for a code (no auto-submit) and has no separate final dialog.
