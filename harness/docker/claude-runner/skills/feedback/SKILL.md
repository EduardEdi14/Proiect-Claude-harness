---
name: feedback
description: Build a feedback form for a training, event or activity that has already happened — the thing evaluated and its date at the top, a few rating criteria, what was useful, what was missing, optional identity. Use for "formular de feedback", "vreau părerea participanților", "evaluare training", "feedback după eveniment", "cum a fost sesiunea", "ce părere au avut colegii".
---

# Feedback form

A form filled in after something has happened: a training session, an internal event, a workshop,
a pilot activity. It specialises `../form-page/SKILL.md` — read that skill first, then apply what
follows. Everything in it holds here: the page has no server, it sends nothing anywhere, submission
is intercepted with `preventDefault()` and replaced by a confirmation, and `NOTE.md` tells the
development team where the answers must actually go.

**Role:** CSAT & Sentiment Pipeline Builder

## Read first

- `../form-page/SKILL.md` — the parent skill: the hard limit on where answers go, the control
  table, the full validation chapter (do not restate it, only what differs below)
- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`, then add the form styles
- `../_common/input-data.md` — section 7, sensitive data, is mandatory here
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Choose the criteria and the wording yourself, and write every decision
into `NOTE.md`.

## Acceptance test (blocking)

Check every line before you write any markup, and verify it again before delivering. A page that
fails one of these lines is not delivered.

- A category control with a fixed, declared set of values is present and required, so every
  submission arrives taggable.
- One rating scale is used for every rated question — never a mix of 1-5 and 1-10 on the same page.
- Free-text answers are preserved in `localStorage` as they are typed, and a visible line says this
  is per-browser only and not yet saved anywhere.
- No field that asks for criticism is `required`; a colleague can submit without naming a fault.
- Identification is optional and clearly marked so, and the page never implies the feedback is
  anonymous when a name field is filled in.

## Plan

1. **Name the thing evaluated and its date** in the `<h1>` and the line under it — feedback with no
   session name and no date is worthless once two sessions have run.
2. **Pick 2-4 fixed rating criteria**, on one 1-5 scale, the same criteria every session.
3. **Add the two free-text questions**: what was useful, what was missing.
4. **Add one optional identity field**, last, clearly marked optional.
5. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap form-page">
  <header class="head">
    <div>
      <h1>Feedback: training "Prevenirea fraudei pe card"</h1>
      <p>Sesiunea din 12 septembrie 2026, sala Brâncuși. Feedbackul ajunge la echipa Formare și ne
         ajută să pregătim următoarea ediție.</p>
    </div>
  </header>

  <p class="callout no-print"><strong>Previzualizare.</strong> Răspunsurile nu se salvează încă -
     echipa de dezvoltare conectează formularul înainte de publicare.</p>

  <form id="f" class="card" novalidate>
    <p class="req-note">Câmpurile marcate cu <span aria-hidden="true">*</span> sunt obligatorii.
       Scala este aceeași la toate: 1 - foarte slab, 5 - foarte bun.</p>

    <fieldset class="field">
      <legend>Cât de utile au fost informațiile pentru munca ta?
        <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="utilitate" value="1" required> 1 - foarte slab</label>
      <label><input type="radio" name="utilitate" value="2"> 2 - slab</label>
      <label><input type="radio" name="utilitate" value="3"> 3 - acceptabil</label>
      <label><input type="radio" name="utilitate" value="4"> 4 - bun</label>
      <label><input type="radio" name="utilitate" value="5"> 5 - foarte bun</label>
      <p class="err" id="utilitate-err" hidden>Alege o notă de la 1 la 5 pentru utilitate.</p>
    </fieldset>

    <fieldset class="field">
      <legend>Cât de clar a explicat trainerul?
        <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="claritate" value="1" required> 1 - foarte slab</label>
      <label><input type="radio" name="claritate" value="2"> 2 - slab</label>
      <label><input type="radio" name="claritate" value="3"> 3 - acceptabil</label>
      <label><input type="radio" name="claritate" value="4"> 4 - bun</label>
      <label><input type="radio" name="claritate" value="5"> 5 - foarte bun</label>
      <p class="err" id="claritate-err" hidden>Alege o notă de la 1 la 5 pentru claritate.</p>
    </fieldset>

    <div class="field">
      <label for="util">Ce ți-a fost cel mai util?
        <span class="req" aria-hidden="true">*</span></label>
      <textarea id="util" name="util" maxlength="500" rows="4" required
                aria-describedby="util-err"></textarea>
      <p class="counter" aria-live="polite">0 / 500</p>
      <p class="err" id="util-err" hidden>Scrie măcar un lucru care ți-a fost util.</p>
    </div>

    <div class="field">
      <label for="lipsit">Ce a lipsit sau ce ai schimba? (opțional)</label>
      <textarea id="lipsit" name="lipsit" maxlength="500" rows="4"></textarea>
      <p class="counter" aria-live="polite">0 / 500</p>
    </div>

    <div class="field">
      <label for="nume">Nume (opțional)</label>
      <input id="nume" name="nume" type="text" autocomplete="name" aria-describedby="nume-ajutor">
      <p id="nume-ajutor">Completează doar dacă vrei un răspuns de la echipa Formare.</p>
    </div>

    <p class="privacy">Feedbackul se folosește doar pentru îmbunătățirea sesiunilor viitoare și se
       raportează agregat. Numele, dacă îl completezi, nu apare în raport.</p>

    <div class="actions">
      <button class="btn btn--primary" type="submit">Trimite feedbackul</button>
    </div>
  </form>

  <div id="ok" class="card confirm" hidden role="status">
    <h2>Mulțumim pentru feedback.</h2>
    <p>Îl citim înainte de a pregăti următoarea sesiune.</p>
  </div>

  <p class="foot-note">...</p>
</div>
```

