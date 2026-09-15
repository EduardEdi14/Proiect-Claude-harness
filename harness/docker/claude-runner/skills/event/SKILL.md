---
name: event
description: Build a page for one internal event — a conference, a team building, a town hall, a training day: what, when and where at the top, the hour-by-hour programme, practical details (transport, ținută, mese) and contact. Use for "pagină de eveniment", "team building", "conferință internă", "town hall", "ședință generală", "agenda evenimentului", "program pe ore", "ne vedem la", "zi de training".
---

# Event page

One page for one event. A specialisation of `info-page` whose spine is **the programme**: what /
when / where sits above everything, then the hour-by-hour agenda, then the practical details
someone needs the evening before.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone, Romanian date and hour format
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Missing hours, speakers or addresses become clearly marked example text,
listed in `NOTE.md` for the colleague to confirm.

## Plan

1. **Answer what / when / where in the header.** Event name, date with day name, hours, and the
   full address or room. Nothing else goes above it.
2. **Build the programme as a table**, one row per slot: hour range, what happens, who leads it.
   Include breaks and meals — they are the rows people actually look for.
3. **Collect the practical details**: how to get there, parking, dress code, meals and dietary
   options, what to bring, what happens if it rains (for anything outdoors).
4. **Point to the sign-up**, do not build it. Name the channel and the deadline.
5. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Eveniment intern · Team building</p>
      <h1>Team building Libra: vineri, 17 octombrie 2026, Complex Bran</h1>
      <p>09:00-18:00 · plecare cu autocarul de la sediul central, Splaiul Independenței 15.</p>
    </div>
    <span class="period">17 oct. 2026 · 09:00</span>
  </header>

  <div class="callout">
    <strong>Înscrierile</strong> se fac pe formularul trimis de Resurse Umane, până
    <strong>luni, 13 octombrie 2026, ora 12:00</strong>. Locurile în autocar sunt limitate la 48.
  </div>

  <section class="section">
    <h2>Programul zilei</h2>
    <div class="table-wrap">
      <table>
        <caption>Programul detaliat pentru vineri, 17 octombrie 2026</caption>
        <thead>
          <tr>
            <th scope="col">Ora</th>
            <th scope="col">Ce se întâmplă</th>
            <th scope="col">Cine susține</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>08:30-09:00</td><td>Îmbarcare în autocar, sediul central</td><td>Administrativ</td></tr>
          <tr><td>09:00-11:00</td><td>Deplasare spre Bran</td><td>-</td></tr>
          <tr><td>11:00-11:30</td><td>Cafea și primire</td><td>-</td></tr>
          <tr><td>11:30-13:00</td><td>Sesiune de deschidere: obiectivele 2027</td><td>Directorul general</td></tr>
          <tr><td>13:00-14:00</td><td>Prânz</td><td>-</td></tr>
          <tr><td>14:00-17:00</td><td>Activități pe echipe, în aer liber</td><td>Echipa de facilitatori</td></tr>
          <tr><td>17:00-18:00</td><td>Concluzii și plecare spre București</td><td>Resurse Umane</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section">
    <h2>Detalii practice</h2>
    <div class="card">
      <h3>Transport</h3>
      <p>Autocar de la sediul central, plecare fixă la 09:00. Cine vine cu mașina personală
        anunță la Administrativ; parcarea complexului are 20 de locuri.</p>
    </div>
    <div class="card">
      <h3>Ținuta</h3>
      <p>Lejeră și încălțăminte comodă - activitățile sunt în aer liber. O jachetă subțire este
        utilă; în caz de ploaie, activitățile se mută în sala mare.</p>
    </div>
    <div class="card">
      <h3>Mese</h3>
      <p>Prânz și două pauze de cafea, incluse. Opțiunile vegetariene se anunță în formularul
        de înscriere.</p>
    </div>
    <div class="placeholder" role="img" aria-label="Loc pentru harta de acces către locație">
      imagine: harta de acces spre Complex Bran (de adăugat)
    </div>
  </section>

  <section class="section contact card">
    <h2>Cu cine vorbești</h2>
    <p>Ana Popescu, Resurse Umane -
      <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a> · interior 215.
      În ziua evenimentului: 07xx xxx xxx (de completat).</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Event rules

- **What / when / where in the first screen.** Header holds the event name with the date, the hour
  range, and the meeting point with a real address or room number. The `.period` badge repeats the
  date and start hour.
- **Programme is a table, not a list.** Columns: hour, what, who. Hours as `09:00-11:00` (24-hour,
  hyphen), rows in chronological order, no gaps between slots.
- **Breaks, meals and travel time get their own rows.** A programme that jumps from 11:30 to 17:00
  is not a programme.
- **Each practical detail is its own `.card`** with a heading a reader can scan for: Transport,
  Ținuta, Mese, Ce aduci, Plan B în caz de ploaie. Omit a card rather than filling it with guesses.
- **Sign-ups belong to `form-page`.** This page mentions the sign-up channel and its deadline in
  the `.callout` and stops there — no `<form>`, no inputs, no "confirmă participarea" button.
- **Dietary or accessibility needs are collected elsewhere.** The page says where to state them;
  it never displays anyone's medical, dietary or personal details, and never asks for CNP, ID
  data, account or card numbers.
- **Every hour and date is complete**: "vineri, 17 octombrie 2026, ora 09:00". A departure hour is
  marked as fixed if it is.
- **A day-of contact** (phone or channel) goes in the contact card, because the page is read while
  someone is already late. If none is given, leave "(de completat)" and note it.
- **Images and maps**: none available offline. Use a `.placeholder` box and record in `NOTE.md`
  what the developer must insert.

## What this template does not do

- It does not take sign-ups or confirmations — no form and no inputs; it links to the sign-up, which is the `form-page` template.
- It does not create calendar invitations, reminders or attendee lists; it is a static page the development team publishes.
- It does not cover a recurring series or a multi-event programme — one page is one event; a recurring programme goes on separate pages.

## Done when

- Name, date, hour range and meeting point are readable from the header alone.
- The programme table is continuous, in order, and includes breaks, meals and travel.
- Practical details answer transport, dress code and meals, each in its own card.
- The sign-up channel and its deadline appear in the callout; no form is present.
- A contact for the day of the event exists, or is marked as to be completed.
- `NOTE.md` lists assumed hours, unconfirmed addresses and image placeholders.
