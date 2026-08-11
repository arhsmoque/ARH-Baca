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

function parseGoogleOAuth(jsonValue) {
  try {
    const parsed = JSON.parse(jsonValue);
    const web = parsed?.web || {};
    return {
      clientId: web.client_id,
      clientSecret: web.client_secret,
    };
  } catch {
    return {};
  }
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

  const appKey = getSecret(appSecrets, 'APP_KEY');
  const githubPat = getSecret(rootSecrets, 'GITHUB_PAT');

  const missingRequired = [];
  if (!githubPat) missingRequired.push('GITHUB_PAT at /');
  if (!appKey) missingRequired.push('APP_KEY at /arh-baca');

  if (missingRequired.length > 0) {
    fail('missing required source secrets:', missingRequired.join('; '));
    return;
  }

  // Required secrets that must exist for CI/deploy to function.
  const requiredPairs = [
    ['APP_KEY', appKey],
    ['GH_PAT', githubPat],
  ];

  for (const [key, value] of requiredPairs) {
    try {
      setGitHubSecret(key, value);
    } catch (err) {
      fail(`GitHub ${key}:`, err.message);
    }
  }

  // Shared ARH secrets synced from Infisical root when present.
  // These are optional for local development but expected in production.
  const optionalMappings = [
    ['ANTHROPIC', 'ANTHROPIC_API_KEY'],
    ['GEMINI', 'GEMINI_API_KEY'],
    ['OPENROUTER_MAIN', 'OPENROUTER_API_KEY'],
    ['GROQ_1', 'GROQ_API_KEY'],
    ['TAVILY', 'TAVILY_API_KEY'],
    ['GOOGLE_SEARCH', 'GOOGLE_SEARCH_API_KEY'],
    ['BRAVE_SEARCH', 'BRAVE_SEARCH_API_KEY'],
    ['EXA', 'EXA_API_KEY'],
    ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID'],
    ['CLOUDFLARE_WORKERS_API_TOKEN', 'CLOUDFLARE_API_TOKEN'],
    ['BACKBLAZE_B2_KEYID', 'B2_ACCESS_KEY_ID'],
    ['BACKBLAZE_B2', 'B2_SECRET_ACCESS_KEY'],
    ['TUGAS_RESEND', 'RESEND_API_KEY'],
  ];

  for (const [infisicalKey, githubKey] of optionalMappings) {
    const value = getSecret(rootSecrets, infisicalKey);
    if (!value) {
      log('optional source secret not found, skipping:', infisicalKey);
      continue;
    }
    try {
      setGitHubSecret(githubKey, value);
    } catch (err) {
      fail(`GitHub ${githubKey}:`, err.message);
    }
  }

  // Google OAuth client is stored as a single JSON blob; expand it into
  // separate GitHub secrets so the deploy workflow can consume them directly.
  const googleOAuth = getSecret(rootSecrets, 'GOOGLE_OAUTH_CLIENT_ARH_HOMELAB');
  if (googleOAuth) {
    const { clientId, clientSecret } = parseGoogleOAuth(googleOAuth);
    if (clientId) {
      try {
        setGitHubSecret('GOOGLE_CLIENT_ID', clientId);
      } catch (err) {
        fail('GitHub GOOGLE_CLIENT_ID:', err.message);
      }
    }
    if (clientSecret) {
      try {
        setGitHubSecret('GOOGLE_CLIENT_SECRET', clientSecret);
      } catch (err) {
        fail('GitHub GOOGLE_CLIENT_SECRET:', err.message);
      }
    }
  } else {
    log('optional source secret not found, skipping: GOOGLE_OAUTH_CLIENT_ARH_HOMELAB');
  }

  log(DRY_RUN ? 'dry-run complete' : 'complete');
}

main().catch((err) => {
  console.error('[sync-secrets] FATAL', err.message);
  process.exit(1);
});
