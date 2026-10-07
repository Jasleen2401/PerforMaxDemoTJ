# DESIGN_SPEC.md
# Employee Performance Management System — UI Design Specification

> **How to use this file:**
> Attach this file to every Claude Desktop conversation about the UI.
> Tell Claude: "Read DESIGN_SPEC.md — this is our design system. Apply it to [component name]. UI only, no logic changes."

---

## 1. Design concept

**Style:** Clean, professional, light-mode SaaS dashboard.
**Inspired by:** Linear, Jira, Notion — tools trusted by IT and software teams.
**Tone:** Calm, structured, information-dense without feeling cluttered.
**Target users:** All employees in an IT/software company — developers, designers, managers, HR staff.

**Core principles:**
- Every element must earn its place — no decoration for decoration's sake
- Information hierarchy is clear at a glance
- Status is always communicated through color + icon (never color alone)
- White space is generous inside panels; tight between panels
- No gradients, no drop shadows, no dark backgrounds

---

## 2. Color system

### Primary palette

| Token name        | Hex value  | Usage                                              |
|-------------------|------------|----------------------------------------------------|
| `primary`         | `#1A56DB`  | Buttons, active nav, links, primary score bars     |
| `primary-hover`   | `#1648C0`  | Hover state on primary button                      |
| `page-bg`         | `#F5F6F8`  | App background, input field backgrounds            |
| `panel-bg`        | `#FFFFFF`  | Cards, sidebar, top bar, all white panels          |
| `border-default`  | `#E4E6EC`  | All card/panel borders, sidebar border             |
| `border-subtle`   | `#F0F2F6`  | Table row dividers, inner section dividers         |
| `border-hover`    | `#C8CCE0`  | Border on hover state                              |

### Text palette

| Token name        | Hex value  | Usage                                              |
|-------------------|------------|----------------------------------------------------|
| `text-primary`    | `#111827`  | Headings, names, values, important labels          |
| `text-secondary`  | `#5A6070`  | Department, role labels, body text                 |
| `text-muted`      | `#9EA3B0`  | Timestamps, placeholder text, column headers       |
| `text-link`       | `#1A56DB`  | Clickable text links                               |
| `text-link-hover` | `#1648C0`  | Hovered link text                                  |

### Status colors — always use fill + text pair together

| Status       | Fill (bg)   | Text color  | Usage                            |
|--------------|-------------|-------------|----------------------------------|
| Success      | `#EAF3DE`   | `#27500A`   | Completed, on-track, high score  |
| Info         | `#EEF3FD`   | `#0C447C`   | In progress, informational       |
| Warning      | `#FAEEDA`   | `#633806`   | Pending, medium score, overdue   |
| Danger       | `#FCEBEB`   | `#791F1F`   | At risk, failed, low score       |
| Neutral      | `#F1EFE8`   | `#444441`   | Inactive, default, unknown       |

### Score bar colors (by value range)

| Score range | Bar color   |
|-------------|-------------|
| 80 – 100    | `#639922`   |
| 65 – 79     | `#1A56DB`   |
| 50 – 64     | `#BA7517`   |
| Below 50    | `#E24B4A`   |

---

## 3. Typography

**Font family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Inter is the primary font. Fall back to system UI fonts if Inter is not available.
- Never use Arial, Roboto, or generic serif fonts.

**Font weight:** Use only `400` (regular) and `500` (medium). Never use 600, 700, or bold except for the brand name.

**Font size scale:**

