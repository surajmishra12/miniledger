# MiniLedger — Product Design Specification

**Version:** 1.5  
**Status:** Implementation-ready  
**Last reviewed:** 22 October 2026  
**Platform:** Android • React Native + Expo  
**Themes:** Light (P0 and default), Dark and Use device setting (required for public V1)  
**Visual identity:** Terracotta & Cream (light) · Onyx & Ember (dark), derived from the MiniLedger logo  
**Companion documents:** [`prd.md`](./prd.md) (behavior and scope), [`architecture.md`](./architecture.md) (implementation and API contracts)  
**Terminology:** "person / people" for anyone in the user's ledger (PRD §0). The word "friend" never appears in UI copy.

---

## 0. Design contract

This document is the **single source of truth for MiniLedger's visual language and user-facing interaction design**. Implement the product requirements in `prd.md` without adding features merely because they would look appealing in a mockup. Where this document discusses an interaction, the PRD controls its business rules. Architecture, API and library choices belong in `architecture.md`.

**Non-negotiables**

1. **Financial clarity over decoration.** At a glance, users must distinguish *money owed to them* from *money they owe*, original amount from outstanding balance, and overdue from partially paid.
2. **Fast recurring flows.** A returning user with a saved person should be able to record a loan in about 10 seconds; minimize steps and re-entry.
3. **Premium restraint.** Warm cream paper and espresso ink in light mode; true onyx black and charcoal in dark mode. Premium comes first from typography, spacing and alignment, then from **soft, physical depth** (layered shadows in light mode, tonal steps in dark mode) and **fluid, purposeful motion** (§2.6, §8). Effects serve hierarchy and feedback, never decoration: **no glows, neon, glass/blur, decorative patterns, multi-color gradients or notification badges.** Avoid fintech clichés, 3D coins, charts without analytical value and overloaded dashboards.
4. **Accessible by design.** Contrast, labels, targets, legible scaling, feedback and reduced motion are required in **both** themes.
5. **Android-native behavior.** Respect system bars, keyboard, back navigation, haptics, permissions, safe areas and loading/error conventions.
6. **Privacy and integrity.** Receipts are local-only. Never imply transactions were verified, processed or synchronized. Never show a success state before the server confirms a financial mutation.
7. **Performance is a design constraint.** The app should remain responsive on modest Android phones and during Render free-tier cold starts; prefer static composition to visual effects.
8. **One design system, not two unrelated themes.** Both modes use identical component geometry, information hierarchy, accessibility and interaction behavior; color and elevation map deliberately to each theme. Dark-mode backgrounds must be **neutral black/charcoal, never brown- or orange-tinted**.
9. **Zero-friction flows.** Every screen answers one question and offers one obvious next action. Navigation is predictable (five fixed bottom slots, standard back), labels are words not jargon, and nothing important hides behind gestures, long-presses or unlabeled icons.
10. **Understood at a glance.** Color, shape, position and size each carry one consistent meaning everywhere (§2.7): *color = what kind of money / how urgent*, *position = priority*, *size = importance*. A user who has learned one screen can read every other screen without re-learning.

**Design-review question:** Can the user answer “Who owes what, how much remains, and what can I do next?” within a few seconds without explanation?

**Precedence:** `prd.md` (features, calculations, business behavior) → `architecture.md` (packages, storage, API contracts, error codes) → `design.md` (visual and interaction behavior). If a conflict is found, the higher document wins and this one is corrected. No new feature is authorized by an illustration, mockup, or screen sketch.

---

## 1. Brand and art direction

### 1.1 Personality

**Quietly confident, human, reliable, warm, precise.** Think a beautifully laid-out personal notebook with modern financial rigor, not a trading terminal or playful wallet app.

- **Terracotta & Cream (light):** a well-made leather notebook on warm paper. Cream canvas, white cards, espresso ink for text, one espresso statement card, terracotta for actions. Warm, airy and reassuring.
- **Onyx & Ember (dark):** true neutral black and charcoal surfaces with cream-white text; terracotta becomes a glowing **ember** accent used sparingly for actions and the single featured balance card. It should feel like a finished native Android dark theme, not a brown filter over light mode.
- Money amounts are editorial focal points, never competing with multiple equally loud cards.
- Use hairline separation, meaningful whitespace and tonal surfaces before adding elevation.
- Corners are modestly rounded; avoid exaggerated pill-shaped *everything*.
- Every screen has one unmistakable primary next action, and usually no more than one strong accent surface.

### 1.2 Brand system

- **Name:** `MiniLedger` with title case; no unnecessary tagline on transactional screens.
- **Mark (approved):** the MiniLedger logo, a flat wallet-notebook: espresso frame and clasp, terracotta cover, cream pages and binder rings. Source artwork: `apps/mobile/assets/brand/mark.png` (mark only) and `logo.png` (mark + wordmark). Keep it flat; never add gradients, shadows, outlines or a second mark.
- **Wordmark:** "Mini" in terracotta + "Ledger" in espresso, rounded geometric bold, as in `miniledger-logo.png`. In the app, use the artwork where the mark appears (S01, S02); where live text is needed, set `MiniLedger` in Plus Jakarta Sans Bold with "Mini" in `brandPrimary` and "Ledger" in `textPrimary` (cream-white in dark mode, so the wordmark always reads on black).
- **Logo source colors** (brand artwork only, not UI tokens; sampled from the artwork):

  | Name | Hex | Where |
  |---|---|---|
  | Espresso | `#4A2620` | Frame, clasp, "Ledger" |
  | Terracotta | `#C65A3A` | Cover, "Mini" |
  | Terracotta light | `#E07650` | Cover edge highlight |
  | Cream | `#FBF3E6` | Pages, rings, clasp button |
  | Parchment | `#F2D9BF` | Page shading |

  UI tokens (§2) are tuned from these for contrast; for example `brandPrimary` is a deepened terracotta because white text on the logo terracotta falls below 4.5:1.
- **App icon:** the mark on a **cream `#FDFBF7`** adaptive-icon background, with the mark inside the central 66dp safe zone so every launcher mask (circle, squircle, rounded square) keeps it whole. The mark must stay recognizable at 48dp.
- **Brand asset files** (`apps/mobile/assets/brand/`; Expo generates every Android density from these):

  | File | Spec | Used for |
  |---|---|---|
  | `icon.png` | 512×512, full-bleed cream square | Legacy launcher icon and the Play Store listing icon |
  | `adaptive-foreground.png` | 432×432 (108dp @ xxxhdpi), transparent, mark in the safe zone | Adaptive launcher icon foreground |
  | `mark.png` | 1254×1254, transparent | Splash screen and in-app mark |
  | `logo.png` | 1254×1254, opaque cream | README and documents only |
  | `adaptive-monochrome.png` | *pending* — 432×432 single-color silhouette | Android 13+ themed icon |
  | `mark-dark.png`, `logo-dark.png` | *pending* — frame and clasp lightened (≈ `#9A6656`), "Ledger" in `#F5F0EB` | Dark splash and dark-mode sign-in (Phase 5) |

- **Splash:** the mark (no wordmark), 120dp wide, centered on `canvas` (`#FAF7F2` light; `#0B0B0C` dark with `mark-dark.png`). No animation beyond the system fade.
- **Imagery:** Product UI is largely iconographic and typographic. Never insert stock photos on dashboard, loans or people screens. The app must look complete with every optional illustration disabled. Light-mode SVGs use espresso strokes, cream fills and a small terracotta accent; dark-mode SVGs have transparent backgrounds, neutral gray strokes and a small ember accent.

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

### 2.1 Light theme — Terracotta & Cream (default)

| Token | Hex | Intended use |
|---|---|---|
| `canvas` | `#FAF7F2` | Main app background; warm cream paper |
| `surface` | `#FFFFFF` | Cards, fields, list groups |
| `surfaceMuted` | `#F3EDE5` | Segmented-control tracks, grouped sub-areas, avatar circles |
| `surfaceRaised` | `#FFFFFF` | Sheets, dialogs, menus (separated by scrim and soft shadow) |
| `textPrimary` | `#2A1B17` | Titles, amounts, body; espresso ink |
| `textSecondary` | `#6B5A53` | Labels, dates, supporting text |
| `textTertiary` | `#8C7B73` | Placeholders and decorative metadata only, never essential text |
| `outline` | `#E6DCD2` | Hairline dividers and card borders (decorative) |
| `outlineStrong` | `#A08F86` | Input and segmented-control boundaries (meaningful, 3:1) |
| `heroSurface` | `#3B2218` | The one **dark-chocolate** statement card (Home hero); tonal top stop `#45291E` |
| `onHero` | `#FFF8EF` | Amount and title on `heroSurface` |
| `onHeroMuted` | `#E3CBBE` | Supporting text on `heroSurface` |
| `heroAccent` | `#F0936E` | Hero progress fill and the hero's line-art decoration |
| `brandPrimary` | `#B4472B` | Primary buttons, links, active tab, selected segment, progress fill |
| `brandPressed` | `#963821` | Pressed primary controls |
| `onBrand` | `#FFFFFF` | Text and icons on `brandPrimary` |
| `brandSubtle` | `#FBEAE3` | Selected chip/segment background, subtle brand tint |
| `focusRing` | `#B4472B` | Visible keyboard/assistive focus |
| `lentText` | `#2E7048` | **Money coming to you**: "Lent" / "Owes you" labels, icons, tinted amounts (green) |
| `lentSurface` | `#E7F3EB` | Lent chip, badge and tile tint |
| `borrowedText` | `#A6405C` | **Money you owe**: "Borrowed" / "You owe" labels, icons, tinted amounts (soft rose) |
| `borrowedSurface` | `#FBEDF1` | Borrowed chip, badge and tile tint |
| `successText` | `#2F6B45` | Confirmations ("Saved", money received) |
| `successSurface` | `#E8F3EB` | Repaid chip background |
| `warningText` | `#8A5710` | Due today / due tomorrow |
| `warningSurface` | `#FCF1DC` | Due-soon chip background |
| `dangerText` | `#B3203F` | Overdue, destructive actions, field errors |
| `dangerSurface` | `#FDECEF` | Overdue chip background |
| `scrim` | `#000000` @ 48% | Modal backdrop |

