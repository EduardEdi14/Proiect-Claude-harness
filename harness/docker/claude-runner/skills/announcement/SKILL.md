---
name: announcement
description: Build a page that announces an internal change — a new policy, a changed procedure, a rule about the office or the working schedule: what changes, from which date, what is different from before, what the employee must do, and an FAQ. Use for "anunț intern", "se schimbă procedura", "de la 1 noiembrie", "politică nouă", "regulă nouă în birou", "informare pentru toți angajații", "ce se modifică", "intră în vigoare".
---

# Announcement page

One page that says something is changing. A specialisation of `info-page` for change only: the
reader's first question is always **"mă afectează și până când trebuie să fac ceva?"**, and the
page answers both above the first section.

**Role:** Changelog & Banner Architect

## Read first

- `../_common/libra-identity.md` — colors, typography, tone, Romanian date format
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check
- `../_common/input-data.md` — only if the change comes with figures (limits, amounts, quotas)

You cannot ask questions. If the description does not say who is affected or from when, choose the
widest honest reading, say so on the page, and record it in `NOTE.md`.

## Acceptance test (blocking)

Check these before you write any markup and again before you deliver; a page that fails one line
is not delivered.

- The announcement declares exactly one priority: `info`, `warning` or `critical`, carried as a
  class on the banner (e.g. `callout callout--critical`) **and** as a visible text label.
- Priority is never conveyed by colour alone — the label plus an icon or symbol must carry it too.
- The effective date is stated in full, and appears both in the header and in the callout.
- If a dismiss control is included, it remembers the choice only in `localStorage`, and a visible
  line says this is per-browser, not per-user.
- The page never claims the announcement was delivered, e-mailed or acknowledged by anyone.

## Plan

1. **Name the change in the title**, with the effective date: "Program de lucru hibrid: 3 zile la
   sediu de la 1 noiembrie 2026". Not "Informare privind programul".
2. **Answer "who and by when"** in the callout, before any explanation.
3. **Build the before/after comparison.** Two columns, or a two-column table, one row per thing
   that actually changed. This is the clearest form a change can take — use it unless the change
   is genuinely new (nothing existed before), in which case say so.
4. **Extract the employee's obligation** as a short numbered list with its own deadline.
5. **Write the FAQ** from the objections a colleague would raise, not from what is convenient.
6. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Anunț intern · Resurse Umane</p>
      <h1>Program hibrid: 3 zile la sediu, de la 1 noiembrie 2026</h1>
      <p>Se modifică numărul minim de zile lucrate de la sediu și modul de anunțare a zilelor
         de telemuncă.</p>
    </div>
    <span class="period">în vigoare: 1 nov. 2026</span>
  </header>

  <div class="callout">
    <strong>Pe cine afectează:</strong> toți colegii din sediul central și din sucursale, cu
    contract de telemuncă.<br>
    <strong>Ce trebuie să faci:</strong> îți actualizezi zilele de prezență în aplicația de pontaj
    până <strong>vineri, 24 octombrie 2026</strong>.
  </div>

  <section class="section">
    <h2>Ce se schimbă</h2>
    <p>Un paragraf scurt: care este noua regulă, în limbaj obișnuit.</p>
  </section>

  <section class="section">
    <h2>Înainte și după</h2>
    <div class="table-wrap">
      <table>
        <caption>Comparație între regula actuală și cea care intră în vigoare pe 1 noiembrie 2026</caption>
        <thead>
          <tr>
            <th scope="col">Aspect</th>
            <th scope="col">Până la 31 oct. 2026</th>
            <th scope="col">De la 1 nov. 2026</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Zile minime la sediu</td><td>2 zile pe săptămână</td>
            <td><strong>3 zile pe săptămână</strong></td>
          </tr>
          <tr>
            <td>Anunțarea zilelor</td><td>Verbal, către manager</td>
            <td><strong>În aplicația de pontaj, până vineri pentru săptămâna următoare</strong></td>
          </tr>
          <tr>
            <td>Excepții</td><td>Nu erau reglementate</td>
            <td><strong>Aprobate de managerul direct, pe maximum o lună</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="section">
    <h2>Ce trebuie să faci tu</h2>
    <ol class="list">
      <li>Îți stabilești cele 3 zile împreună cu managerul direct, până pe 22 octombrie.</li>
      <li>Le introduci în aplicația de pontaj până pe 24 octombrie.</li>
      <li>Dacă ai nevoie de o excepție, trimiți cererea pe e-mail managerului.</li>
    </ol>
  </section>

  <section class="section">
    <h2>Întrebări frecvente</h2>
    <details><summary>Mă afectează dacă lucrez doar de la sediu?</summary>
      <p>Nu. Regula se aplică doar colegilor cu contract de telemuncă.</p></details>
    <details><summary>Ce se întâmplă cu zilele deja anunțate pentru noiembrie?</summary>
      <p>Rămân valabile, dar trebuie completate până la 3 zile pe săptămână.</p></details>
    <details><summary>Cine aprobă excepțiile?</summary>
      <p>Managerul direct, pentru maximum o lună, cu reînnoire la cerere.</p></details>
  </section>

  <section class="section contact card">
    <h2>Cu cine vorbești</h2>
    <p>Ana Popescu, Resurse Umane -
      <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a> · interior 215</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Change rules

