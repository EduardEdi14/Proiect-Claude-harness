---
name: referral
description: Build a form for recommending a candidate for an open position — the role, the candidate's name and contact, a CV or LinkedIn reference, the referrer's relationship to the candidate, and a short argument. Use for "recomandă un candidat", "formular de recomandare", "program de referral", "aduci un coleg nou", "recrutare prin recomandare", "vreau să propun pe cineva pentru postul de".
---

# Candidate referral

A form on which an employee puts forward someone they know for an open position. It specialises
`../form-page/SKILL.md` — read that skill first, then apply what follows. Everything in it holds
here: the page has no server, it sends nothing anywhere, submission is intercepted with
`preventDefault()` and replaced by a confirmation, and `NOTE.md` tells the development team where
the referrals must actually go.

**Role:** Viral Mechanics & Referral Engine

This is the one template in the family that collects **another person's** personal data. The rules
below are not advice; they decide what the form may contain.

## Read first

- `../form-page/SKILL.md` — the parent skill: the hard limit on where answers go, the control
  table, the full validation chapter (do not restate it, only what differs below)
- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`, then add the form styles
- `../_common/input-data.md` — section 7, sensitive data, is mandatory here
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Decide the field set yourself, and write every decision — especially
every field you left out — into `NOTE.md`.

## Acceptance test (blocking)

Checked before a single line of markup is written, and verified again before delivery. A page that
fails any line below is not delivered.

- The referrer identifies themselves, so every referral is attributable to a person.
- The candidate's consent to being put forward is confirmed by an explicit, unchecked checkbox.
- The confirmation shows a reference the referrer can quote when following up, with a vanilla
  copy-to-clipboard button.
- No tracking of any kind: no pixel, no analytics call, no click or conversion counter. The subject
  of the data is a candidate who never visited this page.
- No QR code, and no third-party share integration — both need code or services this page cannot
  reach.

## Plan

1. **Name the programme and who receives the referral** (Recrutare) under the title.
2. **List the open positions** the description gives; do not invent roles.
3. **Collect the minimum about the candidate**: name, one contact channel, one CV reference.
4. **Ask the referrer's relationship** to the candidate and a short, job-relevant argument.
5. **Add the consent confirmation** — required, unchecked.
6. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap form-page">
  <header class="head">
    <div>
      <h1>Recomandă un candidat</h1>
      <p>Recomandările ajung la echipa Recrutare. Îți spunem în cinci zile lucrătoare în ce stadiu
         este.</p>
    </div>
  </header>

  <p class="callout no-print"><strong>Previzualizare.</strong> Recomandările nu se salvează încă -
     echipa de dezvoltare conectează formularul înainte de publicare.</p>

  <form id="f" class="card" novalidate>
    <p class="req-note">Câmpurile marcate cu <span aria-hidden="true">*</span> sunt obligatorii.</p>

    <div class="field">
      <label for="post">Pentru ce post îl recomanzi?
        <span class="req" aria-hidden="true">*</span></label>
      <select id="post" name="post" required aria-describedby="post-err">
        <option value="">Alege postul</option>
        <option value="analist">Analist credite IMM - Sediul Central</option>
        <option value="consilier">Consilier clienți - Sucursala Cluj</option>
        <option value="dezvoltator">Dezvoltator back-end - Direcția IT</option>
      </select>
      <p class="err" id="post-err" hidden>Alege postul pentru care faci recomandarea.</p>
    </div>

    <div class="field">
      <label for="cand-nume">Numele candidatului
        <span class="req" aria-hidden="true">*</span></label>
      <input id="cand-nume" name="cand_nume" type="text" required
             aria-describedby="cand-nume-err">
      <p class="err" id="cand-nume-err" hidden>Scrie numele persoanei pe care o recomanzi.</p>
    </div>

    <div class="field">
      <label for="cand-email">E-mailul candidatului
        <span class="req" aria-hidden="true">*</span></label>
      <input id="cand-email" name="cand_email" type="email" required
             aria-describedby="cand-email-ajutor cand-email-err">
      <p id="cand-email-ajutor">Recrutarea îl folosește doar ca să ia legătura cu candidatul.</p>
      <p class="err" id="cand-email-err" hidden>Scrie o adresă de e-mail, de forma
         nume@exemplu.ro.</p>
    </div>

    <div class="field">
      <label for="cv">Profil LinkedIn sau link către CV
        <span class="req" aria-hidden="true">*</span></label>
      <input id="cv" name="cv" type="url" placeholder="https://..."
             aria-describedby="cv-ajutor cv-err">
      <p id="cv-ajutor">Nu se pot atașa fișiere în această pagină. Dacă nu ai un link, scrie în
         argumentul de mai jos experiența relevantă a candidatului.</p>
      <p class="err" id="cv-err" hidden>Scrie un link care începe cu https:// sau descrie
         experiența relevantă în argument.</p>
    </div>

    <fieldset class="field">
      <legend>De unde îl cunoști? <span class="req" aria-hidden="true">*</span></legend>
      <label><input type="radio" name="relatie" value="fost-coleg" required>
        Fost coleg de muncă</label>
      <label><input type="radio" name="relatie" value="profesional">
        Din mediul profesional (conferințe, comunitate, proiecte)</label>
      <label><input type="radio" name="relatie" value="studii">
        Din perioada studiilor</label>
      <label><input type="radio" name="relatie" value="personal">
        Cunoștință personală</label>
      <p class="err" id="relatie-err" hidden>Alege cum îl cunoști pe candidat.</p>
    </fieldset>

    <div class="field">
      <label for="argument">De ce se potrivește pe acest post?
        <span class="req" aria-hidden="true">*</span></label>
      <textarea id="argument" name="argument" maxlength="700" rows="5" required
                aria-describedby="argument-ajutor argument-err"></textarea>
      <p id="argument-ajutor">Scrie despre experiență și mod de lucru, nu despre viața personală a
         candidatului.</p>
      <p class="counter" aria-live="polite">0 / 700</p>
      <p class="err" id="argument-err" hidden>Scrie câteva rânduri despre potrivirea pe rol.</p>
    </div>

    <div class="field">
      <label for="acord">
        <input id="acord" name="acord" type="checkbox" required aria-describedby="acord-err">
        Confirm că persoana recomandată știe de această recomandare și este de acord să fie
        contactată de Libra Bank. <span class="req" aria-hidden="true">*</span>
      </label>
      <p class="err" id="acord-err" hidden>Fără acordul candidatului nu putem prelua
         recomandarea.</p>
    </div>

    <p class="privacy">Datele candidatului se folosesc exclusiv pentru recrutarea pe postul
       selectat, sunt văzute doar de echipa Recrutare și se șterg la închiderea postului dacă nu se
       ajunge la o angajare.</p>

    <div class="actions">
      <button class="btn btn--primary" type="submit">Trimite recomandarea</button>
    </div>
  </form>

  <div id="ok" class="card confirm" hidden role="status">
    <h2>Mulțumim, recomandarea a fost înregistrată.</h2>
    <p>Recrutarea ia legătura cu candidatul și îți spune în ce stadiu este.</p>
  </div>

  <p class="foot-note">...</p>
</div>
```

