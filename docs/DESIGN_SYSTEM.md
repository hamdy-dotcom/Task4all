# task4all — Design System

NML's internal OKR and task tracker, branded as task4all.

---

## 0. Brand origin

task4all uses **emerald `#10B981`** as its brand colour. Assets live in `public/brand/`:
- `logo-mark.png` — circular checkmark icon (sidebar collapsed, favicon)
- `logo-full.png` — horizontal lockup with wordmark (login page)
- `logo-lockups.png` — reference sheet, not used in the app

---

## 1. Semantic collision rule

Emerald is currently what "done" and "approved" mean in most design systems. Using the same hue for the brand accent and for success states creates ambiguity: an approved pill stops reading as approved.

**The rule:**
- `#10B981` (bright emerald) is **brand only** — logo, active nav icon, primary buttons, the one highlighted stat tile per screen.
- **Done / approved** use `#047857` (emerald-700, noticeably darker) on a `#D1FAE5` tint **and gain a check icon** — so they never rely on colour alone.
- Warning `#D97706`, alert `#EA580C`, critical `#DC2626` — kept in amber/orange/red so they read as distinct from brand.
- Never place a brand-coloured element directly adjacent to a success pill without other differentiators.

---

## 2. Color tokens

```css
:root {
  /* ---- Brand (emerald) ---- */
  --nml:           #10B981;   /* primary accent */
  --nml-hover:     #059669;
  --nml-active:    #047857;
  --nml-soft:      #D1FAE5;   /* tinted fill, badges */
  --nml-softer:    #ECFDF5;   /* hover row, subtle band */

  /* ---- Ink (slate) ---- */
  --ink-900:       #0F172A;   /* primary text */
  --ink-700:       #1E293B;
  --ink-600:       #475569;   /* secondary text */
  --ink-400:       #64748B;   /* muted text, placeholders, borders */
  --ink-300:       #94A3B8;
  --ink-200:       #CBD5E1;   /* dividers, inactive control track */
  --ink-100:       #E2E8F0;   /* inactive pill fill, card borders */

  /* ---- Surfaces ---- */
  --surface:           #FFFFFF;   /* cards, dropdowns, modals */
  --surface-sunken:    #F8FAFC;   /* canvas, inputs */
  --surface-inner:     #F1F5F9;   /* tiles nested inside a card */
  --canvas:            #F8FAFC;   /* page background */

  /* ---- Sidebar ---- */
  --sidebar-top:       #FFFFFF;
  --sidebar-bottom:    #ECFDF5;   /* subtle brand tint at the base */
  --sidebar-active:    #FFFFFF;   /* active nav pill */

  /* ---- Data viz ---- */
  --chart-1:           #10B981;   /* primary series */
  --chart-2:           #94A3B8;   /* secondary series */
  --chart-3:           #0F172A;
  --chart-4:           #CBD5E1;
  --chart-track:       #E2E8F0;

  /* ---- Semantic ---- */
  /* ok/approved: deeper emerald — visually distinct from brand #10B981 */
  --ok:                #047857;
  --ok-soft:           #D1FAE5;
  --warn:              #D97706;
  --warn-soft:         #FEF3C7;
  --alert:             #EA580C;
  --alert-soft:        #FFEDD5;
  --crit:              #DC2626;
  --crit-soft:         #FEE2E2;
}
```

### CSS variables used in globals.css @theme

Prefix all tokens with `--color-` in the actual codebase (e.g. `--color-nml`, `--color-ok`). The table above uses short names for readability.

---

## 3. Typography

**Pairing:**
- Latin/numerals → **Plus Jakarta Sans** (400, 500, 600, 700)
- Arabic → **IBM Plex Sans Arabic** — pairs correctly with Jakarta's proportions and x-height; already loaded

```css
--font-latin: 'Plus Jakarta Sans', system-ui, sans-serif;
--font-arabic: 'IBM Plex Sans Arabic', 'Plus Jakarta Sans', system-ui, sans-serif;
```

Set `--font-arabic` on `[lang="ar"]` and on any element containing Arabic. Numerals stay Latin everywhere — `font-variant-numeric: tabular-nums` on all figures, percentages, and table columns.

### Scale

