# Typography

Typography carries hierarchy, readability and most of a page's personality. Use this file for font selection, type scales, readability and font loading.

## Roles before fonts

Define the roles the interface needs, then assign faces:

- **Display:** hero and section headlines on Persuade and Experience surfaces.
- **Body:** paragraphs and UI text.
- **UI and labels:** buttons, inputs, navigation, table headers.
- **Data and code:** numbers in tables, metrics, code blocks.

One family with well-chosen weights is often right for Operate and Read surfaces. Add a second family only when it does a job the first cannot, and make the contrast obvious (not two similar sans-serifs). Three families is almost always too many.

## Choosing faces

- Choose from the subject. A legal service, a skate shop and a developer tool should not share a typeface.
- Avoid using the model's default picks with no reason: Inter or Roboto for everything, Space Grotesk for "techy", Fraunces, Instrument Serif or Playfair for "premium". They are legitimate fonts; the problem is choosing them by habit. If Inter is right (a neutral, dense product UI), tune it: use `font-feature-settings` (`"cv11", "ss01"`), tighter display tracking, and the display optical size or Inter Display.
- Good sources: Google Fonts, Fontshare (free commercial use), Velvetyne, Collletttivo, and paid foundries when there is a budget. Check the license allows web embedding.
- Check language coverage (Latin Extended, Cyrillic, Greek, Arabic, CJK) for the audience before committing.
- Variable fonts: one file covers many weights. Limit axes to what you use.

## Scale and rhythm

- Body text is at least 16 px (1rem) on the web. Dense data UIs can use 13 to 14 px for secondary table text, never for primary reading.
- Use a modular ratio (1.2 for dense apps, 1.25 to 1.333 for marketing) or a hand-tuned role scale. Avoid many near-identical sizes. Adjacent steps must look clearly different.
- Fluid display type: `font-size: clamp(2.25rem, 1.5rem + 3vw, 4.5rem)`. Always bound it with `clamp`; never use raw `vw`, which breaks zoom. Keep product UI type fixed.
- Line height: body 1.5 to 1.7 (more for serif and long measure), UI text 1.3 to 1.5, display 1.0 to 1.2. Tune to the face rather than using one universal value.
- Measure: 45 to 75 characters per line (`max-width: 65ch`). Long centered paragraphs are hard to read; center only short text.
- Tracking: large display text usually wants -0.01 to -0.03em; do not go tighter than -0.04em. Small all-caps labels want +0.04 to +0.08em. Leave body text at 0.
- Space above a heading is larger than the space below it, so the heading attaches to its content.

## Hierarchy

- Use size, weight, color and space together; size alone produces shouting.
- Only one element per view should compete for maximum emphasis.
- Do not fade important metadata to illegible gray. Secondary text still needs 4.5:1 contrast.
- All caps belongs on short labels only. Never use it for sentences or long headings.

## Detail rules

- `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs to avoid widows.
- `font-variant-numeric: tabular-nums` for numbers that are compared or that update (prices, tables, timers, counters).
- Use real typographic characters: curly quotes (“ ” ‘ ’), the ellipsis character (…), the multiplication sign (×), and a non-breaking space between a number and its unit (`10&nbsp;MB`) or inside short brand phrases.
- Italic display text with descenders (g, j, p, q, y) clips at `line-height: 1`. Use at least 1.1 and add bottom padding.
- Links inside prose need more than color to be identified: an underline (`text-underline-offset: 0.2em; text-decoration-thickness: 1px`) or weight.
- Light text on dark backgrounds looks thinner. Use slightly more line height and a slightly heavier weight, and avoid hairline weights.

## Loading fonts without hurting performance

- Self-host WOFF2 files, or use `next/font`, `@fontsource` or Astro's font tooling, which self-host automatically. A third-party font CDN adds DNS, TLS and render-blocking cost and has privacy implications in the EU.
- `font-display: swap` for body text. For display faces where a late swap would shift layout noticeably, consider `optional`.
- Preload only the one or two files used above the fold: `<link rel="preload" href="/fonts/display.woff2" as="font" type="font/woff2" crossorigin>`.
- Subset with `unicode-range` to the scripts the site uses.
- Prevent layout shift from the swap with fallback metric overrides (`size-adjust`, `ascent-override`, `descent-override`). `next/font` and Fontaine generate these automatically.
- Budget: aim for under 100 KB of font files on first load.

```css
@font-face {
  font-family: "Display";
  src: url("/fonts/display-var.woff2") format("woff2");
  font-weight: 300 800;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2018-201F, U+20AC;
}
@font-face {
  font-family: "Display Fallback";
  src: local("Arial");
  size-adjust: 104%;
  ascent-override: 92%;
}
:root { --font-display: "Display", "Display Fallback", system-ui, sans-serif; }
```

## QA checklist

- Long headings wrap gracefully at 320 px with no single-word last lines.
- Button labels fit on one line at every width; shorten them if they do not.
- Table cells, badges and navigation items handle long values without breaking the layout.
- 200% browser zoom keeps text readable and the layout usable.
- Font loading causes no visible layout shift (check with `visual-check.mjs` or the DevTools Performance panel).
- The fallback font still produces an acceptable layout.