### 2.2 Dark theme — Onyx & Ember

**Art direction:** every large surface is **neutral black or charcoal**: canvas, cards, fields, bottom navigation, sheets, menus and dialogs. **Never use brown, espresso or orange-tinted backgrounds.** Ember (the brightened terracotta) appears only on primary actions, active indicators, focus, a few semantic labels and the **single featured balance card**. Black stays the dominant perceived color on every screen.

| Token | Hex | Intended use |
|---|---|---|
| `canvas` | `#0B0B0C` | Full-screen onyx background; all safe-area regions and system bars |
| `surface` | `#161618` | Cards, fields, list rows, bottom bar |
| `surfaceMuted` | `#1F1F22` | Segmented-control tracks, avatar circles, secondary areas |
| `surfaceRaised` | `#27272B` | Sheets, dialogs, menus; a clear neutral elevation step |
| `textPrimary` | `#F5F0EB` | Headlines, amounts, body; warm cream-white |
| `textSecondary` | `#BFB8B2` | Labels, dates, supporting text |
| `textTertiary` | `#948D88` | Placeholders and decorative metadata only |
| `outline` | `#2F2F33` | Hairline dividers and card borders (decorative) |
| `outlineStrong` | `#6B6663` | Input and segmented-control boundaries (meaningful, 3:1) |
| `heroSurface` | `#F3E6D2` | **Only** the Home hero: the logo's **cream**, glowing softly on onyx; tonal top stop `#FFF9F0` |
| `onHero` | `#2A1B17` | Amount and title on the cream hero (espresso ink) |
| `onHeroMuted` | `#6B5243` | Supporting text on the cream hero |
| `heroAccent` | `#B4472B` | Hero progress fill and line-art decoration (terracotta on cream) |
| `brandPrimary` | `#F08A65` | Primary buttons, links, active tab, selected segment, progress fill |
| `brandPressed` | `#E07450` | Pressed primary controls |
| `onBrand` | `#2A0F07` | Text and icons on ember buttons (dark foreground is mandatory) |
| `brandSubtle` | `#221916` | Small selected chip/segment background only |
| `focusRing` | `#F08A65` | Keyboard/assistive focus boundary |
| `lentText` | `#7FCB98` | Money coming to you (green) |
| `lentSurface` | `#13211A` | Lent chip, badge and tile tint |
| `borrowedText` | `#EBA3B5` | Money you owe (soft rose) |
| `borrowedSurface` | `#261619` | Borrowed chip, badge and tile tint |
| `successText` | `#7FCB98` | Confirmations |
| `successSurface` | `#13211A` | Repaid chip background |
| `warningText` | `#F2C46B` | Due today / due tomorrow |
| `warningSurface` | `#241E12` | Due-soon chip background |
| `dangerText` | `#FF6F82` | Overdue, destructive actions, field errors (more saturated than rose) |
| `dangerSurface` | `#2C1318` | Overdue chip background |
| `scrim` | `#000000` @ 68% | Modal/sheet backdrop |

Chip and badge surfaces (`*Surface`, `brandSubtle`) are near-black tints that must read as **black** at chip size; they never fill rows, cards or screens.

**Dark-mode layering:**

- Page background, headers and system-bar backing: `canvas`. **Never use `heroSurface` or any tinted color as a page background.**
- Cards, loan rows and fields: `surface` with an `outline` hairline; no glowing edges or drop shadows.
- Segmented tracks and sub-panels: `surfaceMuted`; the active segment is a raised neutral thumb with ember label, not a full ember bar.
- Sheets and dialogs: `surfaceRaised` over the black scrim; no frosted or colored blur.
- Home hero: one contained `heroSurface` card with the subtle tonal depth of §2.6 only; no glow, border light or decoration.
- Overall distribution: predominantly onyx and charcoal with ember as a functional accent, never ambient lighting.

### 2.3 Semantic color system

Each financial meaning has one color family, always paired with **text and an icon** so it never depends on hue alone:

| Meaning | Tokens | Icon | Example |
|---|---|---|---|
| They owe you (money coming in) | `lentText` green, `lentSurface` | `arrow-up-right` | `Lent` chip, `Owes you ₹3,000` |
| You owe (money going out) | `borrowedText` soft rose, `borrowedSurface` | `arrow-down-left` | `Borrowed` chip, `You owe ₹4,500` |
| Repaid / settled (finished) | `textSecondary` on `surfaceMuted` (neutral) | `check-check` | `Repaid` chip, `Settled`, `All settled.` |
| Received / saved (confirmation) | `successText`, `successSurface` | `check-check` | Snackbar, `Repaid to you` tile |
| Due today / tomorrow | `warningText`, `warningSurface` | `calendar-clock` | `Due today` |
| Overdue | `dangerText`, `dangerSurface` | `circle-alert` | `8 days overdue` |
| Destructive action | `dangerText` | `trash-2` | `Delete loan` |
| Primary action / selection | `brandPrimary`, `onBrand`, `brandSubtle` | — | `Save loan`, active tab |

Rules:

- **Amounts are neutral.** Monetary figures use `textPrimary` (or `onHero` on the hero card); the semantic color goes on the label, chip or icon next to them, never on the whole number. **Single exception:** an overdue total greater than zero (the Overdue tile on Home and the `₹X overdue` line under You owe) is set in `dangerText`, because it is a warning, not a balance. A zero overdue figure is neutral.
- **Icon badges:** a semantic figure may carry a 36dp circle in its `*Surface` tint with an 18dp icon in its `*Text` color (Home tiles, Add sheet options). This is the only filled semantic shape outside chips; never tint a whole card or row.
- **No signs as meaning:** amounts never carry `+`/`−` to show direction; the label and icon do (`You lent`, `Received`).
- **Brand is not a status.** Terracotta/ember means "act here" or "lent"; it never signals an error. Overdue and destructive states use the cooler crimson `danger` family, which must always carry the word `Overdue`/`Delete` and its icon.
- **Lent vs borrowed** are complementary (warm terracotta vs cool indigo) so they are distinguishable side by side, including for common color-vision deficiencies, and both always show their label.
- **Hero contrast:** text on the hero card uses `onHero` / `onHeroMuted`, never `onBrand`.
- **No visual netting** of lent vs borrowed in summaries or per-person balances.
- Never fake hierarchy with reduced opacity on text; measure every text color against its actual background. Disabled controls use `textTertiary` on `surfaceMuted` plus a non-color cue (no ripple, disabled role).

**Contrast (WCAG AA, verified for this palette):** 4.5:1 for normal text, 3:1 for large text and meaningful boundaries/icons. Computed ratios:

| Pair | Light | Dark |
|---|---:|---:|
| `textPrimary` / `canvas` | 15.5 | 17.4 |
| `textSecondary` / `canvas` (light) · `surface` (dark) | 6.1 | 9.2 |
| `onBrand` / `brandPrimary` | 5.4 | 7.3 |
| `onBrand` / `brandPressed` | 7.3 | 5.8 |
| `brandPrimary` / `canvas` (links) | 5.1 | 8.0 |
| `onHero` / `heroSurface` (worst stop) | 12.5 | 13.5 |
| `onHeroMuted` / `heroSurface` (worst stop) | 8.5 | 5.9 |
| `lentText` / `lentSurface` | 5.2 | 8.7 |
| `borrowedText` / `borrowedSurface` | 5.3 | 8.6 |
| `successText` / `successSurface` | 5.6 | 8.4+ |
| `warningText` / `warningSurface` | 5.4 | 9.6+ |
| `dangerText` / `dangerSurface` | 5.8 | 6.5 |
| `outlineStrong` / `surface` (field boundary) | 3.1 | 3.2 |

`textTertiary` (4.0 light on white) is for placeholders and decoration only. Re-check contrast for every new component state.

### 2.4 Theme behavior