## Ratings and free text, in balance

Both halves are needed and neither replaces the other.

- **Ratings exist for comparison** — between sessions, trainers and dates. So the criteria are
  fixed, few, and phrased identically every time: usefulness of the content, clarity of the
  presenter, pace, organisation. Pick from those; do not invent a new criterion per session.
- **Free text exists for the reason behind the rating.** A 2 out of 5 with no sentence next to it
  tells the organiser nothing they can act on.
- **Keep the proportion**: 2-4 ratings against 2 free-text fields. Nothing but ratings produces
  averages nobody can act on; nothing but free text cannot be compared to last month's session.
- One 1-5 scale, labelled in words at every step, same direction throughout — high is always good.
- Do not ask for an "overall score": either it duplicates the criteria or it contradicts them, and
  the organiser can average the criteria themselves.
- Validation, beyond the parent chapter: at most one free-text field may be `required` and it is the
  positive one; a missing rating message names the criterion ("Alege o notă de la 1 la 5 pentru
  claritate."); the optional name is never checked for format — a first name alone is valid; no
  score or average is shown back after submit.

## Candid feedback, or none at all

- **Identification is optional.** The name field is last, marked "(opțional)", and the page says why
  it is there: "completează doar dacă vrei un răspuns". People who must sign their criticism write
  no criticism.
- **Never make a criticism field mandatory.** "Ce a lipsit?" and any "ce nu a funcționat" field are
  always optional. `required` on a complaint field produces invented complaints or an abandoned form.
- Ask what was missing, not who was at fault. No field naming a colleague, trainer or manager as
  responsible — that turns feedback into a performance record. If the description asks for it, leave
  it out and note it in `NOTE.md`.
- Avoid the field combination that identifies someone by accident: department plus role plus date in
  a six-person session is a name. Keep those out unless the description insists, and note the risk.
- Neutral wording: "Cum a fost ritmul sesiunii?" not "Nu a fost prea rapidă sesiunea?".

## Privacy — non-negotiable in a bank

- No CNP, no account number, no card data, no salary, no health data. If the description asks for
  any of it, leave the field out, build the rest, and write in `NOTE.md`: "Am omis câmpul <x> -
  date personale sensibile; de discutat cu responsabilul cu protecția datelor."
- Feedback is not an evaluation of a person: no field that scores a named colleague.
- A visible line saying what the feedback is used for and that it is reported aggregated.
- No pre-checked consent checkbox.

## What this template does not do

- It does not store feedback or compute averages across sessions — there is no server and no results view.
- It does not verify that the respondent attended the session, and does not prevent a second submission.
- It does not feed an HR record, a trainer evaluation or any performance process.

## For the development team

What you deliver is a static draft; the real feedback page is rebuilt by the development team.
Recommended stack: **Star/NPS rating components, Formbricks / API webhooks**.

What must still hold after the rebuild: server-side draft persistence per user, and automatic
category tagging in the pipeline.

Copy both the recommended stack and those requirements into `NOTE.md`, under its
"For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- The session name and date are in the `<h1>` and the line under it.
- 2-4 fixed rating criteria on one word-labelled 1-5 scale, plus the two free-text questions.
- The identity field is last, optional, and says why it exists; no criticism field is `required`.
- 8 fields at most, each justified; validation in Romanian, next to the field, keyboard accessible.
- `NOTE.md` lists the criteria chosen, the required flags, the storage the developer must connect,
  and any field omitted for privacy reasons.