| Element                  | Size    | Weight | Color          | Notes                            |
|--------------------------|---------|--------|----------------|----------------------------------|
| Brand name               | `14px`  | `500`  | text-primary   | App logo/name in sidebar         |
| Page title               | `18px`  | `500`  | text-primary   | Top of each page                 |
| Page subtitle            | `13px`  | `400`  | text-muted     | Below page title                 |
| Panel title              | `14px`  | `500`  | text-primary   | Inside card/panel headers        |
| Section label            | `10px`  | `500`  | text-muted     | Uppercase, letter-spacing 0.8px  |
| Table column header      | `11px`  | `500`  | text-muted     | Uppercase, letter-spacing 0.5px  |
| Employee name            | `13px`  | `500`  | text-primary   |                                  |
| Role / department        | `11px`  | `400`  | text-muted     |                                  |
| Stat value (large)       | `22px`  | `500`  | text-primary   | Dashboard metric numbers         |
| Stat label               | `12px`  | `400`  | text-muted     | Below stat value                 |
| Body text                | `13px`  | `400`  | text-primary   | General paragraph text           |
| Small body / activity    | `12px`  | `400`  | text-primary   | Feed items, descriptions         |
| Timestamp / hint         | `11px`  | `400`  | text-muted     |                                  |
| Navigation item          | `13px`  | `400`  | text-secondary | Active state: `500`, blue        |
| Button text              | `13px`  | `500`  | `#FFFFFF`      | On primary blue button           |
| Link text                | `12px`  | `400`  | text-link      | Panel action links               |
| Status pill text         | `11px`  | `500`  | status text    | Inside colored pill badges       |
| Badge / notification     | `10px`  | `500`  | `#FFFFFF`      | On blue badge in sidebar         |

**Rules:**
- Minimum font size is `11px` — never go below this
- Line height: `1.5` for body text, `1.2` for headings, `1` for single-line labels
- Sentence case always — never ALL CAPS headings (uppercase is only for 10–11px section labels)
- Letter spacing: `0.8px` on 10px section labels, `0.5px` on 11px table headers, `0` everywhere else

---

## 4. Layout & spacing

### App shell structure

```
┌─────────────────────────────────────────────┐
│  Sidebar (200px fixed) │  Main area (flex 1) │
│                        │─────────────────────│
│  Brand logo            │  Top bar (52px)     │
│  Navigation items      │─────────────────────│
│  ...                   │  Content area       │
│  User profile (bottom) │  (scrollable)       │
└─────────────────────────────────────────────┘
```

**Sidebar:** `200px` wide, white background, `border-right: 0.5px solid #E4E6EC`, always visible (not collapsible in default state).

**Top bar:** `52px` tall, white background, `border-bottom: 0.5px solid #E4E6EC`. Left: breadcrumb trail. Right: search box + icon buttons.

**Content area:** padding `20px` top, `24px` left and right. Scrollable.

### Content layout

**Main two-column grid:**
```
┌───────────────────────────┬────────────────┐
│  Main panel (flex: 1)     │  Right column  │
│  Data table / main content│  (260–300px)   │
└───────────────────────────┴────────────────┘
```

**Stats row:** 4 equal columns, `gap: 12px`, full width at top of page.

**Bottom row:** 2 equal columns, `gap: 16px`.

### Spacing tokens

| Use case                    | Value     |
|-----------------------------|-----------|
| Page padding top            | `20px`    |
| Page padding left/right     | `24px`    |
| Panel padding               | `16px 18px` |
| Stat card padding           | `14px 16px` |
| Stats row gap               | `12px`    |
| Main grid gap               | `16px`    |
| Bottom row gap              | `16px`    |
| Table row height (approx)   | `44px`    |
| Table cell vertical padding | `11px 0`  |
| Sidebar item gap            | `1px`     |
| Sidebar section label margin| `4px` bottom |
| Nav item padding            | `8px 10px` |
| Avatar margin right         | `10px`    |
| Icon-to-text gap            | `9px`     |
| Component internal gap      | `8–10px`  |

---

## 5. Component specifications

### Sidebar navigation

```
Background:       #FFFFFF
Width:            200px
Border right:     0.5px solid #E4E6EC
Padding:          20px 0
Brand area:       padding 0 18px 20px, border-bottom 0.5px solid #E4E6EC
Section padding:  0 10px
```

**Nav item states:**
- Default: `color: #5A6070`, no background
- Hover: `background: #F0F2F8`, `color: #111827`
- Active: `background: #EEF3FD`, `color: #1A56DB`, `font-weight: 500`
- Border radius: `8px`
- Padding: `8px 10px`
- Icon size: `16px`, inherits color from parent

**Nav badge (notification count):**
- Background: `#1A56DB`
- Text: `#FFFFFF`, `10px`, `500`
- Padding: `1px 6px`
- Border radius: `10px`
- Margin left: `auto`

