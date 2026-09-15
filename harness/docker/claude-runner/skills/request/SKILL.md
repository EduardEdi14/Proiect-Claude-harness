---
name: request
description: Build an internal request form — equipment, access rights, leave, or a service from another department: what is requested, the business justification, the requester's department, the approver, and the date it is needed by. Use for "cerere internă", "formular de cerere", "cerere de echipament", "cerere de acces", "cerere de concediu", "solicitare către alt departament", "vreau un formular prin care colegii cer", "cerere de laptop", "aprobare de la șef".
---

# Internal request form

A form one colleague fills in to ask for something — a laptop, a right in an application, days off,
work from another team. A specialisation of `form-page`: the same hard limit applies (**no server,
nothing is sent or stored**), and on top of it this template always asks the same four things —
what, why, who approves, and by when.

**Role:** Ticket Pipeline & Rate-Limiting Handler

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`, then add the form styles
- `../_common/input-data.md` — **section 7, sensitive data, is mandatory here**
- `../_common/delivery.md` — deliverables and final check

Re-read the parent skill `../form-page/SKILL.md` for the control table, the validation rules and the
"where do the answers go?" limit. This skill adds the request-specific shape on top; it does not
replace any of it.

You cannot ask questions. Choose the fields, build the whole form, and write your choices —
including the approval route you could not implement — into `NOTE.md`.

## Acceptance test (blocking)

Check every line below before writing any markup, and verify it again before delivering. A page that fails any line is not delivered.

- The submit button is disabled immediately after a valid submit, so one click cannot produce two requests.
- Nothing on the page claims the request was sent, received, assigned or given a ticket number — none of that has happened.
- The confirmation states plainly that the request is not yet registered, and says who will pick it up once the development team connects the form.
- Validation is driven by a single declarative schema object, so the field rules and the messages cannot disagree.
- `NOTE.md` names the rate-limit policy and the internal channel that must be alerted on submission.

## Plan

1. **Name the object of the request** in the title: "Cerere de echipament IT", not "Formular".
2. **Decide the "what" field.** A closed `<select>` or radio list of the things that can actually be
   requested, plus one short free-text field for details. Never a single open textarea.
3. **Add the justification field** — a short business reason, with its own label asking for the
   business need, and a character counter.
4. **Ask for department and approver**, both required: a request with no route cannot be processed.
5. **Make "needed by" a real date input** with a sensible `min`.
6. **Strip every sensitive field** (see Privacy below) before writing a line of HTML.
7. **Write the page**, then `NOTE.md` with the approval route, then the final check.

## Page structure

```html
<div class="wrap form-page">
  <header class="head">
    <div>
      <h1>Cerere de echipament IT</h1>
      <p>Completează cererea și trimite-o spre aprobare șefului direct. Echipamentul se livrează
         în 5-10 zile lucrătoare de la aprobare.</p>
    </div>
  </header>

  <p class="callout no-print"><strong>Previzualizare.</strong> Cererea nu se trimite și nu se
     salvează încă - echipa de dezvoltare conectează formularul la fluxul de aprobare înainte de
     publicare.</p>

  <form id="f" class="card" novalidate>
    <p class="req-note">Câmpurile marcate cu <span aria-hidden="true">*</span> sunt obligatorii.</p>

    <div class="field">
      <label for="solicitant">Nume și prenume <span class="req" aria-hidden="true">*</span></label>
      <input id="solicitant" name="solicitant" type="text" required autocomplete="name"
             aria-describedby="solicitant-err">
      <p class="err" id="solicitant-err" hidden>Scrie numele tău.</p>
    </div>

    <div class="field">
      <label for="departament">Departament <span class="req" aria-hidden="true">*</span></label>
      <select id="departament" name="departament" required aria-describedby="departament-err">
        <option value="">Alege departamentul</option>
        <option>Retail</option><option>Corporate</option><option>Risc</option>
        <option>IT</option><option>Resurse Umane</option><option>Financiar</option>
      </select>
      <p class="err" id="departament-err" hidden>Alege departamentul din care faci parte.</p>
    </div>

    <fieldset class="field">
      <legend>Ce soliciți <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="obiect" value="laptop" required> Laptop</label>
      <label><input type="radio" name="obiect" value="monitor"> Monitor suplimentar</label>
      <label><input type="radio" name="obiect" value="telefon"> Telefon de serviciu</label>
      <label><input type="radio" name="obiect" value="altul"> Altul (descrie mai jos)</label>
      <p class="err" id="obiect-err" hidden>Alege ce soliciți.</p>
    </fieldset>

    <div class="field">
      <label for="detalii">Detalii despre echipament (model, configurație, cantitate)</label>
      <input id="detalii" name="detalii" type="text" maxlength="120">
    </div>

    <div class="field">
      <label for="motiv">Motivul solicitării - de ce este necesar pentru activitatea ta
        <span class="req" aria-hidden="true">*</span></label>
      <textarea id="motiv" name="motiv" rows="4" maxlength="400" required
                aria-describedby="motiv-err motiv-help"></textarea>
      <p class="counter" aria-live="polite">0 / 400</p>
      <p id="motiv-help">Exemplu: „Lucrez cu două aplicații în paralel la analiza dosarelor de
         credit; monitorul actual nu permite afișarea simultană.”</p>
      <p class="err" id="motiv-err" hidden>Scrie în câteva cuvinte de ce ai nevoie de echipament.</p>
    </div>

    <div class="field">
      <label for="aprobator">Șeful direct care aprobă <span class="req" aria-hidden="true">*</span></label>
      <input id="aprobator" name="aprobator" type="text" required aria-describedby="aprobator-err">
      <p class="err" id="aprobator-err" hidden>Scrie numele șefului direct care aprobă cererea.</p>
    </div>

    <div class="field">
      <label for="data">Data până la care ai nevoie <span class="req" aria-hidden="true">*</span></label>
      <input id="data" name="data" type="date" required min="2026-09-16"
             aria-describedby="data-err data-help">
      <p id="data-help">Alege o dată de peste cel puțin 5 zile lucrătoare.</p>
      <p class="err" id="data-err" hidden>Alege o dată din viitor, de cel puțin 5 zile lucrătoare.</p>
    </div>

    <p class="privacy">Datele completate se folosesc doar pentru procesarea acestei cereri și se
       păstrează pe durata soluționării ei. Nu cerem CNP, date bancare sau informații medicale.</p>

    <div class="actions">
      <button class="btn btn--primary" type="submit">Trimite cererea</button>
    </div>
  </form>

  <div id="ok" class="card confirm" hidden role="status">
    <h2>Cererea a fost completată.</h2>
    <p>Odată conectat fluxul, cererea ajunge la șeful direct pentru aprobare, iar tu primești
       un e-mail cu numărul cererii.</p>
  </div>

  <p class="foot-note">...</p>
