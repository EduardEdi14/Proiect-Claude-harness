---
name: faq
description: Build a frequently-asked-questions page on one subject — questions grouped by theme, each collapsible, most-asked first, plus a contact for what is not covered. Use for "întrebări frecvente", "FAQ", "ne întreabă mereu aceleași lucruri", "listă de întrebări și răspunsuri", "pagină cu răspunsuri pentru colegi".
---
# FAQ page

One subject, the questions colleagues actually ask about it, each with a short answer. The reader
arrives with one specific question and leaves as soon as it is answered — the page is built for
scanning, not for reading.

**Role:** Structured SEO & Accordion Architect

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/input-data.md` — only if an answer carries figures, limits or fees to place in a table
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Fill in what is missing with clearly marked example text and record it
in `NOTE.md`.

## Acceptance test (blocking)

Check every line before you write any markup, and verify it again before delivering. A page that
fails one of these lines is not delivered.

- The page includes a `<script type="application/ld+json">` block describing a `FAQPage`, with every
  question and answer it contains.
- The structured data and the visible content match exactly — same questions, same answers, same
  wording. No question appears in one and not the other.
- Every question is a real `<details>`/`<summary>` entry, readable and answerable with JavaScript
  disabled.
- The filter input ignores diacritics and case, and shows an explicit no-results message when
  nothing matches.
- Questions are phrased the way a colleague would ask them, not as topic labels.

## Plan

1. **Name the one subject** the page covers, and put it in the `<h1>`. A FAQ about two subjects is
   two pages; if the description mixes them, build the larger one and note the other in `NOTE.md`.
2. **Extract the questions.** The description usually arrives as prose or as a list of topics —
   rewrite each into a real question in the reader's voice (see the rules below).
3. **Group by theme**, 3 to 6 questions per theme. Themes are named after what the reader is trying
   to do ("Înscriere", "Costuri", "După aprobare"), not after the internal department.
4. **Order most-asked first**, inside each group and across groups. If the description does not say
   which are most frequent, order by how early in the process the question comes up and record the
   assumption in `NOTE.md`.
5. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Întrebări frecvente</p>
      <h1>Lucrul de la distanță: întrebări frecvente</h1>
      <p>Cele mai frecvente întrebări primite de HR despre zilele de telemuncă.</p>
    </div>
    <span class="period">Actualizat: 15 septembrie 2026</span>
  </header>

  <nav class="section card" aria-label="Cuprins">
    <h2>Pe scurt, despre ce întrebi</h2>
    <ul class="list">
      <li><a href="#solicitare">Cum ceri zile de telemuncă</a> (4 întrebări)</li>
      <li><a href="#echipament">Echipament și acces</a> (3 întrebări)</li>
      <li><a href="#excepții">Situații speciale</a> (2 întrebări)</li>
    </ul>
  </nav>

  <section class="section" id="solicitare">
    <h2>Cum ceri zile de telemuncă</h2>

    <details>
      <summary>Câte zile de telemuncă pot lucra pe lună?</summary>
      <p>Opt zile pe lună, stabilite împreună cu managerul direct. Zilele nefolosite nu se
        reportează în luna următoare.</p>
    </details>

    <details>
      <summary>Cu cât timp înainte trebuie să anunț?</summary>
      <p>Cu cel puțin două zile lucrătoare înainte, prin cererea din portalul intern. Pentru
        situații urgente, un e-mail către managerul direct este suficient.</p>
    </details>

    <details>
      <summary>Managerul îmi poate refuza cererea?</summary>
      <p>Da, dacă ziua respectivă necesită prezență în sediu (audit, inventar, întâlnire cu
        clientul). Refuzul se motivează în portal.</p>
    </details>
  </section>

  <section class="section" id="echipament">
    <h2>Echipament și acces</h2>
    <details>
      <summary>Pot lua monitorul de la birou acasă?</summary>
      <p>Nu. Se scoate din sediu doar laptopul, împreună cu bonul de ieșire emis de Administrativ.</p>
    </details>
  </section>

  <section class="section contact card">
    <h2>Nu ai găsit răspunsul?</h2>
    <p>Scrie-ne la <a href="mailto:hr@libra.ro">hr@libra.ro</a> - răspundem în 2 zile lucrătoare.
      Dacă întrebarea se repetă, o adăugăm pe această pagină.</p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Writing the questions and answers

- **A question, phrased the way a colleague would type it.** "Câte zile de telemuncă pot lucra pe
  lună?" — not "Număr de zile" and not "Politica de telemuncă". Use the second person and a question
  mark in every `<summary>`.
- **One question per `<details>`.** If a `<summary>` contains "și" joining two different questions,
  split it in two.
- **Each answer is short and self-contained**: two to four sentences, no "vezi mai sus", no
  dependency on having opened another entry. The reader may land here from a direct link.
- **Answer first, condition second.** "Da, dacă…" or "Nu, pentru că…" — the first word carries the
  answer; the explanation follows.
- **Never leave a question open.** If the description does not contain the answer, write the honest
  minimum ("Se stabilește cu managerul direct.") and list it in `NOTE.md` as needing confirmation.
  Do not invent limits, fees, deadlines or approvers.
- **Limits, fees and deadlines that repeat** go into one small table inside the relevant answer
  rather than being restated in three entries — see `../_common/input-data.md` for the Romanian
  number format.
- **Table of contents** whenever there are more than three groups: a `<nav>` right after the intro,
  with anchor links and the question count per group, as in the skeleton.
- **First entry of the first group open by default** (`<details open>`) so the page does not look
  empty; everything else closed.
- **Accessibility**: `<details>` works without JavaScript — do not add any. Group headings are
  `<h2>`; the `<summary>` text is the heading of the entry, so no `<h3>` inside it.

## What this template does not do

- It is not the policy or the procedure. It answers questions about one and links to it in words;
  it never restates the full regulation or replaces the official document.
- Its filter is a convenience over the questions already on the page, not a search engine: no
  indexing, no ranking, no fuzzy matching, nothing found outside this page. Tagging and "was this
  helpful" voting need a backend — record those in `NOTE.md` under "For the development team".
- It does not answer questions about an individual's own case — no CNP, account or card numbers, no
  salary, medical or absence data, and no per-person exceptions, even if the description supplies them.

## For the development team

What you deliver is a static draft; the real FAQ page is rebuilt by the development team.
Recommended stack: **Radix UI Accordion, Schema.org FAQPage JSON-LD injector**.

What must still hold after the rebuild: keep the JSON-LD in sync with the content automatically, and
upgrade the substring filter to real fuzzy matching.

Copy both the recommended stack and those requirements into `NOTE.md`, under its
"For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- Every `<summary>` is a real question in a colleague's own words, with a question mark.
- Questions are grouped by theme and the most-asked one in each group is first.
- Every answer stands alone in two to four sentences; nothing points to another entry.
- A table of contents exists if there are more than three groups, and every anchor works.
- The "nu ai găsit răspunsul" contact block is present with a real `mailto:` link.
- The page is fully readable with JavaScript disabled.
- `NOTE.md` lists the unanswered questions, the frequency ordering assumption and any invented figures.
