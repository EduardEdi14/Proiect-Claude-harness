---
name: dashboard
description: Build a one-screen indicator dashboard (KPI tiles, charts, a short table) from figures a business colleague described or pasted. Use when they ask for a "tablou de bord", "dashboard", "raport vizual", "situație pe luna", "cum stăm cu…", or want several numbers watched in one place.
---

# Dashboard of indicators

A single screen answering "how are we doing?" — a colleague opens it, and in ten seconds knows
whether things are fine and where to look if they are not.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone, Romanian number formats
- `../_common/input-data.md` — how to read pasted figures, what to do when there are none
- `../_common/charts-svg.md` — every chart is hand-written SVG; no library exists here
- `../_common/libra-base.css` — copy it as `style.css`, then append page-specific rules
- `../_common/delivery.md` — deliverables (`index.html`, `style.css`, `NOTE.md`) and the final check

You run non-interactively: **you cannot ask questions**. Decide, build the whole page, and write
every assumption into `NOTE.md`.

## Plan

1. **Find the question.** What decision does this dashboard serve? Write it down in one sentence —
   it becomes the `<h1>`. "Cererile de credit în trimestrul 3", not "Dashboard".
2. **Extract the data.** Every figure in the description, with its label and period. If there are
   none, invent plausible ones and mark them (see `input-data.md`, point 6).
3. **Choose 3–5 headline indicators.** Not more. A dashboard with twelve tiles is a table.
   Each tile: what it measures, current value, comparison, direction.
4. **Choose 2–4 charts**, each answering one sub-question. Pick the form from
   `charts-svg.md`, section 1.
5. **Write the page**, then `NOTE.md`, then walk the delivery check.

## Page structure

```html
<body>
<div class="wrap">
  <header class="head">
    <div>
      <h1>Cererile de credit au scăzut cu 8% în trimestrul 3</h1>
      <p>Sursa: cifrele transmise de echipa Operațiuni. Actualizat manual.</p>
    </div>
    <span class="period">1 iul. – 30 sept. 2026</span>
  </header>

  <!-- only when the figures are invented -->
  <p class="callout"><strong>Date exemplu.</strong> …</p>

  <!-- 1. the headline numbers -->
  <section class="grid grid--4" aria-label="Indicatori principali">
    <article class="tile">
      <div class="label">Cereri primite</div>
      <div class="value">1.284</div>
      <div class="delta delta--down">↓ 8,2% față de trim. 2</div>
      <div class="foot">1.399 în trimestrul anterior</div>
    </article>
    …
  </section>

  <!-- 2. how it evolved -->
  <section class="section">
    <h2>Evoluție lunară</h2>
    <div class="card">
      <figure>
        <svg viewBox="0 0 720 320" role="img" aria-labelledby="c1t c1d">…</svg>
        <figcaption>Vârful din august vine din campania de refinanțare.</figcaption>
      </figure>
    </div>
  </section>

  <!-- 3. the breakdown: two charts side by side -->
  <section class="section grid grid--2">
    <div class="card">…</div>
    <div class="card">…</div>
  </section>

  <!-- 4. the detail, for whoever wants the numbers -->
  <section class="section">
    <h2>Cifrele pe sucursale</h2>
    <div class="card"><div class="table-wrap"><table>…</table></div></div>
  </section>

  <p class="foot-note">Generat la 10 sept. 2026. Ciornă generată automat. Echipa de dezvoltare
     o revizuiește înainte de publicare.</p>
</div>
</body>
```

## Rules specific to a dashboard

**A number alone means nothing.** Every tile carries a comparison: previous period, target, or the
same period last year. If there is nothing to compare against, say so ("prima măsurare") instead of
leaving the tile bare.

**Direction, not just color.** `↑ 12,4%` in green, `↓ 8,2%` in red — but a rise is not always good.
For "reclamații", a rise is bad: use `delta--down`/`delta--up` by *meaning*, and say it in words
in the `foot` line.

**Order by attention.** Top-left is the most important indicator. The reading order is the
importance order, not the order of the columns in the source table.

**One idea per chart.** If a chart needs a paragraph of explanation, split it in two.

**Density.** 3–5 tiles, 2–4 charts, at most one detail table. Everything else goes into `NOTE.md`
as a suggestion for a later version.

**Numbers in tiles are rounded** to what the reader can hold: `1.284`, `12,4%`, `3,2 mil. lei`.
Full precision belongs in the table.

**Every chart gets a caption** that says what it shows, in words. That caption is often the most
useful line on the page.

## What this template does not do

- It does not connect to a system. The data is what the colleague pasted; the page is static.
  Say this in the source note under the title.
- No live refresh, no date filters, no login. If the description asks for them, build the static
  version and record the request in `NOTE.md`, under "For the development team".
- No client-level personal data (see `input-data.md`, point 7).

## Done when

- The `<h1>` states a conclusion; a colleague who reads only the title and the tiles has the answer.
- Every tile has a value, a comparison, and a unit.
- Every chart has `<title>`, `<desc>`, a caption, and its data reachable as text.
- The page holds together at 400px wide and prints on one or two A4 pages.
- `NOTE.md` lists the assumptions, the source of every figure, and what the developer must verify.
