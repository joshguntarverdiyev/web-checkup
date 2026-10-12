# Design Direction

Use this file when creating a new site, page or feature, or when redesigning one. The goal is a direction that belongs to this product only. A template with the nouns changed does not count.

## 1. Read the brief

Before choosing a single color, collect these signals:

1. **Surface kind:** landing page, app or tool, dashboard, docs, blog or editorial, ecommerce, portfolio, local business, game, or a redesign of one of these.
2. **Audience:** who decides and who uses it. A procurement panel, a design-literate consumer and a recruiter skimming a portfolio need different things.
3. **Vibe words** the user used ("calm", "Linear-like", "playful", "premium", "brutalist", "trustworthy") and any reference URLs or screenshots.
4. **Existing brand assets:** logo, colors, fonts, photography, voice. For a redesign these are starting material, not optional input.
5. **Quiet constraints:** regulated industry, public sector, children, accessibility-first audiences, low-bandwidth markets. These override aesthetic preference.

Then write one line before any code:

> Reading this as: <surface> for <audience>, with a <tone> language, leaning toward <foundation or aesthetic family>.

Ask exactly one question, and only when two plausible reads would produce materially different designs (for example "Should this feel closer to a calm B2B tool or an expressive consumer brand?"). If the read is clear, state it and proceed.

## 2. Choose the visitor mode

The mode describes what success looks like for the visitor on this surface. Choose it from the surface, not the company: a developer tool's landing page is still Persuade.

| Mode | Visitor goal | Surfaces | Design priorities |
| --- | --- | --- | --- |
| Persuade | Decide and act | Landing, pricing, campaign, product page | A strong first impression, proof, one clear CTA, expressive type and imagery |
| Operate | Finish a task | App UI, dashboard, admin, settings, editor | Scannability, density, consistency, speed. Brand lives in precise details |
| Read | Understand | Docs, articles, help, changelog | Measure, hierarchy, navigation, calm surfaces |
| Experience | Be inside the work | Portfolio, gallery, game, showcase | The artifact leads and the interface recedes |

The concept of visitor modes is adapted from Impeccable (pbakaus/impeccable, Apache-2.0).

## 3. Product archetypes

| Archetype | Must be obvious on first load | Common failure |
| --- | --- | --- |
| SaaS dashboard | Navigation, current context, key data, primary action | Marketing hero layout inside the app shell |
| AI tool | Input, output, progress, history, retry and edit, sources | Sparkle icons and "magic" copy instead of capability |
| Ecommerce | Product media, price, variants, shipping and returns, reviews, add to cart | Hidden total cost, weak photos |
| Portfolio or agency | The work itself, role, specialty, contact | Text-only pages and self-description before proof |
| Local business | Location, hours, booking or call, real photos, prices | Stock photos, address buried in the footer |
| Docs | Search, navigation, examples, code blocks, versions | Marketing styling that slows reading |
| Game or interactive | The playable surface, controls, feedback, pause and reset | UI chrome covering the canvas |

## 4. Choose the foundation honestly

1. **The project's existing system comes first.** Extend its tokens and components.
2. **When the brief matches an official design system, use the official package** rather than recreating it by hand: Fluent UI (Microsoft-style enterprise), Material Web (Google-flavored), Carbon (IBM-style data-dense B2B), Polaris (Shopify admin, required there), Primer (GitHub-style devtools), GOV.UK Frontend or USWDS (public sector), Radix Themes (accessible React foundation).
3. **shadcn/ui** is a fine base, but never ship its default state. Change radius, palette, type, shadows and density to the concept. An untouched shadcn page is one of the most recognizable templates on the web.
4. **When the brief is an aesthetic** (editorial, brutalist, bento, glass), build it with native CSS or Tailwind and say in code comments what is inspiration and what is a dependency.

Use one system per project. Do not mix component libraries in one tree.

## 5. Concept pass

Fill [assets/design-brief-template.md](../assets/design-brief-template.md). At minimum:

