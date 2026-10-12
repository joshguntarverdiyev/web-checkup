# Components and States

AI-generated UI usually renders only the successful, populated state. Real users hit every other one. Use this file when building or reviewing interactive components.

## The state matrix

**Every interactive control** needs: default, hover (pointer devices only, behind `@media (hover: hover)`), `:focus-visible`, active or pressed, disabled, loading or pending (if async), and invalid (if it is an input).

**Every data view** needs: loading, empty (first use), empty (no results for a filter or search), partial, error with a recovery action, permission denied, offline or slow (if relevant), and populated with realistic, long and messy data.

Make states visible in stories, tests or a demo route. If a state exists only in your head, it does not exist.

## Buttons and actions

- **Hierarchy:** one primary action per view or region, quieter secondary actions, and low-emphasis tertiary ones. If everything looks primary, nothing is.
- **Labels are verbs plus objects:** "Create project", "Send invite", "Delete workspace". Avoid "Submit", "OK", "Continue" and "Yes" when a specific verb exists.
- **One name per action across the flow:** the button says "Publish", the toast says "Published", the log says "published".
- **Loading:** keep the label, add a spinner or progress, keep the width stable, and disable only while the request is in flight. Use an idempotency key for payments and creates.
- **Destructive actions:** name the object, state whether it can be undone, prefer undo for reversible actions, and confirm irreversible ones. For very high-risk actions, ask the user to type the resource name. Keep destructive buttons away from routine primary actions.
- **Icon-only buttons** have an `aria-label` and a tooltip when the icon is not universal.
- **Hit targets:** at least 24×24 CSS px (WCAG 2.5.8) and 44×44 px on touch layouts. Expand small visuals with padding or a pseudo-element.
- **Links navigate, buttons act.** Use `<a href>` or the framework `Link` for navigation so Cmd/Ctrl-click, middle-click and "open in new tab" work. Never put navigation on a `div` or `button`.
- Add `touch-action: manipulation` to controls to remove the double-tap zoom delay.

## Forms

- **Labels** are visible, persistent, above the field and programmatically linked (`<label for>`). A placeholder is never the label.
- **Types and keyboards:** set `type` (`email`, `tel`, `url`, `number`, `search`, `password`), `inputmode` and `autocomplete` (`email`, `name`, `given-name`, `street-address`, `postal-code`, `cc-number`, `one-time-code`, `new-password`, `current-password`) so autofill and password managers work.
- **Mobile:** input font size is at least 16 px, or iOS Safari zooms on focus.
- **Validation timing:** validate on blur or submit, not on every keystroke. Never block typing or paste; accept input and explain. Do not pre-disable the submit button, because users need to see what is missing. Trim whitespace that keyboards and autofill add.
- **Errors:** placed next to the field, connected with `aria-describedby`, saying what is wrong and how to fix it. On submit, focus the first invalid field. For long forms, add an error summary at the top.
- **Preserve everything** the user typed after a failed submit.
- **Server-side validation is mandatory.** Client-side validation is UX, not security (see [security.md](security.md)).
- **Submission:** pending state, duplicate-submit protection and a clear success state or next step.
- **Unsaved changes:** warn before navigating away when work could be lost.
- **Enter** submits single-field forms. In a `textarea`, Cmd/Ctrl+Enter submits.
- Turn off `spellcheck` and `autocorrect` for emails, codes and usernames.
- **Required versus optional:** mark the minority. If most fields are required, mark the optional ones.
- **Multi-step forms:** show progress, allow going back without data loss, and show a review step before irreversible submission.

## Navigation

Navigation answers three questions: where am I, where can I go, and what changed?

- Mark the current location with `aria-current="page"` and a visible style.
- Use a sidebar for complex apps, top navigation for simple sites, breadcrumbs for deep hierarchies, tabs for peer views and segmented controls for modes.
- Put filters, tabs, pagination, sort and selected items in the URL, so share, refresh and Back work.
- Back and Forward restore the scroll position.
- The mobile menu traps focus while open, closes with Escape and returns focus to its trigger.

## Tables and lists

- Use real `<table>` markup for tabular data, with `<th scope>`. Align numbers right with tabular figures.
- Provide sort, filter and search for more than a screenful of rows; bulk actions when users manage many items; and empty, loading and no-results states.
- Responsive strategies: hide low-priority columns, make the table horizontally scrollable inside a labeled container, or switch to cards when comparison does not matter.
- For more than about 200 rows, paginate or virtualize (`content-visibility: auto`, TanStack Virtual, virtua).

## Modals, drawers and popovers

- Use a modal only when the task needs interruption or protected focus. Otherwise use inline UI, a drawer or a separate page.
- Prefer the native `<dialog>` element with `showModal()`: it provides the focus trap, Escape and inert background for free.
- Focus moves into the overlay and returns to the trigger on close. Set `overscroll-behavior: contain` on scrollable overlays.
- Popovers: consider the native `popover` attribute and CSS anchor positioning, with a fallback.
- Never put critical information only inside an overlay.

## Feedback

- **Toasts** are for transient, non-blocking confirmation. Announce them with `aria-live="polite"`, keep them on screen long enough to read (about 5 seconds or more) and never use them for errors the user must act on.
- **Inline alerts** are for persistent or contextual problems.
- **Skeletons** only when the final layout is known, and they must match it exactly so nothing shifts.
- **Spinners:** add a show delay of about 150 to 300 ms and a minimum visible time of about 300 to 500 ms to avoid flicker.
- **Optimistic updates** when success is likely. On failure, roll back and explain, or offer undo.
- **Long operations:** show progress, elapsed time and a cancel option.
- Use the ellipsis character for in-progress and follow-up labels: "Saving…", "Rename…".

## Empty, error and edge states

- **First-use empty state:** what goes here, why it matters, the single best next action, and sample data or a template when useful.
- **No results:** echo the query or active filters and offer to reset them.
- **Errors:** what happened, in plain words; whether the user's data is safe; what to do next (retry, contact, go back). Never show a raw stack trace or "Something went wrong" alone.
- **Error pages:** a branded 404 with search or key links, and a 500 page that does not leak internals. Missing pages must return a real 404 status code.
- **Edge cases:** expired session, permission denied, deleted resource, offline, rate limited, very long names, missing images, zero, one and many items.

## Charts and metrics

- Use a chart only when it reveals comparison, trend, distribution or composition.
- Label axes and units, start bar charts at zero, and show exact values in a tooltip or adjacent table.
- Never ship fake or decorative chart data in production UI.

## Component QA

For every new or changed component, check: keyboard operation, visible focus, touch behavior, long text, missing data, every state in the matrix, both themes, and consistency with neighboring components.

Interaction rules adapted in part from Vercel's Web Interface Guidelines (MIT).
