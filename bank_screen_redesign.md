# Bank (Record) Screen — Reorganization

Status: **implemented** (all 5 phases shipped) · Target: `frontend/src/pages/BankPage.tsx`, `components/layout/*`

Originally a draft; now built. The sidebar is replaced by a top-bar record switcher, the
header collapsed to one count line, the stat cards removed, the tabs are an underline bar
with folded-in counts, and owner actions live behind a `⚙ Manage` menu. The Share popover
was rebuilt as a centered modal (`components/banks/ShareRecordDialog.tsx`).

---

## 1. Why reorganize

Looking at the current screen (`BankPage.tsx`), the content is pushed roughly **a third of
the way down the page** before the first question appears. That vertical cost comes from four
stacked bands, several of which repeat each other:

| Band | Source | Problem |
|------|--------|---------|
| Page header (name + meta + actions) | `BankPage.tsx:200` | Counts here… |
| Tab buttons (right-aligned) | `:325` | …read as *actions*, not navigation |
| 4 stat cards (Questions/Passages/Categories/Tests) | `:338` | **…and the counts repeat here** |
| Filter row + section title | `:377` | Only then does content start |

Concrete pain points:

1. **Counts are shown twice** — once in the header meta line (`:203`), once in the stat
   cards (`:338`). Same numbers, two places.
2. **The stat cards earn their vertical cost poorly.** They're pretty (magic circles), but
   on an empty record they're four big zeros taking a full row.
3. **Tabs look like buttons, not a tab bar.** Right-aligned `btn-primary`/`btn-ghost`
   pills (`:329`) float disconnected from the content they switch.
4. **Owner actions are crammed top-right** — Import, Share (popover), Make Public/Private
   all compete in one corner (`:225`), each a differently-styled button.
5. **Record navigation is sidebar-only.** Switching English ↔ Japanese requires the
   sidebar (`Sidebar.tsx`). Removing the sidebar (goal of this redesign) strands that nav
   unless we relocate it.

---

## 2. Goals

- **Remove the sidebar entirely.** Reclaim the full width for content.
- **Relocate record navigation** into a top-bar *record switcher* so English ↔ Japanese
  still works (and "＋ New Record" stays reachable).
- **De-duplicate counts** — one home for each number.
- **Get to content faster** — collapse four bands into two (a header strip + a tab bar).
- **Group owner/admin actions** behind one tidy menu instead of a row of mixed buttons.
- Keep the occult/parchment aesthetic — fold the magic-circle richness into the surviving
  elements rather than deleting it outright.

---

## 3. Navigation model (replacing the sidebar)

The sidebar does two jobs: **(a)** list the user's records and **(b)** create a new one.
Both move into the **top bar**, which is global and already present on every bank route.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AKASHIC | Knowledge Archive    [ English ▾ ]            ＋ New Record   Vu ▾  │
└──────────────────────────────────────────────────────────────────────────────┘
                                   └─ record switcher dropdown
