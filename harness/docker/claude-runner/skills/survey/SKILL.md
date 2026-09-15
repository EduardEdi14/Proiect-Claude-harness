---
name: survey
description: Build an internal survey page on one subject — grouped questions, one consistent rating scale, one free-text field at the end — with validation and a confirmation message. Use for "chestionar", "sondaj intern", "sondaj de opinie", "vreau să aflu ce cred colegii", "chestionar anonim", "măsurăm satisfacția angajaților".
---

# Internal survey

A survey run inside the bank on a single subject: satisfaction, a tool, a process, a proposed
change. It specialises `../form-page/SKILL.md` — read that skill first, then apply what follows.
Everything in it holds here: the page has no server, it sends nothing anywhere, submission is
intercepted with `preventDefault()` and replaced by a confirmation, and `NOTE.md` tells the
development team where the answers must actually go.

## Read first

- `../form-page/SKILL.md` — the parent skill: the hard limit on where answers go, the control
  table, the full validation chapter (do not restate it, only what differs below)
- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`, then add the form styles
- `../_common/input-data.md` — section 7, sensitive data, is mandatory here
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Decide the scale, the groups and the anonymity wording yourself, and
write every decision into `NOTE.md`.

## Plan

1. **Name the subject in one sentence** and say what the results will be used for ("rezultatele
   ajută la alegerea noului intranet"). A survey with no stated purpose gets ignored.
2. **Pick ONE rating scale** for the whole survey and write it down before writing any question.
3. **Group the questions** into 2-3 thematic `<fieldset>` blocks, 2-4 questions each.
4. **End with exactly one free-text field**, optional, with a character counter.
5. **Decide the anonymity wording** — only what is true (rules below).
6. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap form-page">
  <header class="head">
    <div>
      <h1>Chestionar: instrumentele de lucru zilnice</h1>
      <p>Rezultatele ajută echipa IT să aleagă ce înlocuim în 2027. Durează cam 3 minute.</p>
    </div>
  </header>

  <p class="callout no-print"><strong>Previzualizare.</strong> Răspunsurile nu se salvează încă -
     echipa de dezvoltare conectează chestionarul înainte de publicare.</p>

  <form id="f" class="card" novalidate>
    <p class="req-note">Câmpurile marcate cu <span aria-hidden="true">*</span> sunt obligatorii.
       Scala este aceeași la toate întrebările: 1 - deloc de acord, 5 - complet de acord.</p>

    <fieldset class="field">
      <legend>Aplicațiile pe care le folosesc răspund suficient de repede.
        <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="viteza" value="1" required> 1 - deloc de acord</label>
      <label><input type="radio" name="viteza" value="2"> 2 - mai mult dezacord</label>
      <label><input type="radio" name="viteza" value="3"> 3 - neutru</label>
      <label><input type="radio" name="viteza" value="4"> 4 - mai mult de acord</label>
      <label><input type="radio" name="viteza" value="5"> 5 - complet de acord</label>
      <label><input type="radio" name="viteza" value="na"> Nu știu / Nu se aplică</label>
      <p class="err" id="viteza-err" hidden>Alege o variantă la întrebarea despre viteză.</p>
    </fieldset>

    <fieldset class="field">
      <legend>Găsesc ușor informația de care am nevoie.
        <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="cautare" value="1" required> 1 - deloc de acord</label>
      <label><input type="radio" name="cautare" value="2"> 2 - mai mult dezacord</label>
      <label><input type="radio" name="cautare" value="3"> 3 - neutru</label>
      <label><input type="radio" name="cautare" value="4"> 4 - mai mult de acord</label>
      <label><input type="radio" name="cautare" value="5"> 5 - complet de acord</label>
      <label><input type="radio" name="cautare" value="na"> Nu știu / Nu se aplică</label>
      <p class="err" id="cautare-err" hidden>Alege o variantă la întrebarea despre căutare.</p>
    </fieldset>

    <div class="field">
      <label for="propunere">Ce ai schimba primul? (opțional)</label>
      <textarea id="propunere" name="propunere" maxlength="600" rows="4"
                aria-describedby="propunere-ajutor"></textarea>
      <p id="propunere-ajutor">Scrie liber, în câteva propoziții.</p>
      <p class="counter" aria-live="polite">0 / 600</p>
    </div>

    <p class="privacy">Nu îți cerem numele și nu îți colectăm adresa de e-mail. Răspunsurile se
       folosesc doar agregat, pentru decizia privind instrumentele de lucru.</p>

    <div class="actions">
      <button class="btn btn--primary" type="submit">Trimite răspunsurile</button>
    </div>
  </form>

  <div id="ok" class="card confirm" hidden role="status">
    <h2>Mulțumim, răspunsurile au fost înregistrate.</h2>
    <p>Rezultatele agregate se publică pe intranet în luna următoare.</p>
  </div>

  <p class="foot-note">...</p>
</div>
```

