# Thumb-index / page-navigator — redesign sketches

Today it's a plain stack of numbered boxes bound to the spine. Below are
on-theme alternatives (book / parchment / alchemical). All keep the behaviour:
click to jump anywhere, answered vs unread state, current marker, auto-centre,
scroll for long tests. Pick one (or mix), then I build it.

Legend used in sketches:  `*` answered · `>` current · plain = unread

---

## Option 1 — Silk bookmark ribbons

Each question is a thin ribbon bound at the spine. The **current** ribbon is a
long gilded silk that drapes down past the rest with a swallowtail tail;
answered ribbons are gilt, unread ones pale and short. Most evocative of a book.

```
   ||                                 (spine)
   ||___
   ||  1 |v          <- unread: short, pale, notched (v) tail
   ||___
   ||  2 |v
   ||___
   ||  3 |v *         <- answered: gilt ribbon
   ||________
   ||>>> 4      |v    <- current: long gilded ribbon, juts out
   ||___
   ||  5 |v
   ||___
   ||  6 |v
```

- Pro: unmistakably "book", elegant, the current ribbon reads instantly.
- Con: ribbons take a bit more horizontal room; tails add visual busy-ness.

---

## Option 2 — Fore-edge page leaves

Render the book's actual stacked page edges (the fore-edge). Each question is one
leaf; the **current** leaf is tugged out from the block, **answered** leaves have
a gilt edge. Numbers ride on the leaf you hover/focus.

```
        leaf block (fore-edge)
   1  =================
   2  =================
   3  ===============* |   <- answered leaves: gilt edge
   4  =================
 > 5  =================----+   <- current leaf pulled out
   6  =================    |
   7  =================
   8  =================
```

- Pro: subtle, very "physical book", reads as one solid block not 50 widgets.
- Con: individual far leaves are thin → hover-to-see-number; precise jump fiddly.

---

## Option 3 — Spine thread with beads / sigils

A single vertical thread runs down the spine; each question is a bead on it.
Unread = hollow tick, **answered** = filled bead, **current** = large glowing
bead (or a small zodiac/alchemy sigil). Minimal, celestial, low-clutter.

```
    o  1        o hollow = unread
    |
    *  2        * filled = answered
    |
    *  3
    |
   (O) 4        (O) large glowing = current
    |
    o  5
    |
    o  6
    |
    *  7
```

- Pro: clean, airy, matches the star/orbital motifs already in the app.
- Con: less "book", closer in spirit to the orb rail we just moved away from.

---

## Option 4 — Wax-seal medallions

Each question is a small wax-seal medallion down the margin. Unread = blank
parchment disc, **answered** = pressed gold seal, **current** = larger seal with
a glow + ribbon tails. Ornate, ceremonial.

```
   (  1  )         blank disc = unread
   ( *2* )         pressed seal = answered
  (( >3< ))~        large seal + ribbon tails = current
   (  4  )
   (  5  )
   ( *6* )
```

- Pro: rich, ceremonial, on-theme with the alchemical styling.
- Con: heaviest visually; medallions are larger so fewer fit at once.

---

## Decisions

- [ ] Which option (1 / 2 / 3 / 4)?
- [ ] Keep the current page-foot `— n / 50 —`, or let the navigator carry the count?
- [ ] Hover-peek the number on the thin ones (options 2), yes/no?
- [ ] Anything else …