- **First-run theme:** Light. Provide a settings selector: `Light` / `Dark` / `Use device setting`.
- **Release gating:** P0 (assignment) ships the light theme only and may hide the Appearance selector. Dark and Use device setting are required for the public V1 release; every rule in this document applies to them from that point.
- Switching modes updates **all** surfaces, Android status/navigation bar icon appearance, text, icons, focused fields, modal scrims and local illustrations without reloading or losing form state. The bottom bar, keyboard surroundings, status bar and any full-screen loading surface must be neutral onyx in dark mode.
- On dark screens, use light on dark for primary text; on light screens, use dark on light. Prefer native, theme-aware date pickers and keyboard/system UI without forcing custom skins.
- Persist theme preference locally; when `Use device setting` is selected, react to OS appearance changes.
- Do not force dark screenshots behind light dialogs or vice versa. No light flashes during app startup/navigation.
- Respect user's OS high-contrast and reduced-motion choices where exposed by the platform.

### 2.5 Mode parity and color budget

| UI element | Light mode | Dark mode | Invariant |
|---|---|---|---|
| Full-screen background | Cream `canvas` | Onyx `canvas` | Same information order |
| Ordinary cards and loan rows | White `surface` | Charcoal `surface` | Same size, spacing and content |
| Featured Home card | Espresso `heroSurface` | Deep ember `heroSurface` | Same single leading amount |
| Text and key monetary amounts | Espresso `textPrimary` | Cream-white `textPrimary` | Amounts stay neutral; semantics on labels |
| Primary save/continue button | Terracotta `brandPrimary`, white label | Ember `brandPrimary`, dark label | High-contrast label and 48dp+ target |
| Segmented control track | `surfaceMuted` | `surfaceMuted` | Only the active thumb/label gets the accent |
| Tabs, search, inputs, sheets | Cream/white neutrals | Black/charcoal neutrals | No brown or orange surface tint |
| Status chips | Light semantic tints | Near-black semantic tints | Status words and icons always visible |
| Empty-state SVG | Espresso strokes, cream fills, terracotta accent | Gray strokes, small ember accent | Decorative, never essential |

**Theme parity rule:** Each layout has the same navigational and functional affordances in both themes. Dark mode may not replace card hierarchy with glowing outlines, neon saturation, colored shadows or denser widgets.

### 2.6 Elevation and depth

Depth tells the user what sits above what: the page, then content, then the things they can act on, then temporary layers. Light mode expresses it with **soft, layered, warm shadows** (an ambient layer plus a key layer, like paper on a desk). Dark mode expresses it with **lighter neutral surfaces and hairlines**, because shadows are invisible on black.

| Level | Used by | Light | Dark |
|---|---|---|---|
| 0 Page | Canvas, headers, sticky filter block | `canvas` | `canvas` |
| 1 Resting | List containers, tiles, fields, person/loan rows | `surface` + 1dp `outline` + shadow **S1** | `surface` + 1dp `outline` |
| 2 Featured | Home hero, bottom bar | hero: `heroSurface` + shadow **S2**; bar: `surface` + top hairline + shadow **S2-up** | hero: `heroSurface`; bar: `surface` + top hairline |
| 2 Action | Bottom-bar Add button | `brandPrimary` + shadow **S2** | `brandPrimary`, no shadow |
| 3 Floating | Snackbar, sheets, dialogs, menus | `surfaceRaised` + shadow **S3** (+ scrim for sheets/dialogs) | `surfaceRaised` + 1dp `outline` (+ scrim) |
| Pressed | Any tappable surface | Shadow steps down one level while pressed (S1 → none, S2 → S1) | Surface brightens to `surfaceMuted` |

**Shadow recipes** (warm espresso ink `#2A1B17`, never gray-blue; each is two layers):

| Name | Ambient layer | Key layer |
|---|---|---|
| S1 | y 1, blur 2, 4% | y 2, blur 8, 4% |
| S2 | y 2, blur 6, 6% | y 10, blur 24, 10% |
| S2-up | y −1, blur 0, 0% (hairline only) | y −6, blur 20, 6% |
| S3 | y 4, blur 12, 8% | y 16, blur 40, 14% |

- Shadows are **never used in dark mode** and never colored (no brand-tinted or glowing shadows in either theme).
- **Hero tonal depth (the one permitted gradient):** a vertical two-stop shift within the hero's own hue, top 4% lighter to bottom base color (light `#45291E` → `#3B2218`; dark `#FFF9F0` → `#F3E6D2`). It must read as a lit surface, never as a visible gradient; text contrast is measured against the lighter (top) stop, where it is lowest (`onHeroMuted` ≥ 4.5:1 in both themes). No other element in the product uses a gradient.
- Implementation uses React Native `boxShadow` (supported on Android with the new architecture) with the two-layer recipes; where unsupported, fall back to `elevation` 1/3/6 for S1/S2/S3.

### 2.7 At-a-glance encoding

One visual language, applied identically on every screen, so meaning is recognized before text is read:

| Channel | Meaning | How it is used |
|---|---|---|
| **Hue** | *Kind of money* and *urgency* | **Green** = money coming **to you** (they owe you, received). **Soft rose** = money **you owe**. **Neutral grey** = finished (repaid, settled). **Amber** = act soon (due within the week). **Crimson** = act now (overdue) or destructive; always with `circle-alert` and the word, saturated and never just a tint, so it never reads as "you owe". **Terracotta** (brand) = *tap to act* only: Add, primary buttons, links, active tab, focus. Never a status or a kind of money. |
| **Shape** | *What a mark is* | Circle badge = a category of money (Home tiles, Add sheet, person balances). Rounded chip = a loan's status. Left status rail = a row needing action. Pill = active tab. |
| **Arrow direction** | *Which way money moved* | `arrow-up-right` = lent (money went out from you). `arrow-down-left` = borrowed (money came in to you). Settled money uses `check-check`, not an arrow. Always next to a word. |
| **Position** | *Priority* | Top of Home = the biggest answer. Within lists, overdue first, then due soon, then upcoming, then repaid. Primary action at the bottom within thumb reach. |
| **Size and weight** | *Importance* | One 40sp figure per screen (Home hero, Loan detail remaining). Remaining balances bold; original and repaid amounts regular and secondary. |
| **Emphasis** | *Still active vs. finished* | Repaid loans and settled people are visually quieter: amount in `textSecondary`, no rail, success chip. Active loans keep full-contrast amounts. |

- **Status rail** (`LoanRow`, Person detail rows): a 3dp rounded bar on the row's leading inner edge, full row height minus 12dp, in `dangerText` (overdue) or `warningText` (due today/tomorrow). Other rows have none. It is redundant with the chip text, so color is never the only cue, and it makes overdue rows pop out of a scrolling list. This is how the brief's "overdue highlighted" reads at a glance.
- **Color quantity rule:** each row or tile shows at most **two** semantic colors (its direction and its urgency). Everything else is neutral, so the colored marks stay meaningful.
- **Consistency rule:** a color never changes meaning between screens, and a meaning never appears in a different color.

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
| Hero amount | 40 / 48 | 700, letter-spacing −0.5 | `₹12,500` on the Home card |
| Screen title | 28 / 34 | 700 | `Loans`, `People` |
| Section title | 18 / 24 | 600 | `Needs attention` |
| Tile amount | 20 / 26 | 700 | `₹4,500` in a Home tile |
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
- **Bottom bar:** 5 equal slots (4 destinations + the centre Add button) with icon + label; 68dp visual height **plus bottom safe-area inset**. Active indication is a small tonal pill, not a colorful blob. The Add button rises 6dp above the bar edge (§5.1); there is no notch or cut-out.
- **Sticky bottom actions:** Must sit above system/keyboard insets and leave sufficient list bottom padding. Never cover the last entry or form field.
- **Small phones and large text:** the Home 2×2 tile grid becomes one column below 340dp available width or at font scale ≥ 1.6, preserving order.
- **Edge-to-edge:** Support Android 15/16 system bar behavior; draw page backgrounds behind bars but place touch controls within safe insets. Verify both gesture and three-button navigation.

### 4.1 Surface hierarchy

1. App canvas: warm cream in light mode / **neutral onyx black** in dark mode.
2. Content surfaces: white cards in light / **neutral charcoal cards and fields** in dark.
3. One higher-emphasis hero card per screen **when needed**, not repeated everywhere.
4. Bottom sheet/dialog elevated above backdrop with a **neutral charcoal raised layer** in dark mode.
5. No heavy nested boxes; use whitespace and hairline dividers between closely related values.

### 4.2 Layout sketches (structural, not literal styling)

