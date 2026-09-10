---
name: report
description: Write a printable report or one-pager that combines narrative, figures and small charts — the kind a colleague sends to a manager or a committee. Use for "raport lunar", "sinteză", "informare pentru conducere", "o pagină cu situația pe...", "material pentru ședință".
---

# Report / one-pager

A document, not a screen. Someone reads it top to bottom, prints it, or attaches it to an email.
The figures are there to support an argument — the argument comes first.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone, Romanian formats
- `../_common/input-data.md` — reading pasted figures, missing data, sensitive data
- `../_common/charts-svg.md` — small charts only; a report is not a dashboard
- `../_common/libra-base.css` — copy as `style.css`, then add the print block below
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Write the full document and put every assumption in `NOTE.md`.

## Plan

1. **Find the conclusion.** What should the reader do or know after reading? One sentence.
   It goes into the title and it opens the summary.
2. **Sort the material** into: what happened, the figures that show it, what caused it, what
   follows. Anything that fits nowhere goes into an annex or gets cut.
3. **Decide the length.** One page if the subject is one decision. Two to four sections if it is a
   monthly review. Never longer — extra material belongs in the annex table.
4. **Write the text first, the charts second.** Every chart must answer a question the text asked.
5. **Write the page**, then `NOTE.md`, then the final check.

## Document structure

```html
<div class="wrap report">
  <header class="head">
    <div>
      <p class="kicker">Raport lunar - Operațiuni</p>
      <h1>Timpul de soluționare a scăzut sub 3 zile pentru prima dată</h1>
    </div>
    <span class="period">august 2026</span>
  </header>

  <section class="summary card">
    <h2>Pe scurt</h2>
    <ul>
      <li>1.284 de cereri primite, cu 8% mai puține decât în iulie.</li>
      <li>Timpul mediu de soluționare: 2,8 zile (3,4 în iulie).</li>
      <li>Restanțele peste 10 zile au scăzut de la 46 la 12 cereri.</li>
    </ul>
  </section>

  <section class="section grid grid--4" aria-label="Indicatori">
    <article class="tile">...</article>
  </section>

  <section class="section">
    <h2>Ce s-a întâmplat</h2>
    <p>Două-trei paragrafe scurte. Fiecare afirmație cu cifra alături, nu într-o anexă.</p>
    <figure class="card">
      <svg viewBox="0 0 720 260" role="img" aria-labelledby="r1t r1d">...</svg>
      <figcaption>Scăderea începe în a doua săptămână, după redistribuirea cozii.</figcaption>
    </figure>
  </section>

  <section class="section">
    <h2>De ce</h2>
    <p>Cauzele, în ordinea importanței. Dacă o cauză e o presupunere, scrie că e o presupunere.</p>
  </section>

  <section class="section">
    <h2>Ce urmează</h2>
    <table>
      <caption>Acțiuni propuse</caption>
      <thead><tr><th scope="col">Acțiune</th><th scope="col">Cine</th><th scope="col">Până când</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </section>

  <section class="section annex">
    <h2>Anexă: cifrele complete</h2>
    <div class="table-wrap"><table>...</table></div>
  </section>

  <p class="foot-note">Generat la 10 sept. 2026. Ciornă generată automat. Echipa de dezvoltare
     o revizuiește înainte de publicare.</p>
</div>
```

Adapt the section names to the subject. "Ce s-a întâmplat / De ce / Ce urmează" is the default
skeleton, not a required form.

## Writing rules

- **The summary is self-sufficient.** A manager who reads only "Pe scurt" must be able to decide.
  Three to five bullets, each carrying a number.
- **The title states the finding.** "Timpul de soluționare a scăzut sub 3 zile", not
  "Raport operațiuni august".
- **Every claim carries its figure**, and every figure carries its comparison: previous period,
  target, or last year.
- **Separate fact from interpretation.** "Cererile au scăzut cu 8%" is a fact. "Probabil din cauza
  concediilor" is an interpretation — say so: "o explicație posibilă este...".
- **Short paragraphs**, 3-5 lines. Any list of more than three items becomes a real list.
- **No filler**: "în contextul actual", "se poate observa faptul că", "în mod evident".
- **What you do not know is written down**, not smoothed over: "nu avem cifre pentru sucursala Vest".

## Charts in a report

Small and few: at most one chart per section, `viewBox="0 0 720 260"` or smaller. Each one sits
right under the paragraph it illustrates, never in a gallery at the end. Everything else goes into
the annex as a table.

## Print

The report is printed. Add to `style.css`, beyond the base print block:

```css
@page { size: A4; margin: 16mm 14mm; }
@media print {
  .report h2 { break-after: avoid; }
  .summary, figure, table, .tile { break-inside: avoid; }
  .annex { break-before: page; }
}
```

Check mentally that no card is cut in half and that a table's header repeats on the next page.

## Done when

- The reader can stop after the summary and still know what to do.
- Every figure in the text appears in the annex table (or in the data received).
- Facts and interpretations are distinguishable.
- It prints on A4 with no clipped sections, and the annex starts on a new page.
- `NOTE.md` records the assumptions, the period, and what remains unverified.
