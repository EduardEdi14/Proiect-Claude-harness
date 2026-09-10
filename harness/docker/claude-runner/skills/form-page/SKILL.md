---
name: form-page
description: Build a data-collection page — sign-ups, internal surveys, requests, feedback — with validation and a confirmation message. Use for "formular", "înscriere", "chestionar", "colectăm răspunsuri", "vreau să completeze colegii".
---

# Collection form

A page where colleagues fill something in: a sign-up, a short survey, an internal request. What
comes out of this template is the finished front end, plus a precise note about where the answers
have to be stored.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`, then add the form styles
- `../_common/input-data.md` — section 7, sensitive data, is mandatory here
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Choose the fields, build the whole form, and write your choices into
`NOTE.md`.

## The hard limit: where do the answers go?

This page has no server. **It does not send anything anywhere** — there is no address to send to
and no place to store answers. So:

- `<form>` has no `action` and no `method`; submission is intercepted with `preventDefault()`.
- On a valid submit, the form is replaced by a clear confirmation message.
- A visible note tells the colleague this is a preview: answers are not saved yet.
- `NOTE.md` states, for the development team, exactly what is needed: an endpoint, a storage
  location (SharePoint list, database table, mailbox), and who owns the data.

Never simulate storage (no `localStorage` pretending to be a database, no `mailto:` submit).
A form that seems to work but throws answers away is worse than an honest preview.

## Plan

1. **Name the purpose** and the person collecting: what will be done with the answers?
   That sentence goes right under the title.
2. **Choose the fields.** Maximum 8. Every field must justify itself: who uses this answer,
   for what? Cut everything else — a short form gets filled in.
3. **Pick the right control** for each field (table below).
4. **Decide mandatory vs optional**, and mark it visibly.
5. **Write the page**, then `NOTE.md`, then the final check.

## Choosing the control

| Answer | Control |
|---|---|
| Short text (name, department) | `<input type="text">` |
| Email | `<input type="email">` with a real pattern |
| Phone | `<input type="tel">` — accept spaces and `+`, never force a strict format |
| One choice out of 2-5 | `<input type="radio">`, all options visible |
| One choice out of 6+ | `<select>` |
| Several choices | `<input type="checkbox">` |
| Date | `<input type="date">` with `min`/`max` when the period is known |
| A number | `<input type="number">` with `min`, `max`, `step` |
| Opinion, comment | `<textarea>` with a character counter |
| Rating 1-5 | radio buttons with labels, never stars only |

## Page structure

```html
<div class="wrap form-page">
  <header class="head">
    <div>
      <h1>Înscriere la Green Week</h1>
      <p>Completează până vineri, 9 octombrie. Răspunsurile ajung la echipa Administrativ.</p>
    </div>
  </header>

  <p class="callout no-print"><strong>Previzualizare.</strong> Răspunsurile nu se salvează încă -
     echipa de dezvoltare conectează formularul înainte de publicare.</p>

  <form id="f" class="card" novalidate>
    <p class="req-note">Câmpurile marcate cu <span aria-hidden="true">*</span> sunt obligatorii.</p>

    <div class="field">
      <label for="nume">Nume și prenume <span class="req" aria-hidden="true">*</span></label>
      <input id="nume" name="nume" type="text" required autocomplete="name"
             aria-describedby="nume-err">
      <p class="err" id="nume-err" hidden>Scrie numele tău.</p>
    </div>

    <fieldset class="field">
      <legend>În ce zi vrei să participi? <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="zi" value="luni" required> Luni, 12 octombrie</label>
      <label><input type="radio" name="zi" value="marti"> Marți, 13 octombrie</label>
      <p class="err" id="zi-err" hidden>Alege o zi.</p>
    </fieldset>

    <div class="field">
      <label for="obs">Observații (opțional)</label>
      <textarea id="obs" name="obs" maxlength="500" rows="4"></textarea>
      <p class="counter" aria-live="polite">0 / 500</p>
    </div>

    <p class="privacy">Datele completate sunt folosite doar pentru organizarea campaniei și
       se șterg după încheierea ei.</p>

    <div class="actions">
      <button class="btn btn--primary" type="submit">Trimite înscrierea</button>
    </div>
  </form>

  <div id="ok" class="card confirm" hidden role="status">
    <h2>Îți mulțumim, înscrierea a fost înregistrată.</h2>
    <p>Primești un e-mail de confirmare de la Administrativ până joi.</p>
  </div>

  <p class="foot-note">...</p>
</div>
```

## Validation

Vanilla JavaScript, inline at the end of `<body>`. Keep `novalidate` on the form so you control
the messages, and validate on submit (not while typing — that scolds the user mid-word;
re-validate a field on `blur` only after it has failed once).

Requirements:

- The message sits **next to the field**, in Romanian, saying what to do: "Scrie o adresă de
  e-mail, de forma nume@libra.ro" — not "Invalid input".
- `aria-invalid="true"` on the field and `aria-describedby` pointing at the message.
- Focus moves to the first invalid field; the count of problems is announced in an `aria-live` region.
- Errors are not color-only: a border, an icon or a `!` symbol, plus the text.
- On success: the form is hidden, the confirmation appears, focus moves to it.

Never block on a field the description did not ask for, and never invent format rules
(a phone number can legitimately be `+40 721 000 000` or `0721000000`).

## Privacy — non-negotiable in a bank

- No CNP, no account number, no card data, no salary, no health data. If the description asks for
  any of it, leave the field out, build the rest of the form, and write in `NOTE.md`:
  "Am omis câmpul <x> - date personale sensibile; de discutat cu responsabilul cu protecția datelor."
- Personal data collected is limited to what the purpose actually requires.
- A visible line stating what the data is used for and for how long it is kept.
- No pre-checked consent checkbox.

## Done when

- 8 fields at most, each one justified.
- Every field has a real `<label>` (grouped fields use `<fieldset>` + `<legend>`).
- Validation is understandable, in Romanian, next to the field, keyboard accessible.
- The confirmation is clear and the "not saved yet" note is visible.
- `NOTE.md` lists the fields, their types, required flags, the storage the developer must connect,
  and any field omitted for privacy reasons.
