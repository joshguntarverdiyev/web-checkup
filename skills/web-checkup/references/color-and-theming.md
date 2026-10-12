# Color and Theming

Use this file for palettes, design tokens, dark mode and contrast.

## Roles, not swatches

A palette is a set of jobs. Define these roles before choosing any hue:

| Role | Purpose |
| --- | --- |
| `canvas` | Page background |
| `surface`, `surface-raised` | Panels, cards, popovers |
| `border`, `border-strong` | Separators, input outlines |
| `text`, `text-muted`, `text-subtle` | Primary, secondary and tertiary text |
| `accent`, `accent-hover`, `on-accent` | Primary actions, links, selection |
| `focus` | Focus rings |
| `success`, `warning`, `danger`, `info` | Status, each with a matching `-surface` and `on-` color |

Name tokens by role (`--color-accent`), never by value (`--blue-500`) in product UI. Theme switches remap roles; components never change.

## Building the palette

- **Derive hue from the subject,** never from the category habit (purple for AI, blue for finance, green for health). A deliberate exception must be stated.
- **One accent is usually enough.** Its rarity gives it force. Spend it on the primary action and key state, not on decoration.
- **Lock the accent page-wide.** A warm site does not get a teal badge in the footer.
- **Neutrals:** choose one gray family. Tint neutrals toward the brand hue only when it creates cohesion, and never mix warm and cool grays.
- **Use OKLCH for new web palettes.** Lightness behaves predictably, so ramps stay even and contrast is easy to tune. Reduce chroma near white and black.
- **Prefer explicit colors over stacked transparency.** Alpha overlays make contrast depend on whatever sits underneath.
- **On colored surfaces,** derive secondary text from the surface hue rather than generic gray.

```css
:root {
  --canvas: oklch(98.5% 0.004 95);
  --surface: oklch(100% 0 0);
  --text: oklch(22% 0.02 260);
  --text-muted: oklch(45% 0.02 260);
  --border: oklch(90% 0.01 260);
  --accent: oklch(55% 0.17 35);      /* chosen from the subject, not the category */
  --on-accent: oklch(99% 0 0);
  --focus: oklch(62% 0.19 250);
  --danger: oklch(55% 0.2 27);
}
```

Tailwind v4 version: put the same variables in `@theme { --color-canvas: ...; }` and use `bg-canvas`, `text-muted` and so on.

## Contrast (WCAG 2.2 AA)

| Content | Minimum ratio |
| --- | --- |
| Body text, including placeholder text that carries meaning | 4.5:1 |
| Large text (24 px regular, or 18.66 px bold, and up) | 3:1 |
| UI components, icons, input borders, focus indicators | 3:1 against adjacent colors |

- Check every state: hover, active, disabled (exempt, but still legible), selected, error, text on images, and both themes.
- Interactive states should increase contrast, not reduce it.
- APCA gives a better perceptual reading for dark themes and thin fonts. Use it as an extra check, but WCAG 2.x ratios remain the legal and audit baseline.
- Never use color as the only signal for errors, required fields, selection or chart series. Add text, an icon, shape or pattern.
- Text over photos needs a scrim, a solid backdrop or a placement that guarantees contrast at every crop.

Tools: the DevTools color picker shows contrast, WebAIM Contrast Checker, `axe` and Lighthouse.

## Dark mode

- **Decide deliberately.** Choose light, dark or system-following from the use context (who, where, what lighting), not the category. Do not ship a half-finished dark theme. One complete theme beats two broken ones.
- **Compose dark, do not invert.** Elevation gets lighter in dark mode (a raised surface is lighter than the canvas). Reduce accent saturation slightly and re-check contrast.
- **Avoid pure `#000` backgrounds and pure `#fff` body text in large areas.** Use a near-black canvas and slightly softened white text.
- **Set `color-scheme: light dark`** (or `dark`) on `:root` so scrollbars, form controls and the caret match the theme.
- **Set `<meta name="theme-color">`,** with one tag per scheme using `media`, so mobile browser chrome matches.
- **Native `<select>` on Windows** ignores the dark theme unless `background-color` and `color` are set explicitly.
- **Lock the theme across the page.** Sections do not flip between light and dark at random. One deliberate, well-transitioned flip is the exception.
- **Avoid a flash of the wrong theme:** apply the stored theme with a tiny inline script in `<head>` before first paint, or use `next-themes`.

```html
<meta name="theme-color" content="#faf9f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121214" media="(prefers-color-scheme: dark)">
```

## Browser surfaces

Theme the parts you did not draw. These are cheap signals of craft:

```css
::selection { background: color-mix(in oklch, var(--accent) 25%, transparent); }
:root { accent-color: var(--accent); caret-color: var(--accent); }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
```

## Data visualization

- Use a color-blind-safe categorical palette, and vary lightness as well as hue.
- Use sequential palettes for magnitude and diverging palettes around a meaningful midpoint.
- Add direct labels or patterns so meaning survives without color.
- Keep series colors consistent across every chart in the product.

## QA checklist

- Every color in the code maps to a token. Hard-coded values outside the token file are drift.
- The primary action is the most visually prominent element in its region, in both themes.
- All text and UI contrast checks pass in all states and themes.
- Status colors are consistent, and each status has a text or icon cue.
- No flash of the wrong theme on reload.