```text
HOME (S04)                         LOANS (S05)
┌──────────────────────────┐       ┌──────────────────────────┐
│ MiniLedger               │       │ Loans                [⇅] │
│ ┌──────────────────────┐ │       │ [🔍 Search by name     ] │ ← sticky
│ │ YOU ARE OWED         │ │       │ All | Lent | Borrowed    │ ← sticky
│ │ ₹12,450              │ │       │ (All)(Outstanding)(Over… │ ← sticky
│ │ from 3 people        │ │       │ ⚠ OVERDUE                │
│ └──────────────────────┘ │       │ ┌──────────────────────┐ │
│ ┌──────────┐┌──────────┐ │       │ │(RS) Rahul     ₹3,000 │ │
│ │(↙)You owe││(!)Overdue│ │       │ │ Lent · 8 days overdue│ │
│ │ ₹4,500   ││ ₹2,500   │ │       │ └──────────────────────┘ │
│ │ to 2 ppl ││ 2 loans  │ │       │ DUE SOON                 │
│ └──────────┘└──────────┘ │       │ ┌──────────────────────┐ │
│ ┌──────────┐┌──────────┐ │       │ │(PS) Priya     ₹1,500 │ │
│ │(↗)Lent   ││(✓)Repaid │ │       │ │ Borrowed · Due today │ │
│ │ ₹18,000  ││ ₹5,550   │ │       │ └──────────────────────┘ │
│ │ all loans││ 31% back │ │       │ UPCOMING …  REPAID …     │
│ └──────────┘└──────────┘ │       │                          │
│ Needs attention  See all │       │                          │
│ ┌──────────────────────┐ │       │                          │
│ │(RS) Rahul     ₹3,000 │ │       │                          │
│ │ Lent · 8 days overdue│ │       │                          │
│ └──────────────────────┘ │       │                          │
│ Home People (+) Loans Set│       │ Home People (+) Loans Set│
└──────────────────────────┘       └──────────────────────────┘
```

These indicate **information order**, not equally weighted blocks or a requirement for charts/avatars. Real screens must respect device widths and safe areas.

---

## 5. Navigation and information architecture

### 5.1 Primary navigation

A five-slot bottom bar, left to right:

| Slot | Label | Icon | Opens |
|---|---|---|---|
| 1 | **Home** | `house` | S04: what you're owed, what you owe, what needs attention |
| 2 | **People** | `users-round` | S09: everyone in the ledger with separate balances |
| 3 | **Add** | `plus` | S14 Add sheet (an action, not a destination) |
| 4 | **Loans** | `notebook-text` | S05: every loan, searchable, filterable and sortable |
| 5 | **Settings** | `settings-2` | S12: appearance, account, privacy, sign out |

- **Labels are always visible.** Active destination: `brandPrimary` icon and label (terracotta light, ember dark) on a 56×30dp `brandSubtle` pill; inactive: `textSecondary`. No badges or counters on tabs.
- **The Add slot** is a 52dp `brandPrimary` circle with a 24dp `onBrand` plus and the label `Add` below in `textSecondary`. It rises 6dp above the bar's top edge with shadow S2 (light mode), so it reads as the one action in the bar without a notch or cut-out. It is never shown as "selected" and announces as `Add loan, button`. Press: scales to 0.92 with a light haptic; while S14 is open the plus rotates 45° into a close mark (`×`) and tapping it closes the sheet. It never changes the current tab.
- **Order rationale:** the two most-visited destinations flank the action: People (who) to its left, Loans (what) to its right, with Home first and Settings last as Android convention expects. Home and Loans answer different questions (overview vs. finding a specific record), so they are separate destinations; adding money is the most frequent action, so it is permanently one thumb-reach away in the centre. There is no floating action button anywhere.
- **Tab switching** cross-fades content (150 ms) and slides the active pill from the previous slot to the new one (spring, 220 ms, no overshoot); the icon settles from 0.9 to 1.0 scale. A selection haptic fires on change. Reduce motion: instant switch, pill appears without sliding.
- **Tab behavior:** each tab keeps its own scroll, search and filter state. Tapping the active tab scrolls it to the top (a second tap clears an open search on Loans). Android back on any tab other than Home returns to Home; back on Home exits.
- **Cross-tab links:** Home tiles and `See all` switch to the Loans tab with the matching filter applied and scroll it to the top; the Loans filters visibly show that state so the user always knows why the list is narrowed.
- **Other entry points to Add loan:** the Home and Loans empty states, and `Add loan with <name>` on Person detail (person prefilled; skips S14).
- **Nested screens** (Add/Edit loan, Loan detail, Record/Edit repayment, Person detail, receipt viewer, account deletion; route map in `architecture.md` §3) are pushed **over** the tabs: the bottom bar is hidden on them, they have a clear back control and support system back.

**Never** use hamburger navigation, double navigation bars, swipe-only essential actions, or icon-only controls without an accessible name.

### 5.2 Interaction hierarchy

- Use **full screens** for every form with text input (Add/Edit loan, Record/Edit repayment). A bottom sheet with a keyboard causes cramped or inaccessible inputs.
- Use **bottom sheets** only for short choices without typing: the Add sheet (S14), sort, overflow menus and receipt source.
- Use **dialogs** for confirmations and destructive choices, and for one-field prompts (Add person, Rename, Display name).
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

### S04 — Home

**Purpose:** In two seconds answer *How much am I owed? How much do I owe? What needs my attention?*, and offer one tap into each answer.

**Order from top to bottom (one vertical scroll):**

1. **Header:** the live wordmark `MiniLedger` (§1.2), left-aligned, 56dp tall. Nothing else: no greeting, bell, avatar or search (search lives on Loans).
2. **Hero card** (`SummaryHero`, `heroSurface` with its §2.6 tonal gradient: dark chocolate in light mode, logo cream in dark mode; shadow S2 in light mode, 22dp radius, 24dp padding). Content, top-down:
   - overline `YOU ARE OWED` in `onHeroMuted`;
   - **outstanding lent** (`outstandingLent`) in the 40sp hero style in `onHero`;
   - a slim 6dp **received bar** (`totalRepaid / totalLent`, fill `heroAccent`, track `onHero` at 14%) with the line `₹4,500 of ₹14,500 received · 31%` in `onHeroMuted` (hidden when `totalLent = 0`);
   - a footer line in `onHeroMuted`: `from 3 people` (`peopleOwingYou`), followed by `· ₹1,200 overdue` with a `circle-alert` in `heroAccent` when `overdueAmount > 0`; `Nothing owed to you right now` when zero.

   **Decoration (§10.3):** faint ledger-ring line art at 6–8% `onHero` across the right half, and the MiniLedger wallet-notebook mark drawn as flat SVG, ~88dp, tucked into the top-right corner, rotated −8° and cropped by the card edge. The text column reserves 72dp right padding so no figure ever runs under the mark. No glow, glass or pattern beyond this.

   **Interaction:** tap → Loans with `Lent` + `Outstanding`; a trailing 20dp `chevron-right` in `onHeroMuted` signals it. Press scales to 0.985 and the wallet's cover flap lifts 6° (spring), settling on release. On first load the amount counts up and the received bar fills (450 ms ease-out). Reduce motion: static.
3. **Four tiles** in a 2×2 grid (`SummaryTile`, 16dp radius, 16dp padding, 12dp gaps, shadow S1 in light mode). Each tile has a **subtle tinted background** (its tone's `*Surface`) and an **oversized faded glyph** of its icon (64dp, 8% of the tone's text color) cropped in the bottom-right corner. Each tile reads top-down as *badge → label → amount → context*: 36dp icon badge (§2.3) top-left with a `chevron-right` top-right when tappable, label in `textSecondary`, tile amount, one context line in `textSecondary`. The amount takes the tone's text color (§2.3 amount rule).

   | Tile | Tone / badge | Amount | Context line | Tap → Loans with |
   |---|---|---|---|---|
   | **You owe** | borrowed (rose) `arrow-down-left` | `outstandingBorrowed` | `to 2 people` (`peopleYouOwe`); if `overdueBorrowed > 0`: `₹X overdue` in `dangerText` | `Borrowed` + `Outstanding` |
   | **Overdue** | danger `circle-alert`; neutral `check-check` on `surfaceMuted` when zero | `overdueAmount` | `2 loans` (`overdueLoans`) or `Nothing overdue` | `Lent` + `Overdue` |
   | **Due this week** | warning (amber) `calendar-clock` | `dueSoonLent + dueSoonBorrowed` | `3 loans` (`dueSoonLoans`) or `Nothing due this week` | `All` + `Outstanding` |
   | **Repaid to you** | success `check-check` | `totalRepaid` | `31% of what you lent` (rounded down; hidden when `totalLent = 0`) | not tappable |

   `Total lent` (in the hero bar), `Repaid to you` and `Overdue` are the brief's three summary figures (lent loans only, PRD FR-05). *Due this week* counts outstanding, non-overdue loans of both directions due today through today + 6. Tiles show their value even when zero; the grid order is fixed.
4. **Needs attention** section: title + `See all` text button (→ Loans, default filters). Up to **5** outstanding loans from `GET /v1/loans?status=outstanding&sort=attention&limit=5` as `LoanRow`s in one grouped container: overdue first (danger chip), then the soonest due. When nothing is outstanding but loans exist: one calm row with a success badge, `You're all caught up.` / `No open loans right now.`
5. Bottom padding so the last row clears the bar.

