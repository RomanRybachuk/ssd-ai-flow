#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  rulesPath,
  readIfExists,
  taskDir,
  taskRelPath,
  toRel,
  runClaude,
} = require("./lib");

function usage() {
  console.error("Usage: node investigate.js <task-name> [model]");
  console.error("  task-name  folder name to create under ssd/tasks/");
  console.error("  model      claude model alias, default: sonnet");
  process.exit(1);
}

const [taskName, model = "sonnet"] = process.argv.slice(2);
if (!taskName) usage();

const tDir = taskDir(taskName);
fs.mkdirSync(path.join(tDir, "prompt"), { recursive: true });
fs.mkdirSync(path.join(tDir, "workflow"), { recursive: true });

const rules = readIfExists(rulesPath());
const rel = (...segments) => taskRelPath(taskName, ...segments);

const systemPrompt = `${rules}

# SSD Workflow — INVESTIGATE phase

You are running the INVESTIGATE step for task "${taskName}" of the SSD AI workflow. What you produce here is the ONLY context later EXECUTE sessions get (besides ${toRel(rulesPath())} and, if relevant, notes written during execution) — so it has to be complete and unambiguous.

If ${rel("prompt", "init.md")} already exists, read it first — it's the user's rough draft of what they want, written before this session.

Talk to the user first. Ask what they want to build, clarify requirements, surface edge cases, and fill gaps in the request. Do not silently guess on anything important — keep the conversation going until you both have a clear picture.

Everything under ${rel()} is meant to be a source of truth once this session ends — no stale drafts, no unresolved assumptions, nothing a later session (which may read any file in this task's folder) could be misled by. So once things are clear, produce:
1. ${rel("prompt", "init.md")} — rewrite it to match the final, agreed request (overwrite the rough draft; don't leave outdated or contradicted statements in it).
2. ${rel("workflow", "overview.md")} — a complete, self-contained feature description: what, why, how, constraints, edge cases, and anything an implementer needs. This is the shared context for every execution phase.
3. One plan file per phase, in execution order:
   - ${rel("workflow", "phase_N", "plan.md")}
   - or ${rel("workflow", "phase_N", "sub_phase_M", "plan.md")} if a phase is too big for one isolated session and genuinely needs sub-phases.
   Each plan.md: a short title + one-line description, then a detailed, self-contained, step-by-step implementation plan. Each phase must be small enough to implement, test, and commit inside ONE fresh Claude Code session that has read only the overview and (optionally) earlier notes — nothing else. If a phase depends on a previous phase's output, say so explicitly in its plan.

This is planning only — do not write application code in this session.`;

// Just a trigger for the first assistant turn — the actual instructions
// already live in the system prompt above, no need to repeat them here.
const kickoff = "Hi, let's start.";

console.log(`SSD investigate — task "${taskName}", model "${model}"`);
console.log(`Task folder: ${toRel(tDir)}\n`);

const ok = runClaude([
  "--model",
  model,
  "--permission-mode",
  "auto",
  "--append-system-prompt",
  systemPrompt,
  kickoff,
]);

process.exit(ok ? 0 : 1);
