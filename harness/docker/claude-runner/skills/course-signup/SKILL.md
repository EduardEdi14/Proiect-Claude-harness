---
name: course-signup
description: Build a registration form for an internal course or training — choose the course from a list, state experience level, pick a preferred time slot or location, note any constraints. Use for "înscriere la curs", "formular de înscriere training", "vreau să se înscrie colegii la cursul de", "programare la sesiune", "înscrieri la academia internă", "alegere grupă".
---

# Course sign-up

A registration form for an internal course, training or workshop that has not happened yet. It
specialises `../form-page/SKILL.md` — read that skill first, then apply what follows. Everything in
it holds here: the page has no server, it sends nothing anywhere, submission is intercepted with
`preventDefault()` and replaced by a confirmation, and `NOTE.md` tells the development team where
the registrations must actually go.

## Read first

- `../form-page/SKILL.md` — the parent skill: the hard limit on where answers go, the control
  table, the full validation chapter (do not restate it, only what differs below)
- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`, then add the form styles
- `../_common/input-data.md` — section 7, sensitive data, is mandatory here
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. If the description gives no durations, levels or slot times, invent
plausible placeholders, mark them as examples in the page, and list them in `NOTE.md` for the
organiser to replace.

## Plan

1. **Name the programme and the registration deadline** under the title.
2. **List the courses** with enough detail to choose between them (rules below).
3. **Ask for experience level** on the subject, in behavioural terms, not as a self-grade.
4. **Ask for a preferred slot or location, and a second choice.**
5. **Add one optional constraints field** (accessibility, scheduling).
6. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap form-page">
  <header class="head">
    <div>
      <h1>Înscriere la Academia Internă - trimestrul 4</h1>
      <p>Înscrieri până joi, 25 septembrie 2026. Grupele au 12 locuri; confirmarea locului vine pe
         e-mail de la echipa Formare.</p>
    </div>
  </header>

  <p class="callout no-print"><strong>Previzualizare.</strong> Înscrierile nu se salvează încă -
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
      <legend>La ce curs te înscrii? <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="curs" value="excel" required>
        Excel avansat - 2 zile (16h) - nivel avansat</label>
      <label><input type="radio" name="curs" value="creditare">
        Analiza creditului IMM - 3 zile (21h) - nivel intermediar</label>
      <label><input type="radio" name="curs" value="prezentare">
        Prezentări convingătoare - 1 zi (8h) - nivel începător</label>
      <p class="err" id="curs-err" hidden>Alege un curs din listă.</p>
    </fieldset>

    <fieldset class="field">
      <legend>Cât lucrezi acum cu subiectul cursului?
        <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="experienta" value="deloc" required>
        Nu l-am folosit până acum</label>
      <label><input type="radio" name="experienta" value="ocazional">
        Îl folosesc ocazional, pe lucruri simple</label>
      <label><input type="radio" name="experienta" value="zilnic">
        Îl folosesc zilnic și vreau partea avansată</label>
      <p class="err" id="experienta-err" hidden>Alege varianta care te descrie cel mai bine.</p>
    </fieldset>

    <div class="field">
      <label for="slot1">Prima opțiune de grupă
        <span class="req" aria-hidden="true">*</span></label>
      <select id="slot1" name="slot1" required aria-describedby="slot1-err">
        <option value="">Alege o grupă</option>
        <option value="a">Marți, 6 octombrie, 09:00-13:00 - sala Brâncuși, Sediul Central</option>
        <option value="b">Joi, 8 octombrie, 14:00-18:00 - sala Brâncuși, Sediul Central</option>
        <option value="c">Marți, 13 octombrie, 09:00-13:00 - online, Teams</option>
      </select>
      <p class="err" id="slot1-err" hidden>Alege prima opțiune de grupă.</p>
    </div>

    <div class="field">
      <label for="slot2">A doua opțiune <span class="req" aria-hidden="true">*</span></label>
      <select id="slot2" name="slot2" required aria-describedby="slot2-ajutor slot2-err">
        <option value="">Alege o grupă diferită</option>
        <option value="a">Marți, 6 octombrie, 09:00-13:00 - sala Brâncuși, Sediul Central</option>
        <option value="b">Joi, 8 octombrie, 14:00-18:00 - sala Brâncuși, Sediul Central</option>
        <option value="c">Marți, 13 octombrie, 09:00-13:00 - online, Teams</option>
      </select>
      <p id="slot2-ajutor">Grupele se umplu repede; a doua opțiune ne ajută să te plasăm rapid.</p>
      <p class="err" id="slot2-err" hidden>Alege o a doua grupă, diferită de prima.</p>
    </div>

    <div class="field">
      <label for="nevoi">Ai nevoie de ceva anume ca să poți participa? (opțional)</label>
      <textarea id="nevoi" name="nevoi" maxlength="400" rows="3"
                aria-describedby="nevoi-ajutor"></textarea>
      <p id="nevoi-ajutor">De exemplu: acces cu scaun rulant, loc în primul rând, materiale cu text
         mărit, o zi în care nu poți veni.</p>
      <p class="counter" aria-live="polite">0 / 400</p>
    </div>

    <p class="privacy">Datele se folosesc doar pentru organizarea grupelor și se păstrează până la
       încheierea trimestrului de formare.</p>

    <div class="actions">
      <button class="btn btn--primary" type="submit">Trimite înscrierea</button>
    </div>
  </form>

  <div id="ok" class="card confirm" hidden role="status">
    <h2>Înscrierea a fost înregistrată.</h2>
    <p>Locul nu este încă rezervat: echipa Formare confirmă grupa pe e-mail în două zile
       lucrătoare.</p>
  </div>

  <p class="foot-note">...</p>
</div>
```

