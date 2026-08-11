---
name: arh-baca-coding-conventions
description: Repo-specific coding conventions and tooling gotchas for ARH-Baca (Laravel 13 + Filament + Livewire + Tailwind v4). Use before writing or reviewing any PHP, Blade, or JS/TS code, before touching lint configs, before adding a new Eloquent model, before registering a Filament plugin, and before deciding whether a UI change needs a Playwright rehearsal.
triggers:
  - eslint
  - prettier
  - pint
  - larastan
  - phpstan
  - coding style
  - add typescript
  - new model
  - eloquent model
  - casts
  - filament plugin
  - livewire component
  - middleware
  - middleware alias
  - tailwind v4
  - playwright
  - ui check
---

# ARH-Baca coding conventions

Read the real config files (`eslint.config.js`, `.prettierrc.json`, `pint.json`, `phpstan.neon`) as the source of truth. This file explains the _why_ behind the non-obvious choices.

## Formatting is fully automated — don't hand-format

- **PHP**: Laravel Pint (`laravel` preset).
- **JS/TS/CSS/JSON/Markdown/YAML**: Prettier (`singleQuote: true`, `semi: true`, `trailingComma: all`, `printWidth: 100`).
- Both run via Husky + lint-staged and are gated in CI (`ci.yml`).
- If a diff shows only whitespace/quote/class-order churn, that's the formatter — don't revert it.

## Tailwind v4 specifics

- This project uses **Tailwind CSS v4** with the Vite plugin (`@tailwindcss/vite`).
- There is **no `tailwind.config.js`**; theme tokens live in CSS via `@theme` or `theme()`.
- The main entry is `resources/css/app.css` with `@import "tailwindcss"`.
- Filament panel themes (when added) go in `resources/css/filament/{panel}/theme.css` and must be listed in `vite.config.js` under `laravel({ input: [...] })`.
- Vendor plugin CSS (e.g. FullCalendar, WireChat, FilaCraft) needs `@source` directives in the panel theme CSS so Tailwind compiles their classes.

## PHP / Laravel

- **Middleware aliases** go in `bootstrap/app.php` under `Application::configure()->withMiddleware(...)`, not in a resurrected `app/Http/Kernel.php`.
- **New Eloquent models** with `casts()` need explicit `@property` docblocks for Larastan, especially enum/datetime casts.
- **`env()` is unreliable after `php artisan config:cache`.** Read config via `config('...')` in production code.
- **Mass-assignment silently no-ops** if the field isn't `$fillable`; use `forceFill([...])->save()` for server-only fields.

## Filament / Livewire

- Panels live in `app/Providers/Filament/`.
- Plugins are registered in the panel provider's `->plugins([...])` array.
- Livewire components live in `app/Livewire/`.
- Filament forms/tables should use typed `Form` and `Table` imports; Larastan level 5 is enforced.

## UI verification is mandatory

Any change that touches a rendered UI must have a Playwright rehearsal or manual browser verification, not just a code read. See `flow-of-events-first` skill and `AGENTS.md` for the rehearsal contract.

## Dependency audit policy

CI runs `composer audit` and `pnpm audit --audit-level=high` as report-only (`continue-on-error: true`). Do not flip these to hard gates without a dedicated triage pass.
