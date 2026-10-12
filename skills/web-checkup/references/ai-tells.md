# AI Tells: Detecting and Removing the Template Look

Use this file when building anything visual, and when the user says a site looks generic, templated, "AI-made", "Claude-made", "v0-made" or forgettable.

## Principle

A single ingredient is not a tell. Rounded cards, serif display type, gradients and shadows all appear in excellent work. The template look comes from **co-occurrence**: several safe defaults together, chosen because they are the median rather than because the subject asked for them. The brief always wins. If the user asks for a cream-and-serif editorial look, build it well.

Models converge on these patterns because they are the most frequent in training data. A shortlist to avoid is not enough on its own, because a model that bans one cliché tends to pick the next most common one. For every tell you remove, make a positive decision grounded in the subject (see [design-direction.md](design-direction.md)).

## The catalog

Each tell lists a detection signature where one exists. `scan.mjs --only design` finds many of them.

### A. Palette

| Tell | Signature |
| --- | --- |
| AI purple: purple, violet or indigo gradient on white or near-black | `from-purple-*`, `via-violet-*`, `to-indigo-*`, `#7c3aed`, `#8b5cf6`, `#6366f1`, glow `shadow-purple-*` |
| Warm cream canvas, high-contrast serif and terracotta or clay accent | backgrounds near `#F4F1EA`, `#FAF7F1`, `#F5F1EA`; accents near `#D97757`, `#C45C48`, `#E07860` |
| "Premium consumer" kit: beige, brass, oxblood, espresso text | `#EFEAE0`, `#B08947`, `#9A2436`, `#1A1714` |
| Near-black page with one acid-green or vermilion accent | `#0B0B0B` or `#111` with `#C6F432`-like lime or `#FF4D2E`-like red |
| Slate-900 and Inter with a single blue CTA, untouched | `bg-slate-900`, `text-slate-400`, `bg-blue-600` everywhere |
| Neon glows and oversaturated accents | `drop-shadow` or `box-shadow` with a bright colored blur and no offset |
| Mixed warm and cool grays on one page | `stone-*` next to `slate-*` or `zinc-*` |

### B. Typography

| Tell | Signature |
| --- | --- |
| One default sans used for everything, display included, with no tuning | Inter, Roboto, Poppins, Space Grotesk, DM Sans, Plus Jakarta, Manrope as the only family |
| The go-to "premium" display serif | Fraunces, Instrument Serif, Playfair Display chosen for "elegance" with no editorial reason |
| One accented word in the headline (italic, colored or gradient) as the main visual idea | `<em>` or `<span class="text-accent">` inside the H1 |
| Gradient text | `bg-clip-text text-transparent`, `background-clip: text` |
| Tracked all-caps eyebrow above every section heading | `text-xs uppercase tracking-[0.2em]` repeated in every section |
| Monospace used as a "technical" costume for labels that are not code or data | `font-mono` on marketing labels |
| A shouting H1 with `tracking-tighter` and `leading-none` on every heading level | the same oversized style on H1, H2 and H3 |

### C. Layout

| Tell | Signature |
| --- | --- |
| Stock hero: centered vague headline, two buttons, three stats, gradient blob | `text-center` hero plus a stat row plus an `absolute` blurred circle |
| Three equal cards, each icon then heading then sentence | `grid-cols-3` with identical children |
| Identical section rhythm repeated down the page: eyebrow, heading, cards | the same section component pattern three or more times |
| Zigzag: image left and text right, then flipped, three or more times in a row | alternating `flex-row-reverse` |
| Bento grid with filler or empty cells | grid cells containing only an icon and two words |
| Logo wall or trust strip inside the hero | "Trusted by" row inside the hero container |
| Cards nested inside cards | a bordered or shadowed element inside another one |
| One radius on everything regardless of hierarchy | `rounded-2xl` on buttons, inputs, cards and modals |
| `01 / 02 / 03` section numbers on content that is not a sequence | numbered eyebrows |
| Broadsheet hairlines and dense columns with no editorial reason | `border-t` on every row, zero radius, newspaper grid |

### D. Surfaces and effects

| Tell | Signature |
| --- | --- |
| The same soft gray shadow under every card | `shadow-md`, `shadow-lg`, `rgba(0,0,0,0.1)` everywhere |
| Hover lift and bigger shadow on every card, including non-interactive ones | `hover:-translate-y-1 hover:shadow-xl` |
| Glassmorphism as decoration | `backdrop-blur` on cards, nav and modals at once |
| Colored left-border stripe on cards and callouts | `border-l-4 border-accent` |
| Floating orbs, blobs, mesh gradients, grid and dot backgrounds behind everything | `blur-3xl` circles, `bg-[radial-gradient(...)]` dot patterns |
| Noise or grain overlays on scrolling containers | `feTurbulence` or grain PNG |
| Hard offset "neobrutalist" shadows in a world that is not neobrutalist | `box-shadow: 4px 4px 0 #000` |

### E. Motion

| Tell | Signature |
| --- | --- |
| Fade-and-slide-up entrance on every section | `whileInView={{ opacity: 1, y: 0 }}` on every block, AOS `fade-up` |
| `transition: all` with a uniform 300 ms | `transition-all duration-300` |
| Infinite marquees, pulses, floating badges | `animate-pulse` or `animate-bounce` on decoration |
| Scroll cues | "Scroll to explore", animated mouse icons |
| Staggered reveal on content that is not a list | `staggerChildren` on unrelated blocks |

### F. Copy and content

