# Libra visual identity (mandatory in everything you generate)

The generated page is an internal bank document. It must look like it came from the same hand as
the rest of the Libra Maker application: sober, airy, no decorative effects.

## Colors

| Role | Value | Where |
|---|---|---|
| Libra red | `#C2182F` | main accent, marked section titles, first chart series |
| Dark red | `#8E1226` | links, hover |
| Coral | `#E0503F` | secondary accent, rare |
| Ochre | `#E8A33C` | warm highlights, **fill only**, never text or thin lines |
| Ink (text) | `#1C1B21` | all primary text |
| Muted text | `rgba(28,27,33,.55)` | subtitles, notes, axis labels |
| Page background | `#F7F4F2` | body |
| Surface | `#FFFFFF` | cards, tables |
| Line | `rgba(28,27,33,.07)` | borders, grid |

For multi-series charts, the categorical palette, in this order:

```
1 #C2182F  Libra red      4 #3F5C9A  indigo
2 #2F6F5E  teal           5 #7A4A6E  plum
3 #E8A33C  ochre          6 #6E7A3F  olive
```

Color rules:
- Color encodes a variable. If every column means the same thing, they are all red.
- Maximum 6 colored categories. Beyond 6, group the rest into "Other" (grey `#B9B4B1`).
- Green/red for good/bad only when doubled by a sign (`+` / `−`) or an arrow, so it still reads
  for someone with color vision deficiency.

## Typography

```css
--font: "Plus Jakarta Sans", Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
```

Fonts are **not downloaded** (the container has no internet). Keep the stack above; if Plus Jakarta
Sans is missing on the colleague's machine it falls back gracefully to the system font. No `@import`,
no `<link>` to Google Fonts — that request would fail silently.

Scale: page title 28px/700, section title 18px/700, card title 14px/700, body 14px/1.6, note 12px,
big metric number 30–34px/700 with `font-variant-numeric: tabular-nums`.

## Tone

The audience is a business colleague, not a developer.

- Short, direct sentences. **Write the page in the language the colleague used in the description —
  Romanian by default, with correct diacritics (ă â î ș ț).**
- No jargon ("KPI", "insight", "stakeholder", "conversion"). Say "indicator", "what this shows",
  "who is involved", "how many people answered".
- Titles state the conclusion, not the category: "Requests dropped 12% in August", not "Requests chart".
- No emoji, no shouting caps, no exclamation marks.

## Number and date formatting (Romanian conventions)

- Numbers: `1.234,56` (dot for thousands, comma for decimals). Write digits already formatted in the HTML.
- Money: `1.250 lei` or `1.250 RON` — consistent across the whole page.
- Percentages: `12,4%`.
- Dates: `4 sept. 2026`; ranges: `1–31 aug. 2026` (en dash).
- Short month names: ian., feb., mar., apr., mai, iun., iul., aug., sept., oct., nov., dec.

## Visual structure

One screen, max width `1180px`, centered, `24px` side padding. Hierarchy: header (title + period +
source note) → content → footer with the generation date and the note that this is a draft the
development team reviews.

Cards: white background, `border-radius: 16px`, `border: 1px solid rgba(28,27,33,.07)`,
`padding: 18px 20px`, subtle shadow `0 10px 28px rgba(28,27,33,.06)`. No gradients, no 3D,
no animation beyond a 120ms hover transition.

Starter CSS, ready to copy into `style.css`: `../_common/libra-base.css`.
