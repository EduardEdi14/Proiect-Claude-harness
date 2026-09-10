---
name: chart
description: Turn a set of figures into one well-made chart (or a small set) on a page that explains what it shows. Use when the colleague asks for a "grafic", "diagramă", "vreau să văd evoluția / comparația / structura", or pastes a table and wants it visualized.
---

# Chart from data

One chart, made properly, with the sentence that explains it. This is the template for "I have
these numbers, show them to me" — not a dashboard, not a report: the figures and their reading.

## Read first

- `../_common/charts-svg.md` — the whole craft: forms, coordinates, formulas, accessibility
- `../_common/input-data.md` — parsing pasted figures, Romanian number format, missing values
- `../_common/libra-identity.md` — palette and tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Choose, build, and record every choice in `NOTE.md`.

## Plan

1. **Parse the data** into a clean table in your head: labels, one or more series, a period.
   Note the unit (lei, cereri, %, persoane) — it goes on the axis and in the caption.
2. **Name the message.** What does this data say? "Vânzările cresc constant din aprilie",
   "Trei sucursale fac jumătate din volum". That sentence becomes the `<h1>`.
3. **Pick the form from the message**, using the table in `charts-svg.md` section 1 — comparison
   goes to bars, time to columns or a line, composition to a 100% stacked bar or a donut. The
   message decides, not the shape of the source table.
4. **Draw it.** Round axis maximum, grid, labels, values. Do the arithmetic explicitly before
   writing coordinates.
5. **Add the reading**: caption below the chart, the data table under it, `NOTE.md`.

## Page structure

```html
<div class="wrap">
  <header class="head">
    <div>
      <h1>Cererile cresc constant din aprilie</h1>
      <p>Cereri primite lunar, în unități.</p>
    </div>
    <span class="period">ian. – iun. 2026</span>
  </header>

  <div class="card">
    <figure>
      <svg viewBox="0 0 720 320" role="img" aria-labelledby="c1t c1d">
        <title id="c1t">Cereri primite lunar, ianuarie-iunie 2026</title>
        <desc id="c1d">Coloane lunare, de la 276 în februarie la 512 în iunie.</desc>
        ...
      </svg>
      <figcaption>Creșterea din aprilie coincide cu deschiderea sucursalei din Cluj.</figcaption>
    </figure>
    <div class="legend">...</div>   <!-- only with more than one series -->
  </div>

  <section class="section">
    <h2>Cifrele din spatele graficului</h2>
    <div class="card"><div class="table-wrap">
      <table>
        <caption>Cereri primite pe lună</caption>
        <thead><tr><th scope="col">Luna</th><th scope="col" class="num">Cereri</th></tr></thead>
        <tbody>...</tbody>
        <tfoot><tr><td>Total</td><td class="num">2.108</td></tr></tfoot>
      </table>
    </div></div>
  </section>

  <p class="foot-note">...</p>
</div>
```

If the colleague asked for several charts, each one gets its own `.card` and its own `<h2>`, and
the page reads top to bottom as an argument — not as a wall of charts.

## Decisions you make without asking

| Situation | What you do |
|---|---|
| More than 12 categories | Keep the top 10, group the rest into "Altele", say so in the caption |
| They asked for a pie with 8 slices | Draw a 100% stacked bar or horizontal bars; explain the swap in `NOTE.md` |
| Series in different units (lei and %) | Two separate charts, one above the other. Never a second Y axis |
| Values differing by orders of magnitude | Horizontal bars, values written at the end of each bar |
| A single value | No chart. One big number and a sentence |
| Only two points in time | No line. Two columns, plus the difference written out |
| Missing months | Break the line, mark the gap in the caption. Never interpolate silently |
| Percentages that add to 99,8 | Fix the rounding on the largest slice and mention it in a note |

## Anti-patterns

- A truncated Y axis on columns — always start at zero. On a line chart it is allowed, but say so.
- Chart junk: 3D, shadows, gradients, background images, a border around the plot area.
- A legend for a single series.
- Colors that carry no meaning (a rainbow across categories that are all the same thing).
- A title that names the category ("Grafic vânzări") instead of the finding.
- Precision no one needs: `1.284,3921 lei` on an axis.

## Done when

- The `<h1>` states the finding, the caption explains the exception.
- The axis maximum is round; the grid has 4-5 lines; the labels do not overlap.
- All the data is also present as a table.
- The chart scales at 400px wide (`viewBox` + `width:100%`) with no horizontal scroll.
- `NOTE.md` records the chosen form and why, plus any grouping or rounding you did.