**Brand icon:**
- Size: `28px × 28px`
- Background: `#1A56DB`
- Border radius: `7px`
- Icon color: `#FFFFFF`, `14px`

**User profile row (sidebar bottom):**
- Avatar: `28px` circle, `#1A56DB` background, `#FFFFFF` text, `11px 500`
- Name: `13px 500 text-primary`
- Role: `11px 400 text-muted`
- Hover: `background: #F0F2F8`
- Border top: `0.5px solid #E4E6EC`

---

### Top bar

```
Height:           52px
Background:       #FFFFFF
Border bottom:    0.5px solid #E4E6EC
Padding:          0 24px
```

**Breadcrumb:**
- Separator: chevron-right icon, `12px`, text-muted
- Previous steps: `13px 400 text-muted`
- Current page: `13px 500 text-primary`

**Search box:**
- Background: `#F5F6F8`
- Border: `0.5px solid #E0E2E8`
- Border radius: `8px`
- Padding: `6px 12px`
- Width: `180px`
- Text: `13px`, color `#9EA3B0`
- Icon: search icon `14px`, color `#9EA3B0`

**Icon buttons (bell, help, etc.):**
- Size: `32px × 32px`
- Background: `#F5F6F8`
- Border: `0.5px solid #E0E2E8`
- Border radius: `8px`
- Icon: `16px`, color `#5A6070`
- Hover: background `#EEF3FD`, icon color `#1A56DB`, border color `#B5D4F4`

**Notification dot:**
- Size: `6px` circle
- Color: `#E24B4A`
- Position: top-right of bell button
- Border: `1.5px solid #F5F6F8` (creates separation from button bg)

---

### Page header

```
Layout:           flex, space-between, align items to flex-end
Margin bottom:    20px
```

**Page title:** `18px 500 text-primary`
**Page subtitle:** `13px 400 text-muted`, `2px` margin top

**Primary button:**
- Background: `#1A56DB`
- Text: `#FFFFFF`, `13px 500`
- Padding: `8px 14px`
- Border radius: `8px`
- Border: none
- Hover: `#1648C0`
- Always includes a leading icon at `14px`

---

### Stat cards

```
Background:       #FFFFFF
Border:           0.5px solid #E4E6EC
Border radius:    12px
Padding:          14px 16px
Layout:           grid, 4 equal columns, gap 12px
```

**Card structure:**
- Top row: icon square (left) + trend badge (right)
- Icon square: `30px × 30px`, border radius `8px`, tinted background + matching icon
- Trend badge: `11px 500`, padding `2px 6px`, border radius `5px`
  - Up trend: background `#EAF3DE`, text `#27500A`
  - Down trend: background `#FCEBEB`, text `#791F1F`
  - Neutral: background `#F1EFE8`, text `#5F5E5A`
- Stat value: `22px 500 text-primary`, line height `1`, `8px` margin top
- Stat label: `12px 400 text-muted`, `3px` margin top

**Icon tint pairs per stat type:**
- Employees: background `#EEF3FD`, icon color `#1A56DB`
- Score/performance: background `#EAF3DE`, icon color `#27500A`
- Reviews/tasks: background `#FAEEDA`, icon color `#633806`
- Alerts/risk: background `#FCEBEB`, icon color `#791F1F`

---

### Data table (employee list)

```
Background:       #FFFFFF (inside parent panel)
Border:           none on table itself — panel provides the border
```

**Table headers:**
- Font: `11px 500 text-muted`
- Text transform: uppercase
- Letter spacing: `0.5px`
- Padding: `0 0 10px 0`
- Border bottom: `0.5px solid #E4E6EC`

**Table rows:**
- Height: approx `44px`
- Cell padding: `11px 0`
- Row divider: `border-bottom: 0.5px solid #F0F2F6`
- Last row: no border
- Hover (optional): `background: #FAFBFF`

**Employee name cell:**
- Avatar circle: `30px`, border radius `50%`, initials in center
- Name: `13px 500 text-primary`
- Role/dept below name: `11px 400 text-muted`
- Avatar + text gap: `10px`