| Tell | Signature |
| --- | --- |
| Vague transformation copy | supercharge, seamless, unlock, elevate, empower, revolutionize, next-gen, all-in-one, effortless, game-changer, "built for the future of X", "your all-in-one platform for" |
| "AI-powered" with no statement of what the AI does | `AI-powered` in the H1 |
| Fake-precise or fake-round numbers | 99.9%, 10x, 4.9/5 from 10,000+ users, 50K+ teams, with no source |
| Placeholder people and brands | John Doe, Jane Smith, Sarah Chen, Alex Johnson, Acme, Nexus, Lumina, Cloudly, TechCorp |
| Lorem ipsum or "Feature one / Feature two" | literal placeholder text |
| Testimonials with a first name only, perfect grammar and generic praise | "This changed everything! - Sarah" |
| LLM cadence in UI copy | em dashes everywhere, "It's not X, it's Y", rule-of-three lists, rhetorical questions as headings |
| "→" appended to every link and button | `Learn more →` |
| Middle-dot metadata strings everywhere | `A · B · C · D` |
| Hero version pills | `v2.0`, `BETA`, `NEW` badge above the headline with no launch to announce |
| Emoji as feature icons, sparkles for AI, rocket for launch | ✨ 🚀 ⚡ in headings or cards |

Em dashes are fine in long-form prose. In UI copy (headlines, buttons, labels, captions), heavy em-dash use reads as machine-written. Prefer periods, commas and colons.

### G. Assets

| Tell | Signature |
| --- | --- |
| Fake product UI built from `div`s: a pretend dashboard, terminal or chat | nested gray rounded rectangles with fake numbers |
| Hand-drawn one-off SVG illustrations or icons | inline `<path d=...>` icons outside an icon library |
| Generic avatar circles with initials as "customers" | `<div class="rounded-full">JD</div>` in testimonials |
| Placeholder image services left in production | `picsum.photos`, `placehold.co`, `via.placeholder.com`, `source.unsplash.com` |
| Text wordmarks pretending to be customer logos | `<span>Acme Corp</span>` in a logo row |

### H. Browser chrome left at defaults

Builders skip these most often, and they are the cheapest signal that a page was assembled rather than designed.

| Tell | Signature |
| --- | --- |
| Framework default title or favicon | `<title>Vite + React</title>`, `Create Next App`, `vite.svg`, `next.svg`, the default `favicon.ico` |
| Missing link-preview image | no `og:image`, so the link shows a blank card in chats and social apps |
| Focus ring removed and never replaced | `outline: none` or `outline-none` with no `:focus-visible` style |
| Default selection color, scrollbar and caret on a branded dark theme | no `::selection`, no `color-scheme` |
| Default 404 page | the framework's stock error screen |

## Audit procedure

1. **Scan:** run `node <skill-dir>/scripts/scan.mjs . --only design`.
2. **Look:** screenshot the key pages at 375 and 1440 px (`visual-check.mjs`). Several tells are only visible rendered.
3. **Take a census:** list every color, font family, radius and shadow value in use. A product-specific system shows deliberate, limited sets. A default-led one shows framework values.
4. **Run the intentionality test.** Count how many of these are true:
   - The type pairing or system fits this product specifically.
   - The palette has role-based tokens and a point of view.
   - Geometry (radius, borders, density) follows a consistent rule.
   - Copy, layout or imagery could only belong to this product.
   - Motion is limited to feedback or one authored moment.
   - The content is real, not filler.
   If at least four are true, discount tiers 2 and 3 below unless they hurt usability, and say the design has a point of view.
5. **Score:**
   - Tier 1, 3 points each: AI-purple or cream-terracotta default palette, stock hero, three equal icon cards, fake `div` product UI, placeholder people or brands or numbers, framework default title or favicon.
   - Tier 2, 2 points each: gradient text, eyebrow on every section, hover lift on every card, uniform radius and shadow, `transition-all`, fade-up on every section, glass as decoration, emoji icons, vague transformation copy, missing OG image.
   - Tier 3, 1 point each: untuned default sans, repeated section rhythm, zigzag, middle dots and arrows, scroll cues, mixed gray families.

   | Score | Verdict |
   | --- | --- |
   | 0 to 3 | Low likelihood. Reads as designed. Note minor polish only |
   | 4 to 8 | Medium. Works but default-led and forgettable |
   | 9+ | High. Reads as AI or template output. Recommend a committed direction |

   Always show the inputs to the score. A bare number is not useful.

## Report shape

```markdown
## AI-Template Audit: <project>
Likelihood: Low | Medium | High (score N). Confidence: Low | Medium | High

| Tell | Tier | Evidence (file:line or screenshot) |
| --- | ---: | --- |

Intentionality: <what is deliberate, what is default-led>
Keep: <choices worth preserving>
Direction: <one concrete direction: palette roles with values, type, geometry rule, motion, imagery, sample headline>
Fix order: 1. 2. 3.
```

## Remediation rules

- Recommend one direction, with tokens and specific layout changes. "Make it bolder" is not a recommendation.
- Replace, do not soften. A slightly less purple gradient is still the tell.
- Do not swap one cliché for the next (purple to cream serif to acid-green on black).
- Keep anything that works for usability or brand recognition.
- Tie every visual change to the subject, the audience or the task.
- Prefer a few strong decisions over many decorative additions.

Sources: the calibration list in Anthropic's `frontend-design` skill (Apache-2.0), Impeccable's craft floor (Apache-2.0) and Taste-Skill's production tells (MIT). See CREDITS.md.