- **Motion (§8):** on the first load of a session the hero, tiles and section rise in sequence (fade + 8dp, 40 ms stagger) and the hero and tile amounts count up from zero (450 ms, ease-out). When a figure changes after a save it rolls from the old value to the new one, so the user *sees* the effect of what they recorded. Later visits render instantly.
- **Loading:** skeletons with the exact shapes above (hero, four tiles, three rows) with a slow opacity pulse; never zeros.
- **Empty account** (no loans at all): items 2–4 are replaced by one composed empty state (§9.2) with `Add your first loan`, which opens S14.
- **Pull-to-refresh** refetches the summary and the attention list.
- The summary never changes with Loans filters. No charts, net balance, streaks, tips or promotional content.

### S05 — Loans

**Purpose:** Find any loan in seconds and see at a glance which ones need attention. This is the brief's "loan list with overdue highlighted".

- **Header:** screen title `Loans` (scrolls away) with a trailing sort icon button (`arrow-up-down`, label `Sort, Needs attention`).
- **Sticky filter block** (stays under the status bar while the list scrolls, `canvas` background, hairline bottom divider when scrolled):
  1. Search field (`search` icon, placeholder `Search by name`, clear button when non-empty; debounced 300 ms; never auto-focused).
  2. Segmented control **All / Lent / Borrowed**.
  3. Horizontally scrollable status chips **All / Outstanding / Overdue / Repaid** (`Outstanding` includes overdue).
- When any filter or search differs from the default, show a one-line `Showing lent · overdue` summary with `Clear` at the start of the list, so a narrowed list is never mistaken for missing data.
- **Sections** (only with the default *Needs attention* sort): rows are grouped under small overline headers derived from each loan: `OVERDUE` (`dangerText` + `circle-alert`), `DUE SOON` (due today or tomorrow, `warningText` + `calendar-clock`), `UPCOMING` (`textSecondary`), `REPAID` (`textSecondary` + `check-check`). Each header carries its row count and, for outstanding sections, the section's remaining total right-aligned (`OVERDUE · 2` … `₹3,200`). Each section is one grouped container. Other sorts show one ungrouped list.
- `Sort` sheet (radio rows): **Needs attention** (default), **Due date**, **Recent activity**. Semantics in PRD FR-06.
- Row anatomy (`LoanRow`):
  - leading edge: the §2.7 **status rail** (crimson for overdue, amber for due today/tomorrow, none otherwise);
  - left: person initials in a subtle circle (§11 initials rule) and **person name**;
  - second line: direction chip `Lent` / `Borrowed` + due-status label (§1.3);
  - right: **remaining balance** bold, tinted by direction (`lentText` green / `borrowedText` rose, `dangerText` when overdue); when partially repaid, a smaller neutral `of ₹5,000` beneath it; fully repaid loans show the original amount in `textSecondary` (with the neutral `Repaid` chip) instead of `₹0`;
  - in Person detail the person column is dropped: the title becomes `Due 30 October 2026` and the direction chip stays;
  - status chip (`StatusChip`, §2.3 colors with icon): `N days overdue` (danger), `Due today` / `Due tomorrow` (warning) or `Repaid` (success); other outstanding loans show the plain due label without a chip. Never an unlabeled dot.
- Row tap opens Loan details (press: ripple + 0.985 scale). No swipe actions.
- **Motion:** when filters, search or sort change, the current rows stay visible until the new page arrives, then the list cross-fades (180 ms); rows entering on scroll fade in without movement. Section headers scroll with their rows (only the filter block is pinned, so two sticky layers never fight).
- Do not show a total count (the API does not provide one). Filters, search and scroll position are preserved on back.
- Infinite scroll using `nextCursor`, de-duplicated by loan ID; footer spinner while loading more. Changing a filter, search or sort reloads from the first page.
- No matches: `No matching loans` / `Try another name or filter.` + `Clear filters`. No loans at all: the §9.2 first-use empty state with `Add your first loan` (opens S14).
- Pull-to-refresh reloads from the first page.

### S06 — Add / Edit loan

**Purpose:** Make the core 10-second task efficient and hard to enter incorrectly.

**Full-screen form, field order:**

1. Header `Money you lent` / `Money you borrowed` (create, following the chosen direction) or `Edit loan`; back control.
2. Large **direction segmented control** (`DirectionSwitch`): `I lent` / `I borrowed` with arrow icons; the selected thumb takes the direction's surface and text colors (green / rose). Preset from S14 (or `I lent` when opened from elsewhere) and still changeable, so a wrong choice in the sheet costs one tap.
3. **Person** (`PersonPicker`), labelled `Lent to` or `Borrowed from` according to direction:
   - Tapping opens a searchable, alphabetical list of **active** people from `GET /v1/people`.
   - As the user types, matching people appear first; the last row is always `+ Add "<typed name>" as new person`.
   - Choosing an existing person sends `personId`; choosing the add row sends `personName` + `createNewPerson: true`. The person is created in the same save request; no separate setup trip.
   - Opened from Person detail (`?personId=`), the field is prefilled.
   - In create mode, while no person is chosen, up to five **recent-people chips** (unique active people from the latest loans) sit under the field; one tap picks the person.
   - In **edit mode** the add row is hidden: a loan can only be moved to an existing active person (create the person first from People if needed).
4. **Amount** (`MoneyField`): label `Original amount`, `₹` prefix, `decimal-pad` keyboard. Holds the raw typed string; shows grouped formatting only when not focused. Max two decimals enforced while typing.
5. **Due date** (`DateField`): required, native date picker, displayed as `30 October 2026`. Past dates allowed. Beneath it a row of **quick chips** `1 week` · `2 weeks` · `1 month` · `End of month` (counted from the loan date); the chip matching the current value shows as selected.
6. Collapsible **More details**: loan date (defaults today; picker maximum is today), note (multiline, 500-character limit with counter from 450), receipt photo (S11).
7. Fixed safe-area-aware bottom primary action `Save loan` / `Save changes`.

**Micro-interactions and rules:**

- All required inputs are visible without opening More details.
- **Opened from S14:** the person picker opens immediately, so the flow is *Add → I lent → pick or type a name → amount → due date → Save*. Choosing a person moves focus to Amount and raises the decimal keyboard. Closing the picker without a choice leaves the user on the form, never back on the previous tab.
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
- The financial block sits on a **tinted header strip** in the loan's state surface (`lentSurface`, `borrowedSurface`, `dangerSurface` when overdue, `surfaceMuted` when repaid), with a **countdown chip** (`Due in 5 days`, `Due today`, `3 days overdue`).
- Financial hierarchy: **Remaining ₹X** (largest), then two columns `Original ₹Y` / `Received ₹Z` (lent) or `Original ₹Y` / `Paid back ₹Z` (borrowed).
- Due-status line: due-status label (§1.3) plus absolute date; never rely on hue alone.
- **Repayment progress bar** (linear, 8dp, `repaidPaise / principalPaise`) with the labelled amounts beside it; no circular chart. The fill carries the loan's state (§2.7): `lentText` or `borrowedText` while outstanding, `dangerText` while overdue, `successText` when repaid; track `surfaceMuted`. It animates from its previous value after every confirmed repayment (400 ms ease-out). The `Remaining` figure rolls to its new value at the same time.
- **Primary CTA:** `Record repayment`. **Secondary:** `Mark as repaid`. Both only when outstanding > 0. Fully repaid loans show the `All settled.` state instead of enabled buttons.
- **Repayment history:** a vertical **timeline**, newest first: a 2dp `divider` rail with a success dot per repayment and a final neutral dot for `Loan created · ₹5,000`. Each entry shows date, amount, note (if any) and an overflow menu `Edit` / `Remove`. All repayments are shown. No invented payment-method or verification badges.
- **Receipt area:** small thumbnail with `Saved on this device only` label and `Replace` / `Remove`; tap to open the private full-screen viewer. Without a file on this device (never attached, reinstall, other phone) it shows `Add receipt photo`; the file is the only index, so there is never a phantom cloud receipt or a broken remote URL. The viewer shows `Receipt unavailable on this device.` if the file disappears.
- Optional note appears after the financial section, not ahead of it. Destructive delete requires confirmation that includes financial-history implications.

### S08 — Record / edit repayment

**Purpose:** Record partial or full money movement without arithmetic mistakes.

- Full-screen presentation (a pushed form screen), so the keyboard, large text and small viewports never make it cramped.
- Context header `Record money received` for lent / `Record money paid back` for borrowed; small line `Remaining ₹3,000`.
- Amount input (`MoneyField`, empty by default) with quick chips `25%` · `50%` · `Full` that fill that share of the remaining balance (rounded down to the rupee; `Full` is exact).
- Date defaults to today; picker maximum is today. If it is before the loan date, show the non-blocking hint `This is before the loan date.` Optional note (500 characters).
- Primary action `Save repayment`. Errors: `Enter an amount greater than ₹0`; `AMOUNT_EXCEEDS_OUTSTANDING` → `Maximum is ₹3,000.`
- When editing, the maximum shown is the remaining balance plus this repayment's current amount; title `Edit repayment`.
- On success return to S07, refresh detail and summary, and show `Repayment saved`. On failure keep the values.
- **Mark as repaid** (from S07) is a confirmation dialog, not this form: `Record ₹3,000 as received?` (lent) or `Record ₹3,000 as paid back?` (borrowed), dated today, actions `Cancel` / `Mark as repaid`.
- Warnings are plain language, never raw error codes.