**Avatar background colors (assign by employee, cycle through):**
- Blue theme: background `#EEF3FD`, text `#0C447C`
- Green theme: background `#EAF3DE`, text `#27500A`
- Amber theme: background `#FAEEDA`, text `#633806`
- Gray theme: background `#F1EFE8`, text `#444441`
- Red theme: background `#FCEBEB`, text `#791F1F`

**Score cell:**
- Score bar: `56px × 5px`, background `#EEF0F6`, border radius `3px`, overflow hidden
- Fill color: based on score range (see Color System section)
- Score number: `13px 500 text-primary`, `8px` gap from bar

**Status pill:**
- Display: inline-flex, align items center, gap `4px`
- Padding: `3px 8px`
- Border radius: `20px`
- Font: `11px 500`
- Always icon + label text
- Four states (see Status colors in Color System section)

**Department cell:**
- Font: `12px 400 text-secondary`

---

### Panels and cards

```
Background:       #FFFFFF
Border:           0.5px solid #E4E6EC
Border radius:    12px
Padding:          16px 18px
```

**Panel header:**
- Layout: flex, space-between, align center
- Margin bottom: `14px`
- Title: `14px 500 text-primary`
- Action link: `12px 400 text-link`

---

### Progress bars (goal completion)

```
Track:            height 6px, background #EEF0F6, border radius 3px, overflow hidden
Fill:             border radius 3px
```

**Fill colors:**
- Default / primary: `#1A56DB`
- High performing: `#639922`
- Mid / amber: `#BA7517`
- Low / red: `#E24B4A`

**Label row above bar:**
- Label: `12px 400 text-primary`
- Percentage: `12px 500 text-primary`
- Layout: flex, space-between
- Margin bottom: `5px`

---

### Activity feed

**Each item:**
- Layout: flex, gap `10px`
- Divider: `border-bottom: 0.5px solid #F0F2F6`
- Last item: no divider, no bottom padding

**Icon square:**
- Size: `28px × 28px`
- Border radius: `8px`
- Icon: `13px`
- Tinted background matching event type (success/warning/info/danger)
- Margin top: `1px` to align with text

**Text block:**
- Body: `12px 400 text-primary`, line height `1.5`
- Employee name inside text: `12px 500 text-primary`
- Timestamp: `11px 400 text-muted`, margin top `2px`

---

### Calendar / upcoming review items

**Each item:**
- Layout: flex, align center, gap `12px`
- Background: `#F5F6F8` or `page-bg`
- Border: `0.5px solid #E4E6EC`
- Border radius: `10px`
- Padding: `10px 12px`

**Date block:**
- Size: `36px × 36px`
- Border radius: `8px`
- Background: `#EAF3DE`
- Text color: `#27500A`
- Font: `12px 500`, two lines (month / day number)
- Flex shrink: `0`

**Status dot (right side of item):**
- Size: `6px` circle
- Color: green `#639922` (on track), amber `#BA7517` (at risk), red `#E24B4A` (overdue)

---

## 6. Border radius reference

| Component             | Border radius |
|-----------------------|---------------|
| App container         | `12px`        |
| Cards / panels        | `12px`        |
| Stat cards            | `12px`        |
| Table rows            | `0` (no radius on rows) |
| Buttons (primary)     | `8px`         |
| Icon buttons          | `8px`         |
| Nav items             | `8px`         |
| Input fields          | `8px`         |
| Search box            | `8px`         |
| Status pills          | `20px`        |
| Nav badges            | `10px`        |
| Avatars               | `50%`         |
| Progress bar track    | `3px`         |
| Score bar fill        | `3px`         |
| Brand icon            | `7px`         |
| Icon squares (cards)  | `8px`         |
| Calendar date block   | `8px`         |
| Activity icon square  | `8px`         |
| Review item card      | `10px`        |

---

## 7. Border rules

- **All borders use `0.5px` width** — never `1px` or `2px`
- Default border color: `#E4E6EC`
- Subtle divider color: `#F0F2F6` (table rows, feed items)
- Hover border: `#C8CCE0`
- Info accent border: `#B5D4F4` (icon button hover)
- Panel borders are always on all 4 sides
- Do not add `box-shadow` — use border only

---

## 8. Icons

**Library:** Tabler Icons — outline style only
**CDN:** `https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css`
**Usage:** `<i class="ti ti-[name]"></i>` — never use filled variants (no `-filled` suffix)

