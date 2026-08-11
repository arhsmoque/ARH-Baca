#!/usr/bin/env node
/**
 * ARH-Baca — Infisical → GitHub secret sync.
 *
 * Source of truth: Infisical project 90b0e7ef-3f72-4ddb-b888-055e90e13dfa
 * Target: GitHub repository secrets for arhsmoque/ARH-Baca
 *
 * Run manually after rotating a secret, or as a workflow_dispatch job.
 * Never logs secret values — only key names and status.
 */

import { spawnSync } from 'node:child_process';

const PROJECT_ID = '90b0e7ef-3f72-4ddb-b888-055e90e13dfa';
const INFISICAL_API = 'https://app.infisical.com/api/v3/secrets/raw';
const UNIVERSAL_AUTH_URL = 'https://app.infisical.com/api/v1/auth/universal-auth/login';
const REPO = 'arhsmoque/ARH-Baca';

const DRY_RUN = process.argv.includes('--dry-run');

function log(...args) {
  console.log('[sync-secrets]', ...args);
}

function fail(...args) {
  console.error('[sync-secrets] ERROR', ...args);
  process.exitCode = 1;
}

async function getInfisicalAccessToken() {
  if (process.env.INFISICAL_TOKEN) {
    return process.env.INFISICAL_TOKEN;
  }
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return undefined;
  }
  const res = await fetch(UNIVERSAL_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) {
    throw new Error(`Infisical Universal Auth login failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.accessToken;
}

async function fetchInfisicalSecrets(token, folderPath) {
  const params = new URLSearchParams({
    workspaceId: PROJECT_ID,
    environment: 'dev',
    secretPath: folderPath,
  });
  const res = await fetch(`${INFISICAL_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Infisical API error for ${folderPath}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data.secrets) ? data.secrets : [];
}

function getSecret(secrets, key) {
  const found = secrets.find((s) => s.secretKey === key);
  return found ? found.secretValue : undefined;
}

function run(cmd, args, env = process.env) {
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    env,
    maxBuffer: 1024 * 1024,
    shell: process.platform === 'win32',
  });
  if (result.error) {
    throw new Error(`${cmd} failed: ${result.error.message}`);
  }
  return result;
}

function setGitHubSecret(key, value) {
  if (DRY_RUN) {
    log('[dry-run] would set GitHub secret', key);
    return;
  }
  const result = run('gh', ['secret', 'set', key, '--repo', REPO, '--body', value]);
  if (result.status !== 0) {
    throw new Error(`gh secret set ${key} failed: ${(result.stderr || '').trim()}`);
  }
  log('set GitHub secret', key);
}

async function main() {
  log(DRY_RUN ? 'starting (dry-run)' : 'starting');

  const token = await getInfisicalAccessToken();
  if (!token) {
    fail(
      'No Infisical credentials. Set one of:\n' +
        '  - INFISICAL_TOKEN (service token or access token)\n' +
        '  - INFISICAL_CLIENT_ID + INFISICAL_CLIENT_SECRET (machine identity)',
    );
    return;
  }

  const rootSecrets = await fetchInfisicalSecrets(token, '/');
  const appSecrets = await fetchInfisicalSecrets(token, '/arh-baca');

  const githubPat = getSecret(rootSecrets, 'GITHUB_PAT');
  const appKey = getSecret(appSecrets, 'APP_KEY');

  const missing = [];
  if (!githubPat) missing.push('GITHUB_PAT at /');
  if (!appKey) missing.push('APP_KEY at /arh-baca');

  if (missing.length > 0) {
    fail('missing source secrets:', missing.join('; '));
    return;
  }

  const githubPairs = [
    ['APP_KEY', appKey],
    ['GH_PAT', githubPat],
  ];

  for (const [key, value] of githubPairs) {
    try {
      setGitHubSecret(key, value);
    } catch (err) {
      fail(`GitHub ${key}:`, err.message);
    }
  }

  log(DRY_RUN ? 'dry-run complete' : 'complete');
}

main().catch((err) => {
  console.error('[sync-secrets] FATAL', err.message);
  process.exit(1);
});
