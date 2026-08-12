# AGENTS.md — ARH-Baca

A Laravel 13 + Filament + Livewire collaborative study platform. Successor to the Deckmate + Studio idea documented in `arh-family-lab/previews/deckmate-studio/PLATFORM-PROPOSAL.md`.

## Layout

- `app/` — Laravel application code.
- `app/Filament/` — Filament admin and app panels.
- `app/Livewire/` — Livewire components for the public/app panels.
- `resources/views/` — Blade views.
- `resources/js/` — Vanilla JS/TypeScript for browser interactivity.
- `resources/css/` — Tailwind CSS entry and custom tokens.
- `database/migrations/` — Schema migrations.
- `tests/Unit/` — PHPUnit unit tests.
- `tests/Feature/` — PHPUnit feature tests.
- `tests/e2e/` — Playwright UI flow rehearsals.
- `scripts/` — Local quality/doctor scripts.
- `baselines/` — PHPStan baseline files (generated).
- `.claude/` — Agent skills, hooks, and recipes for cloud and local agents.
- `docker/` — Docker Compose, PHP-FPM, nginx, and entrypoint for local dev and Cloud Run.

## Toolchain

- **PHP 8.4+**, **Composer**
- **Node 22+**, **pnpm** (use `corepack prepare pnpm@11.15.1 --activate` if needed)
- **Laravel 13**, **Filament 4/5** (to be added), **Livewire**, **Tailwind CSS v4**
- **Quality**: Laravel Pint, PHPStan + Larastan, PHPUnit, Rector, ESLint, Prettier, TypeScript
- **Security**: Secretlint, `composer audit`, `pnpm audit`
- **UI checks**: Playwright (desktop + mobile Chromium + iPad)
- **Git hooks**: Husky + lint-staged
- **Secrets source of truth**: Infisical project `90b0e7ef-3f72-4ddb-b888-055e90e13dfa`, folder `/arh-baca`
- **LSP/IDE support**: `barryvdh/laravel-ide-helper`
- **Agent skills**: `.claude/skills/` — coding conventions, deploy playbook, flow-of-events-first

## Local commands

```bash
# Discover repository tooling and per-action help
pnpm baca -- --list
pnpm baca -- --help readiness

# Verify environment
pnpm run dev:doctor

# Verify environment plus the Composer/Playwright outbound hosts
pnpm run dev:readiness

# Install everything
composer install
pnpm install

# One-shot quality gate (secrets, format, Pint, PHPStan, tests, lint, typecheck, build)
pnpm run check

# Quick quality gate (skips asset build)
pnpm run check:quick

# Dev server (Laravel + queue + logs + Vite)
composer dev

# Individual tools
vendor/bin/pint --test      # check PHP formatting
vendor/bin/pint             # fix PHP formatting
vendor/bin/phpstan analyse  # static analysis
vendor/bin/rector process --dry-run  # proposed refactorings
vendor/bin/rector process            # apply refactorings
php artisan test            # PHPUnit tests
pnpm lint                   # ESLint
pnpm format:check           # Prettier check
pnpm format                 # Prettier fix
pnpm typecheck              # TypeScript
pnpm secrets:check          # Secretlint
pnpm run secrets:sync:dry-run  # preview Infisical → GitHub sync
pnpm run secrets:sync          # push Infisical secrets to GitHub
pnpm run test:e2e:install   # install Playwright Chromium (cloud-agent friendly)
pnpm run test:e2e           # UI rehearsals
pnpm run test:e2e:ui        # UI rehearsals in headed/debug mode
pnpm exec playwright test   # direct Playwright invocation
composer run ide:helpers    # regenerate IDE helper files
```

`scripts/baca.mjs` is the cross-platform routing entrypoint for recurring development
actions. Add an action there only after the underlying command exists and has a stable,
verified contract; keep credentialed infrastructure mutations outside the DEV catalog.

## Doctrine notes

