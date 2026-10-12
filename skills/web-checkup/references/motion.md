# Motion

Use motion to explain what changed, to acknowledge an action, or to create one authored moment the surface has earned. Motion without one of those jobs is animation debt.

## Find the job first

Animate only where motion will:

- acknowledge an action (press, toggle, submit);
- make a state change or spatial relationship legible (open, expand, reorder, navigate);
- preserve continuity through a layout or route change;
- direct attention once, at a meaningful moment.

Write a short motion thesis before implementing: the focal moment (if any), the continuity transitions, the feedback, and the performance budget. "Fade up every section" is not a thesis.

## Spend boldness once

One orchestrated moment (a page-load sequence, a hero reveal, a signature interaction) lands better than scattered effects. Operate and Read surfaces usually need no choreography at all: fast feedback and clear transitions only.

## Timing and easing

| Duration | Use |
| --- | --- |
| 100 to 150 ms | Immediate feedback: press, hover, toggle |
| 150 to 300 ms | Routine state change: dropdown, tab, tooltip |
| 300 to 500 ms | Overlays, layout changes, view transitions |
| 500 to 800 ms | A deliberately authored focal entrance, at most once per view |

- Exits are faster than entrances.
- Use deceleration for arrivals: `cubic-bezier(0.16, 1, 0.3, 1)` (expo out) or `cubic-bezier(0.22, 1, 0.36, 1)`. Use `ease-in` only for exits.
- Avoid reflex bounce and elastic curves. Use springs only when the interaction is physical (drag, swipe).
- Anchor `transform-origin` where the motion physically starts (a menu grows from its trigger).
- Tooltips: delay the first one about 300 to 500 ms; later tooltips in the same group appear instantly.

## Implementation rules

- **Never `transition: all`.** List the properties: `transition: transform 200ms var(--ease-out), opacity 200ms var(--ease-out);`
- **Animate compositor-friendly properties** (`transform`, `opacity`) by default. Filters, clip-path and blur are fine when they are bounded to small regions and measured. Never casually animate `width`, `height`, `top`, `left` or margins; use FLIP or grid-row techniques.
- **Prefer CSS, then the Web Animations API, then a library.** Use Motion (`motion/react`) or GSAP only when you need interruption, sequencing or physics that CSS cannot express cleanly.
- **Content is visible by default.** Do not start content at `opacity: 0` and depend on JavaScript to reveal it. If the script fails, the page must still show everything.
- **No scroll event listeners for effects.** Use `IntersectionObserver`, CSS scroll-driven animations (`animation-timeline: view()`) with a fallback, or the library's scroll hooks.
- **Interruptible:** a new user action cancels or redirects an in-flight animation.
- **`will-change`** only during a known animation, never left on at rest.
- **Stop loops** when they are offscreen or the tab is hidden.
- **View Transitions** for route and state continuity: same-document `document.startViewTransition()`, or cross-document `@view-transition { navigation: auto; }` as progressive enhancement.
- **Replace GIFs with video:** `<video autoplay muted loop playsinline>` is far smaller.

## Reduced motion

`prefers-reduced-motion: reduce` means less and gentler motion, not none. Keep opacity and color changes that confirm actions, and remove parallax, large translations, zooms, auto-advancing carousels and scroll-linked effects.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
  .reveal { transform: none !important; }
}
```

The global rule above is a safety net. Write intentional reduced variants for important animations (cross-fade instead of slide). In Motion, use `useReducedMotion()`.

Auto-playing motion longer than 5 seconds next to other content needs a pause, stop or hide control (WCAG 2.2.2). Nothing flashes more than three times per second.

## Tells to avoid

The same fade-and-rise on every section, hover lift on non-interactive cards, perpetual pulse and float on decoration, animated gradient backgrounds, scroll cues, parallax for its own sake, custom cursors and scroll hijacking. See [ai-tells.md](ai-tells.md#e-motion).

## QA checklist

- Each animation can be justified as feedback, state, continuity or the one focal moment.
- Interactions stay smooth on a mid-range phone (DevTools CPU throttling at 4x).
- Reduced motion keeps meaning and removes movement.
- Rapid repeated interaction (double clicks, fast toggles) does not break state.
- No layout shift is caused by animation (CLS stays at or below 0.1).
