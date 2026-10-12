# Responsive: Mobile, Tablet and Wide Screens

Responsive work is not adding breakpoints. It means the product stays understandable, usable and polished with real content, touch input, browser chrome and constrained space. Tablets are the most neglected size class, so test them explicitly.

## Viewport setup

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Never add `maximum-scale=1` or `user-scalable=no`. Blocking zoom fails WCAG 1.4.4 and frustrates low-vision users. Fix iOS input zoom with 16 px input text instead.

## Widths to check

| Class | Widths (CSS px) | Watch for |
| --- | --- | --- |
| Small phone | 320, 360 | Clipped buttons, overflowing headlines, cramped navigation (320 is the WCAG reflow baseline) |
| Phone | 375, 390, 414, 430 | Primary action reachable, sticky bars covering content |
| Phone landscape | 667 to 932 wide by about 375 tall | Hero and modals taller than the screen, fixed headers eating height |
| Tablet portrait | 768, 810, 820, 834 | Awkward two-column layouts, oversized cards, desktop nav crammed in |
| Tablet landscape and small laptop | 1024, 1112, 1180, 1280 | Hover-dependent UI on touch screens, sidebar plus content squeeze |
| Desktop | 1280, 1440 | Reading measure, alignment, density |
| Wide | 1920, 2560 (simulate with 50% browser zoom) | Content sprawl, tiny centered islands, stretched images |

`visual-check.mjs` captures 375, 768, 1024, 1280 and 1440 by default. Read every screenshot yourself.

## Breakpoints

- Let content decide. Add a breakpoint where the layout breaks, not at device widths.
- Mobile-first: base styles for small screens, `min-width` queries upward.
- Prefer container queries for components used in different contexts.
- Collapse navigation when it stops fitting on one line, not at an arbitrary width. Many sites need the hamburger up to about 1024 px.

## Tablet-specific rules

- iPads report desktop-class browsers and have fine and coarse pointers. Do not detect devices; detect capabilities: `@media (hover: hover) and (pointer: fine)` for hover effects, `(pointer: coarse)` for bigger targets.
- Every hover-revealed control (row actions, tooltips, menus) needs a tap or focus path.
- Avoid two narrow columns at 768 to 900 px. Use one comfortable column or an asymmetric split.
- Card grids usually go 1, then 2 (around 640 px), then 3 (around 1024 px). Avoid three cramped columns at 768.
- Split-view and sidebar apps: collapse the sidebar to icons or a drawer below about 1024 px.

## Mobile patterns

- **Full-height sections:** `min-height: 100dvh` (dynamic), or `100svh` when you need the small viewport. Never use `100vh`, which ignores the browser bars.
- **Notches and home indicators:** pad fixed elements with `env(safe-area-inset-*)`, and add `viewport-fit=cover` only when you handle the insets.
- **Touch targets:** 44×44 px minimum on touch layouts, with at least 8 px between adjacent targets.
- **Inputs:** 16 px or larger text, the correct `type` and `inputmode`, and labels above the field. Make sure the focused field stays visible above the on-screen keyboard.
- **Sticky CTAs:** only when they do not cover form fields or content, and account for the safe area.
- **Tables:** prioritize columns, scroll horizontally in a labeled container (`role="region" aria-label="..." tabindex="0"`), or convert to cards.
- **Modals:** become full-screen sheets on phones, with internal scrolling and `overscroll-behavior: contain`.
- **Navigation:** expose the two or three most important actions without opening a menu. The menu is keyboard accessible, traps focus and closes with Escape.
- **Desktop-only effects** (parallax, cursor effects, heavy WebGL) are disabled or simplified on small and low-power devices.

## Fluid techniques

- Images: `max-width: 100%; height: auto;`, plus `srcset` and `sizes` so phones download small files.
- Type: bounded `clamp()` for display sizes only.
- Spacing: section padding can scale with `clamp()`. Component padding stays fixed.
- Use `aspect-ratio` for media and embeds to reserve space and prevent layout shift.
- `<picture>` for art direction, with a different crop on mobile.

## Finding horizontal overflow

Run this in the browser console at 320 and 375 px to find the elements that cause sideways scroll:

```js
[...document.querySelectorAll('body *')]
  .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
  .map(el => [el, el.getBoundingClientRect().right]);
```

Common causes are fixed widths, long URLs or words (fix with `overflow-wrap: anywhere`), `100vw` elements next to a scrollbar, negative margins, wide tables and pre-formatted code. Do not hide overflow with `overflow-x: hidden` on `body` without fixing the cause, because it breaks `position: sticky`.

## Content stress tests

At every class, try long names, emails, URLs, prices and numbers; missing images and avatars; zero, one and many items; translated strings 30% longer; 200% text zoom; validation errors under inputs; toasts and modals while the mobile keyboard is open; slow 3G loading (DevTools throttling); and landscape orientation. Do not lock orientation.

## QA checklist (blocking)

- No horizontal scroll at 320 px or any wider width, except intentional scroll regions.
- No clipped or overlapping text, buttons, badges or navigation at any width.
- The primary action is visible and reachable on a phone without opening a menu.
- Touch targets are at least 44 px on touch layouts and 24 px everywhere.
- Hover-only functionality has a touch and keyboard equivalent.
- Fixed and sticky elements never cover content, focus or form fields.
- Zoom is not disabled. 200% zoom and 320 px reflow keep everything usable.
- Tablet portrait and landscape were checked explicitly.
