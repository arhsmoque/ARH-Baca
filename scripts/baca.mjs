#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const actions = {
  doctor: {
    summary: 'Check the local toolchain, dependencies, Laravel env, and Playwright browser.',
    command: [process.execPath, ['scripts/doctor.mjs']],
  },
  readiness: {
    summary: 'Run doctor plus outbound probes for Composer and Playwright download hosts.',
    command: [process.execPath, ['scripts/doctor.mjs', '--network']],
  },
  check: {
    summary: 'Run the full local quality gate.',
    command: [process.execPath, ['scripts/check.mjs']],
  },
  'check:quick': {
    summary: 'Run the quality gate without the asset build.',
    command: [process.execPath, ['scripts/check.mjs', '--quick']],
  },
  'e2e:install': {
    summary: 'Install the Chromium build required by the pinned Playwright package.',
    command: ['pnpm', ['exec', 'playwright', 'install', '--with-deps', 'chromium']],
  },
  'collision-check': {
    summary: 'Fetch origin and report whether this branch is current, ahead, or diverged.',
  },
};

const printList = () => {
  console.log('ARH-Baca developer toolkit\n');
  for (const [name, action] of Object.entries(actions)) {
    console.log(`  ${name.padEnd(18)} ${action.summary}`);
  }
  console.log("\nRun 'node scripts/baca.mjs --help <action>' for details.");
};

const printHelp = (name) => {
  const action = actions[name];
  if (!action) {
    console.error(`Unknown action: ${name || '(missing)'}`);
    printList();
    process.exitCode = 1;
    return;
  }

  console.log(`${name} — ${action.summary}\n`);
  if (name === 'readiness') {
    console.log('Read-only. It makes bounded requests to api.github.com, codeload.github.com,');
    console.log('and cdn.playwright.dev so a blocked proxy is distinguished from a repo failure.');
  } else if (name === 'collision-check') {
    console.log('Updates the origin remote-tracking refs, then compares HEAD with origin/main.');
    console.log('It does not merge, rebase, commit, or push.');
  } else {
    console.log('This action delegates to the existing repository command shown by --list.');
  }
};

const run = (executable, args) => {
  const result = spawnSync(executable, args, {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit',
    shell: process.platform === 'win32' && executable === 'pnpm',
  });
  process.exitCode = result.status ?? 1;
};

const collisionCheck = () => {
  const git = (args, capture = false) =>
    spawnSync('git', args, {
      cwd: new URL('..', import.meta.url),
      encoding: capture ? 'utf8' : undefined,
      stdio: capture ? 'pipe' : 'inherit',
    });

  const fetched = git(['fetch', 'origin']);
  if (fetched.status !== 0) return (process.exitCode = fetched.status ?? 1);

  const head = git(['rev-parse', 'HEAD'], true).stdout?.trim();
  const origin = git(['rev-parse', 'origin/main'], true).stdout?.trim();
  if (!head || !origin) return (process.exitCode = 1);

  const ancestor = (older, newer) =>
    git(['merge-base', '--is-ancestor', older, newer], true).status === 0;

  if (head === origin) console.log(`[OK] HEAD ${head.slice(0, 7)} matches origin/main.`);
  else if (ancestor(head, origin)) {
    console.error(`[FAIL] origin/main ${origin.slice(0, 7)} is ahead of HEAD ${head.slice(0, 7)}.`);
    process.exitCode = 1;
  } else if (ancestor(origin, head)) {
    console.log(`[OK] HEAD ${head.slice(0, 7)} is ahead of origin/main ${origin.slice(0, 7)}.`);
  } else {
    console.error(
      `[FAIL] HEAD ${head.slice(0, 7)} and origin/main ${origin.slice(0, 7)} diverged.`,
    );
    process.exitCode = 1;
  }
};

const [requested = '--list', detail] = process.argv.slice(2);
if (requested === '--list' || requested === '-l') printList();
else if (requested === '--help' || requested === '-h') printHelp(detail);
else if (!actions[requested]) {
  console.error(`Unknown action: ${requested}`);
  printList();
  process.exitCode = 1;
} else if (requested === 'collision-check') collisionCheck();
else run(...actions[requested].command);
