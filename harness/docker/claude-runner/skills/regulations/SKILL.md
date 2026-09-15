---
name: regulations
description: Build a page with the rules of an internal contest, activity or procedure — who may take part, the rules as numbered clauses, the period, how winners or outcomes are decided, prizes or consequences, deadlines, exceptions and who is responsible. Use for "regulament", "regulament de concurs", "regulament intern", "reguli de participare", "condiții de participare", "cine poate participa", "cum se aleg câștigătorii", "vreau regulamentul pentru tombolă", "procedură internă", "termeni și condiții".
---

# Regulation page

One page that states the rules of something: an internal contest, a tombola, a referral scheme, an
activity with conditions, a procedure colleagues must follow. A specialisation of `info-page` where
the page is **read adversarially** — by someone looking for the loophole, the missed deadline, the
case the rules forgot. Citable numbered clauses, exact dates and named exceptions outrank friendly
prose.

**Role:** Compliance & Legal Terms Parser

## Read first

- `../_common/libra-identity.md` — colors, typography, tone, Romanian date format
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check
- `../_common/input-data.md` — only if the description carries prize values, quotas or a table of criteria

You cannot ask questions. Every rule the description leaves open becomes a clearly marked example
clause, listed in `NOTE.md` as something the owner must confirm before publishing.

## Acceptance test (blocking)

Checked before a single line of markup is written, and verified again before delivery. A page that
fails any line below is not delivered.

- A version number and a "last updated" date appear at the top of the rules.
- A changelog section lists what changed, in which version, on what date — most recent first.
- Clauses are numbered so they can be cited in writing ("punctul 3.2").
- No "I accept" control that records nothing. If the description asks for one, leave it out and
  record the requirement in `NOTE.md` instead — in a bank, an acceptance that logs nowhere is worse
  than none, because it looks as if consent was captured when it was not.
- Dates are complete, including the closing hour where a deadline exists — never "până vineri" on
  its own.

## Plan

1. **Fix eligibility first.** Who may take part, and — just as important — who may not (organisers,
   jury, probation period, departments excluded). If the description is silent, write the narrow
   version and flag it.
2. **Number the rules.** Turn the description into an `<ol>` of clauses, one obligation per clause,
   so a colleague can write "conform punctului 3".
3. **Pin the period.** Start, end, and every intermediate deadline with a date, a year and an hour.
4. **State the decision mechanism.** How a winner or an outcome is determined: criteria, weights,
   tie-break, who decides, when it is announced.
5. **State what is won or what follows** — prizes, or the consequence of not respecting the rules.
6. **Collect the exceptions** into their own section: force majeure, missed deadline, withdrawal,
   disqualification, change of the regulation itself.
7. **Name the responsible person** and the version/date of the regulation.
8. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Regulament intern · Versiunea 1.0</p>
      <h1>Regulamentul concursului de idei „Libra Îmbunătățește”, 1-31 octombrie 2026</h1>
      <p>Condiții de participare, criterii de evaluare, premii și termene. În vigoare de la
         1 octombrie 2026.</p>
    </div>
    <span class="period">1-31 oct. 2026</span>
  </header>

  <div class="callout">
    <strong>Termen limită:</strong> propunerile se trimit până <strong>vineri, 31 octombrie 2026,
    ora 17:00</strong>. Propunerile primite după această oră nu se evaluează (punctul 12).
  </div>

  <section class="section">
    <h2>1. Cine poate participa</h2>
    <ul class="list">
      <li>Toți angajații Libra Bank cu contract pe perioadă nedeterminată, activi la 1 octombrie 2026.</li>
      <li>Participarea este individuală sau în echipe de maximum 3 persoane.</li>
      <li><strong>Nu pot participa:</strong> membrii juriului, echipa organizatoare (Resurse Umane)
          și colegii aflați în perioada de probă.</li>
    </ul>
  </section>

  <section class="section">
    <h2>2. Regulile concursului</h2>
    <ol class="list">
      <li>Fiecare participant poate trimite cel mult două propuneri.</li>
      <li>Propunerea se trimite pe adresa <a href="mailto:idei@libra.ro">idei@libra.ro</a>,
          într-un document de maximum două pagini.</li>
      <li>Propunerea trebuie să vizeze un proces intern al băncii și să fie aplicabilă în 12 luni.</li>
      <li>Propunerile deja implementate sau aflate în implementare nu sunt eligibile.</li>
      <li>O propunere trimisă în echipă se depune o singură dată, de un coordonator desemnat.</li>
    </ol>
  </section>

  <section class="section">
    <h2>3. Perioada și termenele</h2>
    <ul class="list">
      <li><strong>Depunerea propunerilor:</strong> 1 - 31 octombrie 2026, ora 17:00</li>
      <li><strong>Evaluarea juriului:</strong> 3 - 14 noiembrie 2026</li>
      <li><strong>Anunțarea câștigătorilor:</strong> luni, 17 noiembrie 2026</li>
    </ul>
  </section>

  <section class="section">
    <h2>4. Cum se aleg câștigătorii</h2>
    <p>Juriul acordă fiecărei propuneri un punctaj de la 1 la 10 pe fiecare criteriu:</p>
    <ul class="list">
      <li><strong>Impact asupra clientului</strong> - pondere 40%</li>
      <li><strong>Fezabilitate în 12 luni</strong> - pondere 35%</li>
      <li><strong>Cost de implementare</strong> - pondere 25%</li>
    </ul>
    <p>La punctaj egal, câștigă propunerea depusă mai întâi (data și ora e-mailului). Decizia
       juriului este finală.</p>
  </section>

  <section class="section">
    <h2>5. Premii</h2>
    <div class="card">
      <h3>Locul 1</h3>
      <p>Voucher de 2.000 lei și prezentarea ideii în ședința de management.</p>
    </div>
    <div class="card"><h3>Locurile 2 și 3</h3><p>Voucher de 1.000 lei pentru fiecare echipă.</p></div>
  </section>

  <section class="section">
    <h2>6. Excepții și situații speciale</h2>
    <ul class="list">
      <li><strong>Termen depășit:</strong> propunerile primite după 31 octombrie 2026, ora 17:00,
          se resping fără evaluare.</li>
      <li><strong>Retragere:</strong> un participant își poate retrage propunerea, în scris, până
          la 3 noiembrie 2026.</li>
      <li><strong>Descalificare:</strong> propunerea care încalcă punctele 3 sau 4 se elimină, iar
          participantul este anunțat pe e-mail.</li>
      <li><strong>Modificarea regulamentului:</strong> organizatorul poate modifica regulamentul,
          anunțând colegii pe intranet cu cel puțin 3 zile lucrătoare înainte.</li>
    </ul>
  </section>

  <section class="section contact card">
    <h2>Cine răspunde de regulament</h2>
    <p>Ana Popescu, Resurse Umane -
      <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a> · interior 215</p>
    <p>Regulament versiunea 1.0, în vigoare de la 1 octombrie 2026.</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Rules for writing rules