### S09 — People

**Purpose:** Locate a person and view obligations without collecting contacts.

- Title `People`; search field (case-insensitive, debounced 300 ms) and an `Add person` header action.
- Segmented control **Active / Archived** (default Active).
- Each row (`PersonRow`): initials circle with a 3dp direction **side bar** at its left (green when they owe you, rose when you owe them, split when both, none when settled), name, and up to two separate figures, each as a **soft pill** with icon + label + amount on the tone's surface: `↗ Owes you ₹X` (green `lentSurface`/`lentText`, when `owesYouPaise > 0`) and `↙ You owe ₹Y` (rose `borrowedSurface`/`borrowedText`, when `youOwePaise > 0`); `✓ Settled` in neutral `textSecondary` and a quieter row when both are zero. Never a netted figure; never imply the person uses the app.
- **Transition to Person detail** must be immediate: the detail header and tiles render from the People list cache on the first frame, and the loan list mounts after the push animation finishes (skeleton until then). Rows do no per-row entrance animation.
- Order: people with an outstanding balance first (alphabetical), then settled people (alphabetical), so the list leads with who matters now.
- `Add person` opens a small dialog with one required field `Name` (1–80 characters). If an active person with the same name exists, show `You already have someone named Rahul.` with `Add anyway` / `Cancel`. No contact permission, email or phone.
- No search results: `No matching people` + `Clear search`. Empty Active list: §9.2 empty state.

### S10 — Person detail

**Purpose:** Understand all loans with one person.

- Header with the name and an overflow menu: `Rename`, `Archive` / `Unarchive`, and `Delete person` (shown only when `loanCount = 0`).
- Two side-by-side figure tiles `They owe you` (green tint) and `You owe them` (rose tint), styled like Home tiles; never netted. A zero figure renders its tile neutral.
- Their loans from `GET /v1/loans?personId=…&sort=attention` as `LoanRow`s, with infinite scroll.
- Primary action `Add loan with <name>` opens S06 with the person prefilled (hidden while archived; an archived banner shows `Archived. Unarchive to add loans.` with `Unarchive`).
- Archive confirmation: `Archive Rahul?` + `They'll be hidden from your people list and the loan form. Their loans stay in your history.`
- Rename uses the same name rules and returns to this screen with the new name everywhere.

### S11 — Receipt picker / viewer

**Purpose:** Attach supporting evidence without cloud hosting.

- From Add loan (More details) or Loan details, show an action sheet: `Take photo`, `Choose photo`, `Cancel` (and `Remove receipt` if attached). Changes on Loan details apply immediately; the Edit loan form does not hold the receipt.
- Ask for camera/gallery permissions **only when the user chooses** the corresponding action; show a helpful OS Settings path if denied.
- Show one-time, concise disclosure before first attachment: **`Receipt photos are saved only on this device. They won't appear if you reinstall the app or switch phones.`** One clear `Continue` action.
- Confirm the selected image with a fit preview, `Replace` / `Remove`, and a small `Saved on this device only` label. Compression keeps receipt text legible (parameters in `architecture.md` §8).
- If the loan saved but the receipt could not be stored, S07 shows a persistent `InlineNotice` (not a snackbar): `Loan saved. Receipt couldn't be saved on this device.`
- Full-screen viewer: pinch-to-zoom and native back; only one photo per loan in V1.
- Local file missing after reinstall/account switch: graceful placeholder; never assume a URL exists. Switching accounts must never leak another user's local receipt.

### S12 — Settings, account, and appearance

**Purpose:** Offer trust, control and low-effort customization.

Each row leads with a 32dp rounded **icon square** in a muted tone (appearance amber, account terracotta-neutral, data green, privacy neutral, sign out neutral). Grouped sections in this order:

1. **Appearance:** `Light`, `Dark`, `Use device setting` with current selection indicated. A simple row/selector is enough; do not construct an elaborate theme-preview screen.
2. **Account:** signed-in email (production) or mobile number (assignment, no "verified" label); editable `Display name` row (optional, up to 60 characters). The identifier cannot be changed.
3. **Your data:** `Loans and repayments are stored in your account. Receipt photos stay on this device only.`
4. **Privacy and support:** `Privacy policy`, `How to delete your data` (external page), app version.
5. **Sign out** (neutral; confirmation `Sign out?` — receipts stay on this device for when you sign back in); **Delete account** in its own group at the bottom, danger text with a crimson icon square.

