---
name: onboarding
description: Build a welcome page for newly joined colleagues — first day, first week and first month as a timeline, who is responsible for what, a checklist of system accesses to request and who to ask when stuck. Use for "pagină de onboarding", "ghid pentru colegii noi", "primele zile", "bun venit în echipă", "ce face un coleg nou", "integrare nou angajat", "checklist pentru începători", "de la ce cer acces".
---

# Onboarding page

One page a colleague reads on their first morning. A specialisation of `info-page` where the
reader is new and slightly anxious: **order and tone carry the page**. A checklist they can work
through beats three paragraphs explaining the same thing.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Where a name, tool or deadline is missing, write a clearly marked
example and list it in `NOTE.md` for the colleague to replace.

## Plan

1. **Decide who the reader is** — a new colleague in a specific team, or anyone joining the bank.
   That decides how specific the timeline can be.
2. **Build the timeline in real order**: first day, first week, first month. Never a jumbled list
   of everything that has to happen eventually.
3. **Separate what they do from what happens to them.** Tasks for the reader go in the checklist;
   things IT or HR do for them go in the timeline with the responsible person named.
4. **Collect the accesses** into one checklist: system, who approves it, how it is requested.
5. **End with help** — the concrete person or channel for "nu știu ce să fac acum".
6. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Bun venit</p>
      <h1>Primele zile la Libra Bank: ghidul colegului nou</h1>
      <p>Ce se întâmplă în prima zi, prima săptămână și prima lună, la ce ceri acces și pe cine
         întrebi când te blochezi.</p>
    </div>
  </header>

  <div class="callout">
    <strong>Dacă citești asta în prima dimineață:</strong> nu trebuie să faci nimic singur astăzi.
    Te caută Ana Popescu (Resurse Umane) la ora 09:30, la recepție, parter.
  </div>

  <section class="section">
    <h2>Prima zi</h2>
    <ol class="list">
      <li><strong>09:30</strong> - primire la recepție, semnarea documentelor de angajare.</li>
      <li><strong>10:30</strong> - legitimația de acces și laptopul, de la IT Support, etaj 2.</li>
      <li><strong>11:30</strong> - tur de sediu, prezentarea echipei și prima discuție cu
        managerul direct despre ce urmează în prima lună.</li>
    </ol>
  </section>

  <section class="section">
    <h2>Prima săptămână</h2>
    <ol class="list">
      <li>Cursurile obligatorii din platforma internă de training (aprox. 4 ore).</li>
      <li>Discuție 1:1 cu fiecare coleg din echipă, câte 30 de minute.</li>
      <li>Configurarea accesului la aplicațiile de lucru (vezi lista de mai jos).</li>
    </ol>
  </section>

  <section class="section">
    <h2>Prima lună</h2>
    <ol class="list">
      <li>Preiei primele sarcini proprii, împreună cu mentorul tău.</li>
      <li>Ședință de feedback la 30 de zile, cu managerul direct.</li>
    </ol>
  </section>

  <section class="section">
    <h2>Cine răspunde de ce</h2>
    <div class="card">
      <h3>Resurse Umane - Ana Popescu</h3>
      <p>Contract, legitimație, beneficii, zile libere.
        <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a></p>
    </div>
    <div class="card">
      <h3>IT Support - Mihai Ionescu</h3>
      <p>Laptop, conturi, parole, VPN. <a href="mailto:itsupport@libra.ro">itsupport@libra.ro</a></p>
    </div>
    <div class="card">
      <h3>Mentorul tău - stabilit de manager în prima zi</h3>
      <p>Întrebările de zi cu zi despre cum lucrăm. (de completat)</p>
    </div>
  </section>

  <section class="section">
    <h2>Accese de cerut</h2>
    <ul class="list checklist">
      <li><label><input type="checkbox"> <strong>Cont de e-mail și Teams</strong> - creat automat
        de IT în prima zi</label></li>
      <li><label><input type="checkbox"> <strong>VPN</strong> - cerere în portalul IT, aprobă
        managerul direct</label></li>
      <li><label><input type="checkbox"> <strong>Platforma de training</strong> - acces de la
        Resurse Umane</label></li>
      <li><label><input type="checkbox"> <strong>Aplicațiile echipei</strong> - listă dată de
        manager, cerere în portalul IT</label></li>
    </ul>
    <p class="foot-note">Bifele sunt doar pentru tine, pe acest calculator - nu se salvează
      nicăieri și nu le vede nimeni.</p>
  </section>

  <section class="section contact card">
    <h2>Când te blochezi</h2>
    <p>Orice întrebare, oricât de mică: scrie-i mentorului sau lui Ana Popescu, Resurse Umane -
      <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a> · interior 215.
      Nu există întrebare pusă prea devreme.</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Onboarding rules

- **Chronology is not optional.** Sections run first day → first week → first month, and steps
  inside each are `<ol>` in the order they happen. Hours on day one, days on the week.
- **The checkbox list is local and stateless.** Plain `<input type="checkbox">` with a `<label>`
  around each item, no JavaScript, no storage, and a `.foot-note` saying nothing is saved or seen
  by anyone. The page must read fine with the boxes ignored.
- **Every step has an owner or a place**: who meets you, on which floor, from whom you get the
  laptop. "Primești acces" without a source is not an instruction.
- **Tone is calm and second person singular** ("primești", "te caută"), never imperative stacks
  and never bank jargon or English terms the reader has not met yet. Expand an abbreviation the
  first time it appears.
- **Make it safe to ask.** The closing section says explicitly that questions are expected.
- **No personal data anywhere.** It never asks the reader to enter CNP, ID series, IBAN, card
  details, salary or health information — those go through HR's own channels, which the page names.
- **Do not invent internal system names.** If the description does not name the tools, write
  "aplicațiile echipei (de completat)" and list it in `NOTE.md`.

## What this template does not do

- It does not create accounts or submit access requests — the checklist tells the reader where to ask; nothing on the page reaches a system.
- It does not hold employment paperwork, contracts or any personal data of the new colleague; those stay with Resurse Umane.
- It does not collect the reader's answers or progress: checkbox state lives only in their browser view and is never sent or stored.

## Done when

- The reader knows exactly what happens in the next hour, not just this month.
- Sections are in chronological order and every step is numbered.
- Every responsibility area has a name and a `mailto:`.
- The access checklist says, for each item, who requests it and who approves it.
- The page states that nothing is saved and that asking questions is expected.
- `NOTE.md` lists every invented name, tool or hour the colleague must confirm.