</div>
```

## Request rules

- **The "what" is a closed list**, built from the description, plus "Altul" and one short text field
  for details. An open textarea as the only "what" field produces requests nobody can route.
- **Justification is a business reason, not a catch-all.** The label asks *why it is needed for the
  work* ("de ce este necesar pentru activitatea ta"), with a concrete example under the field and a
  counter. Never label it "Observații" or "Alte informații" — that is where real information goes
  to die.
- **Department and approver are both required**, and the approver is a person, not a team. If the
  description names a fixed approver, show it as read-only text instead of an input.
- **"Needed by" is a real `<input type="date">`** with `min` set to the earliest date that makes
  sense — tomorrow at the very least, and the realistic lead time when the description gives one
  (delivery in 5-10 working days → `min` five working days out). Validate in JavaScript too, with a
  message that says why: not "dată invalidă".
- **Approval routing does not exist in a static page.** There is no server, no workflow engine, no
  e-mail. Do not fake it: no "cererea a fost trimisă șefului", no `mailto:` submit, no
  `localStorage` queue. The confirmation says the request was completed, and `NOTE.md` states the
  route the development team must build: who approves, in what order, what happens on refusal,
  where the request is stored, and who owns the data.
- **Eight fields maximum**, as in the parent skill. Identity fields the bank already knows
  (badge number, internal extension) are cut unless the description insists.
- **Confirmation restates what happens next** in honest future tense, and the "not saved yet"
  preview note stays visible above the form.

## Privacy — non-negotiable in a bank

- **Never collect**: CNP, ID series and number, account or card numbers, IBAN, salary or salary
  grid, medical diagnoses, or any health document.
- **Medical leave**: collect only the dates of absence and, at most, the type as chosen from a
  closed list ("concediu medical"). Never a diagnosis, never a certificate number, never a free-text
  field about the condition.
- If the description asks for any of the above, leave the field out, build the rest of the form, and
  write in `NOTE.md`: "Am omis câmpul <x> - date personale sensibile; de discutat cu responsabilul
  cu protecția datelor."
- A visible `.privacy` line states the purpose and the retention period. No pre-checked consent.

## What this template does not do

- It does not send, store or route the request — there is no server and no workflow engine, so a valid submit only shows the confirmation, and the real route is specified in `NOTE.md`.
- It does not notify or authenticate the approver: it records the name typed by the requester, it cannot verify that the person exists or has the right to approve.
- It does not track status, produce a request number or show a history of past requests; all of that needs the back end the development team connects.

## For the development team

The delivered page is a static draft, rebuilt properly by the development team before publishing.

Recommended rebuild stack: `Upstash Ratelimit, Zod, Nodemailer / Slack Webhooks`

Still must hold after the rebuild: sliding-window rate limiting per IP and per user, and an automated alert to the internal channel on each submission.

Copy both the stack line and the line above into `NOTE.md`, under its "For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- The title names what is being requested, and the form has at most 8 fields.
- The "what" is a closed list with details, and the justification asks for a business reason.
- Department, approver and needed-by date are required, the date is a real `date` input with `min`.
- Validation is in Romanian, next to the field, keyboard accessible (parent skill's rules).
- No CNP, ID, account, salary or medical data anywhere; medical leave carries dates only.
- The preview note and the confirmation are both honest about nothing being sent.
- `NOTE.md` lists the fields and types, the approval route to be built, the storage and data owner,
  and every field omitted for privacy reasons.
