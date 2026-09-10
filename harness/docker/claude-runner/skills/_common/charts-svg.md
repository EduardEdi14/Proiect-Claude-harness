# Charts without libraries — hand-written SVG

The container has no internet and installs no packages: **Chart.js, D3, Recharts, Plotly do not
exist here**. Every chart is an inline `<svg>` with coordinates you compute yourself. It is less
work than it sounds — a column chart is `n` rectangles and a few labels.

## 1. Pick the right form

| What you show | Form | Note |
|---|---|---|
| Comparison across categories | horizontal bars | sorted descending; best when names are long |
| Change over time, few points (≤ 12) | vertical columns | months, quarters |
| Change over time, many points | line | max. 3 lines on one chart |
| Composition (parts of a whole) | 100% stacked bar | prefer it to a pie |
| A single proportion ("68% completed") | donut ring or progress bar | with one big number beside it |
| Two correlated measures | scatter | rarely needed in internal reports |
| Trend next to a number | sparkline (no axes) | 120×28 px |

Never use: 3D, a pie with more than 5 slices, dual Y axes, overlapping translucent areas,
gradients, drop shadows on bars.

## 2. The coordinate frame

All charts share one frame. A fixed `viewBox` + `width:100%` in CSS = a chart that resizes itself,
no JavaScript.

```html
<svg viewBox="0 0 720 320" role="img" aria-labelledby="g1t g1d" preserveAspectRatio="xMidYMid meet">
  <title id="g1t">Requests received, January–June 2026</title>
  <desc id="g1d">Monthly columns; the peak is March, 412 requests.</desc>
  ...
</svg>
```

Standard margins: left `L=56` (room for axis numbers), right `R=16`, top `T=16`, bottom `B=44`
(room for labels).

```
W = 720, H = 320
plotW = W - L - R = 648
plotH = H - T - B = 260
x0 = L = 56          (left edge of the drawing area)
y0 = T + plotH = 276 (baseline)
```

Converting a value `v` to a Y coordinate, with the axis starting at 0:

```
y(v) = T + plotH * (1 - v / yMax)
column height = plotH * v / yMax
```

## 3. The "round" axis maximum

Do not set `yMax = max(values)` — the tallest column would touch the edge. Round up:

```
p     = 10^floor(log10(max))          e.g. max = 412  →  p = 100
ratio = max / p                       →  4.12
step  = first of [1; 1.2; 1.5; 2; 2.5; 3; 4; 5; 10] ≥ ratio   →  5
yMax  = step * p                      →  500
```

Draw 4–5 grid lines at `yMax * k/4`, k = 0..4 (0, 125, 250, 375, 500).

## 4. Vertical columns

For `n` values: `step = plotW / n`, bar width `bw = step * 0.62`, bar `i` starts at
`x = x0 + i*step + (step - bw)/2`.

```html
<!-- 6 months, yMax = 500 -->
<g class="grid">
  <line class="grid-line" x1="56" y1="276" x2="704" y2="276"/>
  <line class="grid-line" x1="56" y1="211" x2="704" y2="211"/>
  <line class="grid-line" x1="56" y1="146" x2="704" y2="146"/>
  <line class="grid-line" x1="56" y1="81"  x2="704" y2="81"/>
  <line class="grid-line" x1="56" y1="16"  x2="704" y2="16"/>
</g>
<g class="axis" text-anchor="end">
  <text x="46" y="280">0</text>
  <text x="46" y="215">125</text>
  <text x="46" y="150">250</text>
  <text x="46" y="85">375</text>
  <text x="46" y="20">500</text>
</g>
<!-- Jan = 318:  h = 260*318/500 = 165.4 ;  y = 276 - 165.4 = 110.6 -->
<rect class="bar" x="76" y="110.6" width="67" height="165.4" rx="4"/>
<text class="axis" x="109.5" y="296" text-anchor="middle">ian.</text>
```

Round coordinates to one decimal. Rotate month labels only if they do not fit:
`transform="rotate(-35 x y)"` with `text-anchor="end"`.