## Presenting the courses and the experience question

A bare list of course names forces a guess. Every option carries three things in the label itself:
**name, duration, level.**

- `<input type="radio">` for up to 5 courses, all options visible; `<select>` with `<optgroup>`
  from 6 up. Format: "Excel avansat - 2 zile (16h) - nivel avansat".
- Add a short line per course only when it changes the decision (prerequisite, language, who it is
  for). One sentence, not a syllabus — a course catalogue belongs in an `info-page`.
- Never abbreviate the level to a letter or a colour. Write "începător", "intermediar", "avansat".
- **Experience is asked behaviourally** — "Folosesc zilnic formule și tabele pivot" — never as
  "nivelul meu: 1-5". A self-grade is not comparable between two people; a behaviour is. The field
  exists so the trainer can split the groups, and the page says so.
- Validation, beyond the parent chapter: a `<select>` starts with an empty `<option value="">` and
  counts as unfilled while that is selected; the constraints field never blocks and is never checked
  for content.

## Slots, second choice, and capacity

- **Always offer a second choice.** First choices collide: half a branch picks the same Tuesday
  morning. One required "prima opțiune" plus one required "a doua opțiune" lets the organiser fill
  groups without a round of e-mails. Compare the two values on submit and reject the same slot
  twice — "Alege o a doua grupă, diferită de prima."
- Slot labels carry the full date, the interval and the place: "Marți, 6 octombrie, 09:00-13:00 -
  sala Brâncuși, Sediul Central". For a location choice, list only real ones the description gives;
  do not invent branch names.
- **Capacity, honestly.** A static page cannot know how many seats are left — nobody counts the
  submissions. So: no "locuri rămase", no counter, no progress bar, no "Ultimele 3 locuri!" badge,
  and never a slot disabled as full, because you do not know that it is.
- State the rule instead: "Grupele au 12 locuri. Confirmarea locului vine pe e-mail de la echipa
  Formare." The registration is a request, not a reservation, and the confirmation says exactly
  that — never "locul tău este rezervat".
- Record in `NOTE.md`: "Capacitatea nu poate fi verificată în pagină. Numărarea locurilor și
  confirmarea se fac în sistemul care preia înscrierile."

## Privacy — non-negotiable in a bank

- No CNP, no account number, no card data, no salary, no health data. If the description asks for
  any of it, leave the field out, build the rest, and write in `NOTE.md`: "Am omis câmpul <x> -
  date personale sensibile; de discutat cu responsabilul cu protecția datelor."
- The constraints field is free text in neutral wording. Never ask for a diagnosis, a disability
  certificate or a medical reason — an accessibility need is stated, not proven.
- A visible line saying what the data is used for and how long it is kept.
- No pre-checked consent checkbox.

## What this template does not do

- It does not track capacity or seats left, and cannot close a full group — nothing counts the submissions.
- It does not reserve a place, send a calendar invitation or a confirmation e-mail.
- It does not check eligibility, prerequisites or manager approval for the course.

## Done when

- Every course option shows name, duration and level in its own label; experience is behavioural.
- First and second slot choices are both required, and validation rejects picking the same one.
- No seat counter, no "full" slot, no wording implying a reserved place.
- 8 fields at most, each justified; validation in Romanian, next to the field, keyboard accessible.
- `NOTE.md` lists the courses and slots used (and which were placeholders), the capacity rule the
  developer must enforce server-side, the storage to connect, and any field omitted for privacy.