- **Subject world:** the materials, artifacts, vocabulary and visual culture of the product's domain. Distinctive choices come from here.
- **Palette:** 4 to 6 named roles with values (OKLCH or hex): canvas, surface, text, muted text, accent, plus semantic colors.
- **Type:** families and roles (display, body, UI and data), and why they fit this subject.
- **Layout:** one-sentence composition idea and an ASCII wireframe of the first viewport. Alignment rules (left, center, asymmetric).
- **Materials:** photography, product screenshots, data visualization, illustration, texture or none.
- **Motion:** one purposeful moment, or a decision to keep motion minimal.
- **Voice:** tone, CTA vocabulary, words to avoid.
- **The memorable element:** the single choice people will remember.
- **Restraint:** what stays quiet so that element can work.

### Where distinctiveness comes from

Mine the subject, not the trend list:

| Product | Material to borrow |
| --- | --- |
| Climbing gym | Route grades, chalk texture, topo-line drawings, wall-color coding |
| Tax or accounting tool | Ledger rules, tabular figures, form-field precision, stamped approvals |
| Specialty coffee | Roast curves, origin maps, bag labels, brew ratios |
| Developer CLI | Real terminal output (actually rendered, not faked), keyboard glyphs, diff colors |
| Kids' learning app | Hand-scale shapes, tactile color, big targets, sticker rewards |
| Law firm | Typesetting traditions, measured margins, restrained color, document structure |

### Genericity test

Before writing code, review the plan against the brief:

1. **Prompt-twin test:** imagine the default page you would produce for a similar prompt. Any part of the plan that matches that default must be revised or deliberately justified.
2. **Noun-swap test:** if replacing the product name and nouns makes the plan fit a different product, it is not specific enough.
3. **Tell check:** compare the plan with [ai-tells.md](ai-tells.md). Two or more tells from different categories means revise.

State what you changed and why. Then build.

## 6. First viewport

- **Open with the most characteristic thing in the subject's world:** the product surface for tools, a live demo when interaction is the product, a striking real image when recognition matters, a concrete offer and proof when conversion matters.
- **For apps,** the first screen is the workspace, not a marketing hero.
- **The headline** names the product, the category or the concrete offer. Explanation goes in the supporting line.
- **One primary CTA and at most one secondary** that reduces risk (see demo, pricing, examples).
- **It fits the viewport on desktop:** headline at most 2 lines, supporting copy of about 25 words, CTAs visible without scrolling.
- **A real visual.** Text plus a gradient blob is a placeholder, not a hero.

## 7. Information architecture

Every section must answer a visitor question or move the task forward. Remove sections that exist only to fill the page.

- **Marketing page:** hero, then proof, product or service detail, how it works, objections, comparison, pricing or next step, then FAQ and contact.
- **App shell:** navigation, page header (title, context, actions), workspace, and an optional inspector or detail panel.
- **Ecommerce:** gallery and purchase panel, then details and specs, reviews, policies, related items.
- **Content:** title, summary, body, navigation, related content, author and date.

## 8. Self-critique before delivery

Answer these with screenshots in hand:

- What is the one memorable element, and does it come from the subject?
- What was kept quiet on purpose?
- Which defaults were avoided or replaced?
- Does it hold up with real content, long strings, empty states and a 375 px screen?
- Does the page read as a designed whole, or as a stack of sections?

Then remove one decorative element that does not earn its place.

## Redesign protocol

1. **Audit first** with the `audit` workflow. List what works (brand recognition, usability, SEO equity, content) and what fails.
2. **Decide the depth:**
   - *Preserve:* keep the identity and improve hierarchy, spacing, states, performance and accessibility. Choose this when the brand is recognized or the problems are execution, not concept.
   - *Overhaul:* a new visual world. Treat the old look as evidence of what not to repeat. Choose this when the concept itself is generic or wrong for the audience.
   - Never split the difference by polishing a look you have decided to discard.
3. **Never change these silently:** factual claims, prices, legal text, URLs and slugs (they carry SEO equity, so create 301 redirects if any change), navigation labels users rely on, form fields that feed other systems, analytics event names.
4. **Re-verify** SEO metadata, redirects and analytics after the redesign ships.
