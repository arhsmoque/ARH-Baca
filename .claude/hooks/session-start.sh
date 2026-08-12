#!/usr/bin/env bash
set -euo pipefail

echo "[arh-baca] Session start hook"
echo "[arh-baca] Working directory: $(pwd)"

# Cloud sessions start from a fresh clone with no node_modules/. Bootstrap
# pnpm automatically so the diagnostics below (and the first tool call)
# reflect a ready repo instead of a "run pnpm install" warning. Gated on
# CLAUDE_CODE_REMOTE so a local dev's own node_modules/lockfile state is
# never touched by this hook. Composer is deliberately NOT auto-installed
# here: it's far heavier, and dev-dependency downloads can be blocked by
# this session's outbound network policy (see AGENTS.md) - failing that
# silently in a hook would be more confusing than the existing diagnostic.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] && command -v pnpm >/dev/null 2>&1; then
  echo "[arh-baca] Cloud session detected: installing pnpm dependencies (frozen lockfile)."
  if pnpm install --frozen-lockfile --prefer-offline; then
    echo "[arh-baca] pnpm dependencies installed."
  else
    echo "[arh-baca] WARNING: pnpm install failed; run 'pnpm install' manually."
  fi
fi

# Verify PHP toolchain
if command -v php >/dev/null 2>&1; then
  echo "[arh-baca] PHP: $(php -v | head -n 1)"
else
  echo "[arh-baca] WARNING: php not found in PATH"
fi

# Verify Node/pnpm toolchain
if command -v pnpm >/dev/null 2>&1; then
  echo "[arh-baca] pnpm: $(pnpm --version)"
elif command -v npm >/dev/null 2>&1; then
  echo "[arh-baca] npm: $(npm --version) (pnpm preferred)"
else
  echo "[arh-baca] WARNING: neither pnpm nor npm found in PATH"
fi

# Verify Composer
if command -v composer >/dev/null 2>&1; then
  echo "[arh-baca] Composer: $(composer --version | head -n 1)"
else
  echo "[arh-baca] WARNING: composer not found in PATH"
fi

# Verify Playwright browsers are installed (cloud agents can run pnpm run test:e2e:install)
if [ -d "node_modules/@playwright/test" ]; then
  if [ -d "$HOME/.cache/ms-playwright/chromium" ] || [ -d "$(pwd)/node_modules/playwright-core/.local-browsers/chromium" ]; then
    echo "[arh-baca] Playwright Chromium: detected"
  else
    echo "[arh-baca] Playwright Chromium: NOT installed — run 'pnpm run test:e2e:install' before e2e tests"
  fi
else
  echo "[arh-baca] WARNING: node_modules/@playwright/test not found — run 'pnpm install'"
fi

# Verify Laravel env
if [ -f ".env" ]; then
  echo "[arh-baca] .env: present"
else
  echo "[arh-baca] .env: missing — copy .env.example to .env and run 'php artisan key:generate'"
fi

echo "[arh-baca] Hook complete"
