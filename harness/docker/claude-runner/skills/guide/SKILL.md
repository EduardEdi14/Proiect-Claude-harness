---
name: guide
description: Build a step-by-step how-to guide that teaches a colleague to do something — request an access right, use an internal application, follow a process end to end: what you need before starting, numbered steps with what you see after each one, troubleshooting and where to ask for help. Use for "ghid", "ghid pas cu pas", "cum se face", "instrucțiuni", "tutorial", "cum cer acces la", "cum folosesc aplicația", "manual de utilizare", "pași de urmat", "vreau un ghid pentru colegi".
---

# How-to guide

One page that teaches a colleague to do a task on their own: request access, use an internal system,
run through a process. A specialisation of `info-page` where the spine of the page is the
**sequence of steps**, and each step tells the reader both what to do and what they should see
afterwards, so they know it worked before moving on.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/delivery.md` — deliverables and final check
- `../_common/input-data.md` — only if the description carries a list of fields, codes or values to place in a table

You cannot ask questions. Where the description skips a step, a screen name or a menu label, write
the step with clearly marked example text (`[de confirmat]`) and list it in `NOTE.md`.

## Plan

1. **State the outcome.** One sentence: what the reader will have done by the end ("vei avea acces
   la raportul X"), plus roughly how long it takes and whether an approval is involved.
2. **List the prerequisites.** Accounts, rights, data, devices, approvals the reader needs *before*
   step 1. Anything the reader has to fetch mid-way belongs here instead.
3. **Cut the description into steps**, in the order actually performed. One action per step.
4. **For every step, write the result** — what appears on screen, what e-mail arrives, what changes.
5. **Collect the failure modes** into a troubleshooting section: the three or four things that
   realistically go wrong, and what the reader does about each.
6. **Name where to ask for help** — one team, one person, one `mailto:`.
7. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Ghid pas cu pas · Acces aplicații</p>
      <h1>Cum ceri acces la aplicația de raportare CRM</h1>
      <p>La final vei avea drept de citire în CRM Raportare. Durează ~10 minute de completat și
         1-2 zile lucrătoare până la aprobare.</p>
    </div>
  </header>

  <div class="callout">
    <strong>Înainte de a începe</strong> ai nevoie de aprobarea șefului direct. Fără ea, cererea
    se închide automat după 5 zile (vezi „Dacă ceva nu merge”).
  </div>

  <section class="section">
    <h2>De ce ai nevoie înainte să începi</h2>
    <ul class="list">
      <li>Utilizator de domeniu activ (același cu care te loghezi pe laptop).</li>
      <li>Numele complet al șefului direct, care aprobă cererea.</li>
      <li>Codul centrului de cost al echipei tale - îl găsești în fluturașul de salariu.</li>
      <li>Acces la rețeaua internă: din afara băncii, conectat pe VPN.</li>
    </ul>
  </section>

  <section class="section">
    <h2>Pașii</h2>
    <ol class="list steps">
      <li>
        <strong>Deschide portalul intern</strong> la adresa <code>intranet.libra.ro/acces</code>.
        <p><em>Ce vezi:</em> pagina „Cereri de acces”, cu numele tău afișat sus, în dreapta.</p>
      </li>
      <li>
        <strong>Apasă butonul „Cerere nouă”</strong> și alege din listă
        <strong>CRM Raportare</strong>.
        <p><em>Ce vezi:</em> formularul se deschide cu departamentul tău completat automat.</p>
        <div class="placeholder" role="img"
             aria-label="Loc pentru captura de ecran a formularului de cerere">
          captură de ecran: formularul „Cerere nouă”, cu lista de aplicații deschisă (de adăugat)
        </div>
      </li>
      <li>
        <strong>Alege tipul de drept: „Citire rapoarte”.</strong>
        <p><em>Ce vezi:</em> sub câmp apare textul „Aprobare necesară: șef direct”.</p>
      </li>
      <li>
        <strong>Scrie motivul cererii</strong> într-o propoziție, legată de activitatea ta:
        „Am nevoie de raportul de vânzări lunar pentru sucursala Timișoara”.
        <p><em>Ce vezi:</em> butonul „Trimite” devine activ.</p>
      </li>
      <li>
        <strong>Trimite cererea.</strong>
        <p><em>Ce vezi:</em> un număr de cerere de forma <code>ACC-2026-01234</code> și un e-mail
           de confirmare în maximum 5 minute. Notează numărul.</p>
      </li>
      <li>
        <strong>Așteaptă aprobarea șefului direct.</strong>
        <p><em>Ce vezi:</em> un al doilea e-mail, „Cerere aprobată”, în 1-2 zile lucrătoare.
           Accesul este activ la următoarea logare.</p>
      </li>
    </ol>
  </section>

  <section class="section">
    <h2>Dacă ceva nu merge</h2>
    <details><summary>Aplicația nu apare în lista de la pasul 2</summary>
      <p>Înseamnă că nu e disponibilă pentru departamentul tău. Scrie-i echipei IT Support cu
         numele aplicației și departamentul tău.</p></details>
    <details><summary>Nu primesc e-mailul de confirmare de la pasul 5</summary>
      <p>Verifică folderul Spam. Dacă nu e nici acolo, cererea nu s-a trimis: reia de la pasul 2.</p></details>
    <details><summary>Au trecut mai mult de 2 zile lucrătoare și nu am aprobare</summary>
      <p>Trimite numărul cererii șefului direct; aprobarea îi apare în portal, la „Aprobările mele”.
         După 5 zile lucrătoare cererea se închide automat și trebuie reluată.</p></details>
    <details><summary>Am acces, dar raportul e gol</summary>
      <p>Drepturile se propagă la următoarea logare. Ieși din aplicație, intră din nou și, dacă tot
         e gol, contactează IT Support cu numărul cererii.</p></details>
  </section>

  <section class="section contact card">
    <h2>Unde ceri ajutor</h2>
    <p>IT Support - <a href="mailto:itsupport@libra.ro">itsupport@libra.ro</a> · interior 400,
       luni-vineri 08:00-18:00. Menționează numărul cererii.</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Rules for steps

- **One action per step.** If a step contains "și apoi", split it. A step the reader cannot finish
  in one sitting at the screen is two steps.
- **Every step states its result.** A short "*Ce vezi:*" line naming the screen, the message, the
  e-mail or the status that proves the step worked. A step with no observable outcome is a step the
  reader cannot verify — either give it one or merge it into the next.
- **Steps are an `<ol>`** so they can be cited ("blochează-te la pasul 4"), in the order performed.
  Never bullets, never a paragraph describing the flow.
- **Prerequisites come before step 1**, all of them. Nothing the reader must go fetch may first
  appear in the middle of the sequence.
- **Name things exactly as they appear on screen**: button labels, menu names and field names in
  quotes or `<strong>`, addresses and codes in `<code>`. "Apasă butonul «Cerere nouă»", not
  "inițiază procesul".
- **Second person, imperative, present tense**: "Deschide", "Alege", "Trimite".
- **Screenshots**: no images exist offline. Where one belongs, insert a `.placeholder` box that
  describes the exact screen and the step it illustrates, and record it in `NOTE.md`:

```html
<div class="placeholder" role="img" aria-label="Loc pentru captura de ecran a pasului 2">
  captură de ecran, pasul 2: formularul „Cerere nouă”, cu lista de aplicații deschisă (de adăugat)
