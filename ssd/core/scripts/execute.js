#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  rulesPath, readIfExists, taskDir, toRel, runClaude, discoverUnits,
} = require('./lib');

function usage() {
  console.error('Usage: node execute.js <task-name> [model] [startPhase] [--single] [--no-push]');
  console.error('  task-name   folder name under ssd/tasks/ (created by investigate.js)');
  console.error('  model       claude model alias, default: sonnet');
  console.error('  startPhase  e.g. "1.1" or "2" (= "2.1"), default: 1.1');
  console.error('  --single    run only startPhase, then stop (default: chain through all remaining phases)');
  console.error('  --no-push   commit but do not git push');
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith('--')));
const positional = rawArgs.filter((a) => !a.startsWith('--'));
const [taskName, model = 'sonnet', startPhaseArg = '1.1'] = positional;
const single = flags.has('--single');
const noPush = flags.has('--no-push');

if (!taskName) usage();

const startPhase = /^\d+$/.test(startPhaseArg) ? `${startPhaseArg}.1` : startPhaseArg;

const tDir = taskDir(taskName);
const workflowDir = path.join(tDir, 'workflow');
const overviewPath = path.join(workflowDir, 'overview.md');

if (!readIfExists(overviewPath)) {
  console.error(`No ${toRel(overviewPath)} found (or it's empty). Run investigate.js for "${taskName}" first.`);
  process.exit(1);
}

const units = discoverUnits(workflowDir);
if (units.length === 0) {
  console.error(`No phase_N folders found under ${toRel(workflowDir)}. Run investigate.js first.`);
  process.exit(1);
}

const startIndex = units.findIndex((u) => u.id === startPhase);
if (startIndex === -1) {
  console.error(`Phase "${startPhase}" not found. Available phases: ${units.map((u) => u.id).join(', ')}`);
  process.exit(1);
}

const rules = readIfExists(rulesPath());
const overviewRel = toRel(overviewPath);

console.log(`SSD execute — task "${taskName}", model "${model}", starting at phase ${startPhase}${single ? ' (single phase)' : ''}`);
console.log(`Phases: ${units.map((u) => u.id).join(', ')}\n`);

for (let i = startIndex; i < units.length; i += 1) {
  const unit = units[i];
  const planPath = path.join(unit.dir, 'plan.md');
  const notesPath = path.join(unit.dir, 'notes.md');

  if (!readIfExists(planPath)) {
    console.error(`Phase ${unit.id}: no ${toRel(planPath)} found (or it's empty). Stopping.`);
    process.exit(1);
  }

  const previousNotes = units
    .slice(0, i)
    .map((u) => path.join(u.dir, 'notes.md'))
    .filter((p) => fs.existsSync(p))
    .map(toRel);

  const planRel = toRel(planPath);
  const notesRel = toRel(notesPath);

  const readList = [
    `- ${overviewRel} — full context for the whole task (what/why/how).`,
    ...previousNotes.map((p) => `- ${p} — notes from an earlier phase, read only if relevant to this phase.`),
    `- ${planRel} — the plan for THIS phase. This is your actual task.`,
  ].join('\n');

  const prompt = `${rules}

# SSD Workflow — EXECUTE phase ${unit.id}

You are implementing ONE isolated phase of task "${taskName}" from the SSD AI workflow, in a fresh session with no memory of any previous phase.

Read, before doing anything else:
${readList}

Do this:
1. Implement the plan in ${planRel} completely.
2. Write unit and/or integration tests covering the change, run the relevant test suite, and fix anything broken until it's all green. Don't consider the phase done until tests pass.
3. Only if there is something important for a future phase to know (non-obvious decisions, deviations from the plan, gotchas, follow-ups) — write it concisely to ${notesRel}. If there's nothing important, do NOT create that file.
4. Commit your changes with a clear, descriptive message.${noPush ? '' : " Then push to the current branch if it has a configured remote (check with `git remote -v`); skip the push cleanly (don't fail the phase) if there isn't one."}

Work autonomously end-to-end without asking the user questions — this session is unattended.`;

  console.log(`=== Phase ${unit.id} — starting ===`);

  const ok = runClaude(['-p', prompt, '--model', model, '--permission-mode', 'auto', '--verbose']);

  if (!ok) {
    console.error(`\nPhase ${unit.id} failed (or exited non-zero). Stopping the chain.`);
    console.error(`Resume later with: node ${toRel(path.join(__dirname, 'execute.js'))} ${taskName} ${model} ${unit.id}`);
    process.exit(1);
  }

  console.log(`=== Phase ${unit.id} — done ===\n`);

  if (single) break;
}

console.log('All requested phases finished.');
