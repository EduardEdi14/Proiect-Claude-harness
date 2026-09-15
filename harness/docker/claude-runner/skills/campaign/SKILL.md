---
name: campaign
description: Build a page for a time-bound internal campaign — a green week, a blood drive, a wellbeing month, a donation or volunteering drive: goal, period with start and end dates, how a colleague takes part, locations and the person responsible. Use for "campanie internă", "campanie de donare de sânge", "săptămâna verde", "luna wellbeing", "strângem donații", "vreau o pagină de campanie", "acțiune de voluntariat", "ne înscriem până la".
---

# Campaign page

One page for a campaign that starts and ends: what we are doing, between which dates, what the
colleague does to take part, where, and who answers questions. A specialisation of `info-page`
where **time is the spine of the page** — the period and the deadline to join outrank everything.

**Role:** Campaign & Attribution Handler

## Read first

- `../_common/libra-identity.md` — colors, typography, tone, Romanian date format
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check
- `../_common/input-data.md` — only if the description carries a target figure or a list of locations

You cannot ask questions. Missing dates, locations or owners become clearly marked example text,
listed in `NOTE.md` as things the colleague must confirm.

## Acceptance test (blocking)

Check these before you write any markup and again before you deliver; a page that fails one line
is not delivered.

- The campaign name and its exact start and end dates appear in the header.
- The deadline to join is stated in full and repeated in the callout.
- Any sign-up or "find out more" link carries a campaign identifier in its query string, so the
  destination knows which campaign sent the colleague.
- `NOTE.md` names that parameter and its value.
- The page sends nothing and promises no e-mail: no form, and no mail client link presented as a
  submission.

## Plan

1. **Fix the period first.** Start date, end date, and the deadline to sign up. If the description
   gives only a month ("în octombrie"), pick a concrete range, mark it as an assumption in
   `NOTE.md`, and keep the format "12-16 octombrie 2026".
2. **Write the goal in one sentence.** Why the campaign exists and, if there is a target ("500 de
   litri", "30 de voluntari"), put the number in that sentence.
3. **Turn participation into steps.** What the colleague actually does, as an `<ol>`. Not "te
   implici" — "te înscrii, primești ora, vii la parter cu legitimația".
4. **List logistics**: locations, floors, hours, what to bring.
5. **Name the owner** — one person, one department, one `mailto:`.
6. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Campanie internă · Responsabilitate socială</p>
      <h1>Donăm sânge: campanie Libra Bank, 5-9 octombrie 2026</h1>
      <p>Ne-am propus 60 de donatori din toate sediile. Înscrierile se închid joi, 1 octombrie.</p>
    </div>
    <span class="period">5-9 oct. 2026</span>
  </header>

  <div class="callout">
    <strong>Ce trebuie să faci:</strong> te înscrii până <strong>joi, 1 octombrie 2026, ora
    17:00</strong>, pe formularul trimis de Resurse Umane. Locurile sunt limitate la 12 pe zi.
  </div>

  <section class="section">
    <h2>Scopul campaniei</h2>
    <p>Un paragraf: ce urmărim și de ce acum. Dacă există o țintă, apare aici ca număr.</p>
  </section>

  <section class="section">
    <h2>Perioada și termenele</h2>
    <ul class="list">
      <li><strong>Înscrieri:</strong> 22 septembrie - 1 octombrie 2026</li>
      <li><strong>Desfășurare:</strong> luni 5 - vineri 9 octombrie 2026, 09:00-13:00</li>
      <li><strong>Anunțarea rezultatelor:</strong> vineri, 16 octombrie 2026</li>
    </ul>
  </section>

  <section class="section">
    <h2>Cum participi</h2>
    <ol class="list">
      <li>Te înscrii pe formular și alegi ziua.</li>
      <li>Primești pe e-mail intervalul orar confirmat.</li>
      <li>Vii la punctul mobil cu buletinul; ziua de donare este liberă.</li>
    </ol>
  </section>

  <section class="section">
    <h2>Unde și ce aduci</h2>
    <div class="card">
      <h3>Sediul central, Splaiul Independenței</h3>
      <p>Parter, sala de training 2 · 09:00-13:00 · luni-vineri</p>
    </div>
    <div class="card">
      <h3>Sucursala Timișoara</h3>
      <p>Etaj 1, sala de ședințe · 09:00-12:00 · doar miercuri, 7 octombrie</p>
    </div>
    <div class="placeholder" role="img" aria-label="Loc pentru harta punctelor de colectare">
      imagine: harta punctelor din sediul central (de adăugat)
    </div>
  </section>

  <section class="section contact card">
    <h2>Cu cine vorbești</h2>
    <p>Ana Popescu, Resurse Umane -
      <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a> · interior 215</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Campaign rules

- **Every date is complete**: day name + day + month + year, and an hour when a deadline closes:
  "joi, 1 octombrie 2026, ora 17:00". Never "până joi".
- **The `.period` badge in the header** carries the campaign range in short form and is the one
  thing a reader scanning at speed sees.
- **The deadline to join appears twice**: in the header sentence and in the `.callout`. If the page
  runs past four sections, repeat it in a closing callout.
- **Participation is an `<ol>`**, one action per step, in the order the colleague performs them.
- **One location per `.card`**, each with address/floor, hours and days. Do not merge locations
  into a paragraph.
- **A target figure stays a figure** ("60 de donatori"), and progress against it is text or a
  simple hand-written SVG bar only if the description supplies real numbers — otherwise omit it.
- **No health data, ever.** A blood-drive or wellbeing page never asks for or shows medical
  conditions, eligibility answers, weight, CNP or any personal identifier — it points to the
  official channel instead. Same for account numbers, card data and salary.
- **Voluntary participation is stated as such** where the campaign touches personal choice:
  "participarea este voluntară".
- **Images**: none available offline. Use a `.placeholder` box with descriptive text and record in
  `NOTE.md` what belongs there.

## What this template does not do

- It does not collect sign-ups — no `<form>`, no inputs. It links to or names the sign-up channel; a real form is the `form-page` template.
- It does not track live progress towards the target: there is no data connection, so any figure on the page is the one written in the description.
- It does not send reminders, invitations or calendar entries; it is a static page the development team publishes.

## For the development team

The delivered page is a static draft: it collects nothing, sends nothing and tracks nothing.

Recommended rebuild stack: `React Hook Form, UTM parser utilities, Resend / React-Email`.

What must still hold after the rebuild: the campaign parameter must be captured from the URL and
persisted on submission, so attribution is not lost; and campaign e-mail belongs to the real
backend, never to the page.

Copy both the stack and these constraints into `NOTE.md`, under its "For the development team"
heading.

## Done when

- Every line of the acceptance test passes.
- The period and the sign-up deadline are readable from the header alone.
- "Cum participi" is a numbered list a colleague can follow without asking anything.
- Every location has floor, days and hours.
- One named owner with a working `mailto:` link.
- No health, identity or financial data appears or is requested anywhere on the page.
- `NOTE.md` lists assumed dates, unconfirmed locations and image placeholders.
