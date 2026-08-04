# SSD AI Workflow

A tiny personal automation on top of the Claude Code CLI: split a feature into
an **INVESTIGATE** step (plan it) and a chain of isolated **EXECUTE** sessions
(build it phase by phase, each in a fresh context).

## Directory structure

```
ssd/
  core/
    rules.md              # global rules, prepended to every session (system prompt)
    scripts/
      investigate.js       # step 1: plan a task
      execute.js            # step 2: implement a task, phase by phase
      lib.js                 # shared helpers (not run directly)
  tasks/
    <task-name>/
      prompt/init.md               # the user's ask — investigate rewrites it to match the final, agreed request
      workflow/
        overview.md                 # full feature description — the shared context for every phase
        phase_1/
          plan.md                    # what phase 1 must do
          notes.md                   # written by execute, only if useful for later phases
          sub_phase_1/                # optional, only if phase 1 is too big for one session
            plan.md
            notes.md
        phase_2/
          plan.md
          notes.md
```

A "phase" is one isolated unit of work: implemented, tested, and committed in
a single fresh Claude Code session that has read only `core/rules.md`,
`workflow/overview.md`, its own `plan.md`, and — if relevant — `notes.md`
files from earlier phases. Nothing else carries over between phases.

## Requirements

- [Claude Code CLI](https://claude.com/claude-code) installed and on `PATH` (`claude --version`).
- Run both scripts **from the repository root** of the project you're working on (the one `ssd/` lives in) — they resolve all paths relative to `process.cwd()`.

## Step 1 — investigate

```
node ssd/core/scripts/investigate.js <task-name> [model]
```

- `task-name` — folder name to create under `ssd/tasks/` (e.g. `html-blog`).
- `model` — Claude model alias, default `sonnet`.

This opens a normal **interactive** `claude` session with a system prompt
that tells it to run the SSD investigate step. Just talk to it — describe
what you want to build. It will ask clarifying questions, discuss edge
cases, and push back on gaps in the request instead of guessing.

Optionally, write your own draft ask by hand into
`ssd/tasks/<task-name>/prompt/init.md` before running investigate — it'll
read it as a starting point.

When you're both happy with the picture, ask it to wrap up. It writes:

- `ssd/tasks/<task-name>/prompt/init.md` — rewritten to match the final,
  agreed request (the rough draft is overwritten, not appended to)
- `ssd/tasks/<task-name>/workflow/overview.md`
- `ssd/tasks/<task-name>/workflow/phase_N/plan.md` (one per phase, split into
  `sub_phase_M/plan.md` only if a phase is genuinely too big for one session)

Everything under `ssd/tasks/<task-name>/` is meant to be trustworthy once
investigate is done — no stale drafts, no unresolved assumptions — since an
execute phase may end up reading any file in that folder.

Review these files before moving on — they're the entire context every
execute phase will get. If something's off, just keep chatting in the same
session (or start it again) and have it fix the files.

## Step 2 — execute

```
node ssd/core/scripts/execute.js <task-name> [model] [startPhase] [--single] [--no-push]
```

- `task-name` — must already have `workflow/overview.md` and at least one phase (from step 1).
- `model` — default `sonnet`.
- `startPhase` — e.g. `1.1` or `2` (short for `2.1`), default `1.1`.
- `--single` — run only `startPhase`, then stop. Without it, execute chains
  through **every remaining phase automatically**, each in its own fresh,
  non-interactive `claude -p` session, until they're all done or one fails.
- `--no-push` — commit but skip `git push`.

Each phase session is told to: implement its `plan.md`, write and run tests
until they pass, optionally leave a short `notes.md` (only if a later phase
would genuinely need it), commit, and push to the current branch. Progress
streams live to your terminal (`--verbose`) so you can watch what it's
doing — expect a phase to take anywhere from a few minutes to ~30-40
minutes depending on scope.

If a phase fails, the chain stops immediately and prints the exact command
to resume from that phase once you've looked into it:

```
node ssd/core/scripts/execute.js <task-name> <model> <failed-phase-id>
```

### Trying it out

Start small the first time:

```
node ssd/core/scripts/execute.js my-task sonnet 1.1 --single
```

Check the diff and the phase's `notes.md` (if it wrote one), then drop
`--single` to let it run the rest of the phases unattended:

```
node ssd/core/scripts/execute.js my-task sonnet 1.2
```

## Notes

- All sessions run with `--permission-mode auto` — no interactive
  permission prompts, but not a full bypass either.
- `ssd/core/rules.md` is your project-wide system prompt — edit it to change
  conventions (language, testing, git, notes discipline, etc.) for every
  future session.
- Editing files under `ssd/tasks/<task-name>/workflow/` by hand between
  phases is expected and fine — execute always reads the current file
  contents when a phase starts.
