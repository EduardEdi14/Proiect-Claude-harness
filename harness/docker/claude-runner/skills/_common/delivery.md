# What you deliver and how you check it

## The files

Every template produces, in the root of the workspace:

```
index.html    the page, a single file, no external <script src>
style.css     the styles, starting from ../_common/libra-base.css
NOTE.md       the note for the business colleague and for the development team
```

Nothing else: no `package.json`, no `assets/` folder, no binary images (a missing image becomes a
grey placeholder box with descriptive text, so the developer knows what belongs there).

JavaScript only when the template explicitly calls for it (sorting, filtering, switching views),
written inline at the end of `<body>`, vanilla, no dependencies. The page must stay readable with
JavaScript disabled.

## `NOTE.md` structure

```markdown
# <Project name>

## What I built
Two or three sentences, in the business colleague's language.

## Assumptions
- I read "last month" as 1–31 Aug 2026.
- No figures for the West branch; that row is marked "—".

## Example data
Yes / No. If yes: where it sits in the file and what has to be replaced.

## For the development team
- Data source: pasted by hand into the description (no system connection exists).
- What to verify before publishing: <short list>.
- What I deliberately left out, and why.
```

## Final check (walk the list, do not skip it)

**Correctness**
- [ ] Every number on the page appears in the data received (or is marked as an example).
- [ ] Totals add up; percentages reach 100.
- [ ] No `NaN` or `Infinity` coordinate in the SVG.

**Self-containment**
- [ ] Zero `<link>` or `<script>` to an external domain, zero `@import`, zero `fetch`.
- [ ] Zero downloaded fonts; system font stack only.
- [ ] The page opens correctly from a local file, by double-click.

**Form**
- [ ] `<html lang="ro">`, `<meta charset="utf-8">`, `<meta name="viewport" ...>`, `<title>` with the project name.
- [ ] Correct Romanian diacritics throughout (ă â î ș ț), never the cedilla variants.
- [ ] Readable at 400px wide, with no horizontal scrolling (exception: tables, inside `.table-wrap`).
- [ ] Prints acceptably (Ctrl+P) — no cards cut in half.

**Accessibility**
- [ ] Semantic structure: exactly one `<h1>`, then `<h2>`/`<h3>` in order.
- [ ] Tables have `<th scope="col">`, a `<caption>`, and a real header row.
- [ ] Charts have `<title>`/`<desc>` and their data available as text.
- [ ] Sufficient contrast; color is never the only cue.

**Tone**
- [ ] Page copy in the colleague's language (Romanian by default), with diacritics, no English jargon.
- [ ] Titles say what the data shows, not which category it belongs to.
- [ ] Footer with the generation date and the line: "Ciornă generată automat. Echipa de dezvoltare
      o revizuiește înainte de publicare."
