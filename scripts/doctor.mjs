#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'composer.json',
  'composer.lock',
  'artisan',
  'app/Providers/AppServiceProvider.php',
  'database/migrations',
  'package.json',
];

const checks = [];
const add = (name, status, detail) => checks.push({ name, status, detail });
const command = (name, args = ['--version']) => {
  const result = spawnSync(name, args, { encoding: 'utf8', shell: false });
  return result.status === 0 ? (result.stdout || result.stderr).trim().split(/\r?\n/)[0] : null;
};

const phpVersion = command('php');
const phpMajorMinor = phpVersion?.match(/PHP (\d+)\.(\d+)/);
const phpSupported =
  phpMajorMinor && (Number(phpMajorMinor[1]) > 8 || Number(phpMajorMinor[2]) >= 4);
add('PHP', phpSupported ? 'PASS' : 'FAIL', phpVersion ?? 'not found; expected 8.4+');

const composerVersion = command('composer');
add('Composer', composerVersion ? 'PASS' : 'FAIL', composerVersion ?? 'not found');

const pnpmVersion = command('pnpm');
add('pnpm', pnpmVersion ? 'PASS' : 'FAIL', pnpmVersion ?? 'not found');

const nodeSupported = Number(process.versions.node.split('.')[0]) >= 22;
add(
  'Node.js (docs/asset tooling only)',
  nodeSupported ? 'PASS' : 'WARN',
  `v${process.versions.node}`,
);
add('Git', command('git') ? 'PASS' : 'FAIL', command('git') ?? 'not found');

for (const path of requiredFiles) {
  add(path, existsSync(path) ? 'PASS' : 'FAIL', existsSync(path) ? 'present' : 'missing');
}

add(
  'vendor/ (composer install)',
  existsSync('vendor/autoload.php') ? 'PASS' : 'WARN',
  existsSync('vendor/autoload.php') ? 'installed' : 'run: composer install',
);

add(
  'node_modules/ (pnpm install)',
  existsSync('node_modules/.package-lock.json') || existsSync('node_modules/.modules.yaml')
    ? 'PASS'
    : 'WARN',
  existsSync('node_modules/.package-lock.json') || existsSync('node_modules/.modules.yaml')
    ? 'installed'
    : 'run: pnpm install',
);

add(
  '.env',
  existsSync('.env') ? 'PASS' : 'WARN',
  existsSync('.env') ? 'present' : 'not set; copy .env.example and run php artisan key:generate',
);

if (existsSync('composer.json')) {
  const composerJson = JSON.parse(readFileSync('composer.json', 'utf8'));
  add(
    'composer.json license',
    composerJson.license === 'MIT' || composerJson.license == null ? 'PASS' : 'WARN',
    composerJson.license ?? '(none declared)',
  );
}

console.log('ARH-Baca development doctor\n');
for (const check of checks) {
  console.log(`[${check.status}] ${check.name}: ${check.detail}`);
}

const failed = checks.filter((c) => c.status === 'FAIL').length;
const warned = checks.filter((c) => c.status === 'WARN').length;
const passed = checks.length - failed - warned;
console.log(`\n${passed} passed, ${warned} warnings, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
