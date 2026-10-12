# Layout and Composition

Layout turns priorities into reading order. Use this file for spacing, grids, hero composition, section rhythm and density.

## Diagnose before moving boxes

Answer these with screenshots or computed values:

- **Squint test:** blur the page. Can you still find the primary element, the secondary one and the major groups, in that order?
- **Grouping:** are related items close and unrelated groups clearly separated, or are borders and cards compensating for weak proximity?
- **Rhythm:** is there a deliberate contrast between tight and generous spacing, or one value repeated until everything has equal weight?
- **Structure:** does the layout match the content? Are the repeated cards and columns genuinely equivalent items?
- **Density:** does the amount of information fit the visitor mode (Persuade is airy, Operate is dense)?

## Spacing system

Use a 4 px base scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`. Avoid one-off values like 15, 18 or 27 unless an existing system uses them.

- Related items sit closer together than unrelated ones. Section gaps are clearly larger than item gaps.
- Use `gap` for sibling rhythm instead of margins on children.
- Products with long-form content may need two scales: a type-driven one for prose and a 4 px module scale for UI.

## Grids and containers

- Use CSS Grid for two-dimensional layouts. Avoid percentage flex math like `w-[calc(33%-1rem)]`.
- Content width: about 65ch for prose, 1100 to 1280 px for marketing content, and full width with sensible maximums for dashboards.
- Prefer container queries (`@container`) for components that appear in several contexts.
- Let the browser size things. Do not measure the DOM in JavaScript to lay out content.

## Hero discipline (Persuade surfaces)

- The hero fits the first viewport at 1280×720 and on a phone: headline at most 2 lines on desktop, supporting copy of about 25 words, CTAs visible without scrolling.
- At most four text elements: an optional short label or brand line, the headline, the supporting copy, and the CTAs (one primary and at most one secondary).
- Logo walls, pricing teasers, feature bullets and avatar rows belong in sections below the hero, not inside it.
- Plan headline size and visual size together. A long headline next to a large image cannot also be 7xl.
- Keep top padding modest (about 96 px maximum on desktop). A hero floating halfway down the viewport reads as a bug.
- Use `min-height: 100dvh` (or `svh`) for full-height sections, never `100vh`, which jumps behind mobile browser bars.

## Section rhythm

- Vary layout families down a long page. Do not repeat the same family (three equal cards, image and text split, centered quote) back to back. An eight-section page should use four or more distinct compositions.
- Limit zigzag image and text splits to two in a row.
- A bento grid has exactly as many cells as you have real content. No filler or empty tiles.
- Use eyebrow labels sparingly: at most one per three sections, and only when the label adds information.
- A section header is one focused message. Stack the headline and its explanation; a tiny paragraph floating in the top-right corner of a section is a tell.

## Cards and containers

- Cards represent repeated objects (products, posts, files) or contained tools. Use page sections as full-width bands or unframed layouts.
- Never nest cards. Group inner content with spacing, dividers or headings instead.
- Declare elevation once: border or shadow, rarely both. Shadows, when used, have offset and blur (`0 1px 2px` plus `0 8px 24px` at low alpha), tinted toward the background hue.
- Radius system: pick a rule and keep it (for example 6 px controls, 10 px cards, full radius only for pills and avatars). Nested radius equals the outer radius minus the padding, so curves stay concentric.

## Navigation and chrome

- Desktop navigation fits on one line. If it does not, shorten labels, drop secondary items or collapse it earlier.
- Header height of 56 to 72 px. A sticky header must not cover focused elements or anchor targets: set `scroll-margin-top` on headings.
- The footer carries real navigation, contact, legal links and social proof, not decorative strips.

## Layers

Define a z-index scale once and use only its tokens:

```css
:root { --z-dropdown: 10; --z-sticky: 20; --z-overlay: 30; --z-modal: 40; --z-toast: 50; }
```

Random `z-50` and `z-[9999]` values are drift.

## Alignment and optics

- Everything aligns to something: the grid, a text edge or an optical center.
- Icons beside text align to the cap height or text center, not the line box. Nudge by a pixel when the eye disagrees with the math.
- Numbers in columns align right with tabular figures.

## Density by mode

| Mode | Section padding (desktop) | Typical gap | Notes |
| --- | --- | --- | --- |
| Persuade and Experience | 96 to 160 px | 24 to 48 px | Generous, with one focal element per section |
| Read | 48 to 96 px | 16 to 24 px | Driven by measure and a calm rhythm |
| Operate | 16 to 32 px | 8 to 16 px | Dense, aligned, stable dimensions, no giant cards |

## QA checklist

- No accidental horizontal scroll at any width (see [responsive.md](responsive.md)).
- Spacing values come from the scale.
- The primary action and the main content win the squint test.
- Sticky and fixed elements never cover content, focused elements or form fields.
- Long content, empty states and translated strings do not break the structure.
- DOM order, focus order and visual order agree.