## One scale, and questions that do not lead

- **One scale, everywhere.** Choose a single scale — 1-5 agreement is the default — and use it for
  every rating question. Mixing a 1-5 block with a 1-10 block makes the answers impossible to
  compare or average, and the results become useless. Two scales in one survey is never right.
- Label every step in words, not numbers alone: "1 - deloc de acord" … "5 - complet de acord".
  A bare "3" means nothing three weeks later.
- Keep the direction constant: low is always negative, high always positive, in every question.
- Add "Nu știu / Nu se aplică" as a separate option, never folded into the middle of the scale —
  that pollutes the average. Radio buttons, all options visible; never stars only, never a slider.
- **Neutral, not leading.** "Cât de utilă ți se pare aplicația?" not "Cât de mult te ajută noua
  aplicație excelentă?". No question presupposes an opinion or thanks the respondent in advance.
- **One idea per question.** "Instrumentul este rapid și ușor de folosit" measures two things and
  can be answered neither yes nor no. Split it.
- **Short enough to finish.** 8 fields at most, counting the free text — the parent skill's limit,
  and here also a response-rate rule. Every question must justify itself: who reads this answer,
  and what decision changes because of it? Cut the rest. Exactly one free-text field, last,
  optional, `maxlength="600"`. State the completion time under the title and make it true.
- Validation, beyond the parent chapter: a missing rating message names the question, not the field
  id; the free text never blocks; no score is computed or shown back to the respondent.

## Anonymity — say only what is true

A static page cannot guarantee anonymity. Once the development team connects a backend, the request
can carry an IP address, a session, or an intranet single-sign-on identity.

- If the survey collects no name, department or e-mail, write exactly that:
  "Nu îți cerem numele și nu îți colectăm adresa de e-mail."
- Never write "complet anonim", "100% anonim" or "nu putem identifica pe nimeni" — a promise the
  page cannot keep and the bank would answer for.
- If the description asks for anonymity, keep identifying fields out and record in `NOTE.md`:
  "Colegul a cerut răspunsuri anonime. Pagina nu cere date de identificare, dar anonimatul real
  depinde de backend - de confirmat cu responsabilul cu protecția datelor înainte de publicare."
- A "departament" field plus a small team makes people identifiable. If the description asks for it,
  keep it optional and note the risk.

## Privacy — non-negotiable in a bank

- No CNP, no account number, no card data, no salary, no health data. If the description asks for
  any of it, leave the field out, build the rest, and write in `NOTE.md`: "Am omis câmpul <x> -
  date personale sensibile; de discutat cu responsabilul cu protecția datelor."
- No questions about union membership, religion, ethnicity, political views, sexual orientation or
  disability — not even as "optional demographics".
- A visible line saying what the answers are used for and that they are reported aggregated.
- No pre-checked consent checkbox.

## What this template does not do

- It does not store, count or aggregate answers — there is no server, so no results page and no chart of responses.
- It does not guarantee anonymity; it can only state which data the page does not ask for.
- It does not enforce one response per person, nor prevent a second submission.

## Done when

- One rating scale, identical in every question, labelled in words, same direction throughout.
- 8 fields at most, each justified; exactly one free-text field, last and optional.
- Questions are neutral, single-idea, grouped in `<fieldset>` blocks with a real `<legend>`.
- The purpose sentence and the honest anonymity line are both visible.
- Validation is in Romanian, next to the question, keyboard accessible.
- `NOTE.md` lists the scale chosen, the questions, the anonymity wording and its limits, the
  storage the developer must connect, and any field omitted for privacy reasons.