**Account deletion flow** (`settings/delete-account`):
1. Explanation screen: `Delete your account?` + `This permanently deletes your people, loans and repayments from MiniLedger, and removes receipt photos from this device. This can't be undone.` Actions `Cancel` / `Send code`.
2. `Send code` requests a code for the account's own identifier, then shows S03 in deletion mode: heading `Confirm it's you`, line `Enter the code to permanently delete your account.`, **no auto-submit**, and a destructive `Delete account` button (enabled when six digits are entered) plus `Cancel`.
3. Success: clear local data and return to Sign-in with `Your account was deleted.` OTP errors use §9.4 copy. Offline or failure: stay on the screen; never show deletion as complete.

Signing out clears tokens and cached data; another account signing in on the device never sees this user's receipts.

### S14 — Add sheet

**Purpose:** Start recording money in one tap, with the direction decided up front so the form reads naturally.

- Opened by the bottom-bar **Add** button and by `Add your first loan`. A bottom sheet (`surfaceRaised`, 22dp top radius, handle) titled `Add`.
- Two large option cards (80dp, full width, 16dp radius, 12dp apart), each tinted with its direction's surface:
  1. green `lentSurface` · lent badge `arrow-up-right` · **`I lent money`** · `Someone owes you`
  2. rose `borrowedSurface` · borrowed badge `arrow-down-left` · **`I borrowed money`** · `You owe someone`
- Tapping a row closes the sheet and pushes S06 with that direction preset. No third option, no Cancel button (the `×` Add button position, a scrim tap and Android back all close it).
- Rows announce as `I lent money, someone owes you, button`. Focus starts on the first row and returns to the Add button on dismissal.

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

| Screen | Light — Terracotta & Cream | Dark — Onyx & Ember |
|---|---|---|
| S01 Launch | Cream canvas; full-color mark centered | Onyx canvas; full-color mark centered; **no brown wash** |
| S02 Sign-in | Spacious cream canvas, logo artwork, white field, terracotta CTA | Onyx canvas, mark + cream-white wordmark, charcoal field, ember CTA |
| S03 OTP | Cream page, white 6-cell containers, terracotta focused cell | Onyx page, charcoal cells, neutral borders, ember focused cell |
| S04 Home | Espresso hero with soft S2 shadow; white tiles (S1) with light semantic badges; white grouped rows | **One deep-ember hero** on onyx, no shadow; charcoal tiles with near-black badges; charcoal rows |
| S05 Loans | White grouped sections on cream; sticky cream filter block | Charcoal sections on onyx; sticky onyx filter block with hairline divider |
| S14 Add sheet | White sheet, green and rose tinted option cards | Raised charcoal sheet, near-black green and rose cards, black scrim |
| S06 Add/Edit | White fields on cream; green/rose direction thumb; quick chips; terracotta CTA | Charcoal fields, `surfaceMuted` track, green/rose thumb, ember CTA |
| S07 Loan detail | White financial panel (S1); 8dp progress fill in the loan's state color (§2.7) | Charcoal panels; same state-colored progress fill |
| S08 Repayment | White fields on cream, terracotta CTA | Charcoal fields on onyx, ember CTA |
| S09 People | Cream canvas, initials with direction side bar, green/rose balance pills | Onyx canvas, charcoal rows, near-black green/rose pills |
| S10 Person detail | Green and rose tinted balance tiles | Near-black green and rose tinted tiles, tinted figures |
| S11 Receipt | White local-only notice; neutral viewer | Neutral black viewer; never tint the photo |
| S12 Settings | Grouped white rows, muted icon squares, crimson delete group | Grouped charcoal rows, near-black icon squares; ember active selector |
| S13 Confirmations | White dialog, neutral Cancel, crimson destructive text | Raised charcoal dialog, cream-white body, crimson destructive text, neutral Cancel |

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
| `SummaryHero` | Outstanding lent, received bar, footer, tappable | `heroSurface` gradient card, 22dp radius, line art + wallet mark (§10.3) |
| `SummaryTile` | Badge + label + amount + context line, optional tap | Tone `*Surface` tint, 16dp radius, shadow S1 (light), faded corner glyph |
| `IconBadge` | Semantic meaning for a figure or option | 36dp circle in `*Surface`, 18dp icon in `*Text` |
| `SectionHeader` | Overline title, optional semantic icon, optional trailing text action | 12sp overline; action in `brandPrimary` |
| `LoanRow` | Person, direction, remaining, due status | Large hit target; text status, subtle separator |
| `StatusChip` | Text + semantic color + screen-reader label | Compact pill, adequate contrast |
| `PersonRow` | Name + separate owes-you / you-owe pills | Initials avatar with direction side bar, green/rose pills |
| `Snackbar` | Low-risk success only, 4 s, announced to TalkBack | Raised surface above the bottom bar or form footer |
| `FilterChips` | Selected state, horizontal scroll/focus | Small radius, no reliance on color alone |
| `BottomTabBar` | Home · People · Add · Loans · Settings (§5.1) | `surface`, hairline top, shadow S2-up in light, sliding `brandSubtle` pill, raised Add circle |
| `StatusRail` | Overdue / due-soon emphasis on a row (§2.7) | 3dp rounded leading bar in `dangerText` / `warningText` |
| `AnimatedAmount` | Counts between values on confirmed data (§8.1) | Tabular digits; final value immediately under reduce motion |
| `AddSheet` | S14 two-option chooser | Bottom sheet with two 80dp tinted option cards |
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

- **App shell and tab bar:** `canvas` behind content and system insets; the bottom bar uses `surface` with a hairline `outline` top divider. Selected icon/label ember with a `brandSubtle` pill; other icons `textSecondary`.
- **Cards:** `surface`, flat, with an `outline` hairline. No colored borders around neutral cards. The featured balance card is the one intentional color surface.
- **Inputs and OTP cells:** `surface` with an `outlineStrong` border; focused border `focusRing` at 2dp. Errors use `dangerText` plus a specific message below; never flood-fill the field.
- **Primary actions:** ember `brandPrimary` fill with dark `onBrand` label. Secondary actions: `surfaceMuted` fill or `outlineStrong` border with `textPrimary` label.
- **Segmented controls:** `surfaceMuted` track; the active segment is a `surfaceRaised` thumb with an ember label, never a full-width ember bar.
- **Chips and statuses:** near-black semantic tints (§2.2) with the semantic text color and icon; compact, never attention magnets.
- **Avatars/initials:** `surfaceMuted` circle with `textSecondary` initials; no random rainbow colors, no implied profile photos.
- **Sheets and dialogs:** `surfaceRaised`, neutral handle and divider, black scrim, cream-white text. No translucent or tinted glass, no colored shadow.
- **Skeletons and progress:** `surfaceMuted` placeholders with the §8.1 opacity pulse (no shimmer sweep); progress fills use the §2.7 state colors.
- **Depth without shadows:** rows sit on `surface` over `canvas` with a hairline; tiles use their near-black tone tints; the cream hero and the Add button are the only bright surfaces; sheets use `surfaceRaised` plus an `outline` hairline.
- **Financial values:** direction balances take the desaturated green / rose text tones (§2.3 amount rule); originals and received figures stay `textPrimary` cream-white.

Reject any dark-theme screenshot where the **base background, most card surfaces or the bottom navigation look brown, espresso, orange or warm-tinted** instead of black/charcoal. That is a visual defect, not an alternate theme.

### 7.3 Premium finish details (both themes)

- **Numerals:** all amounts use tabular figures (`fontVariant: ['tabular-nums']`) so columns align and counts don't jitter.
- **Hairlines over boxes:** group related rows in one `surface` container with 1dp `outline` dividers inset by the 16dp row padding, rather than separate stacked cards.
- **One accent per view:** terracotta is for actions only. On tab screens the only filled brand element is the bar's Add button; empty-state CTAs use the secondary style there. Pushed screens (no bar) have at most one filled primary button.
- **Pressed states** (§8.1): buttons darken to `brandPressed` and scale to 0.97; tiles scale to 0.97 and drop one shadow level; rows scale to 0.985 with an Android ripple in `textPrimary` at 8% (light) / 12% (dark) opacity.
- **Depth:** the §2.6 levels exactly; never invent a new shadow, never add a shadow in dark mode.
- **Rhythm:** 20dp gutters, 12dp between tiles and grouped containers, 24dp before each section title, 32dp between major Home blocks.
- **Focus:** a 2dp `focusRing` outline offset by 2dp, never only a color change.
- **Icons:** Lucide at 1.75 stroke width, sized 20/24dp, colored `textSecondary` unless semantic.
- **Corners:** follow the radius tokens exactly; the hero card and sheets use 22dp, cards 16dp, fields and buttons 12dp, chips 8dp.

---

## 8. Motion, touch and haptics

### 8.1 Motion grammar

Motion makes the app feel physical and explains cause and effect: *what I tapped responded, where the new screen came from, and what my action changed*. It is fluid and quick, never decorative or slow. All motion runs on the UI thread (Reanimated); nothing blocks input.

**Curves:** *standard* `cubic-bezier(0.2, 0, 0, 1)` for moves and fades; *exit* `cubic-bezier(0.3, 0, 1, 1)`; *spring* `damping 22, stiffness 260, mass 1` (settles without visible overshoot) for things the finger moves or launches.

| Moment | Duration | Behavior |
|---|---:|---|
| Press (buttons, tiles, rows, Add) | 100 ms in / 160 ms out | Scale 0.97 (buttons, tiles), 0.985 (rows), 0.92 (Add); light-mode shadow steps down one level (§2.6); ripple on rows |
| Tab switch | 150 ms | Content cross-fade; active pill slides between slots (spring, 220 ms); icon settles 0.9 → 1.0 |
| Screen push / pop | 260 ms | Native stack slide with Android back consistency |
| Bottom sheet open / close | 280 / 200 ms | Spring up from the bottom, scrim fades to its opacity; Add button's plus rotates 45° to `×` in sync |
| Chip / segment selection | 160 ms | Selected background and label cross-fade; segment thumb slides |
| First Home load (once per session) | 40 ms stagger | Hero, then tiles, then the attention list fade in and rise 8dp |
| Amount change on confirmed data | 450 ms | Counts from the previous value to the new one (Home figures, Loan detail remaining), tabular digits so width never jitters |
| Progress bar update | 400 ms | Fill animates from the previous ratio; color cross-fades if the state changes |
| Success after save | 200 ms | Snackbar rises 12dp with a `check-check` icon in `successText`; success haptic |
| List change (filter/sort/search) | 180 ms | Old rows stay until new data arrives, then cross-fade; no row-by-row cascade |
| Skeleton | 1.2 s loop | Opacity pulse 0.55 ↔ 1.0 on `surfaceMuted`; no shimmer sweep |
| Empty-state illustration | 220 ms | One-time fade and 0.96 → 1.0 scale |

**Signature moments** (the few places motion is allowed to be noticed):

1. **Add → sheet:** the plus turns into `×` as the sheet springs up, so the same button visibly closes it.
2. **Save → result:** after saving a loan or repayment, the user lands on Loan detail and the remaining amount and progress bar animate to their new values.
3. **Home arrival:** figures count up once per session, making the first glance feel alive without repeating on every visit.

- Animate **opacity and transforms** whenever possible; avoid repeated JavaScript-driven layout animation of long lists, heavy blurs or animated shadows.
- Prevent content from jumping when data loads: skeletons use stable dimensions; text wraps deliberately.
- No movement is required to understand state changes.
- Respect OS **Reduce motion**: remove scale, slide, stagger, rotation and counting; amounts appear at their final value; keep only 100 ms fades or instant state changes.
- Never animate shadows' blur, layout of long lists, or anything during scroll except list-native behavior.
- On lower-end devices, degrade nonessential animation rather than blocking interaction or delaying API operations.

### 8.2 Haptics

Haptics follow the Android system touch-feedback setting and are never the only cue.

| Event | Haptic |
|---|---|
| Add button press | Light impact |
| Tab change, segment, chip, radio, direction switch | Selection tick |
| Confirmed save, settle, repayment | Success notification |
| Destructive dialog opens (delete, remove, delete account) | Warning notification |
| Validation error on submit | Error notification (once per submit) |

Never vibrate on keystrokes, scrolling, pull-to-refresh or background refreshes.

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
| First login, no loans (Home and Loans) | `A clearer way to keep track.` / `Record money you've lent or borrowed.` | `Add your first loan` (opens S14) |
| Home, loans exist but none outstanding | `You're all caught up.` / `No open loans right now.` | — |
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
- Icon vocabulary (one meaning each): tabs `house`, `notebook-text`, `plus`, `users-round`, `settings-2`; `arrow-up-right` lent, `arrow-down-left` borrowed (always with the label), `calendar-days` dates, `calendar-clock` due soon, `circle-alert` overdue, `check-check` repaid/settled, `search`, `arrow-up-down` sort, `chevron-right` "opens more", `chevron-left` back, `ellipsis-vertical` overflow, `receipt`, `pencil`, `trash-2`.
- Icons are supporting cues, never the only carrier of meaning. Provide accessibility labels for icon-only buttons.

### 10.2 Deliberate SVG illustrations (optional, small)

Define **exactly two** reusable empty-state concepts if time permits; both must work in light and dark mode by consuming tokens, not hard-coded colors:

