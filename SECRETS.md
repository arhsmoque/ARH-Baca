# Secrets runbook — ARH-Baca

## Source of truth

Infisical project: **`90b0e7ef-3f72-4ddb-b888-055e90e13dfa`**

This is the same project used by `arh-family-lab` and `ARH-URUS`, so shared root secrets such as `GITHUB_PAT` can be reused.

## What needs to be created

### 1. Infisical folder for ARH-Baca

Create a folder named **`/arh-baca`** inside the Infisical project.

### 2. Required secrets

In the **`/arh-baca`** folder (environment `dev`):

| Secret    | How to generate        | Example command                   |
| --------- | ---------------------- | --------------------------------- |
| `APP_KEY` | Laravel encryption key | `php artisan key:generate --show` |

In the root **`/`** folder (already exists for other repos; reuse):

| Secret       | Purpose                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------- |
| `GITHUB_PAT` | Personal access token with `repo` scope, used by the sync script to write GitHub secrets |

### 3. GitHub repository secrets

The sync script (`scripts/sync-secrets.mjs`) sets these automatically:

- `APP_KEY`
- `GH_PAT`

You also need to create these manually so the `Sync secrets from Infisical` workflow can authenticate:

- `INFISICAL_CLIENT_ID` — from a Machine Identity in Infisical
- `INFISICAL_CLIENT_SECRET` — from the same Machine Identity

## Step-by-step manual setup

1. **Open Infisical** and navigate to the project:
   https://app.infisical.com/project/90b0e7ef-3f72-4ddb-b888-055e90e13dfa/overview

2. **Create the `/arh-baca` folder**:
   - Secrets → `+ New folder` → Name: `arh-baca`

3. **Generate and save `APP_KEY`**:

   ```bash
   cd D:\ARH-GITHUB\ARH-Baca
   php artisan key:generate --show
   ```
   - Copy the output (starts with `base64:`)
   - Add it as `APP_KEY` in Infisical folder `/arh-baca`, environment `dev`

4. **Confirm `GITHUB_PAT` exists at root `/`**:
   - If missing, create a GitHub PAT at https://github.com/settings/tokens/new
   - Select `repo` scope
   - Save it as `GITHUB_PAT` in Infisical root `/`, environment `dev`

5. **Create a Machine Identity in Infisical** for CI sync:
   - Project Settings → Machine Identity → Add Machine Identity
   - Give it read access to the `dev` environment
   - Copy `Client ID` and `Client Secret`

6. **Add GitHub repository secrets**:
   - Open https://github.com/arhsmoque/ARH-Baca/settings/secrets/actions
   - Add `INFISICAL_CLIENT_ID`
   - Add `INFISICAL_CLIENT_SECRET`

7. **Run the sync script locally** (requires `gh` CLI authenticated):
   ```bash
   cd D:\ARH-GITHUB\ARH-Baca
   infisical login
   pnpm run secrets:sync
   ```
   Or run it from GitHub Actions:
   - https://github.com/arhsmoque/ARH-Baca/actions/workflows/sync-secrets.yml
   - Click **Run workflow**

## Local development

Copy `.env.example` to `.env` and run:

```bash
php artisan key:generate
```

This gives you a local `APP_KEY`. It does not need to match the Infisical/CI value because each environment is independent.

## Rotating a secret

1. Update the value in Infisical.
2. Re-run `pnpm run secrets:sync` (or the GitHub Actions workflow).
3. For `APP_KEY`: rotating it invalidates existing signed sessions/cookies; plan a maintenance window if users are active.
