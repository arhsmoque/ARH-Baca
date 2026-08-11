#!/usr/bin/env node
process.noDeprecation = true;

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const quick = process.argv.includes('--quick');
const json = process.argv.includes('--json');

const isWindows = process.platform === 'win32';

// pnpm is installed via Corepack on Windows and may only be resolvable from PATH
// when a shell is involved. npm_execpath points at a .mjs file that cannot be
// spawned directly, so always use the well-known "pnpm" command with shell mode
// on Windows.
const pnpmExec = 'pnpm';
const pnpmNeedsShell = isWindows;

const run = (executable, args, options = {}) => {
  const shell = executable === pnpmExec && pnpmNeedsShell ? true : (options.shell ?? false);
  return spawnSync(executable, args, { ...options, shell });
};

const definitions = [
  ['Secrets', pnpmExec, ['secrets:check']],
  ['Format', pnpmExec, ['format:check']],
  ['PHP style (Pint)', 'php', ['vendor/bin/pint', '--test']],
  ['PHP static analysis', 'php', ['vendor/bin/phpstan', 'analyse', '--memory-limit=512M']],
  ['PHP tests', 'php', ['artisan', 'test']],
  ['JS lint', pnpmExec, ['lint']],
  ['JS typecheck', pnpmExec, ['typecheck']],
  ...(!quick ? [['Asset build', pnpmExec, ['build']]] : []),
];

const results = [];
for (const [name, executable, args] of definitions) {
  const started = Date.now();
  const result = run(executable, args, {
    encoding: 'utf8',
    stdio: json ? 'pipe' : 'inherit',
  });
  results.push({
    name,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    seconds: Number(((Date.now() - started) / 1000).toFixed(1)),
    exitCode: result.status ?? 1,
    ...(json && result.status !== 0
      ? { detail: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().slice(-4000) }
      : {}),
  });
}

if (json) {
  console.log(JSON.stringify({ mode: quick ? 'quick' : 'full', results }, null, 2));
} else {
  console.log('\nARH-Baca quality results');
  for (const result of results) {
    console.log(`[${result.status}] ${result.name} (${result.seconds}s)`);
  }
}

const failures = results.filter((result) => result.status === 'FAIL').length;
if (!json) console.log(`\n${results.length - failures} passed, ${failures} failed`);
process.exitCode = failures === 0 ? 0 : 1;