## 5. Horizontal bars (comparison across categories)

Better than columns when the names are long. Reserve the left side for labels: `L=170`.
Total height grows with the number of rows: `H = 24 + n*34`.

```
bar width = (W - L - R) * v / vMax
row i y   = 12 + i*34
```

Put the value as text at the end of the bar (`x = end + 8`, `dominant-baseline="middle"`) — it
saves the reader a trip to the axis.

## 6. Line

```
x(i) = x0 + i * plotW / (n - 1)
y(v) = T + plotH * (1 - (v - yMin) / (yMax - yMin))
```

For series that do not start at 0, `yMin` may be a round threshold below the minimum — but then
say explicitly in the `figcaption` that the axis does not start at zero.

```html
<polyline class="line" points="56,180 164,150 272,96 380,120 488,88 596,74 704,60"/>
<circle cx="704" cy="60" r="4" fill="#C2182F"/>   <!-- last point, marked -->
```

Multiple series: one `<polyline>` each, `stroke` from the palette (`--s1`…`--s6`), and a text label
at the right end of each line instead of a legend when it fits.

## 7. 100% stacked bar (composition)

A single horizontal bar, 34px tall, split proportionally. Accumulate the widths:

```
width_i = plotW * v_i / total
x_i     = x0 + sum of previous widths
```

Give every segment its own `<title>` for the native tooltip, plus an HTML legend under the chart.
Segments under 4% get no inside label — they move to the legend.

## 8. Donut for a single proportion

Radius `r = 54`, circumference `C = 2πr = 339.29`.

```html
<svg viewBox="0 0 140 140" role="img" aria-labelledby="d1t">
  <title id="d1t">68% of colleagues completed the survey</title>
  <circle cx="70" cy="70" r="54" fill="none" stroke="#F0EDEB" stroke-width="16"/>
  <!-- 68% → 0.68 * 339.29 = 230.7 -->
  <circle cx="70" cy="70" r="54" fill="none" stroke="#C2182F" stroke-width="16"
          stroke-dasharray="230.7 339.29" stroke-linecap="round"
          transform="rotate(-90 70 70)"/>
  <text x="70" y="70" text-anchor="middle" dominant-baseline="central"
        font-size="26" font-weight="700" fill="#1C1B21">68%</text>
</svg>
```

For several slices, accumulate `stroke-dashoffset`: slice `i` has
`offset = -(sum of previous fractions) * C`.

## 9. Sparkline (next to a number)

```html
<svg viewBox="0 0 120 28" class="spark" role="img" aria-label="Trend over the last 6 months: rising">
  <polyline fill="none" stroke="#C2182F" stroke-width="2" points="0,22 24,18 48,20 72,11 96,13 120,5"/>
</svg>
```

No axes, no labels. Just the shape of the trend.

## 10. Accessibility — required on every chart

1. `role="img"` + `<title>` (what the chart shows) and `<desc>` (what it means).
2. Color is never the only cue: label each series, or write the values on the bars.
3. Below every chart, the same data in table form. If that would crowd the page, wrap it in
   `<details><summary>Show the data</summary>…</details>` — still accessible, still prints.
4. Text at 11px or larger; contrast at least 4.5:1 for text and 3:1 for lines.
5. No information delivered by hover alone — hover is a bonus, not the channel.

## 11. Checks before you ship

- Segments of a composition add up to exactly 100% (fix rounding on the largest slice).
- No `NaN` coordinates — they appear when `yMax = 0` or `n = 1`; handle those cases separately.
- One value only → do not draw a chart, write the number large.
- All values equal → flat chart; say so in the caption instead of forcing an axis.
- Negative values → the baseline is no longer at the bottom:
  `y(0) = T + plotH * yMax/(yMax - yMin)`, negative bars grow downward from it.
- Picture the page at 400px wide: `viewBox` + `width:100%` handles scaling, but labels under
  columns can collide — above 8 categories on a small screen, switch to horizontal bars.
