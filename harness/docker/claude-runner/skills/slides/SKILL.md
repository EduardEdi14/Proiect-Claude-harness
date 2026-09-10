---
name: slides
description: Build a short HTML slide deck for an internal meeting — one idea per slide, numbers as charts, arrow-key navigation, prints one slide per page. Use for "prezentare", "slide-uri", "material pentru ședință", "am de prezentat în comitet", "PowerPoint".
---

# Presentation (slides)

A colleague has to present something in fifteen minutes. The output is one HTML file that opens
full screen, moves with the arrow keys, and prints to PDF one slide per page — no PowerPoint, no
external library.

## Read first

- `../_common/libra-identity.md` — colors, typography, tone
- `../_common/charts-svg.md` — the numbers on a slide are a chart, not a table
- `../_common/input-data.md` — reading figures, example data
- `../_common/libra-base.css` — copy as `style.css`, then add the deck styles
- `../_common/delivery.md` — deliverables and final check

You cannot ask questions. Build the whole deck and record the structure in `NOTE.md`.

## Plan

1. **Find the storyline.** A deck is an argument in order: where we are, what the problem is, what
   we propose, what it costs, what we ask for. Write the line of the argument before any slide.
2. **One idea per slide.** If a slide needs two headings, it is two slides.
3. **Set the length**: 6-12 slides. Below 6 it is a page, above 12 nobody follows.
4. **The title of each slide is the takeaway**, not a label: "Costul crește cu 18% dacă amânăm",
   not "Costuri".
5. **Build the deck**, then `NOTE.md`, then the final check.

## Deck structure

```html
<div class="deck">
  <section class="slide slide--title" id="s1">
    <p class="kicker">Comitet operațional - 12 sept. 2026</p>
    <h1>Timpul de soluționare poate scădea sub 2 zile până în decembrie</h1>
    <p class="by">Ana Popescu, Operațiuni</p>
  </section>

  <section class="slide" id="s2">
    <h2>Astăzi așteptăm în medie 2,8 zile</h2>
    <figure>
      <svg viewBox="0 0 720 300" role="img" aria-labelledby="s2t s2d">...</svg>
      <figcaption>Cereri soluționate pe zi, august 2026.</figcaption>
    </figure>
  </section>

  <section class="slide" id="s3">
    <h2>Trei sucursale produc jumătate din întârzieri</h2>
    <ul class="points">
      <li>Nord - 312 cereri întârziate</li>
      <li>Vest - 208</li>
      <li>Centru - 154</li>
    </ul>
  </section>

  <section class="slide slide--ask" id="s9">
    <h2>Ce cerem</h2>
    <p class="big">Două posturi temporare pentru trimestrul 4.</p>
  </section>
</div>

<nav class="deck-nav no-print" aria-label="Navigare prezentare">
  <button id="prev" type="button" aria-label="Slide-ul anterior">&#8592;</button>
  <span id="pos" aria-live="polite">1 / 9</span>
  <button id="next" type="button" aria-label="Slide-ul următor">&#8594;</button>
</nav>
```

## Slide styling

```css
.slide{
  min-height:100vh; display:flex; flex-direction:column; justify-content:center;
  gap:20px; padding:6vh 7vw; scroll-snap-align:start; background:var(--surface);
  border-bottom:1px solid var(--line);
}
html{scroll-snap-type:y mandatory; scroll-behavior:smooth}
.slide h1{font-size:clamp(28px,4.4vw,52px); line-height:1.15; max-width:20ch}
.slide h2{font-size:clamp(22px,3.2vw,38px); line-height:1.2; max-width:24ch; margin:0}
.points{font-size:clamp(16px,1.9vw,24px); line-height:1.7}
.slide figure svg{max-height:58vh}
.deck-nav{position:fixed; right:20px; bottom:18px; display:flex; gap:10px; align-items:center;
          background:#fff; border:1px solid var(--line); border-radius:999px; padding:8px 14px;
          box-shadow:var(--shadow); font-size:13px}

@page{ size:A4 landscape; margin:12mm }
@media print{
  html{scroll-snap-type:none}
  .slide{min-height:auto; break-after:page; border:0; padding:0 0 10mm}
  .deck-nav{display:none}
}
```

`scroll-snap` gives you the deck feel with no JavaScript at all. The script only adds the arrow
keys and the position counter:

- `ArrowRight` / `ArrowDown` / `PageDown` / `Space` move to the next slide,
  `ArrowLeft` / `ArrowUp` / `PageUp` to the previous, `Home` / `End` to the ends.
- `scrollIntoView({behavior:"smooth"})`, plus `IntersectionObserver` to keep the counter accurate
  while scrolling with the mouse.
- With JavaScript off, the deck still works: it is a scrollable page and it prints correctly.
- Do not capture keys while focus is in a form control.

## Rules

- **Little text.** A slide holds a title plus at most 5 short lines, or a title plus one chart.
  Full sentences belong in the speaker's mouth, not on the wall.
- **Numbers as a chart or as one big number.** A dense table on a slide is unreadable from the
  third row of the room; move it to the last slide, "Anexă".
- **Large type** — nothing under 16px. The `clamp()` sizes above assume a projector.
- **The last slide is the ask**: what you want from the people in the room, in one sentence.
- **No animation, no transitions, no build-up bullets.** They break printing and add nothing.
- Charts get `<title>`/`<desc>` like anywhere else; a deck is not an excuse to drop accessibility.

## Done when

- The slide titles, read one after another, tell the whole story.
- No slide holds two ideas, and none is a wall of text.
- Arrow keys and printing both work; printing gives one slide per page in landscape.
- Every figure on a slide comes from the data received, or is marked as an example.
- `NOTE.md` lists the slide order and what the presenter still has to fill in.
