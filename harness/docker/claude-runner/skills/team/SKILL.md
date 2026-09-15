---
name: team
description: Build a page that presents a department or team on the intranet — mission, members with their roles, what they are working on now, and how you ask them for something. Use for "pagină de prezentare a echipei", "prezentăm departamentul", "cine face ce în echipă", "pagină despre echipa noastră", "pe cine întreb despre...".
---

# Team page

One page that answers a single question for the rest of the bank: *who do I talk to about X?*
Everything else — mission, projects, history — is context around that answer.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/input-data.md` — only if the member list arrived as a pasted table
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Fill in what is missing with clearly marked example text and record it
in `NOTE.md`.

## Plan

1. **Write the mission in one sentence** before anything else. If the description does not contain
   one, build it from what the team actually does and mark it in `NOTE.md` as to be confirmed.
2. **Turn every member into a role, not a title.** "Andrei Munteanu — HR Business Partner" is a
   title; "Andrei Munteanu — HR Business Partner: recrutare pentru Retail, onboarding" is a role a
   colleague can route a question to. Titles alone make the page useless.
3. **Pick the member layout**: up to 8 members → `.grid--3` of `.card`; more than 8 → a table with
   name, role, area of responsibility, contact. Never a plain bullet list of names.
4. **Find the entry point.** How does another department ask this team for something — a form, a
   mailbox, a Teams channel, an SLA? That block is the second most important thing on the page.
5. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Departament</p>
      <h1>Resurse Umane</h1>
      <p>Cine suntem, la ce lucrăm acum și cum ne ceri ceva.</p>
    </div>
    <span class="period">Actualizat: septembrie 2026</span>
  </header>

  <div class="callout">
    <strong>Misiunea noastră:</strong> aducem și păstrăm în Libra Bank oamenii potriviți, de la
    primul interviu până la planul de dezvoltare.
  </div>

  <section class="section">
    <h2>Cine face ce</h2>
    <div class="grid grid--3">
      <article class="card">
        <div class="placeholder" role="img" aria-label="Loc pentru fotografia colegului">
          fotografie (de adăugat)
        </div>
        <h3>Andrei Munteanu</h3>
        <p><strong>HR Business Partner - Retail</strong></p>
        <p>Recrutare pentru sucursale, onboarding, discuții de carieră.</p>
        <p class="note">Întreabă-l despre: posturi deschise în Retail, evaluări.</p>
        <p><a href="mailto:andrei.munteanu@libra.ro">andrei.munteanu@libra.ro</a> - int. 4120</p>
      </article>
      <article class="card">
        <h3>Ioana Dinu</h3>
        <p><strong>Specialist Învățare și Dezvoltare</strong></p>
        <p>Catalogul de cursuri, bugetul de training, certificări.</p>
        <p class="note">Întreabă-o despre: înscrieri la cursuri, cereri de certificare.</p>
        <p><a href="mailto:ioana.dinu@libra.ro">ioana.dinu@libra.ro</a> - int. 4127</p>
      </article>
    </div>
  </section>

  <section class="section">
    <h2>La ce lucrăm acum</h2>
    <ul class="list">
      <li><strong>Program de mentorat</strong> - pilot cu 20 de colegi, până în decembrie 2026.
        Responsabil: Ioana Dinu.</li>
      <li><strong>Revizuirea fișelor de post din Retail</strong> - în curs, termen 30 noiembrie 2026.
        Responsabil: Andrei Munteanu.</li>
    </ul>
  </section>

  <section class="section card">
    <h2>Cum ne ceri ceva</h2>
    <ol class="list">
      <li>Pentru recrutare: formularul de cerere de post, trimis către HR Business Partnerul zonei.</li>
      <li>Pentru cursuri: e-mail la <a href="mailto:training@libra.ro">training@libra.ro</a>.</li>
      <li>Pentru orice altceva: <a href="mailto:hr@libra.ro">hr@libra.ro</a>, răspundem în 2 zile lucrătoare.</li>
    </ol>
  </section>

  <section class="section contact card">
    <h2>Contact general</h2>
    <p>Resurse Umane, etaj 4 - <a href="mailto:hr@libra.ro">hr@libra.ro</a> - int. 4100</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Roles and routing

- **Every member gets an "Întreabă-l/o despre:" line** with two or three concrete subjects. This is
  the whole point of the page; a card without it is not finished.
- **No duplicate ownership.** If two members appear to cover the same subject, split it by segment
  (Retail / Corporate, sucursale / centrală) or by step in the process, and note the guess in
  `NOTE.md`.
- **Order members by how often they are contacted**, not by seniority. The team lead can sit first
  only if colleagues actually write to the lead first.
- **Photos**: none available offline. Use a `.placeholder` box in each card, or omit photos from all
  cards — never some with and some without. Record the choice in `NOTE.md`.
- **Current work items** each carry an owner and a horizon ("termen 30 noiembrie 2026"). An item
  without an owner is a paragraph, not a project.
- **Contacts** always as a real `mailto:` link plus extension if known. Prefer a team mailbox over a
  personal address for the general contact, so the page survives people leaving.

## Privacy

- Work contact only: name, role, work e-mail, extension, floor. Nothing else.
- Never personal phone numbers, home addresses, dates of birth, CNP, salary or grade, performance
  ratings, medical or absence information — even if the description contains them. Drop them
  silently from the page and say in `NOTE.md` that they were removed.
- If the description lists people who have left, do not publish them; list the names in `NOTE.md`
  for the development team to confirm.

## What this template does not do

- It does not connect to the HR system or the directory. The member list is what the colleague
  pasted, and the page is static — say so in the footer note.
- It does not publish photos, an org chart image or any binary asset. Where one belongs, a marked
  `.placeholder` box goes instead, described in `NOTE.md`.
- It does not build a request form. If the description asks colleagues to submit something, link the
  existing channel and record the form request in `NOTE.md` under "For the development team".

## Done when

- A colleague who knows nothing about the team can name the right person for their question in
  under 15 seconds.
- Every member has a specific role and an "Întreabă-l/o despre" line; no title-only cards.
- The mission is one sentence and sits in the `.callout` near the top.
- Every current work item has an owner and a deadline.
- No personal or sensitive data anywhere on the page.
- `NOTE.md` lists placeholders, the photo decision, invented roles and anything removed for privacy.
