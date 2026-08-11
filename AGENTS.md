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

## Toolchain

- **PHP 8.4+**, **Composer**
- **Node 22+**, **pnpm** (use `corepack prepare pnpm@11.15.1 --activate` if needed)
- **Laravel 13**, **Filament 4/5** (to be added), **Livewire**, **Tailwind CSS v4**
- **Quality**: Laravel Pint, PHPStan + Larastan, PHPUnit, ESLint, Prettier, TypeScript
- **Security**: Secretlint, `composer audit`, `pnpm audit`
- **UI checks**: Playwright (desktop + mobile Chromium)
- **Git hooks**: Husky + lint-staged

## Local commands

```bash
# Verify environment
pnpm doctor

# Install everything
composer install
pnpm install

# One-shot quality gate (secrets, format, Pint, PHPStan, tests, lint, typecheck, build)
pnpm check

# Quick quality gate (skips asset build)
pnpm check:quick

# Dev server (Laravel + queue + logs + Vite)
composer dev

# Individual tools
vendor/bin/pint --test      # check PHP formatting
vendor/bin/pint             # fix PHP formatting
vendor/bin/phpstan analyse  # static analysis
php artisan test            # PHPUnit tests
pnpm lint                   # ESLint
pnpm format:check           # Prettier check
pnpm format                 # Prettier fix
pnpm typecheck              # TypeScript
pnpm secrets:check          # Secretlint
pnpm exec playwright test   # UI rehearsals
```

## Doctrine notes

- Verify before claiming completion. Run `pnpm check` before signing off on a change.
- Keep app code self-contained inside `app/` domain folders until a second consumer actually needs extraction.
- Do not commit `.env`, real secrets, or `vendor/`/`node_modules/`/`public/build/`.
- The operator owns secrets and accepts home-lab risk — don't gate progress on secret-handling theater, but never echo secrets or commit them.
- UI changes require a Playwright rehearsal or manual browser verification, not just code review.

## CI

- `.github/workflows/ci.yml` — quality gate on every PR/push to `main`.
- `.github/workflows/ui.yml` — Playwright journeys against an ephemeral SQLite Laravel app.
