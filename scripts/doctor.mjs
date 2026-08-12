#!/usr/bin/env node
process.noDeprecation = true;

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const json = process.argv.includes('--json');
const network = process.argv.includes('--network');

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

const commandOnPath = (name) => {
  let version = command(name);
  if (version) return version;
  // Windows often installs tools as .bat/.cmd rather than extensionless binaries,
  // and Node's spawnSync without shell may not resolve them from PATH. Retry with
  // shell enabled for version checks only (no untrusted input is passed).
  if (process.platform === 'win32') {
    const shellResult = spawnSync(name, ['--version'], { encoding: 'utf8', shell: true });
    if (shellResult.status === 0) {
      return (shellResult.stdout || shellResult.stderr).trim().split(/\r?\n/)[0];
    }
  }
  return null;
};

const phpVersion = command('php');
const phpMajorMinor = phpVersion?.match(/PHP (\d+)\.(\d+)/);
const phpSupported =
  phpMajorMinor && (Number(phpMajorMinor[1]) > 8 || Number(phpMajorMinor[2]) >= 4);
add('PHP', phpSupported ? 'PASS' : 'FAIL', phpVersion ?? 'not found; expected 8.4+');

const composerVersion = commandOnPath('composer');
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

if (existsSync('.env')) {
  const env = readFileSync('.env', 'utf8');
  const rawKey =
    env
      .match(/^APP_KEY=(.*)$/m)?.[1]
      ?.trim()
      .replace(/^['"]|['"]$/g, '') ?? '';
  let keyBytes = 0;
  if (rawKey.startsWith('base64:')) {
    try {
      keyBytes = Buffer.from(rawKey.slice(7), 'base64').length;
    } catch {
      keyBytes = 0;
    }
  } else {
    keyBytes = Buffer.byteLength(rawKey);
  }
  add(
    'APP_KEY shape',
    keyBytes === 32 ? 'PASS' : 'FAIL',
    keyBytes === 32
      ? 'valid length for AES-256-CBC (value redacted)'
      : 'invalid or missing; run: php artisan key:generate',
  );
}

if (existsSync('node_modules/@playwright/test')) {
  try {
    const { chromium } = await import('@playwright/test');
    const executable = chromium.executablePath();
    add(
      'Playwright Chromium',
      existsSync(executable) ? 'PASS' : 'WARN',
      existsSync(executable)
        ? 'matching browser executable installed'
        : `matching browser missing; run: pnpm run test:e2e:install (${executable})`,
    );
  } catch (error) {
    add(
      'Playwright Chromium',
      'WARN',
      `package present but browser check failed: ${error.message}`,
    );
  }
}

if (network) {
  const endpoints = [
    ['GitHub API', 'https://api.github.com/rate_limit'],
    ['GitHub codeload', 'https://codeload.github.com/'],
    ['Playwright CDN', 'https://cdn.playwright.dev/'],
  ];
  for (const [name, url] of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ARH-Baca-readiness-check' },
        redirect: 'manual',
        signal: controller.signal,
      });
      await response.body?.cancel();
      const blocked = response.status === 403 || response.status === 407;
      add(name, blocked ? 'FAIL' : 'PASS', `HTTP ${response.status}; no credentials sent`);
    } catch (error) {
      add(name, 'FAIL', error.name === 'AbortError' ? 'timed out after 8s' : error.message);
    } finally {
      clearTimeout(timeout);
    }
  }
}

if (existsSync('composer.json')) {
  const composerJson = JSON.parse(readFileSync('composer.json', 'utf8'));
  add(
    'composer.json license',
    composerJson.license === 'MIT' || composerJson.license == null ? 'PASS' : 'WARN',
    composerJson.license ?? '(none declared)',
  );
}

const failed = checks.filter((c) => c.status === 'FAIL').length;
const warned = checks.filter((c) => c.status === 'WARN').length;
const passed = checks.length - failed - warned;
if (json) {
  console.log(JSON.stringify({ checks, summary: { passed, warned, failed } }, null, 2));
} else {
  console.log('ARH-Baca development doctor\n');
  for (const check of checks) {
    console.log(`[${check.status}] ${check.name}: ${check.detail}`);
  }
  console.log(`\n${passed} passed, ${warned} warnings, ${failed} failed`);
}
process.exit(failed > 0 ? 1 : 0);
