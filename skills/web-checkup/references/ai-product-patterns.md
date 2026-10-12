# AI Product Patterns

Use this file for chat interfaces, copilots, agents, generators, summarizers and any feature whose output is probabilistic or slow. AI features fail differently from forms: latency is unpredictable, quality varies, the system can be confidently wrong, and users need to inspect, edit, retry and recover. For the security side, see [security-playbooks.md](security-playbooks.md#llm-and-ai-features).

## Pick the right interface

A chat box is not always the answer. If the task has known inputs (a tone, a length, a document, a target audience), a structured form with a generate button beats a blank prompt. Use chat for open-ended exploration and for refining results. Put AI inside the workflow (inline suggestions, a "draft reply" button, autofill) when that is where the user already is.

## Streaming

- Stream output progressively whenever possible. Do not wait silently and then dump a long response.
- Auto-scroll only when the user is already at the bottom. Pause when they scroll up, and show a "Jump to latest" control.
- Keep the stop button and the input available during generation.
- Reserve space or grow smoothly so the layout does not jump as text arrives.
- Render markdown incrementally without re-flowing the whole message on every token. Memoize finished blocks.

## Waiting states

- Use phase labels ("Reading 3 files…", "Searching the web…", "Drafting summary…") instead of a bare spinner.
- Show elapsed time after a few seconds, and a cancel option.
- For long jobs, reassure the user that their input is saved, show progress or logs when safe, and allow them to leave and come back (with a notification when done).

## Trust and provenance

- Cite sources with links when claims come from retrieval or the web.
- Distinguish user-provided facts, retrieved facts and model interpretation.
- Show confidence only when it is backed by a real signal. Otherwise use a "Review before sending" state for high-stakes output.
- Show model or source metadata and timestamps when freshness matters.
- Never present AI output as more authoritative than it is.

## Human control

Outputs should be actionable: copy, edit, retry or regenerate, compare versions, accept or apply, undo, and give feedback.

- AI never silently overwrites user work. Preview the change as a diff and let the user accept it.
- Actions with external effects (send, post, pay, delete) require explicit confirmation showing exactly what will happen.
- Always provide a manual path when AI fails or is not wanted.

## Errors

- Explain what failed in plain words. Distinguish temporary, quota, permission, safety and input problems when known.
- Preserve the prompt and any partial output, and offer a one-click retry.
- Rate and quota limits say when the limit resets and how to get more.

## Settings worth exposing

Response length or detail, source scope (which documents, the web or not), whether private data is included, clearing context or history, and export.

## Anti-patterns

- Sparkles and "magic" copy instead of describing the capability.
- No stop button. No edit or retry.
- Output that overwrites work without a preview.
- Confidence badges with no basis.
- A chat UI for a task that has a known structure.
- Streaming that steals scroll while the user reads.
- "Something went wrong" with no recovery path.
- Provider keys in the browser, or no usage limits (see security).

## Design bar

Users should feel in control, able to recover from any failure, able to check important claims, clear about what the system is doing, and clear about what remains their responsibility.
