---
name: benefits
description: Build a page explaining employee benefits — one block per benefit answering the same three questions: what it is, who is eligible, how you access it. Use for "pachetul de beneficii", "beneficii pentru angajați", "ce beneficii avem", "abonament medical, tichete, zile libere", "pagină cu beneficiile Libra".
---

# Benefits page

The benefits a colleague has, one block each, every block answering the same three questions in the
same order. The value of the page is the repetition: the reader learns the shape once and then
compares benefits by scanning the same three positions.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/input-data.md` — for amounts, limits and waiting periods placed in a table
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Fill in what is missing with clearly marked example text and record it
in `NOTE.md`.

## Plan

1. **List the benefits** the description mentions, one per block. Group them only if there are more
   than eight, into two or three named groups ("Sănătate", "Timp liber", "Bani și economii").
2. **For each one, fill the same three slots**: *Ce este*, *Cine are dreptul*, *Cum îl accesezi*.
   A benefit whose three slots cannot all be filled still gets all three headings, with the missing
   one written as "De confirmat cu HR" and listed in `NOTE.md`.
3. **Order by how many colleagues it touches** — the medical subscription before the sabbatical.
4. **Add the comparison table** if there are more than five benefits: one row per benefit, columns
   *Beneficiu*, *Cine are dreptul*, *De când*. It sits after the intro and links to the blocks.
5. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Resurse Umane</p>
      <h1>Pachetul de beneficii Libra Bank</h1>
      <p>Fiecare beneficiu răspunde la aceleași trei întrebări: ce este, cine are dreptul,
        cum îl accesezi.</p>
    </div>
    <span class="period">Valabil din 1 ianuarie 2026</span>
  </header>

  <div class="callout">
    <strong>Ce trebuie să faci:</strong> îți alegi beneficiile flexibile o dată pe an, în platforma
    de beneficii, până la 31 ianuarie 2026.
  </div>

  <section class="section">
    <h2>Abonament medical</h2>
    <div class="card">
      <h3>Ce este</h3>
      <p>Abonament la o rețea privată de clinici, cu consultații la medicul de familie și la
        specialiști, analize de rutină și un control anual.</p>
      <h3>Cine are dreptul</h3>
      <p>Toți colegii cu contract pe perioadă nedeterminată, din prima zi de lucru. Colegii cu
        contract pe perioadă determinată: după 3 luni. Nu include membrii familiei, dar aceștia pot
        fi adăugați contra cost.</p>
      <h3>Cum îl accesezi</h3>
      <ol class="list">
        <li>Primești cardul de abonat pe e-mail, în prima săptămână.</li>
        <li>Îți faci programare direct la clinică, cu numele și angajatorul.</li>
        <li>Pentru schimbarea clinicii: <a href="mailto:beneficii@libra.ro">beneficii@libra.ro</a>.</li>
      </ol>
    </div>
  </section>

  <!-- același bloc, aceleași trei titluri, pentru fiecare beneficiu -->

  <section class="section">
    <h2>Pe scurt, toate beneficiile</h2>
    <div class="table-wrap">
      <table>
        <caption>Beneficiile din pachetul standard, valabile din 1 ianuarie 2026</caption>
        <thead>
          <tr>
            <th scope="col">Beneficiu</th>
            <th scope="col">Cine are dreptul</th>
            <th scope="col">De când</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Abonament medical</th>
            <td>Contract nedeterminat</td>
            <td>Prima zi de lucru</td>
          </tr>
          <tr>
            <th scope="row">Zile libere suplimentare</th>
            <td>Toți colegii</td>
            <td>După 6 luni</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section contact card">
    <h2>Cu cine vorbești</h2>
    <p>Echipa de beneficii, Resurse Umane -
      <a href="mailto:beneficii@libra.ro">beneficii@libra.ro</a> - int. 4105</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## The same three questions, every time

- **Identical headings, identical order**, in every block: `Ce este`, `Cine are dreptul`,
  `Cum îl accesezi`. No renaming, no reordering, no fourth heading on one block only.
- **No block is skipped.** A missing answer is written "De confirmat cu HR" under its own heading —
  never dropped, because a missing heading breaks the comparison.
- **"Cum îl accesezi" is steps, not description.** Two to four steps as an `<ol class="list">`, each
  naming who does what and where. If it is a single action, one sentence is enough.
- **Amounts and limits** go where they belong, in the honest form the description gives them, using
  the Romanian number format from `../_common/input-data.md` ("1.200 lei/an", not "1200 RON").
  If no amount was given, write "valoarea se comunică anual de HR" — do not invent one.
- **Benefit names as `<h2>`**, the three questions as `<h3>` inside the `.card`. One `<h1>` only.

## Eligibility and privacy

- **State eligibility honestly and completely**, including the exclusions: contract type, waiting
  period, part-time, probation, whether family members are covered. A benefit that looks universal
  when it is not causes more tickets than it saves.
- **Never write "toți angajații"** unless the description actually says so. Otherwise name the
  condition, or write "De confirmat cu HR".
- **Never display sensitive personal data**, even when the description contains it: no salary,
  grade or bonus figures, no CNP, no account, card or IBAN numbers, no medical diagnoses, absence
  records or named individual cases. Remove them and say in `NOTE.md` that they were removed and why.
  The medical benefit describes the *coverage* ("analize de rutină incluse"), never anyone's health.

## What this template does not do

- It is not the benefits regulation or a contract. It explains the package in plain words, states
  that the official document prevails, and links it by name — it never reproduces legal text.
- It does not calculate anything personal: no net value of the package, no salary simulation, no
  per-person entitlement, because the page is static and holds no personal data.
- It does not enrol anyone. There is no form and no platform connection; the page points to the
  existing channel and the request goes into `NOTE.md` under "For the development team".

## Done when

- Every benefit block has exactly the three headings, in the same order, with all three filled or
  explicitly marked "De confirmat cu HR".
- Eligibility names the contract type and the waiting period; no unearned "toți angajații".
- "Cum îl accesezi" tells the reader what to do first.
- A comparison table is present if there are more than five benefits, with a `<caption>` and
  `<th scope="col">` headers.
- No salary, medical, CNP or account data anywhere on the page.
- The page says the official document prevails and the footer marks it as a draft.
- `NOTE.md` lists unconfirmed amounts and eligibility rules, and everything removed for privacy.
