# SSD — Global Rules

These rules apply to every INVESTIGATE and EXECUTE session in this workflow.

- Write all files (prompts, plans, notes, overview, commit messages) in English — always, regardless of the conversation language.
- When talking directly to the user in the console (asking questions, confirming, summarizing), reply in the same language as `ssd/tasks/<task-name>/prompt/init.md` (or the language the user is writing to you in, if that file doesn't exist yet). Only the files you write stay in English — the conversation itself should not.
- Treat each phase as an isolated unit of work: a fresh session must be able to implement it having read only `ssd/core/rules.md`, the task's `workflow/overview.md`, its own `plan.md`, and (optionally) earlier phases' `notes.md`.
- Don't guess on important requirement gaps — ask (INVESTIGATE) or, if something in a plan is genuinely ambiguous during EXECUTE, make the most reasonable call, implement it, and record the decision in `notes.md`.
- Every EXECUTE phase must include tests (unit and/or integration, matching the project's existing test setup) for what it changed, and isn't done until they pass.
- Only write a phase's `notes.md` if a later phase would genuinely benefit from it (non-obvious decisions, deviations from the plan, gotchas, follow-ups). Skip it otherwise — don't write notes for the sake of it.
- Commit with clear, descriptive messages. Don't rewrite history (no force-push, no amending commits from other sessions).
- Keep implementation scoped to the current phase's plan. If you discover follow-up work that belongs in a later phase, note it — don't do it now.
