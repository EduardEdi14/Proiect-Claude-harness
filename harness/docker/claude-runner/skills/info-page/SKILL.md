---
name: info-page
description: Build a single informational page — an internal announcement, a guide, a campaign or onboarding page: title, text, sections, bullet lists, contacts. Use for "pagină de informare", "anunț intern", "ghid", "prezentăm colegilor", "pagină despre...".
---

# Information page

One page that tells colleagues something: a campaign starts, a procedure changed, this is how you
ask for access. No data, no forms — text organized so it can be read in a hurry.

**Role:** Static Content & Accessibility Auditor

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/libra-base.css` — copy as `style.css`
- `../_common/input-data.md` — only if the description carries figures or a list to place in a table
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Fill in what is missing with clearly marked example text and record it
in `NOTE.md`.

## Acceptance test (blocking)

Checked before a single line of markup is written, and verified again before delivery. A page that
fails any line below is not delivered.

- The page uses real landmarks: a single `<main>`, a `<header>`, and `<section>` or `<article>` for
  each part of the content.
- Exactly one `<h1>`, and heading levels descend without skipping — no `<h3>` directly under an
  `<h1>`.
- Body text meets WCAG AA contrast against its background: at least 4.5:1, or 3:1 for large text.
  State the pair you relied on in `NOTE.md`.
- A dark-mode palette is defined under `prefers-color-scheme: dark`, with every colour given a value
  in both modes so nothing inherits a light-only colour.
- No information is carried by colour alone; anything colour-coded also has a label, icon or shape.

## Plan

1. **Find the message and the reader.** Who opens this page, and what should they do afterwards?
   That decides the title and the order of the sections.
2. **Split the text into sections** with real headings. A wall of text is not a page.
3. **Pull out the action.** If there is something the reader must do — sign up, ask for access,
   come to a meeting — it becomes a visible block near the top, not a line lost in a paragraph.
4. **Write the page**, then `NOTE.md`, then the final check.

## Page structure

```html
<div class="wrap page">
  <header class="head">
    <div>
      <p class="kicker">Campanie internă</p>
      <h1>Green Week: colectăm selectiv, 12-16 octombrie</h1>
      <p>Cine poate participa, ce se colectează și unde sunt punctele din sediu.</p>
    </div>
    <span class="period">12-16 oct. 2026</span>
  </header>

  <div class="callout">
    <strong>Ce trebuie să faci:</strong> te înscrii până vineri, 9 octombrie, prin formularul
    trimis de Administrativ.
  </div>

  <section class="section">
    <h2>Despre ce e vorba</h2>
    <p>Două-trei paragrafe scurte, în limbaj obișnuit.</p>
  </section>

  <section class="section">
    <h2>Punctele de colectare</h2>
    <ul class="list">
      <li><strong>Parter, lângă recepție</strong> - hârtie și carton</li>
      <li><strong>Etaj 3, zona de cafea</strong> - plastic și metal</li>
    </ul>
  </section>

  <section class="section">
    <h2>Întrebări frecvente</h2>
    <details><summary>Pot participa dacă lucrez hibrid?</summary>
      <p>Da, în zilele în care ești la sediu.</p></details>
  </section>

  <section class="section contact card">
    <h2>Cu cine vorbești</h2>
    <p>Ana Popescu, Administrativ - <a href="mailto:ana.popescu@libra.ro">ana.popescu@libra.ro</a></p>
  </section>

  <p class="foot-note">...</p>
</div>
```

## Rules

- **Readable line length**: text at `max-width: 68ch`. Full width belongs to tables and images,
  not to paragraphs.
- **The title says the thing**, with the date if there is one: "Green Week: colectăm selectiv,
  12-16 octombrie". Not "Informare".
- **Section headings are informative**: "Punctele de colectare", not "Detalii".
- **One call to action**, in a `.callout` near the top, repeated at the end if the page is long.
- **Dates and deadlines in full**: "până vineri, 9 octombrie 2026", never "până vineri".
- **Lists** for anything enumerable: steps, locations, conditions. Steps use `<ol>`.
- **Contacts** always as a real `mailto:` link, with name and department.
- **Images**: none available offline. Where a photo or logo belongs, insert a grey placeholder box
  with descriptive text, and note in `NOTE.md` what the developer must put there.

```html
<div class="placeholder" role="img" aria-label="Loc pentru fotografia punctului de colectare">
  imagine: punctul de colectare de la parter (de adăugat)
</div>
```

- **Long page**: over four sections, add a short table of contents with anchor links right after
  the intro.
- **No decorative filler text.** If the description is thin, write the minimum honest version and
  list in `NOTE.md` what the colleague still has to fill in.

## For the development team

The delivered page is a static draft: three files, no build step, no dependencies, nothing stored.

Recommended rebuild stack: **@tailwindcss/typography (prose), Lighthouse a11y standards**.

The same semantic structure and AA contrast must survive the rebuild, verified with an accessibility
audit rather than by eye: one `<main>` and one `<h1>`, heading levels that never skip, a dark mode
in which every colour has a value, and no meaning carried by colour alone.

Copy the stack and these constraints into `NOTE.md`, under its "For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- A colleague in a hurry gets the point from title + callout alone.
- Every section has a heading that says what is inside.
- There is exactly one action and it is impossible to miss.
- Line length is comfortable and the page prints cleanly.
- `NOTE.md` lists the placeholders (images, missing dates, unconfirmed contacts).