1. **`EmptyLedgerIllustration`** — the logo's wallet-notebook drawn in outline: an open page with two understated entry lines, three binder rings and a small circular check. Canvas ~156×126dp; light theme espresso strokes, cream fill and one terracotta accent; dark theme neutral gray strokes and one small ember accent, transparent background. Use on the empty Home screen; do not repeat it on the same page.
2. **`EmptyPeopleIllustration`** — two overlapping rounded initial circles with a gentle connecting stroke. Canvas ~128×104dp; no faces, no stock people. Use only on an empty People screen.

**Vector construction rules:** 1.5–2dp line weight, round line caps, no more than 3 tonal fills, plenty of whitespace, no detailed texture, gradients, glows, blur filters, animated paths or heavyweight Lottie bundles. Export as viewBox-based vectors, not screenshots. The illustrations are optional enhancements; screens remain complete without them. Do not create a decorative logo as a third competing hero illustration.

### 10.3 Hero treatment

(v1.6) The hero is the one decorated surface in the app. Two layers, both inline `react-native-svg`, both behind the text and hidden from accessibility:

1. **Ledger line art:** two large concentric ring arcs and three horizontal ruled lines across the right half, 1.5dp strokes in `onHero` at 7% opacity. No fill, no gradient, no glow.
2. **Wallet mark (`HeroWallet`):** the logo's wallet-notebook as a flat vector, ~88dp, top-right corner, rotated −8°, cropped by the card's 22dp corner. Fills use the brand palette (espresso frame `#4A2620`, terracotta cover `#C65A3A`, cream pages `#FBF3E6`, three binder rings, a small clasp) at 92% opacity so it sits into the surface in both the chocolate and cream heroes. On press-in its cover flap rotates open 6° with the §8.1 spring and returns on release; reduce motion keeps it still.

The text column reserves 72dp on the right so the mark never sits under a figure. Nothing else on the page carries decoration except the tile corner glyphs (S04).

---

## 11. Accessibility and localization quality bar

- **Contrast:** WCAG AA minimums: 4.5:1 normal text, 3:1 large text and meaningful nontext control boundaries. Verify combinations in both themes, disabled vs enabled states and fields on local surfaces.
- **Target size:** At least **48×48dp** per Android accessibility guidance; sufficient gap between destructive and safe targets.
- **Font scaling:** Verify default, 130%, 160%, **200%**; no clipped balances, form buttons, OTP input, filter controls or bottom navigation labels. Use scrollable layouts and adaptive line breaking.
- **TalkBack:** Every action has role/name/state; financial figures should read with helpful descriptions, e.g. `Rahul, lent, remaining three thousand rupees, eight days overdue`. OTP entry is one logical six-digit field. Screen changes and validation errors are announced appropriately.
- **Focus order:** Header → summary → content → primary action → bottom bar (Home, Loans, Add, People, Settings). In sheets/dialogs, focus remains within the overlay and returns to trigger on dismissal.
- **Motion sensitivity:** Respect Android accessibility reduce motion preferences when available; no essential information conveyed only through motion or haptics.
- **Color independence:** Overdue, direction, disabled and selected states use text and/or icon/shape, not hue alone.
- **System UI:** Dynamic status/nav icon contrast, safe-area insets, device cutouts, keyboard and Android back gesture handled correctly. On edge-to-edge Android, never obscure a field or sticky CTA with nav bars.
- **Language:** English-first UI, India-first INR. Person names accept Unicode (including Devanagari); choose a font with suitable fallback. **Initials rule:** take the first grapheme of the first and last words (one grapheme if the name is a single word), using `Intl.Segmenter` when available or a grapheme-splitting fallback, never the first UTF-16 unit; uppercase only where the script has case. Do not use flags for currency.
- **Readable formatting:** Use Indian grouping, correct singular/plural (`1 day`, `2 days`), absolute date on details and meaningful due labels in lists. Never rely on color alone to indicate who pays whom.
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

- [ ] Terracotta & Cream light theme applied consistently; Onyx & Ember dark theme uses neutral black/charcoal `canvas`, `surface`, `surfaceMuted` and `surfaceRaised` throughout.
- [ ] One primary visual hierarchy on each screen. Home has **exactly one hero card** above the four supporting tiles; no brand-colored ambient backgrounds anywhere.
- [ ] Depth follows §2.6 exactly (two-layer warm shadows in light only, no shadows in dark); no glows, glass, decorative patterns or badges; the hero tonal shift is the only gradient.
- [ ] Five-slot bottom bar per §5.1 on every tab screen and hidden on pushed screens; Add opens S14 from every tab.
- [ ] Semantic colors follow §2.3: lent terracotta, borrowed indigo, repaid sage, due-soon amber, overdue crimson, each with its label and icon.
- [ ] The app icon, splash and wordmark use the approved MiniLedger artwork (§1.2).
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

- [ ] Contrast audited in both modes for all critical text and meaningful controls; dark CTA text is dark on ember and default dark-theme financial text is cream-white.
- [ ] ≥48dp tap targets, TalkBack labels, logical focus, and 200% font-scale usability.
- [ ] Standard Android back/gesture/3-button navigation and edge-to-edge safe areas.
- [ ] Reduced motion respected; animations smooth, subtle, and nonblocking.
- [ ] Visual regression review performed with screenshots of **all** screens in both light and dark modes, including a side-by-side scan for unwanted brown- or orange-tinted surfaces in dark mode.
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

**v1.1 design revision (22 October 2026):** Neutral near-black dark mode, single featured balance card, theme parity and per-screen treatment rules. (Palette superseded by v1.4.)

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

**v1.4 revision (22 October 2026):**
- New brand palette derived from the approved MiniLedger logo (`assets/brand/logo.png`, `mark.png`): **Terracotta & Cream** (light) and **Onyx & Ember** (dark), replacing Forest & Ivory / Obsidian & Emerald.
- Logo source colors, app icon, splash and wordmark rules (§1.2).
- Token changes: `brandForest` → `heroSurface`; added `outlineStrong`, `heroAccent`, `lentText`/`lentSurface`, `warningText`/`warningSurface`. Borrowed moves from amber to indigo; amber now means due soon; overdue and destructive use crimson.
- Semantic color system table (§2.3), contrast table verified for every pairing, elevation rules (§2.6), premium finish details (§7.3).
- Dark mode: all large surfaces are neutral black/charcoal; brown or orange surface tints are defects.

**v1.5 revision (22 October 2026):**
- Five-slot bottom bar: **Home · People · Add · Loans · Settings** (§5.1). The extended FAB is removed; adding money is the centre Add button, which opens the new **S14 Add sheet** (`I lent money` / `I borrowed money`) and then S06 with the direction preset and the person picker open.
- **Home (S04)** becomes an overview: flat hero (`You are owed` + people count), a 2×2 tile grid (You owe, Overdue, Total lent, Repaid to you) with semantic icon badges, and a 5-row **Needs attention** list with `See all`. The full list moves to the new **Loans tab (S05)** with a sticky search and filter block and status sections (Overdue, Due soon, Upcoming, Repaid).
- Premium depth and motion: two-layer warm shadow recipes S1–S3 in light mode and tonal steps in dark (§2.6); one permitted gradient (the hero's subtle tonal shift); a full motion system with curves, durations, signature moments (Add → ×, animated amounts and progress after saves, first-load stagger) and a haptics map (§8). No glows, glass, patterns or badges; the binder-ring hero decoration is removed.
- Semantic color: icon badges (§2.3); overdue totals in `dangerText` as the one amount-color exception; no `+`/`−` signs for direction.
- At-a-glance encoding (§2.7): one meaning per hue, shape, arrow, position and size; status rail on overdue/due-soon rows; state-colored progress bars; people with balances listed first.
- Type: hero 40/48, screen title 28/34, section 18/24, new tile amount 20/26.
- New components: `SummaryTile`, `IconBadge`, `SectionHeader`, `AddSheet`, `StatusRail`, `AnimatedAmount`; removed `LoanFAB` and `Metric`.
- The brief's "summary card at the top + loan list with overdue highlighted" is met on Home (hero + tiles + attention list with overdue first) and in full on Loans.

**v1.6 revision (22 October 2026):**
- Semantic color remap: green = they owe you (`lent*`), soft rose = you owe (`borrowed*`), crimson = overdue only, neutral = settled/repaid; terracotta is reserved for actions (Add, primary buttons, links, active tab, focus). Direction balances are tinted; originals and received figures stay neutral.
- Hero: dark chocolate in light mode, logo cream in dark mode; received bar, overdue footer, ledger line art and the wallet mark with a cover-flap press interaction (§10.3).
- Home tiles: You owe, Overdue, **Due this week** (new API fields), Repaid to you; tinted backgrounds and faded corner glyphs. Total lent moves into the hero bar.
- People: green/rose balance pills and an avatar side bar; instant transition to Person detail (cache-seeded header, deferred list).
- Forms: due-date quick chips, recent-people chips, repayment 25% / 50% / Full chips; tinted direction thumb. Add sheet uses green/rose cards.
- Loans: direction-tinted balances, section counts and totals. Loan detail: tinted header strip, countdown chip, repayment timeline. Settings: icon squares and a separate delete group.