| Token | Size / line-height | Weight | Used for |
|---|---|---|---|
| `display` | 40 / 44 | 700 | The big stat number ("8", "42", "2.96") |
| `h1` | 24 / 30 | 600 | Page title |
| `h2` | 20 / 26 | 600 | Card headers ("Statistics", "Diagnoses") |
| `h3` | 16 / 22 | 600 | List item names, event card titles |
| `body` | 15 / 22 | 400 | Default |
| `body-sm` | 14 / 20 | 400 | Nav labels, table cells |
| `meta` | 13 / 18 | 400 | Muted sublines ("Female, 54 y.o.", room/time) |
| `micro` | 12 / 16 | 500 | Badges, delta pills, axis labels |

Muted text = `--ink-400`. Secondary = `--ink-600`. Never lower opacity on colored text — use the token.

---

## 4. Status & priority (CRM-specific, not in the reference)

Rendered as **micro pills**: `12px`, weight 500, `padding: 3px 10px`, `border-radius: 999px`, soft background + solid text color.

### Work status

| Status | Text | Background |
|---|---|---|
| `not_started` | `--ink-600` | `--ink-100` |
| `pending` | `--warn` | `--warn-soft` |
| `in_progress` | `#FFFFFF` | `--ink-900` (solid black pill, matches the reference's active segment) |
| `blocked` | `--alert` | `--alert-soft` |
| `done` | `--ok` | `--ok-soft` |
| `cancelled` | `--ink-400` | `--ink-100`, label struck through |

### Approval status

| Status | Text | Background |
|---|---|---|
| `pending` | `--warn` | `--warn-soft` |
| `approved` | `--ok` | `--ok-soft` |
| `rejected` | `--crit` | `--crit-soft` |

### Priority
Left-edge indicator bar (3px, full height, on the item row) **plus** a pill:

| Priority | Color |
|---|---|
| `low` | `--ink-300` |
| `medium` | `--warn` |
| `high` | `--alert` |
| `critical` | `--crit` |

### Item type
The four levels need instant visual identity. Use a **small square icon badge** (see §6.7), same shape at every level, differing only in fill:

| Type | Badge fill | Icon |
|---|---|---|
| Objective | `--ink-900` | target |
| Initiative | `--nml-red` | flag |
| Task | `--chart-2` | check-square |
| Sub-task | `--ink-300` | corner-down-right |

---

## 5. Shape, spacing, elevation

Softer than the original reference — still round, but more refined.

```css
--r-card:    16px;   /* top-level cards — 1px #E2E8F0 border + glass treatment */
--r-inner:   12px;   /* tiles/panels nested in a card */
--r-row:     10px;   /* list rows, event cards */
--r-input:    8px;
--r-pill:    999px;  /* buttons, segments, badges, search, chips */
--r-badge:   999px;  /* circular icon badges */
```

**Spacing:** 4px base. Card padding `24px`. Gap between cards `16px`. Gap between list rows `8px`. Gap between nav items `4px`.

**Elevation** — almost none. Separation comes from tone, not shadow.
```css
--shadow-none: none;                              /* default for cards */
--shadow-raised: 0 1px 2px rgba(32,31,30,.04),
                 0 4px 12px rgba(32,31,30,.05);   /* active nav pill, dropdowns */
--shadow-pop:   0 8px 32px rgba(32,31,30,.10);    /* modals, popovers */
```

**Borders:** avoid. Only `1px solid var(--ink-200)` for table row dividers and input outlines. Cards have no border.

### 5.1 Glass / depth treatment

Adds perceived depth without mud or gradients. The page background gets a large, barely-there radial wash so frosted surfaces have something to pick up.

```css
/* Page shell — applied as .canvas-wash on the outermost shell div */
background: radial-gradient(
  ellipse 80% 60% at 0% 0%,
  rgba(237, 28, 36, 0.055) 0%,   /* NML red, 5.5% opacity — atmosphere only */
  var(--color-canvas) 100%
);

/* Cards, stat tiles, search pill, modals — .glass-card */
background: rgba(255, 255, 255, 0.72);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.60);   /* hairline, not a design border */

/* Sidebar — .glass-sidebar (stronger blur so scrolling content shows faintly) */
background: rgba(251, 249, 249, 0.82);
backdrop-filter: blur(28px) saturate(200%);
```

**Rules:**
- The NML-red highlighted stat tile stays `background: var(--nml-red)` — fully opaque, no blur. It must not go translucent.
- Email templates: solid fills only, no glass.
- `@supports not (backdrop-filter: blur(1px))` fallback swaps `.glass-card` → `--color-surface` and `.glass-sidebar` → the sidebar gradient. Nothing looks broken on older browsers.

**Motion:** `150ms cubic-bezier(.4,0,.2,1)` on color/background. `200ms` on transform. Nothing longer.

---

## 6. Components

### 6.1 App shell

```
≥ 1440 px
┌──────────┬──────────────────────────────────┬───────────────┐
│ SIDEBAR  │            MAIN                   │  RIGHT RAIL   │
│  260px   │            fluid                  │    340px      │
└──────────┴──────────────────────────────────┴───────────────┘

1100 – 1439 px
┌──────────┬────────────────────────────────────────────────────┐
│ SIDEBAR  │            MAIN                                     │
│  260px   │            fluid                                    │
├──────────┴────────────────────────────────────────────────────┤
│ RIGHT RAIL (full width, stacked below main)                   │
└───────────────────────────────────────────────────────────────┘

768 – 1099 px
┌──────┬──────────────────────────────────────────────────────┐
│ ICON │            MAIN                                       │
│  72px│            fluid                                      │
├──────┴──────────────────────────────────────────────────────┤
│ RIGHT RAIL (full width, stacked below main)                  │
└──────────────────────────────────────────────────────────────┘

< 768 px (drawer closed)
┌──────────────────────────────────────────────────────────────┐
│            MAIN (full width)                                 │
├──────────────────────────────────────────────────────────────┤
│ RIGHT RAIL (full width, stacked below main)                  │
└──────────────────────────────────────────────────────────────┘
```

#### Breakpoints

| Viewport | Sidebar | Right rail |
|---|---|---|
| ≥ 1440 px | 260 px, labels visible | 340 px beside main |
| 1100 – 1439 px | 260 px, labels visible (collapse toggle available) | Full-width card below main |
| 768 – 1099 px | 72 px icon rail (auto), labels hidden, native `title` tooltip on hover | Full-width card below main |
| < 768 px | Off-canvas drawer (260 px), hamburger in TopBar | Full-width card below main |

**Collapse toggle (≥ 1100 px):** the `«` chevron in the sidebar header collapses to 72 px icon-only rail; `»` expands. Always available in expanded mode.

**Drawer behavior (< 768 px):** the sidebar slides in from the left edge with a `rgba(32,31,30,.5)` backdrop. Closes on backdrop tap, `Escape` key, and any route change. Body scroll is locked while open.

**Right rail reflow:** `flex-wrap` on the content row. Content card: `flex: 1 1 0; min-width: 280px`. Rail: `flex-basis: 100%` below 1440 px (wraps to its own row), `flex-basis: 340px` at ≥ 1440 px (sits beside).

**TopBar at < 768 px:** hamburger (44 × 44) + NML logo badge on the left; search icon + bell + avatar circle on the right. Full user chip hidden. Search icon opens a full-screen overlay input with a back arrow to dismiss.

**Touch targets:** minimum 44 × 44 px on all interactive elements.

- Page background `--canvas`. Sidebar has its own gradient (`--sidebar-top` → `--sidebar-bottom`). Right rail and content card are `--surface-sunken`.
- Max content width: none — the layout fills.

### 6.2 Sidebar
- Background: `linear-gradient(180deg, var(--sidebar-top) 0%, var(--sidebar-bottom) 100%)`. No border on the right edge — the tone difference against `--canvas` is the separation.
- **Logo block:** 40px circular badge, fill `--ink-900`, NML mark in white inside. Wordmark to the right at `h3`. The `«` collapse toggle sits at the far right of this row, `--ink-400`.
- **Nav item:** height 44px, `--r-pill`, padding `0 16px`, gap 12px between icon and label, `body-sm` at weight 500.
  - Inactive: transparent bg, `--ink-700` text, `--ink-600` icon.
  - Hover: `rgba(255,255,255,.6)` bg.
  - **Active: `--sidebar-active` (white) fill + `--shadow-raised` + `--ink-900` text + `--nml-red` icon.** This is the one place brand red appears in the sidebar.
- **Footer:** Settings and Logout pinned to the bottom with `margin-top: auto`, same item styling, `--ink-600`.

**Nav order:**
`Dashboard · Objectives · Initiatives · Tasks · Approvals · Meetings · Teams · Reports` — then footer `Settings · Logout`.
Show a count badge on **Approvals** when the user has pending items: `--nml-red` circle, white `micro` numeral, right-aligned in the row.

### 6.3 Top bar
Single row, aligned to the content grid, `margin-bottom: 16px`.
- **Search:** flex-grow, height 52px, `--r-pill`, fill `--surface-inner`, magnifier icon `--ink-400` at 20px inset 20px, placeholder `--ink-400`. No border. On focus: fill `--surface`, `--shadow-raised`, no colored ring.
- **Notification bell:** 52px circle, `--surface-inner` fill, bell icon `--ink-900`. Unread → 8px `--nml-red` dot at the top-right of the icon.
- **User chip:** `--surface` fill, `--r-pill`, padding `6px 16px 6px 6px`. 40px avatar circle, then two stacked lines — name at `body-sm`/600 `--ink-900`, **title** (the free-text field from `profiles.title`) at `meta` `--ink-400` — then a chevron-down `--ink-400`.

### 6.4 Card
`--surface-sunken` fill, `--r-card`, `24px` padding, no border, no shadow.
Header row: `h2` title on the left; controls (segmented control / dropdown) on the right, vertically centered. Optional **count chip** immediately after the title — 24px circle, `--ink-100` fill, `micro`/600 `--ink-600`.

### 6.5 Stat tile
The four-across row under "Statistics".
- `--surface-inner` fill, `--r-inner`, padding `20px`, min-height 108px.
- **Number** at `display`. If there's a unit, it follows the number at `body-sm`/`--ink-600`, baseline-aligned (`25 min`).
- **Label** below at `body-sm`/`--ink-600`.
- **Delta pill** absolutely positioned top-right: `--surface` fill, `--r-pill`, `4px 10px`, arrow glyph + value at `micro`/600. Up = `--ok`, down = `--alert`. The arrow direction is literal (↑/↓); the *color* reflects whether the movement is good, which is metric-dependent — pass it explicitly, don't infer from the sign.
- **Highlighted tile:** exactly one per row. Fill `--nml-red`, number and label white, delta pill stays white-filled with its own semantic text color. (This replaces the reference's yellow tile.)

### 6.6 Segmented control
Track: `--ink-100`, `--r-pill`, `4px` padding. Segment: `--r-pill`, `8px 20px`, `body-sm`/500.
Inactive `--ink-700` on transparent. **Active: `--ink-900` fill, white text.** Not red — keep red for brand.

### 6.7 Icon badge
40px circle, `--ink-900` fill, white 18px line icon centered. Used on event cards and item rows. For work-item types, use the fills in §4.

### 6.8 Dropdown trigger
`--surface-inner` fill, `--r-pill`, `10px 16px`, `body-sm` `--ink-700`, chevron-down `--ink-400` at 16px, 8px gap. Menu: `--surface`, `--r-inner`, `--shadow-pop`, 8px padding, items 40px tall at `--r-row`, hover `--surface-inner`, selected gets a `--nml-red` check.

### 6.9 List row
`--surface-inner` fill, `--r-row`, `12px 16px`, `8px` vertical gap between rows.
Left: 40px avatar (or type icon badge). Middle: name at `h3`, subline at `meta`/`--ink-400`. Right: status pill, then `⋯` overflow button (32px circle, transparent, `--ink-400`, hover `--ink-100`).
Row hover: `--nml-softer`. Row with a priority: 3px `--r-pill` bar flush to the left inner edge in the priority color.

### 6.10 Bar chart
The distinctive part of the reference — replicate exactly.
- Each bar sits inside a **full-height ghost track** filled `--chart-track`, same width, same radius. The bar is the filled portion rising from the bottom.
- **Both track and bar use a fully rounded capsule shape** — `border-radius: 999px` top and bottom, not just the top. Short bars become squat pills.
- Bar fill `--chart-2`. Bar width ~48px, gap ~12px.
- The **percentage label sits above each bar** at `micro`/`--ink-600`, inside the track's empty upper region.
- No gridlines, no y-axis.
- To the right of the chart, a **two-column key**: label at `body-sm` `--ink-900` on the left, value at `body-sm`/600 right-aligned. Sorted descending, matching bar order.

### 6.11 Line / area chart
- Two smooth (monotone) series, 2.5px stroke, with a soft gradient area fill fading to transparent at ~12% opacity.
- Series 1 `--chart-1`, series 2 `--chart-2`.
- Y axis: 4–5 ticks, `micro` `--ink-400`, no axis line. Horizontal gridlines `--ink-200` at 1px.
- X axis: labels only, `micro` `--ink-400`, no line.
- Legend **below** the chart: 8px dot + `meta` label, 20px gap between entries.
- Tooltip: `--ink-900` fill, white text, `--r-row`, `8px 12px`.

### 6.12 Timeline / schedule rail (→ NML Meetings)
- Header: `h2` title + segmented control (`Today` / `This week`). Below it, the date at `body`/`--ink-900` on the left and an `Upcoming` dropdown on the right.
- **Time gutter:** 64px wide, labels at `micro` `--ink-400`, top-aligned to their slot.
- **Now indicator:** `--ink-900` pill with the current time in white `micro`, followed by a 1px dashed `--ink-300` line spanning the full rail width.
- **Event card:** `--r-row`, `16px` padding, `8px` vertical gap. Icon badge top-left. Optional **tag pill** to the right of the badge (`--surface` fill, `micro`, e.g. "Approval due"). Title at `h3`. Subline at `meta`/`--ink-400`. Bottom row: 14px clock icon + time range at `meta`.
  - Default card: `--surface-inner`.
  - **Primary/next event: `--nml-red` fill, all text white**, tag pill stays white-filled with `--ink-900` text.
  - Secondary emphasis: `--chart-2` fill, white text.

### 6.13 Buttons

| Variant | Fill | Text | Use |
|---|---|---|---|
| Primary | `--nml-red` → hover `--nml-red-hover` | `#FFF` | Create, Submit, Approve |
| Secondary | `--ink-900` → hover `--ink-700` | `#FFF` | Neutral confirm |
| Tertiary | `--ink-100` → hover `--ink-200` | `--ink-900` | Cancel, Back |
| Ghost | transparent → hover `--ink-100` | `--ink-700` | Inline actions |
| Destructive | `--crit-soft` → hover `--crit` | `--crit` → hover `#FFF` | Reject, Delete |

All `--r-pill`. Height 44px default, 36px compact. Padding `0 24px`. `body-sm`/600. Icon 18px, 8px gap.

### 6.14 Progress bar (CRM-specific)
Track `--ink-100`, height 8px, `--r-pill`. Fill `--nml-red`, `--r-pill`.
- **Unallocated weight** renders as a hatched `--ink-200` segment at the tail, so the gap is visible rather than implied by a short bar.
- Percentage label to the right at `body-sm`/600 tabular-nums.
- **Continuous objectives show no bar.** Instead: `Ongoing · 4 of 9 initiatives complete` at `body-sm` `--ink-600`, with a `--ink-100` "Ongoing" pill.

### 6.15 Empty state
Centered, 48px line icon `--ink-300`, `h3` `--ink-900` headline, `body-sm` `--ink-400` line under it, primary button below. Vertical rhythm 16px.

---

## 7. Reference → CRM mapping

| MedSync element | NML Compliance Tracker |
|---|---|
| Statistics tiles | Objectives count · Initiatives in progress · Pending approvals · Overall completion |
| Yellow highlighted tile | Pending approvals (red fill) — the thing needing action |
| Diagnoses bar chart | Progress by objective, descending |
| New patients line chart | Completion trend, current user's scope vs team |
| Patients list | My items — assigned work across all four levels |
| Schedule rail | Upcoming meetings + items due today |
| Event card | Meeting card (with Meet link) or due-item card |
| "New Patient" tag pill | "Needs approval" / "Overdue" / "Blocked" tag |
| Doctor name + specialty in user chip | Full name + `profiles.title` |

---

## 8. RTL

The whole layout must mirror under `dir="rtl"`. Non-obvious bits:
- Sidebar moves to the right, right rail to the left.
- Use CSS logical properties throughout (`padding-inline-start`, `margin-inline-end`, `inset-inline-start`) — not `left`/`right`.
- Chevrons, back arrows, and the `«` collapse toggle flip. **Clock icons, the up/down delta arrows, and chart axis direction do not.**
- Charts: bar order and the line chart's time axis stay left-to-right regardless of direction. Time does not mirror.
- Numbers stay Latin and LTR inside Arabic sentences — wrap figures in `<bdi>`.

---

## 9. Open items

1. **Brand book.** Only `#ED1C24` is recoverable from the site. If NML has documented secondary colors, they should replace the derived neutrals and `--chart-2`.
2. **Logo asset.** Need the NML mark as SVG for the sidebar badge; the Salla store only exposes a raster JPEG.
3. **Default language.** Does the CRM open in Arabic or English? It changes the default `dir` and which font loads first.
4. **Dark mode** — not specified in the reference and not in scope here. If needed later, the token structure supports it; the values don't exist yet.