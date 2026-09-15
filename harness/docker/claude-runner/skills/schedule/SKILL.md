---
name: schedule
description: Build an agenda or programme page for something that runs over time slots — a training day, a conference, a workshop, a rota: time-slot table, what happens, who leads it and where. Use for "agendă", "program", "programul zilei de training", "orarul conferinței", "planificare pe intervale orare", "grafic de prezență".
---

# Schedule page

One event or one period, broken into time slots. The reader either follows it live on a phone or
prints it and carries it around, so the time column is the spine of the page and everything else
hangs off it.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/input-data.md` — the slots almost always arrive as a pasted table; read it
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Fill in what is missing with clearly marked example text and record it
in `NOTE.md`.

## Plan

1. **Establish the axis.** One day split into hours, several days, or a rota over weeks? One day →
   one table. Several days → one `<section>` with its own table per day, plus a day index at the top.
2. **Normalise every slot** to `HH:MM-HH:MM` and sort ascending. Fill gaps: a hole between two
   slots becomes an explicit break row, not blank space.
3. **Decide whether tracks exist.** If two sessions share a start time, the programme is parallel —
   mark it and add a legend. If not, do not invent tracks.
4. **Check the columns.** Ora, Ce se întâmplă, Cine susține, Unde. Drop a column only if it is empty
   for every slot; never leave a column half-filled without marking the gaps with "—".
5. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Program</p>
      <h1>Ziua de training Creditare IMM - 8 octombrie 2026</h1>
      <p>Sala Mare, etaj 1, sediul central. Începem la 09:00, terminăm la 16:30.</p>
    </div>
    <span class="period">joi, 8 oct. 2026 - 09:00-16:30</span>
  </header>

  <div class="callout">
    <strong>De reținut:</strong> sesiunile marcate <span class="badge badge--warn">paralel</span>
    se desfășoară în același timp - alegi una singură și te înscrii până la 3 octombrie 2026.
  </div>

  <div class="legend" aria-label="Legendă trasee">
    <span><i style="background:var(--s1)"></i> Traseu A - analiză de credit</span>
    <span><i style="background:var(--s2)"></i> Traseu B - relația cu clientul</span>
    <span><i style="background:var(--line-strong)"></i> Comun - toți participanții</span>
  </div>

  <section class="section">
    <h2>Programul zilei</h2>
    <div class="table-wrap">
      <table>
        <caption>Ziua de training Creditare IMM, joi 8 octombrie 2026, ora României (EEST)</caption>
        <thead>
          <tr>
            <th scope="col">Ora</th>
            <th scope="col">Ce se întâmplă</th>
            <th scope="col">Cine susține</th>
            <th scope="col">Unde</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">09:00-09:15</th>
            <td>Deschidere și obiectivele zilei <span class="badge">comun</span></td>
            <td>Mihai Stoica, director Creditare IMM</td>
            <td>Sala Mare</td>
          </tr>
          <tr class="is-break">
            <th scope="row">10:45-11:00</th>
            <td colspan="3">Pauză de cafea - foaier etaj 1</td>
          </tr>
          <tr>
            <th scope="row">11:00-12:30</th>
            <td>Studiu de caz: firmă cu istoric neregulat
              <span class="badge badge--warn">paralel - traseu A</span></td>
            <td>Elena Radu</td>
            <td>Sala Mare</td>
          </tr>
          <tr>
            <th scope="row">11:00-12:30</th>
            <td>Discuția cu clientul despre garanții
              <span class="badge badge--warn">paralel - traseu B</span></td>
            <td>Andrei Munteanu, Resurse Umane</td>
            <td>Sala 1.04</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section contact card">
    <h2>Organizare și înscrieri</h2>
    <p>Ioana Dinu, Învățare și Dezvoltare -
      <a href="mailto:training@libra.ro">training@libra.ro</a> - int. 4127</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Time, slots and tracks

- **One format everywhere**: `HH:MM-HH:MM`, 24-hour, with a hyphen and no spaces. Never "9-10:30",
  never "9 AM", never a start time without an end time.
- **Say which time zone** once, in the `<caption>` or the intro: "ora României". It matters for
  colleagues joining online from another country.
- **Full dates with the weekday**: "joi, 8 octombrie 2026". A multi-day programme repeats the full
  date in each day's `<h2>` — "Ziua 2" alone is not enough on a printed page.
- **Parallel sessions**: same start time on consecutive rows, each carrying a visible badge naming
  the track. Colour from the legend is never the only cue — the badge text says the track too.
- **Legend only when tracks exist**, in a `.legend` above the table, with one entry per track plus
  one for the common sessions.
- **Breaks and meals are rows**, marked with a `colspan` row as in the skeleton, so the reader can
  see the day is continuous.
- **Empty cell** is "—", never blank; an unconfirmed speaker is "de confirmat" and goes into
  `NOTE.md`. Pasted figures follow `../_common/input-data.md` for the Romanian number format.

## Printing

People print an agenda and carry it, so the print result is part of the deliverable:

- `@media print`: white background, no shadows, `font-size: 10.5pt`, and the table left at full width.
- `thead { display: table-header-group }` so the header row repeats on a second page, and
  `tr { break-inside: avoid }` so no slot is cut in half.
- One day per printed page where there are several: `break-before: page` on each day `<section>`
  after the first.
- Badges must survive without colour: keep the text, add a thin border in print.
- Check the page at 400px too — the table scrolls inside `.table-wrap`, the header does not break.

## What this template does not do

- It is not a booking or sign-up system. There is no registration form and no seat counter; the page
  links the existing channel in words and the request goes into `NOTE.md`.
- It does not generate calendar files, invitations or reminders — no `.ics`, no e-mail, no live
  "happening now" highlight, because the page is static and offline.
- It does not publish participant lists or anything personal about attendees: only the names and
  work roles of the people leading a session, never contact details of the audience, CNP, or any
  medical or salary information.

## Done when

- Every slot has a start and an end time in `HH:MM-HH:MM`, sorted, with no unexplained gaps.
- The time zone and the full date with weekday appear on the page.
- Parallel sessions are unmistakable from the text alone, and the legend matches the badges.
- Breaks appear as their own rows.
- Ctrl+P gives a legible one-or-two-page agenda with a repeated header and no slot split across pages.
- The table has a `<caption>`, `<th scope="col">` headers and the time cell as `<th scope="row">`.
- `NOTE.md` lists unconfirmed speakers, rooms, times and any slot invented as an example.
