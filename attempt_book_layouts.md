# Attempt screen — "book page" layout sketches

Goal: present each question as a **page of a book** (borrowing the focused-card
idea from the results screen, but a fresh build). Keep the existing mechanics:
per-question **Check / Skip** reveal + lock, **running score**, **Submit All**,
**free jump** to any question, **autosave/resume**.

Three candidate layouts below. Mark up / cross out / annotate freely.

---

## Option A — Single page + edge stack

One question per parchment page. Pages already read stack as thin edges on the
**left**; pages not yet reached stack on the **right**. Click an edge (or the
turn arrows) to flip there. Page number at the foot.

```
              ┌───────────────────────────────────────────────────────┐
              │ header: Q 12/50 · 8 answered · SCORE 6/8 · [Submit All] │
              └───────────────────────────────────────────────────────┘

       read edges                  current page                 unread edges
        \ \ \ \        ┌─────────────────────────────────────┐        / / / / / /
       | | | | | ┌─────┤                                     ├─────┐ | | | | | | |
       | | | | | |     |   *  Q U E S T I O N   12           |     | | | | | | | |
       | | | | | |     |   ───────────────────────────────   |     | | | | | | | |
       | | | | | |     |   prompt text of the question …      |     | | | | | | | |
       | | | | | |     |                                     |     | | | | | | | |
       | | | | | |     |   ( A )  ............                |     | | | | | | | |
       | | | | | |     |   ( B )  ............                |     | | | | | | | |
       | | | | | |     |   ( C )  ............                |     | | | | | | | |
       | | | | | |     |                                     |     | | | | | | | |
       | | | | | |     |   [ Check ]   [ Skip ]              |     | | | | | | | |
       | | | | | |     |                       — 12 / 50 —   |     | | | | | | | |
       | | | | | └─────┤                                     ├─────┘ | | | | | | |
        / / / /        └─────────────────────────────────────┘        \ \ \ \ \ \
                            ‹ turn back              turn ›
```

- Jump: click any edge → flips to roughly that page (hover shows the number).
  Precise far-jump is approximate (edges are thin).
- Page-turn feel on flip (curl / slide).
- Pro: most "book" of the three, navigator folded into the book itself.
- Con: clicking an exact far page (e.g. 7 → 43) is fuzzy.

---

## Option B — Open two-page spread

An open book with a centre spine. Left page = passage/context (or the question
text); right page = the answer area. Turning flips the whole spread.

```
        ┌────────────────────────────────────────────────────────┐
        │ header: Q 12/50 · 8 answered · SCORE 6/8 · [Submit All]  │
        └────────────────────────────────────────────────────────┘

          ┌───────────────────────┬┬───────────────────────┐
          |                       ||                        |
          |   PASSAGE / CONTEXT   ||   *  Question 12        |
          |   ─────────────────   ||   ──────────────────    |
          |   …reading text or    ||   prompt text …         |
          |    group instructions ||                         |
          |    sit here …         ||   ( A ) ........        |
          |                       ||   ( B ) ........        |
          |                       ||   ( C ) ........        |
          |                       ||                         |
          |                       ||   [ Check ]  [ Skip ]   |
          |         ~ 11 ~        ||        ~ 12 ~           |
          └───────────────────────┴┴───────────────────────┘
                         ‹ prev          next ›
                          (spine down the middle)
```

- Jump: prev/next turn the spread; a small "go to page" / contents popover for
  far jumps.
- Pro: closest to a real open book; great for passage tests (passage left,
  questions right).
- Con: wastes the left page for plain standalone questions (no passage/context).

---

## Option C — Single page + contents tabs (thumb-index)

One question per page, with a slim vertical column of numbered page tabs beside
it (a book's thumb-index) to jump straight to any page. `>` marks the current.

```
   ┌─────────────────────────────────────────────────────────────┐
   │ header: Q 12/50 · 8 answered · SCORE 6/8 · [Submit All]       │
   └─────────────────────────────────────────────────────────────┘

   ┌────┐   ┌─────────────────────────────────────────────────┐
   |  9 |   |                                                   |
   ├────┤   |   *  Q U E S T I O N   12                         |
   | 10 |   |   ─────────────────────────────────────────────   |
   ├────┤   |   prompt text of the question …                   |
   | 11 |   |                                                   |
   ├────┤   |   ( A ) ............                               |
   |> 12|   |   ( B ) ............                               |
   ├────┤   |   ( C ) ............                               |
   | 13 |   |                                                   |
   ├────┤   |   [ Check ]   [ Skip ]              — 12 / 50 —    |
   | 14 |   |                                                   |
   └────┘   └─────────────────────────────────────────────────┘
  thumb-index            current page
   (scrolls)
```

- Jump: click any tab → straight to that page (precise, even far jumps).
- Pro: most precise jumping; tidy.
- Con: least "physical" book feel — tabs are basically the old rail restyled.

---

## Notes / decisions to settle

- [ ] Which option (A / B / C)?
- [ ] Page-turn **animation** (curl/slide) or instant?
- [ ] Standalone vs passage tests — same layout, or B only for passage?
- [ ] Where the **running score** + **Submit All** live (header vs page corner)?
- [ ] Anything else …
