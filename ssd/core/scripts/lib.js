'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ssd/core/scripts -> ssd/
const SSD_ROOT = path.resolve(__dirname, '..', '..');
// Scripts are meant to be run from the repo root (`node ssd/core/scripts/...`).
const REPO_ROOT = process.cwd();

function rulesPath() {
  return path.join(SSD_ROOT, 'core', 'rules.md');
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : '';
}

function taskDir(taskName) {
  return path.join(SSD_ROOT, 'tasks', taskName);
}

// Path to a file/dir inside a task, relative to REPO_ROOT, forward-slashed for prompts.
function taskRelPath(taskName, ...segments) {
  const abs = path.join(taskDir(taskName), ...segments);
  return toRel(abs);
}

function toRel(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}

// Runs `claude` with the given CLI args, streaming stdio directly to the
// user's terminal (works for both interactive and -p/print sessions).
// Returns true on a clean (exit code 0) finish.
function runClaude(args) {
  const result = spawnSync('claude', args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Could not run "claude": ${result.error.message}`);
    console.error('Make sure the Claude Code CLI is installed and on your PATH.');
    return false;
  }

  return result.status === 0;
}

function numFromDirName(name, prefix) {
  const m = name.match(new RegExp(`^${prefix}_(\\d+)$`));
  return m ? parseInt(m[1], 10) : null;
}

function listNumberedDirs(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && numFromDirName(d.name, prefix) !== null)
    .map((d) => ({ name: d.name, num: numFromDirName(d.name, prefix) }))
    .sort((a, b) => a.num - b.num);
}

// Flattens phase_N[/sub_phase_M] folders into an ordered list of executable
// units, each identified by "N.M" (M defaults to 1 when there are no sub-phases).
function discoverUnits(workflowDir) {
  const units = [];
  for (const phase of listNumberedDirs(workflowDir, 'phase')) {
    const phaseDir = path.join(workflowDir, phase.name);
    const subPhases = listNumberedDirs(phaseDir, 'sub_phase');
    if (subPhases.length === 0) {
      units.push({ id: `${phase.num}.1`, dir: phaseDir });
    } else {
      for (const sub of subPhases) {
        units.push({ id: `${phase.num}.${sub.num}`, dir: path.join(phaseDir, sub.name) });
      }
    }
  }
  return units;
}

module.exports = {
  SSD_ROOT,
  REPO_ROOT,
  rulesPath,
  readIfExists,
  taskDir,
  taskRelPath,
  toRel,
  runClaude,
  discoverUnits,
};