</div>
```

- **Troubleshooting mirrors the steps.** Each entry names the step that fails ("pasul 2"), the
  symptom in the reader's words, and one concrete action — retry, wait, or contact whom.
- **Timings are explicit** where the reader waits: "1-2 zile lucrătoare", "în maximum 5 minute".
  A wait with no duration reads as a failure.
- **No step invents a system.** If the description does not give a screen name, a URL or an
  approver, write `[de confirmat]` in the step and list it in `NOTE.md` rather than guessing.

## What this template does not do

- It does not perform the steps or connect to any internal system: there is no network in the container, so the guide describes the flow, it never executes it.
- It does not include real screenshots — every image is a grey placeholder box the development team replaces before publishing.
- It does not verify that the procedure is current; the process owner must confirm screen names, approvers and timings, which the guide marks as `[de confirmat]` where the description was silent.

## Done when

- The reader knows, from the header alone, what they will have achieved and how long it takes.
- Every prerequisite sits before step 1.
- Every step is one action and says what the reader should see afterwards.
- Buttons, menus, fields and addresses are written exactly as on screen.
- Troubleshooting covers the realistic failures, each pointing at the step it concerns.
- One named help channel with a working `mailto:` and its working hours.
- `NOTE.md` lists the screenshot placeholders, the `[de confirmat]` items and any assumed timing.
