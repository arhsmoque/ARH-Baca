# Parked manual steps — ARH-Baca infrastructure, secrets, and deploy

These steps require your click/login and cannot be automated by the agent in this environment.

## ✅ Done by agent in this session

- Created GitHub repo **https://github.com/arhsmoque/ARH-Baca** and pushed local `main`.
- Generated `APP_KEY` for ARH-Baca and set it as a GitHub repository secret.
- Reused the shared Infisical machine identity and set these GitHub repository secrets:
  - `INFISICAL_CLIENT_ID`
  - `INFISICAL_CLIENT_SECRET`
  - `GH_PAT`
- Copied the `arh-urus` Cloud Run + Neon deployment strategy to ARH-Baca:
  - `Dockerfile` (adapted for pnpm + Tailwind v4)
  - `docker/entrypoint.sh`, `docker/nginx/default.conf`, `docker/php/*`, `docker/docker-compose.dev.yml`
  - `.github/workflows/deploy.yml`
  - `.github/workflows/neon_workflow.yml`
- Extended `scripts/sync-secrets.mjs` to sync shared ARH secrets from Infisical root to GitHub.

---

## Still manual — Infisical source of truth

Infisical project: **https://app.infisical.com/project/90b0e7ef-3f72-4ddb-b888-055e90e13dfa/overview**

### 1. Create the `/arh-baca` folder in Infisical

1. Open the project.
2. Go to **Secrets**.
3. Click **+ New folder**.
4. Name it `arh-baca`.

### 2. Add `APP_KEY` to Infisical `/arh-baca`

The agent-generated key is already set as a GitHub secret, but for source-of-truth consistency you should also store it in Infisical.

Direct link: **https://app.infisical.com/project/90b0e7ef-3f72-4ddb-b888-055e90e13dfa/secrets?folder=arh-baca**

Secret name: `APP_KEY`

### 3. Confirm shared root secrets exist

The agent's updated sync script expects these in Infisical root `/` (environment `dev`). They are already documented in `arh-vault-infisical.json`; confirm they are present in Infisical itself:

- `GITHUB_PAT`
- `ANTHROPIC`
- `GEMINI`
- `OPENROUTER_MAIN`
- `GROQ_1`
- `TAVILY`
- `GOOGLE_SEARCH`
- `BRAVE_SEARCH`
- `EXA`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_WORKERS_API_TOKEN`
- `BACKBLAZE_B2_KEYID`
- `BACKBLAZE_B2`
- `TUGAS_RESEND`
- `GOOGLE_OAUTH_CLIENT_ARH_HOMELAB`

If any are missing, paste the values from `D:\ARH-RECONCILE-CANDIDATES\governance docs\11_secrets-vault\arh-vault-infisical.json` into Infisical root `/`, environment `dev`.

### 4. Run the sync script

Once the Infisical folder and root secrets are in place:

```bash
cd D:\ARH-GITHUB\ARH-Baca
pnpm run secrets:sync
```

Or run it from GitHub Actions: **https://github.com/arhsmoque/ARH-Baca/actions/workflows/sync-secrets.yml**

---

## Still manual — Google Cloud Platform

The deploy workflow (`.github/workflows/deploy.yml`) targets Cloud Run. You need a GCP project and Workload Identity Federation.

### 5. Create/confirm GCP project

1. Open **https://console.cloud.google.com/**
2. Create or select the project that will host ARH-Baca.
3. Enable these APIs:
   - Cloud Run API
   - Artifact Registry API
   - Cloud Scheduler API
   - IAM Credentials API

### 6. Create Artifact Registry repository

1. Go to **https://console.cloud.google.com/artifacts**
2. Create a Docker repository in `asia-southeast1`.
3. Note the repository name (used as `GCP_ARTIFACT_REPOSITORY`).

### 7. Set up Workload Identity Federation for GitHub Actions

1. Go to **IAM & Admin → Workload Identity Federation**.
2. Create a pool for GitHub Actions.
3. Add a provider with the attribute mapping:
   - `google.subject` = `assertion.sub`
   - `attribute.repository` = `assertion.repository`
4. Create a service account for deploys and grant it:
   - `roles/run.admin`
   - `roles/artifactregistry.writer`
   - `roles/iam.serviceAccountUser`
   - `roles/cloudscheduler.admin`
5. Bind the service account to the workload identity provider with the condition:
   - `attribute.repository == "arhsmoque/ARH-Baca"`
6. Note the provider ID and service account email.

---

## Still manual — Neon database

### 8. Create Neon project

1. Go to **https://console.neon.tech/**
2. Create a project in `Singapore (aws-ap-southeast-1)`.
3. Create a database named `neondb` (default) or any name you prefer.
4. Note the project ID (used as `NEON_PROJECT_ID`).
5. Generate an API key: **https://console.neon.tech/app/settings/api-keys** (used as `NEON_API_KEY`).

---

## Still manual — GitHub repository configuration

Direct links:

- Secrets: **https://github.com/arhsmoque/ARH-Baca/settings/secrets/actions**
- Variables: **https://github.com/arhsmoque/ARH-Baca/settings/variables/actions**

### 9. Required GitHub repository secrets

The agent has already set:

- `APP_KEY`
- `GH_PAT`
- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`

You must still set manually:

| Secret                      | Value / source                                                 |
| --------------------------- | -------------------------------------------------------------- |
| `NEON_API_KEY`              | Neon API key from step 8                                       |
| `STORAGE_ACCESS_KEY_ID`     | `BACKBLAZE_B2_KEYID` from Infisical root                       |
| `STORAGE_SECRET_ACCESS_KEY` | `BACKBLAZE_B2` from Infisical root                             |
| `MAIL_PASSWORD`             | Your SMTP password (if using SMTP; skip if using Resend only)  |
| `E2E_USER_EMAIL`            | Synthetic test account email (only if enabling smoke tests)    |
| `E2E_USER_PASSWORD`         | Synthetic test account password (only if enabling smoke tests) |

