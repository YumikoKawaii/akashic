# Solar-system — resize & reposition draft

## Current state
`SolarSystemBackground` is a **fixed, full-screen** layer centred on the viewport
(`left:50% top:50%`), with orbit rings at radius 210/340/460px, a central "sun"
(magic circle), and 4 orbiting sigils. Because the exam page now sits top-left
and is 880px wide, the page **covers the sun + inner orbits** — only the lower-
right arcs peek out. So the nicest part (the sun + planets) is hidden.

Goal: shrink it and move it into open, visible space.

Caveat: it's a **shared** background (the passage attempt layout uses it too), so
repositioning *only* on the exam screen means adding `center` + `scale` props
(default = today's centred/full size, so other screens are unchanged).

Legend:  `[#]` thumb-index · `+----+` book page · `(*)` solar-system centre (sun)

---

## Option A — Right gutter, vertically centred

Sun sits in the open strip to the right of the page, mid-height. Scaled ~0.55.

```
 [#] +-------------------------+
 [#] |  QUESTION 02            |
 [#] |  prompt ...             |        (*)        <- sun centred in the
 [#] |  [A][B]                 |      orbiting          right gutter
 [#] |  [C][D]                 |       sigils
 [#] |  Check  Prev            |
 [#] +-------------------------+
```

- center: ~`82% , 48%`   scale: ~`0.5`
- Pro: tidy, balanced beside the page.
- Con: on a narrow window the right gutter is thin (~300px) → gets cramped /
  clipped. Best on wide screens.

---

## Option B — Bottom-right corner bloom

Sun near the bottom-right; the system blooms up-and-left into the open area below
the page. Largest & most visible, partially runs off the corner.

```
 [#] +-------------------------+
 [#] |  QUESTION 02            |
 [#] |  prompt ...             |
 [#] |  [A][B]  [C][D]         |
 [#] +-------------------------+
                         . orbit .
                      .   sigils   .
                     .     (*)      .   <- sun low-right, big
                      '.         .'
```

- center: ~`78% , 82%`   scale: ~`0.7`
- Pro: most of the system (sun + inner orbits) clearly visible; cosmic corner.
- Con: asymmetric; bottom edge may clip the outer ring (probably fine / intended).

---

## Option C — Lower-centre, under the page

Sun centred under the open lower half; orbits rise behind the page's bottom edge.

```
 [#] +-------------------------+
 [#] |  QUESTION 02            |
 [#] |  prompt ...   [A][B]    |
 [#] +-------------------------+
              .  orbit ring  .
           .                   .
          .        (*)          .   <- sun centred low
           .                   .
              '  sigils  '
```

- center: ~`58% , 76%`   scale: ~`0.62`
- Pro: symmetric, fills the big empty band beneath the page.
- Con: sits under the page rather than "beside" it; less of a left/right split.

---

## Decisions

- [ ] Which position (A / B / C)?
- [ ] Scale — keep my suggested value, or bigger/smaller?
- [ ] Should the sun be **fully** visible (not clipped by page/edges), yes/no?
- [ ] Apply only to the exam screen (recommended), or change it everywhere?
- [ ] Keep it faint/background, or make it a touch bolder now that it's a feature?
