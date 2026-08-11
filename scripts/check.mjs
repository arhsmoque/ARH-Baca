#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const quick = process.argv.includes('--quick');
const json = process.argv.includes('--json');
const pnpm = process.env.npm_execpath ?? 'pnpm';

const definitions = [
  ['Secrets', pnpm, ['secrets:check']],
  ['Format', pnpm, ['format:check']],
  ['PHP style (Pint)', 'vendor/bin/pint', ['--test']],
  ['PHP static analysis', 'vendor/bin/phpstan', ['analyse', '--memory-limit=512M']],
  ['PHP tests', 'php', ['artisan', 'test']],
  ['JS lint', pnpm, ['lint']],
  ['JS typecheck', pnpm, ['typecheck']],
  ...(!quick ? [['Asset build', pnpm, ['build']]] : []),
];

const results = [];
for (const [name, executable, args] of definitions) {
  const started = Date.now();
  const result = spawnSync(executable, args, {
    encoding: 'utf8',
    shell: false,
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