The remaining AI/search secrets (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, etc.) are synced by `scripts/sync-secrets.mjs` once Infisical root has them.

### 10. Required GitHub repository variables

| Variable                         | Example                                                                 | Notes                                                   |
| -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `GCP_PROJECT_ID`                 | `my-gcp-project-123`                                                    | From step 5                                             |
| `GCP_ARTIFACT_REPOSITORY`        | `arh-baca`                                                              | From step 6                                             |
| `GCP_REGION`                     | `asia-southeast1`                                                       | Same region as Neon/R2                                  |
| `CLOUD_RUN_SERVICE`              | `arh-baca`                                                              | Cloud Run service name                                  |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/.../locations/global/workloadIdentityPools/.../providers/...` | From step 7                                             |
| `GCP_DEPLOY_SERVICE_ACCOUNT`     | `deploy@my-gcp-project-123.iam.gserviceaccount.com`                     | From step 7                                             |
| `NEON_PROJECT_ID`                | `...`                                                                   | From step 8                                             |
| `ARH_BACA_APP_URL`               | `https://arh-baca-xxx.asia-southeast1.run.app`                          | Set after first deploy reveals the URL                  |
| `APP_NAME`                       | `ARH-Baca`                                                              |                                                         |
| `APP_ENV`                        | `production`                                                            |                                                         |
| `APP_DEBUG`                      | `false`                                                                 |                                                         |
| `SESSION_DRIVER`                 | `cookie` or `database`                                                  |                                                         |
| `CACHE_STORE`                    | `redis` or `database`                                                   | Redis requires a Redis instance                         |
| `QUEUE_CONNECTION`               | `database` or `redis`                                                   |                                                         |
| `LOG_CHANNEL`                    | `stderr`                                                                | Recommended for Cloud Run                               |
| `AWS_DEFAULT_REGION`             | `us-east-005`                                                           | Backblaze B2 region                                     |
| `AWS_USE_PATH_STYLE_ENDPOINT`    | `true`                                                                  | Required for B2                                         |
| `STORAGE_BUCKET`                 | `arh-cloudbucket`                                                       | Backblaze B2 bucket name                                |
| `STORAGE_ENDPOINT`               | `https://s3.us-east-005.backblazeb2.com`                                | B2 S3 endpoint                                          |
| `MAIL_MAILER`                    | `resend` or `smtp`                                                      |                                                         |
| `MAIL_FROM_ADDRESS`              | `noreply@arh.homelab`                                                   |                                                         |
| `MAIL_HOST`                      | `...`                                                                   | Only if using SMTP                                      |
| `MAIL_PORT`                      | `587`                                                                   | Only if using SMTP                                      |
| `MAIL_ENCRYPTION`                | `tls`                                                                   | Only if using SMTP                                      |
| `MAIL_USERNAME`                  | `...`                                                                   | Only if using SMTP                                      |
| `E2E_SMOKE_ENABLED`              | `false`                                                                 | Set `true` only after provisioning a smoke-test account |
| `E2E_BASE_URL`                   | (optional)                                                              | Override smoke-test target URL                          |

---

## Still manual — first deploy

### 11. Run the deploy workflow

Direct link: **https://github.com/arhsmoque/ARH-Baca/actions/workflows/deploy.yml**

Click **Run workflow**.

The first run will:

1. Build and push the Docker image.
2. Create the Cloud Run service.
3. Run migrations via the `arh-baca-migrate` Cloud Run Job.
4. Create the `arh-baca-scheduler` Cloud Run Job and Cloud Scheduler trigger.

### 12. Set the live URL variable

After the first deploy succeeds:

1. Open **https://console.cloud.google.com/run**
2. Find the `arh-baca` service and copy its URL.
3. Set `ARH_BACA_APP_URL` to that URL in GitHub Variables.
4. Re-run the deploy workflow so the service knows its own canonical URL.

---

## Verification

After completing the steps above:

- `https://<your-cloud-run-url>/up` returns `200 OK`.
- `https://<your-cloud-run-url>/health` returns `healthy`.
- GitHub Actions `deploy.yml` runs green on every push to `main` after CI passes.
- Pull requests automatically create/delete a Neon preview branch via `neon_workflow.yml`.

## What was already done

- Laravel 13 + PHP 8.4 scaffold installed
- Dev tools configured: Pint, PHPStan/Larastan, PHPUnit, Rector, ESLint, Prettier, TypeScript, Secretlint, Playwright, Husky, lint-staged
- IDE helper (`barryvdh/laravel-ide-helper`) installed
- `.infisical.json` linked to shared project `90b0e7ef-3f72-4ddb-b888-055e90e13dfa`
- Plugin research proposal written at `docs/PLUGIN-PROPOSAL.md`
- 11 plugin repos added as git submodules under `research/plugins/`
- Deployment stack copied from `arh-urus` and adapted:
  - `Dockerfile`, `docker/entrypoint.sh`, `docker/nginx/default.conf`, `docker/php/*`, `docker/docker-compose.dev.yml`
  - `.github/workflows/deploy.yml`
  - `.github/workflows/neon_workflow.yml`
- `scripts/sync-secrets.mjs` extended to sync shared Infisical root secrets to GitHub
- `APP_KEY`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `GH_PAT` set as GitHub repository secrets
- `pnpm run check` passes 8/8 locally
- Committed and pushed to `origin/main`
