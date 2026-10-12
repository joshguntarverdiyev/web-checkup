# Conversion and Positioning

Use this file for public pages where visitors must understand, trust, compare and then buy, book, subscribe, sign up or get in touch. Conversion is answering the visitor's questions in the right order, with honest proof and little friction. It is not manipulation.

## Positioning check

Within the first viewport plus one scroll, a visitor can answer:

1. What is it?
2. Who is it for?
3. What problem or desire does it address?
4. What outcome do I get?
5. Why should I believe it?
6. What do I do next?

If the hero could describe many unrelated products, rewrite it.

## Message order

1. Concrete category or offer.
2. Specific audience or use case.
3. Primary outcome.
4. Proof.
5. Primary CTA.
6. How it works or what is included.
7. Objections, comparisons, FAQ.
8. Final CTA.

Do not lead with internal jargon, vision statements or feature lists before the visitor knows what the thing is.

## Page patterns

**SaaS landing**
- Show the real product surface early: a screenshot, short video or live demo, not a `div` mockup.
- Explain the core workflow in three to five concrete steps or a short demo.
- Organize by role or use case when audiences differ.
- Proof: customer logos (real, with permission), short attributed quotes, case studies, metrics with context.
- Give security, compliance and integration details where buyers expect them.

**Pricing page**
- Make plan differences scannable. Say who each plan is for.
- Explain limits, usage-based charges, billing period, trial terms, cancellation and refunds.
- Use a comparison table when features drive the decision. Label CTAs per plan ("Start Pro trial").
- Prices are server-defined. The client never decides the amount charged (see [security-playbooks.md](security-playbooks.md#payments-stripe)).

**Ecommerce product page**
- High-quality media with zoom. Price, variants, stock, delivery estimate, returns and the add-to-cart button stay visible without hunting.
- Specs, sizing and compatibility. Reviews with a rating distribution.
- Clear out-of-stock, sale and variant states. Show total cost before checkout.
- Guest checkout. Apple Pay and Google Pay where possible. No surprise fees.

**Local business or venue**
- Location, hours (including today's), booking or call, real photos, services and prices, reviews.
- Mobile tap-to-call, tap-to-map and booking. Service area.

**Portfolio or agency**
- Role, specialty and target client in one line. Work samples first, with outcomes.
- Describe the process only where it reduces buyer uncertainty. A simple contact path.

## Proof rules

- **Allowed:** real screenshots and demos, real customer logos used with permission, attributed testimonials (name, role, company, ideally a photo or link), case studies, metrics with source and context, certifications you actually hold, press mentions with links.
- **Never fabricate:** testimonials, customer logos, ratings, user counts, awards or "as seen in" badges. Fake social proof is deceptive and illegal in many jurisdictions (for example under the FTC rule on fake reviews and testimonials in the US). Before launch, use honest early-stage proof instead: founder story, product demo, guarantee, transparent roadmap, public changelog.
- **Quotes:** at most about three lines, a specific outcome, and attribution with name and role.

## CTA system

- The primary CTA matches visitor readiness: buy, start trial, book demo, contact, download.
- A secondary CTA lowers risk: see demo, view pricing, read a case study.
- Repeat the primary CTA after major persuasion sections, with one label per intent across the page.
- Use one primary CTA per viewport. Competing equal-weight buttons split attention.

## Objection handling

Answer the likely objections where they arise, not in a footer FAQ: price, setup time and effort, data security and privacy, compatibility and integrations, quality, support, cancellation and lock-in, and "will this work for my situation?".

## Lead capture and forms

- Ask for the minimum. Every extra field costs conversions.
- Say what happens after submitting ("We reply within one business day").
- Add privacy reassurance next to sensitive fields. Marketing consent is a separate, unchecked checkbox ([privacy-and-compliance.md](privacy-and-compliance.md)).
- Protect forms from spam without hurting people: a honeypot field plus Cloudflare Turnstile or similar, and server-side rate limits.
- The confirmation page is useful: next steps, an expected timeline, a calendar link.

## Conversion audit score

Score each item 0 to 2: offer clarity, audience clarity, differentiation, CTA above the fold, proof quality, objection handling, mobile conversion path, form or checkout friction, trust and security cues, and consistency between the search snippet and the page message.

| Total | Reading |
| --- | --- |
| 17 to 20 | Strong |
| 12 to 16 | Workable, with clear improvements available |
| 7 to 11 | Unclear or under-proven |
| 0 to 6 | Conversion risk. The page likely needs restructuring |

For each gap, report the current message, the visitor question it fails to answer, the likely impact and the recommended copy, layout or proof fix.
