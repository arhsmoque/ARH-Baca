#!/usr/bin/env bash
set -euo pipefail

echo "[arh-baca] Session start hook"
echo "[arh-baca] Working directory: $(pwd)"

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
