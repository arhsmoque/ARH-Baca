# Parked manual steps — ARH-Baca devtool/secrets setup

These steps require your click/login and cannot be automated by the agent in this environment.

## 1. Infisical login (required once)

Open a terminal in `D:\ARH-GITHUB\ARH-Baca` and run:

```bash
infisical login
```

Then follow the browser/CLI login flow.

## 2. Create the `/arh-baca` folder in Infisical

Direct link to the project:  
**https://app.infisical.com/project/90b0e7ef-3f72-4ddb-b888-055e90e13dfa/overview**

Steps:

1. Open the project.
2. Go to **Secrets**.
3. Click **+ New folder**.
4. Name it `arh-baca`.

## 3. Add `APP_KEY` to Infisical

Generate it:

```bash
cd D:\ARH-GITHUB\ARH-Baca
php artisan key:generate --show
```

Copy the output (starts with `base64:`) and save it as `APP_KEY` inside Infisical folder `/arh-baca`, environment `dev`.

## 4. Confirm `GITHUB_PAT` exists at root `/`

In the same Infisical project, check the root `/` folder for a secret named `GITHUB_PAT`.

If missing:

1. Create a new GitHub PAT at **https://github.com/settings/tokens/new**
2. Select the `repo` scope.
3. Save the token as `GITHUB_PAT` in Infisical root `/`, environment `dev`.

## 5. Create a Machine Identity in Infisical for CI

1. In the Infisical project, go to **Project Settings → Machine Identity**.
2. Click **Add Machine Identity**.
3. Give it read access to the `dev` environment.
4. Copy the **Client ID** and **Client Secret**.

## 6. Add Infisical credentials to GitHub

Direct link: **https://github.com/arhsmoque/ARH-Baca/settings/secrets/actions**

Add two repository secrets:

- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`

## 7. Sync secrets to GitHub

Option A — locally (requires `gh` CLI authenticated):

```bash
cd D:\ARH-GITHUB\ARH-Baca
pnpm run secrets:sync
```

Option B — via GitHub Actions:

Direct link: **https://github.com/arhsmoque/ARH-Baca/actions/workflows/sync-secrets.yml**

Click **Run workflow**.

## Verification

After completing the steps above, the GitHub repo should have these secrets:

- `APP_KEY`
- `GH_PAT`
- `INFISICAL_CLIENT_ID`
- `INFISICAL_CLIENT_SECRET`

Then any push to `main` or PR will run:

- **CI quality gate**: https://github.com/arhsmoque/ARH-Baca/actions/workflows/ci.yml
- **UI Playwright journeys**: https://github.com/arhsmoque/ARH-Baca/actions/workflows/ui.yml

## What was already done

- Laravel 13 + PHP 8.4 scaffold installed
- Dev tools configured: Pint, PHPStan/Larastan, PHPUnit, Rector, ESLint, Prettier, TypeScript, Secretlint, Playwright, Husky, lint-staged
- IDE helper (`barryvdh/laravel-ide-helper`) installed
- `.infisical.json` linked to shared project `90b0e7ef-3f72-4ddb-b888-055e90e13dfa`
- `scripts/sync-secrets.mjs` created to push `/arh-baca` secrets to GitHub
- CI/UI/sync workflows created
- `pnpm run check` passes 8/8 locally
- `pnpm exec playwright test` passes 2/2 locally
- Committed to local `main` branch; not pushed to GitHub
