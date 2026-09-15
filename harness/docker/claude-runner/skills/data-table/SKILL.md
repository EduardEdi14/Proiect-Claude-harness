---
name: data-table
description: Build a readable, searchable, sortable table page from a list the colleague pasted (Excel, CSV, or written out) — with totals, status badges and CSV export. Use for "listă", "tabel", "evidență", "situația pe sucursale", "cine a completat", "vreau să caut în listă".
---

# Data table

The colleague has a list — branches, requests, colleagues, invoices — and wants to look things up
in it instead of scrolling an Excel file. The output is one page: the table, plus the few controls
that make it usable.

**Role:** High-Performance Data Table Specialist

## Read first

- `../_common/input-data.md` — parsing the paste, missing values, sensitive data
- `../_common/libra-identity.md` — colors, tone, Romanian number formats
- `../_common/libra-base.css` — copy as `style.css`; the table styles are already in it
- `../_common/charts-svg.md` — only if the table deserves one small chart above it
- `../_common/delivery.md` — deliverables and final check

No questions can be asked. Decide and document in `NOTE.md`.

## Acceptance test (blocking)

Check every line before you write any markup, and verify it again before delivering. A page that
fails one of these lines is not delivered.

- The table is complete and readable as plain HTML with JavaScript disabled; sorting and filtering
  are enhancements, never the only way to see the data.
- Every column header sorts, is reachable by keyboard, and announces its direction with `aria-sort`.
- The global search input is debounced (roughly 200-300 ms) rather than filtering on each keystroke,
  and ignores diacritics so "Brasov" finds "Brașov".
- A search with no matches shows an explicit no-results message, never an empty table body with no
  explanation.
- The total row count is stated, and if the rendered rows are capped the page says so plainly.

## Plan

1. **Rebuild the table** from the paste: header row, columns, types (text, number, money, date,
   status). Types decide alignment and sorting.
2. **Order the columns for reading**, not as they came: identifier first, then what the reader
   looks for, then the rest. Drop columns that carry nothing (an empty column, an internal id).
3. **Decide the summary**: which columns have a meaningful total or average, and put it in `<tfoot>`.
4. **Add the controls** the size justifies (below).
5. **Write the page**, then `NOTE.md`, then the final check.

## How much interaction, by size

| Rows | What you build |
|---|---|
| under 15 | A plain table. No search, no sorting — the eye is faster |
| 15-200 | Search box + sortable columns + row counter + CSV export |
| over 200 | The same, plus a filter on the one column that matters (status, branch, month) and a note that a real application should paginate |

Everything works with plain vanilla JavaScript, inline at the end of `<body>`, no dependency.
**The full table is in the HTML** — with JavaScript off, the page is still a readable table.
That is the rule: JS enhances, it never renders.

## Page structure

```html
<div class="wrap">
  <header class="head">
    <div>
      <h1>Situația cererilor pe sucursale</h1>
      <p>128 de rânduri, actualizate manual la 10 sept. 2026.</p>
    </div>
    <span class="period">aug. 2026</span>
  </header>

  <div class="card">
    <div class="toolbar no-print">
      <label class="sr-only" for="q">Caută în tabel</label>
      <input id="q" type="search" placeholder="Caută sucursală, responsabil..." autocomplete="off">
      <select id="f-status" aria-label="Filtrează după stare">
        <option value="">Toate stările</option>
        <option>În lucru</option><option>Finalizat</option>
      </select>
      <span id="count" aria-live="polite">128 de rânduri</span>
      <button id="export" type="button">Descarcă CSV</button>
    </div>

    <div class="table-wrap">
      <table id="t">
        <caption>Cereri pe sucursale, august 2026</caption>
        <thead>
          <tr>
            <th scope="col"><button type="button" data-sort="0">Sucursala</button></th>
            <th scope="col" class="num"><button type="button" data-sort="1" data-type="num">Cereri</button></th>
            <th scope="col">Stare</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sucursala Nord</td>
            <td class="num">318</td>
            <td><span class="badge badge--ok">Finalizat</span></td>
          </tr>
          ...
        </tbody>
        <tfoot><tr><td>Total</td><td class="num">1.284</td><td></td></tr></tfoot>
      </table>
    </div>
  </div>

  <p class="foot-note">...</p>
</div>
```

## The interaction script

Keep it short, readable, commented in English, at the end of `<body>`:

- **Search** — case- and diacritic-insensitive: fold the text before comparing (replace
  the Romanian letters with their plain equivalents, or strip combining marks with
  `s.normalize("NFD").replace(/\p{Diacritic}/gu, "")`). Match across all cells of a row and
  toggle `row.hidden`.
- **Sort** — click a header to sort, click again to reverse; set `aria-sort="ascending"` or
  `"descending"` on the `<th>`; numeric columns parse the Romanian format (`"1.284,5"` becomes
  `1284.5`) before comparing; empty values always sort last, in either direction.
- **Filter** — one `<select>` per filterable column, combined with the search (a row shows when it
  passes both).
- **Counter** — "24 din 128 de rânduri", inside an `aria-live="polite"` region.
- **CSV export** — build the text from the visible rows, then `Blob` + `URL.createObjectURL`;
  separator `;` and a UTF-8 BOM (`﻿` at the start of the string) so Romanian Excel opens it
  with correct diacritics.
- **`<tfoot>` totals recompute** over the visible rows after every filter, and the label becomes
  "Total afișat" while a filter is active.

## Rules

- **Alignment**: text left, numbers right (`class="num"`, `tabular-nums`), dates left. Column
  headers align with their content.
- **Status as a badge**, never as raw text and never color-only — `.badge--ok` / `--warn` /
  `--alert`, with the word inside.
- **Money and quantities** formatted Romanian (`1.284`, `12.450,75 lei`), the unit in the header
  (`Valoare (lei)`) rather than repeated in every cell.
- **Missing values** are an em dash, never `0`, never an empty cell.
- **Long text** in a cell: keep the first ~80 characters, put the rest in `title`. Never truncate
  identifiers or names.
- **Sticky header** (already in the base CSS) so the header survives scrolling.
- **Print**: `thead` repeats on each page, controls carry `.no-print`.
- More than 8 columns: keep the essential ones and record the dropped ones in `NOTE.md`; a wide
  table stops being readable.

## For the development team

What you deliver is a static draft; the real table is rebuilt by the development team.
Recommended stack: **@tanstack/react-table (v8)**.

What must still hold after the rebuild: server-side pagination, multi-column sorting, and
virtualized rows above the row count where the browser starts to struggle.

Copy both the recommended stack and those requirements into `NOTE.md`, under its
"For the development team" heading.

## Done when

- Every line of the acceptance test passes.
- The table is complete in the HTML and readable with JavaScript disabled.
- Search, sort and filter agree with one another and the counter tells the truth.
- Totals add up, and recompute when filtered.
- The exported CSV opens in Excel with correct diacritics.
- `NOTE.md` records the column order, the dropped columns, and how missing values were handled.
