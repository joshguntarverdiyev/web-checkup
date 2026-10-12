# Code Quality for AI-Built Projects

AI-generated code tends to work on the happy path and then rot: duplicated components, hallucinated imports, dead code, `any` everywhere, logic in effects, no tests. Use this file when cleaning up a codebase, reviewing generated code, or setting up guardrails so the next generation round stays clean.

The goal is code that a human (or the next agent) can safely change. It is not a rewrite. Refactor in place, in small verified steps.

## Guardrails first

A project should have these scripts and they should pass:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "vitest run",
    "build": "next build",
    "check": "npm run typecheck && npm run lint && npm run test && npm run build"
  }
}
```

- **TypeScript** with `"strict": true` (plus `noUncheckedIndexedAccess` for new projects).
- **ESLint** with the framework config, `eslint-plugin-jsx-a11y` for React, and `react-hooks` rules. Biome is a fast alternative for lint and format together.
- **Prettier** or Biome formatting, so diffs show logic rather than whitespace.
- **knip** to find unused files, exports and dependencies: `npx knip`.
- **CI** runs `npm run check` on every pull request. Add Dependabot or Renovate.
- A **README** with setup steps, required environment variables and scripts. An `.env.example` with placeholders.

## AI code smells and fixes

| Smell | Why it hurts | Fix |
| --- | --- | --- |
| Hallucinated imports, APIs or packages | Build breaks, or worse, a malicious look-alike package gets installed | Verify each import exists in `node_modules` and in the docs for the installed version. Check new packages on npm before installing |
| Duplicated components (`Button2`, `CardNew`, three modal implementations) | Inconsistent UI, fixes applied in one place only | Consolidate into one component with variants (`cva` or props). Delete the rest |
| Components over about 300 lines mixing data, logic and markup | Hard to change or test | Extract hooks and subcomponents; move data access to the server or a data layer |
| `any`, `as any`, `@ts-ignore` | Type errors hidden until runtime | Type properly. Use `unknown` plus schema parsing at boundaries |
| `useEffect` used for derived state or event logic | Extra renders and race conditions | Derive during render. Put event logic in handlers. Use a data-fetching library or server components for fetching |
| Fetch without loading, error or abort handling | Infinite spinners, state updates after unmount | Use TanStack Query or SWR, or server components. Handle every state |
| Magic numbers and hard-coded colors and spacing | Design drift | Use tokens and named constants |
| Inline styles mixed with utility classes and CSS modules | No single source of truth | One styling approach per project |
| Dead code, commented-out blocks, unused exports | Noise that confuses readers and agents | Delete it (git keeps history). Run `knip` |
| `console.log` and `debugger` left in | Leaks data, noisy consoles | Remove them. Use a logger with levels on the server |
| Swallowed errors (`catch {}`) | Silent failures | Handle, report to error tracking, or rethrow |
| Copy-pasted validation in client and server that drifts apart | Inconsistent rules | Share one schema (Zod) between both |
| Prop drilling through five levels | Brittle | Composition, context for truly global state, or server data access |
| Secrets, URLs and environment checks scattered through the code | Leaks and misconfiguration | A single validated `env` module ([security-playbooks.md](security-playbooks.md#secrets-and-environment-variables)) |
| No error boundaries | One component crash blanks the whole page | Add route-level error boundaries (`error.tsx` in Next.js) and a global fallback |
| Inconsistent naming and folder structure | Slow navigation | Pick conventions (PascalCase components, kebab-case files or the project's existing rule) and organize by feature |

## Structure

- Organize by feature or route (`features/billing/`, `app/(dashboard)/projects/`) with shared UI in `components/ui`.
- Keep server-only code in clearly marked modules (`import "server-only"`).
- Keep the components library small: a `Button` with variants instead of five buttons.
- Keep configuration in one place: tokens, env, constants, route paths.

## Tests worth having

Do not chase coverage numbers. Cover what would hurt:

- **Authorization:** a user cannot read or modify another user's data (one test per sensitive route or action).
- **Payments and webhooks:** price comes from the server; invalid signatures are rejected; events are idempotent.
- **Core business logic:** calculations, permissions, state machines.
- **Critical user path:** one Playwright end-to-end test for signup or checkout or the main task.
- **Regression tests** for every bug fixed.

## Reviewing generated code

Before accepting a change an AI produced:

1. Does it build, typecheck and lint?
2. Does every import and API exist in the installed versions?
3. Did it duplicate something that already exists in the codebase?
4. Does it handle loading, error and empty cases?
5. Does any server code skip validation or authorization?
6. Did it add a dependency? Is that dependency needed, maintained and real?
7. Is there leftover debug code, a TODO or a placeholder?
8. Is the diff limited to what was asked?

## Cleanup procedure

1. Get the guardrail scripts running and record the current failures.
2. Fix build and type errors, then lint errors.
3. Run `knip`. Remove unused files, exports and dependencies in small commits.
4. Consolidate duplicated components and utilities, one family at a time, verifying the UI after each step.
5. Add tests around the risky areas before refactoring them.
6. Leave the project with `npm run check` passing in CI.