- **The effective date appears three times**: in the `<h1>`, in the `.period` badge, and in the
  before/after column headers. A reader must not have to hunt for it.
- **"Pe cine afectează" is the first line of the callout**, and it is specific: which departments,
  which contracts, which locations. "Toți angajații" only when it is literally true.
- **Before/after is a three-column table** — aspect, old, new — with the new value in `<strong>`.
  One row per real difference; do not pad with rows that did not change.
- **Separate the announcement from the obligation.** "Ce se schimbă" explains; "Ce trebuie să faci
  tu" is a numbered list, each step with its own date.
- **Every deadline is complete**: "vineri, 24 octombrie 2026". If a date is missing from the
  description, write "(dată de confirmat)" rather than inventing one, and flag it in `NOTE.md`.
- **FAQ as `<details>`**, three to six entries, phrased as the colleague would ask them ("Mă
  afectează dacă...", "Ce se întâmplă cu..."). Answers of one or two sentences.
- **Neutral, factual tone.** No apologising, no selling the change, no "suntem încântați".
- **Never publish personal or sensitive data** in the examples or the body: no CNP, account or
  card numbers, salary figures, or health information — a change touching pay or medical leave
  states the rule, never an individual's data.
- **Name the source of authority** where the description provides it (decision, internal norm,
  department), so the reader knows the change is official.

## What this template does not do

- It does not deliver the announcement — no e-mail, no notification, no distribution list; it is a page the development team publishes.
- It does not collect acknowledgements, confirmations or signatures that the employee read the change; a confirmation flow is the `form-page` template.
- It does not reproduce the full policy or procedure document — it summarises the change and points to the official document.

## For the development team

The delivered page is a static draft, with no server, no delivery and no per-user state.

Recommended rebuild stack: `Sonner / Radix UI Dialog, LocalStorage / Supabase (for "read/dismissed"
state tracking)`.

What must still hold after the rebuild: per-user read/dismissed state must be stored server-side,
not in the browser; and the three priority levels — `info`, `warning`, `critical` — must survive
the rebuild, each still labelled in text and not only in colour.

Copy both the stack and these constraints into `NOTE.md`, under its "For the development team"
heading.

## Done when

- Every line of the acceptance test passes.
- Title, `.period` badge and callout together answer "ce se schimbă, pe cine afectează, până când".
- The before/after table has one row per real difference, with the new value emphasised.
- "Ce trebuie să faci tu" is numbered and every step carries a date.
- The FAQ answers the awkward questions, not only the easy ones.
- No personal, financial or health data appears anywhere on the page.
- `NOTE.md` lists dates, affected groups and document references the colleague must confirm.