**Icon sizes:**
- Inline with text: `16px`
- In icon buttons (top bar): `16px`
- In primary button: `14px`
- In nav items: `16px`
- In activity feed squares: `13px`
- In stat card squares: `15px`
- Decorative maximum: `24px`

**Color:** Inherits from parent (do not set icon color separately unless overriding)

**Accessibility:** All decorative icons get `aria-hidden="true"`. Icon-only buttons get `aria-label`.

**Key icons used in this system:**
- Dashboard: `ti-layout-dashboard`
- Employees: `ti-users`
- Goals: `ti-target`
- Reviews / star: `ti-star`
- Feedback: `ti-messages`
- Schedule: `ti-calendar`
- Reports: `ti-report-analytics`
- Settings: `ti-settings`
- Notifications: `ti-bell`
- Search: `ti-search`
- Help: `ti-help-circle`
- Completed: `ti-circle-check`
- Alert / risk: `ti-alert-circle`
- In progress / clock: `ti-clock`
- Check mark: `ti-check`
- Add / create: `ti-plus`
- Home: `ti-home`
- Chevrons: `ti-chevron-right`, `ti-chevron-down`
- Edit: `ti-edit`
- Trash: `ti-trash`
- Download: `ti-download`
- Charts: `ti-chart-bar`
- Arrow up-right (trend): `ti-arrow-up-right`
- Brand/logo icon: `ti-chart-bar`

---

## 9. Do and don't

### Always do
- Use flat, white panel surfaces
- Communicate status with both color AND icon (never color alone)
- Use structured tables for employee data — not cards
- Keep column headers uppercase and muted
- Use generous whitespace inside panels
- Apply subtle hover states to interactive elements
- Show breadcrumb navigation in the top bar
- Keep the sidebar fixed and always visible

### Never do
- Use gradients on any surface
- Add drop shadows (no `box-shadow` with offset)
- Use dark backgrounds or dark sidebar
- Use rounded hero/banner sections
- Add decorative illustrations or background patterns
- Use more than 4 status colors in one view
- Use font sizes below `11px`
- Use ALL CAPS for headings (only for `10–11px` section labels)
- Use `font-weight: 600` or `700`
- Use `1px` or `2px` borders (always `0.5px`)
- Use `WidthType.PERCENTAGE` in table widths

---

## 10. Page templates

### Dashboard page

```
Page header (title + subtitle + primary button)
Stats row (4 columns)
Two-column grid:
  Left: employee table panel (1fr)
  Right: key metrics panel + filter panel (260px)
Two-column bottom row:
  Left: recent activity panel
  Right: upcoming reviews panel
```

### Employee profile page (recommended next)

```
Profile header card (avatar + name + role + department + score)
Three-column grid:
  Left: skill breakdown (progress bars per skill)
  Center: goal list (with status pills)
  Right: review history timeline
```

### Goal setting page (recommended next)

```
Page header (title + "Add goal" button)
Goal tree (parent goals with child goals nested beneath)
Each goal card: title, due date, owner, status pill, progress bar
```

### Review form page (recommended next)

```
Form header (employee name + review period)
Section: self-assessment (rating scale 1–5 + text field per competency)
Section: manager assessment (same structure)
Section: peer feedback (read-only, from peer submissions)
Section: overall summary + recommended action
Submit button
```

### Reports page (recommended next)

```
Filter bar (period selector + department filter + export button)
Stats row (team summary)
Chart area (bar chart: score distribution, line chart: trend over time)
Table: individual scores sortable by column
```

---

## 11. Tech stack instructions (fill in your stack)

```
Framework:     [React 19]
CSS approach:  [Tailwind CSS]
Icon lib:      lucide-react
Font:          Inter (from Google Fonts or local)
```

**When applying this spec:**
- Map every color token to a Tailwind class or CSS variable
- Do not add new npm dependencies without asking
- Do not change any API calls, data fetching, state management, or routing
- Work one component at a time
- Show a summary of changes after each component before moving to the next

---

*End of DESIGN_SPEC.md*
*Version: 1.0 — Employee Performance Management System*
*Created with Claude — claude.ai*