```

**Record switcher** (`[ English ▾ ]`): a dropdown sitting after the logo divider. Click to
open a menu of the user's records (from `useBanks()`), with the active one checked. Selecting
one navigates to `/banks/:id`. The menu footer carries "＋ New Record" (same `createBank`
flow the sidebar/topbar use today). On the community **home** (`/`) the switcher reads
"Records ▾" or is hidden — TBD, see open questions.

This keeps `Akashic` (logo) = home, and the switcher = "jump between my records", which is
exactly the sidebar's two affordances, minus the persistent 240px column.

Files touched: delete `Sidebar.tsx` usage from `Layout.tsx:22`, drop `MagicCircleBackground
leftOffset={240}` → `0` (`Layout.tsx:19`), remove the `.app-layout` sidebar grid column in
`index.css`, add a `RecordSwitcher` component used by `TopBar.tsx`.

---

## 4. New bank-screen layout

Two bands instead of four:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ENGLISH — Record            ·  viewer  ·  public                  ⚙ Manage ▾  │   ← Header strip
│  10 questions · 3 categories · 5 passages · 2 tests                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  Questions ⁰   Passages ⁰   Generate   Tests ⁰   Contribute      ───────────   │   ← Tab bar
│  ▔▔▔▔▔▔▔▔▔                                                                      │     (underline = active)
├──────────────────────────────────────────────────────────────────────────────┤
│  Filter: [All Types ▾] [All Difficulties ▾]              ＋ Add Question        │
│                                                                                │
│  … questions list …                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4a. Header strip (replaces header + stat cards)

- **Title**: `ENGLISH — Record` (keep `.page-title`).
- **Inline chips**: `role` + `visibility` badges stay, moved up beside the title (already
  exist at `:205`/`:214`).
- **One meta line** carries *all* the counts: `10 questions · 3 categories · 5 passages ·
  2 tests`. This is now the **single** source for counts → **delete the 4 stat cards**
  (`:338`–`:356`).
- **`⚙ Manage ▾` menu** (right) collects the scattered owner/editor actions:
  - Editor+: **Import** (the file picker at `:228`).
  - Owner: **Share** (the member popover at `:239`), **Make Public / Make Private**
    (`:312`), and natural future homes for **Rename** / **Delete record**.
  - Viewers see no menu (or just a disabled state).

  Rationale: one consistent affordance instead of three differently-styled corner buttons.
  The Share *content* (email + role + member list) stays exactly as-is — it just opens from
  the menu instead of its own button.

### 4b. Tab bar (real tabs, with counts folded in)

- Left-aligned, underline-on-active (not pill buttons). Reads as navigation.
- **Counts move onto the tabs**: `Questions 10`, `Passages 5`, `Tests 2` as a dim
  superscript/parenthetical. This is what lets the stat-card row die without losing the
  numbers.
- Tab set is unchanged and still role-gated (`visibleTabs`, `:116`): viewers get
  **Contribute**, editors+ get **Review**.

### 4c. Content

Unchanged per-tab bodies (Questions list, Passages, GenerateTab, Tests, Contribute/Review).
They simply start higher because two bands were removed above them.

---

## 5. What gets deleted / moved

| Element | Now | After |
|---|---|---|
| Sidebar (record list + new) | `Sidebar.tsx`, `Layout.tsx:22` | **Deleted**; → top-bar record switcher |
| 240px layout column | `index.css .app-layout`, `Layout.tsx:19` | **Removed**; full-width content |
| 4 stat cards | `BankPage.tsx:338` | **Deleted**; counts → meta line + tab labels |
| Header counts (`:203`) | duplicated | Becomes the **one** count line (adds passages/tests) |
| Import / Share / Visibility buttons | row at `:225` | Folded into **⚙ Manage ▾** |
| Tab pills | `:325` | Underline **tab bar** |

Net: the screen goes from **header + tabs + stats + filter** (4 bands) to **header + tabs**
(2 bands) before content.

---

## 6. Phased implementation — all done ✅

Ordered so navigation was never stranded:

1. ✅ **Record switcher** in `TopBar` (`RecordSwitcher.tsx`, uses `useBanks`). Creation stays
   on TopBar's existing "New Record" button.
2. ✅ **Sidebar removed**: dropped from `Layout.tsx`, `leftOffset={0}`, `.app-layout` →
   `1fr`, `Sidebar.tsx` deleted, hamburger removed from `TopBar`.
3. ✅ **Header collapsed**: one count line (questions · categories · passages · tests);
   stat-card block deleted.
4. ✅ **Tab bar restyle**: `.bank-tab` underline bar, left-aligned, counts folded in via
   `.bank-tab-count`.
5. ✅ **⚙ Manage menu**: Import / Share / visibility behind one owner-only dropdown; editors
   keep Import inline. Share rebuilt as `ShareRecordDialog` (centered modal).

Leftover dead CSS (`.sidebar*`, `.hamburger`, `.stat-card*`) is harmless and can be swept
later.

---

## 7. Open questions

1. **Switcher on the home page (`/`)** — show it (reading "Records ▾"), or hide it since
   home already lists records as the carousel? *Leaning: hide on home, the logo+carousel
   already cover it.*
2. **Keep any magic-circle visual** from the stat cards? Option: give the header strip a
   single faint magic-circle in the corner so the page doesn't lose all ornament. *Leaning:
   yes, one subtle circle.*
3. **Categories management** — there's no Categories tab today (categories are implicit).
   Out of scope for this pass, or add a lightweight manager? *Leaning: out of scope.*
4. **Manage menu vs. inline for editors** — editors only have Import; is a one-item menu
   worth it, or show Import inline and reserve the menu for owners? *Leaning: Import inline
   for editors, ⚙ menu owner-only.*

---

## 8. Not changing

- Per-tab content/logic, pagination (`PageInput`), filters, the Share member-management
  flow, role gating (`canEdit`/`isOwner`), and all RPCs. This is a **layout** reorganization,
  not a behavior change.