- Verify before claiming completion. Run `pnpm check` before signing off on a change.
- Keep app code self-contained inside `app/` domain folders until a second consumer actually needs extraction.
- Do not commit `.env`, real secrets, or `vendor/`/`node_modules/`/`public/build/`.
- The operator owns secrets and accepts home-lab risk — don't gate progress on secret-handling theater, but never echo secrets or commit them.
- UI changes require a Playwright rehearsal or manual browser verification, not just code review. See `.claude/skills/flow-of-events-first/`.

## Mobile-first / responsive discipline

ARH-Baca targets students on phones and tablets as primary devices.

- Use **mobile-first** Tailwind breakpoints (`sm:`, `md:`, `lg:`).
- Touch targets must be at least **44 × 44 px**.
- Test every UI change on **mobile (Pixel 7)**, **tablet (iPad)**, and **desktop** viewports in Playwright.
- Filament panels will use `hammadzafar05/filament-mobile-preset` for bottom navigation, stacked tables on phones, slide-over modals, and larger touch targets.
- iPad readiness: layouts between 768–1024 px must not horizontally scroll; sidebars collapse to a toggle; tables remain readable.

## Cloud-agent independence

Any agent — local or cloud — should be able to run the full quality gate without relying on a pre-configured local machine.

- **Playwright browsers are not pre-installed.** Run `pnpm run test:e2e:install` to fetch Chromium with system dependencies. CI does this automatically in `.github/workflows/ui.yml`.
- **Laravel env is generated from `.env.example`.** Copy it, run `php artisan key:generate`, and use SQLite for local/CI runs.
- **Dependencies are pinned** (`composer.lock`, `pnpm-lock.yaml`). Use `composer install` and `pnpm install --frozen-lockfile`.
- **Session-start hook** (`.claude/hooks/session-start.sh`) reports toolchain state on agent startup.

## Secrets

Source of truth: **Infisical project** `90b0e7ef-3f72-4ddb-b888-055e90e13dfa` (same project used by `arh-family-lab` and `ARH-URUS`).

- Local Infisical config: `.infisical.json`
- App folder: `/arh-baca`
- Sync script: `scripts/sync-secrets.mjs` pushes `/arh-baca` and selected root secrets to GitHub repo `arhsmoque/ARH-Baca`
- Required `/arh-baca` secrets:
  - `APP_KEY` — run `php artisan key:generate --show` and paste the output
- Required root `/` secrets (reused from existing project):
  - `GITHUB_PAT` — personal access token with `repo` scope, used by `sync-secrets.mjs`
  - `ANTHROPIC`, `GEMINI`, `OPENROUTER_MAIN`, `GROQ_1`, `TAVILY`, `GOOGLE_SEARCH`, `BRAVE_SEARCH`, `EXA`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKERS_API_TOKEN`, `BACKBLAZE_B2_KEYID`, `BACKBLAZE_B2`, `TUGAS_RESEND`, `GOOGLE_OAUTH_CLIENT_ARH_HOMELAB`
- Required GitHub repository secrets:
  - `APP_KEY`, `GH_PAT`, `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`
  - `NEON_API_KEY`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `MAIL_PASSWORD`

## CI / CD

- `.github/workflows/ci.yml` — quality gate on every PR/push to `main`.
- `.github/workflows/ui.yml` — Playwright journeys against an ephemeral SQLite Laravel app.
- `.github/workflows/sync-secrets.yml` — manual Infisical → GitHub sync.
- `.github/workflows/deploy.yml` — build, migrate, and deploy to Google Cloud Run (gated on CI success).
- `.github/workflows/neon_workflow.yml` — create/delete Neon preview branches for pull requests.

## Deployment target

Google Cloud Run + Neon Postgres (Singapore, `aws-ap-southeast-1`) + Backblaze B2 for object storage. See `PARKED.md` for the remaining manual provisioning steps and `.claude/skills/arh-baca-deploy-playbook/` for the learned-hard facts.