## Third-party data — the firm rules

The candidate is not filling this form in and has not seen it. Everything follows from that.

- **The page must state that the candidate has agreed to be put forward**, as a required,
  *unchecked* checkbox the referrer ticks themselves (see the skeleton). No pre-checked box, no
  consent buried in the privacy paragraph, no implicit consent.
- **Collect only what recruitment actually needs** to make contact and read a CV: name, one contact
  channel (e-mail or phone, not both unless the description insists), one CV reference. Every extra
  field about a third party must be justified twice — by the purpose, and by the fact that the data
  subject is absent.
- **Never ask for, and never add on your own initiative:** the candidate's CNP or any ID number,
  date of birth or age, current or expected salary as a required field, a photograph, a home
  address, marital or family status, health or disability, ethnicity, religion, nationality, gender,
  union membership, political views, sexual orientation, or a criminal record. If the description
  asks for any of them, leave the field out, build the rest, and write in `NOTE.md`: "Am omis câmpul
  <x> - date personale ale unui terț / caracteristică protejată; de discutat cu responsabilul cu
  protecția datelor și cu Recrutare."
- Salary expectations belong later in the process, asked of the candidate themselves. Keep them out
  of this form entirely, required or not.
- The argument field invites job-relevant reasons and nothing about private life; the helper text
  says so.

## The CV: a link or text, never a file

A static page cannot accept an upload — there is no server to receive it, and an
`<input type="file">` that appears to work while silently dropping the file is a lie.

- One field: a LinkedIn profile URL or a link to a CV in the internal document space. If the
  referrer has no link, the relevant experience goes into the argument text instead. One of the two
  is required, not both — validate that on submit and say which is missing.
- Validate the URL loosely (an `https://` prefix and a dot). Never reject a valid LinkedIn address
  over a country prefix or a trailing slash, and never pattern-match the candidate's name — names
  carry hyphens, apostrophes and diacritics.
- Never render `<input type="file">`, a drag-and-drop zone or an "atașează CV" button.
- Validation, beyond the parent chapter: the consent checkbox is validated like any required field,
  with its message next to it — never disable the submit button instead, say why. The confirmation
  thanks the referrer; it never states that the candidate will be interviewed.
- Record in `NOTE.md`: "Încărcarea fișierului CV nu este posibilă în pagina statică. Formularul
  cere un link sau text. Uploadul real se implementează de echipa de dezvoltare, în spațiul de
  documente al Recrutării, cu drepturi de acces limitate."

## Privacy — non-negotiable in a bank

- No CNP, no account number, no card data, no salary, no health data — for the referrer and, above
  all, for the candidate.
- No photograph, no date of birth, no protected characteristic, in any form, optional or not.
- Third-party personal data is limited to name, one contact channel and one CV reference.
- The consent confirmation is required and unchecked; no pre-checked consent checkbox anywhere.
- A visible line stating the purpose, who sees the data, and how long it is kept.

## What this template does not do

- It does not accept a CV file upload, an attachment or a drag-and-drop zone — a static page has nowhere to put a file.
- It does not verify the candidate's consent, identity or anything the referrer writes about them.
- It does not enter the candidate into a recruitment system, track the referral's status, or compute a referral bonus.

## For the development team

The delivered page is a static draft: three files, no build step, no dependencies, nothing sent
anywhere.

Recommended rebuild stack: **nanoid (for short collision-resistant hashes), Web Share API**.

In the real build, referral references are short collision-resistant ids; and if referral analytics
are ever added, the candidate's data must stay out of them. Growth tracking here is not merely
unavailable, it is inappropriate: the data subject is a third party who never visited the page. The
consent checkbox stays explicit and unchecked.

Copy the stack and these constraints into `NOTE.md`, under its "For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- Only name, one contact channel and one CV reference are collected about the candidate.
- No CNP, date of birth, salary field, photograph or protected characteristic anywhere in the page.
- The consent confirmation is present, required and unchecked, with its own error message.
- The CV is a link or text; there is no `<input type="file">` in the file.
- The relationship field and the job-relevant argument are both present.
- 8 fields at most, each justified; validation in Romanian, next to the field, keyboard accessible.
- `NOTE.md` lists the fields, the fields omitted for third-party privacy and why, the CV upload the
  developer must implement with restricted access, and the storage owner in Recrutare.
