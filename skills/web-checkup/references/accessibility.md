# Accessibility (WCAG 2.2 AA)

Accessibility is product quality, and increasingly a legal requirement. In the EU, the European Accessibility Act has applied since 28 June 2025 to many consumer-facing digital services, including ecommerce. In the US, the ADA is routinely applied to websites. The common technical reference is WCAG 2.2 AA.

## Workflow

1. **Automated pass:** `npx @axe-core/cli <url>` or Lighthouse's accessibility category. `scan.mjs --only a11y` covers static source smells. Automated tools catch roughly a third of issues, so this is a floor.
2. **Keyboard pass:** unplug the mouse and complete the primary flow (below).
3. **Screen-reader spot check:** VoiceOver on macOS (Cmd+F5) or NVDA on Windows. Check landmarks, headings, form labels, buttons and dynamic updates.
4. **Visual pass:** contrast, 200% zoom, 320 px reflow, reduced motion, forced colors (Windows High Contrast or the DevTools emulation).
5. **Fix by impact** and re-test the fixed paths.

## Keyboard pass

- Tab reaches every interactive element in a logical order that matches the visual order. No positive `tabindex`.
- Focus is always visible and never hidden behind sticky headers or footers (2.4.11, new in 2.2).
- Enter and Space activate controls. Arrow keys work inside composite widgets (tabs, menus, radio groups, listboxes) following the WAI-ARIA Authoring Practices patterns.
- Escape closes dialogs, menus and popovers, and focus returns to the trigger.
- Focus is trapped inside open modals only, never anywhere else.
- A "Skip to content" link is the first focusable element on pages with navigation.

## WCAG 2.2 AA checklist

**Perceivable**
- 1.1.1: meaningful images have alt text that conveys their purpose. Decorative images use `alt=""`. Icon-only controls have accessible names.
- 1.2.x: video has captions; audio has a transcript.
- 1.3.1: structure is in the markup, not only the visuals: headings in order, lists, tables with headers, labels tied to inputs, landmarks (`header`, `nav`, `main`, `footer`).
- 1.3.5: personal-data inputs have `autocomplete` attributes.
- 1.4.1: color is never the only cue.
- 1.4.3, 1.4.11: text contrast 4.5:1 (3:1 for large text); UI components and focus indicators 3:1.
- 1.4.4, 1.4.10: text resizes to 200%; content reflows at 320 CSS px without two-dimensional scrolling.
- 1.4.12: overriding text spacing (line height 1.5, letter spacing 0.12em) does not break the layout.
- 1.4.13: hover and focus popups can be dismissed, can be hovered, and persist until dismissed.

**Operable**
- 2.1.1, 2.1.2: everything works by keyboard, with no traps.
- 2.2.2: moving or auto-updating content longer than 5 seconds can be paused.
- 2.3.1: nothing flashes more than three times per second.
- 2.4.1: a skip link or landmarks let users bypass blocks.
- 2.4.2: every page has a unique, descriptive `<title>`.
- 2.4.3, 2.4.7: focus order is logical and focus is visible.
- 2.4.4: link text makes sense in context. Avoid bare "click here" or "read more".
- 2.4.11 (new in 2.2): a focused element is not entirely hidden by sticky content. Use `scroll-padding-top`.
- 2.5.7 (new in 2.2): every drag interaction has a single-pointer alternative (buttons, a menu).
- 2.5.8 (new in 2.2): targets are at least 24×24 CSS px, or have enough spacing.

**Understandable**
- 3.1.1: `<html lang="...">` is set correctly. Changes of language are marked with `lang`.
- 3.2.x: no unexpected context change on focus or input. Navigation is consistent across pages.
- 3.2.6 (new in 2.2): help mechanisms (contact, chat, FAQ) are in the same place on every page.
- 3.3.1 to 3.3.3: errors are identified in text, connected to fields, and suggest a fix.
- 3.3.7 (new in 2.2): do not make users re-enter information they already gave in the same process.
- 3.3.8 (new in 2.2): logging in does not require a cognitive test. Allow paste and password managers, and do not block copy-paste of one-time codes.

**Robust**
- 4.1.2: custom controls expose name, role and state (`aria-expanded`, `aria-pressed`, `aria-selected`, `aria-checked`).
- 4.1.3: status messages (toasts, "3 results", form saved) are announced through `role="status"` or `aria-live="polite"`.

## Patterns

```html
<a class="skip-link" href="#main">Skip to content</a>
<main id="main" tabindex="-1">…</main>
```

```css
.skip-link { position: absolute; left: 1rem; top: -100px; }
.skip-link:focus { top: 1rem; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
```

```html
<label for="email">Work email</label>
<input id="email" name="email" type="email" autocomplete="email"
       aria-describedby="email-hint email-error" aria-invalid="true" required>
<p id="email-hint">We'll send the invite here.</p>
<p id="email-error">Enter an email like name@company.com.</p>

<button type="button" aria-label="Close dialog"><svg aria-hidden="true">…</svg></button>
<div role="status" aria-live="polite" class="sr-only" id="announcer"></div>
```

## ARIA rules

1. Prefer native HTML: `button`, `a`, `label`, `select`, `dialog`, `details` and `summary`, `table`. Native elements are accessible by default.
2. Incorrect ARIA is worse than none. Do not add roles that conflict with the element (`<button role="link">`).
3. Never `aria-hidden="true"` on a focusable element.
4. Every interactive element made from a `div` needs a role, `tabindex="0"`, keyboard handlers and state. Usually the answer is to use a `button`.
5. Headless libraries (Radix, React Aria, Headless UI, Ark) handle complex widgets correctly. Use them instead of hand-rolling comboboxes, menus and date pickers.

## Common failures in AI-generated UI

- Clickable `div` and `span` elements instead of buttons and links.
- `outline: none` with no replacement focus style.
- Icon-only buttons with no name.
- Placeholder used as the only label.
- Light-gray text on white (muted text below 4.5:1).
- Missing or skipped heading levels, and several H1s used for styling.
- Modals that do not trap or return focus, or do not close with Escape.
- Carousels and marquees that auto-play with no pause.
- `lang` missing or wrong.
- Animations that ignore `prefers-reduced-motion`.

## Severity

| Level | Examples |
| --- | --- |
| Blocker (P0) | Core flow impossible by keyboard, form without labels, focus trap, essential content unreadable |
| High (P1) | Missing focus indicator, contrast failure on primary text or actions, unnamed buttons, broken modal focus |
| Medium (P2) | Heading order issues, missing live announcements, small targets on secondary controls |
| Low (P3) | Redundant ARIA, alt text quality on minor images |

Report the WCAG criterion, the component or route, the user impact and the concrete fix.
