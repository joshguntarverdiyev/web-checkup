# UX and Copy

Use this file to evaluate flows, find friction and write interface text.

## Start from the primary path

Name the one path that matters most before judging details:

- A visitor understands the offer and signs up, buys, books or contacts.
- A user creates their first project and gets value (activation).
- An admin reviews and approves an item.
- A reader finds and understands an answer.
- A player starts, plays, pauses and restarts.

The most important UX issues are whatever blocks or slows this path. Walk it yourself, with keyboard and on a phone, before reviewing anything else.

## Heuristic pass

| Heuristic | Ask |
| --- | --- |
| Visibility of status | Does every action produce visible feedback? Does the user know whether work was saved? |
| Match with the real world | Are things named the way users name them ("notifications", not "webhook config")? |
| User control | Can users cancel, undo, go back, reset filters and escape any flow? |
| Consistency | Do similar things look and behave the same? Is one term used per concept? |
| Error prevention | Are risky actions confirmed and constrained? Are defaults safe? |
| Recognition over recall | Are options visible instead of hidden behind memory or gestures? |
| Efficiency | Can returning users go fast (shortcuts, remembered choices, bulk actions)? |
| Minimalism | Does every element earn its place? |
| Recovery | Do errors explain the problem and the fix, and preserve the user's work? |
| Help | Is help inline and contextual first, with documentation second? |

## Friction audit order

1. Blocking confusion on the primary path.
2. Missing feedback or state.
3. Hard-to-find navigation or actions.
4. Excessive form burden (fields, steps, required account creation).
5. Visual issues that slow scanning.

For each issue, report the screen, what the user expects, what actually happens, why it matters, and the concrete design or copy change.

## Trust

- **Public pages:** a specific offer, real proof, visible pricing or next step, privacy and security answers where relevant, and a visible contact or support path.
- **Apps:** reliable feedback, clear account and data actions, reversible or confirmed risky actions, and visible saved state.

## Onboarding and activation

- Get the user to their first real success fast. Defer every field and setting that is not needed for it.
- Prefer a populated starting point (template, sample data, import) over a blank canvas.
- Product tours are a last resort. Inline hints at the moment of need work better.
- Measure activation, not tour completion.

## Writing interface copy

Words are interface. Every string does one job.

- **Say what it is or does.** Describe instead of selling: "Track every invoice in one place" beats "Supercharge your finances".
- **Use the user's language** and name things by what the user controls, not how the system is built.
- **Active voice and plain verbs:** "Install the CLI", not "The CLI will be installed".
- **Sentence case** for headings and buttons, unless the brand system says otherwise.
- **CTAs say exactly what happens:** "Start free trial", "Book a call", "Download the PDF".
- **One label per intent.** Pick "Get started" or "Sign up" or "Start free" and use it in the nav, hero and footer alike. Several labels for the same action is a tell and confuses users.
- **Errors say what happened and how to fix it,** in the interface's voice. They do not apologize theatrically and are never vague: "Card declined. Try another card or contact your bank." not "Oops! Something went wrong."
- **Empty states invite action.**
- **Don't narrate the UI.** Avoid in-app text that describes the interface, keyboard mechanics or design decisions unless the screen is a tutorial.
- **Numbers:** numerals for counts ("8 projects"), a non-breaking space between number and unit, consistent currency decimals, and locale-aware formatting with `Intl.NumberFormat` and `Intl.DateTimeFormat`.
- **Keep nouns consistent.** Introduce as few unique terms as possible.

### Words that signal template copy

Avoid them unless the brief demands them: supercharge, seamless, unlock, unleash, elevate, empower, revolutionize, transform your workflow, next-gen, cutting-edge, game-changer, effortless, all-in-one, everything you need, built for the future, AI-powered (without saying what AI does), world-class, best-in-class, robust, leverage, synergy.

Replacements:

| Vague | Concrete |
| --- | --- |
| "Supercharge your workflow" | Name the workflow and the time or effort saved |
| "All-in-one platform" | Name the jobs it combines |
| "Seamless integration" | "Connects to Slack, Linear and GitHub in two clicks" |
| "AI-powered insights" | "Flags invoices more than 30 days overdue and drafts the reminder" |
| "Trusted by thousands" | Show who, how many and the source, or remove it |

### Copy self-audit before shipping

Re-read every visible string: headings, buttons, labels, alt text, captions, errors, footer. Rewrite any string that is:

- grammatically broken or has an unclear referent ("we plan to keep it that way" with no "it");
- cute but meaningless, or a forced metaphor;
- falsely precise (invented numbers, specs or customer counts), unless clearly labeled as an example;
- in a different register from the rest of the page.

If unsure whether a line makes sense, replace it with a plain functional sentence. Boring and clear beats clever and confusing.

## Internationalization readiness

Even when the site launches in one language:

- Set `<html lang>` and keep text out of images.
- Allow about 30% text expansion (German, Finnish) without breaking layouts.
- Use logical CSS properties (`margin-inline-start`) when right-to-left languages are plausible.
- Format dates, numbers and currencies with `Intl`.
- Detect language with `Accept-Language` or `navigator.languages`, never IP geolocation.
- Wrap brand names and code tokens in `translate="no"`.