- **Every clause is numbered and citable.** Sections are numbered (`1.`, `2.`), clauses inside them
  live in an `<ol>`. Never a paragraph that hides three obligations; one obligation per clause.
- **Keep the numbers stable.** Do not renumber to tidy up; add at the end. A clause the colleagues
  already cite as "punctul 3" must stay punctul 3.
- **Exclusions are as explicit as inclusions.** "Nu pot participa: ..." is a required part of the
  eligibility section, even when the description only says who may.
- **Dates are complete and closing hours are stated**: "vineri, 31 octombrie 2026, ora 17:00".
  A deadline without an hour is an argument waiting to happen.
- **Quantify every limit**: how many entries per person, how many places, what the prize is worth,
  how long a decision takes. "Un număr limitat" is not a rule.
- **Name the decision maker and the tie-break.** Who decides, on what criteria, with what weights,
  and what happens at equal scores.
- **Exceptions get their own section**, not footnotes: missed deadline, withdrawal, disqualification,
  force majeure, and how the regulation itself may change.
- **No conditional or promotional language.** "Poate primi", "eventual", "în principiu" are removed:
  a rule either applies or does not. No superlatives, no persuasion — this is not a campaign page.
- **Version and effective date** in the kicker and repeated near the responsible person.
- **Anything the description did not settle** becomes a clause marked `[de confirmat]` in the page
  text and a line in `NOTE.md`. Never invent a prize value, a quota or a jury silently.

## What this template does not do

- It does not collect entries, votes or sign-ups — no `<form>`, no inputs; it names the channel where a submission goes, and a real form is the `form-page` template.
- It does not give legal validation: the text is a draft of an internal regulation, and Legal and Compliance must review it before publishing.
- It does not compute, rank or publish results; there is no data connection, so any score, quota or prize value on the page is the one written in the description.

## For the development team

The delivered page is a static draft: three files, no build step, no dependencies, nothing stored
and nothing logged.

Recommended rebuild stack: **Versioned document store, Date-fns (last updated timestamps)**.

The rebuild needs a versioned document store and a real acceptance log capturing who accepted which
version and when — that log is the precondition for any "Accept Terms" control existing at all. The
version, the "last updated" date, the changelog and the citable clause numbers must all survive, as
must complete dates with closing hours.

Copy the stack and these constraints into `NOTE.md`, under its "For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- Eligibility, deadline and decision mechanism are readable without scrolling twice.
- Every rule is a numbered clause that can be cited as "punctul N".
- Every date has day, month, year, and an hour where something closes.
- The exceptions section covers missed deadline, withdrawal, disqualification and change of the rules.
- One named responsible person with a working `mailto:`, plus a version and effective date.
- No personal, financial or medical data is requested or displayed anywhere on the page.
- `NOTE.md` lists every clause marked `[de confirmat]`, the assumed dates and the Legal review needed.
