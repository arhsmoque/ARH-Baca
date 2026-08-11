---
name: arh-baca-deploy-playbook
description: Repo-specific facts about ARH-Baca's deploy pipeline (Laravel + Cloud Run + Neon + Backblaze B2 + Workload Identity Federation). Use before touching Dockerfile, docker/entrypoint.sh, .github/workflows/deploy.yml, config/filesystems.php, or any infrastructure workflow. Trigger on "arh-baca deploy", "cloud run", "entrypoint", "dockerfile", "migration", "APP_KEY", "workload identity", "neon".
---

# ARH-Baca deploy playbook

Concrete, repo-specific facts — not general advice. The pipeline was adapted from `arh-urus`, which paid real debugging time for these rules. See `PARKED.md` for the remaining manual GCP/Neon setup steps.

## Laravel / PHP

- **`env()` is unreliable after `php artisan config:cache`.** Any conditional logic keyed on an env var must read via `config('...')` once caching is in play — which it always is in production.
- **Migrations run as a one-off Cloud Run Job against the _direct_ (non-pooled) Neon connection string**, never on container boot. A scale-to-zero service migrating on every cold start is a correctness hazard.
- **APP_KEY is injected at runtime** via GitHub secrets. The Dockerfile bakes a known dummy key so `composer install` can run `package:discover`; `docker/entrypoint.sh` rejects that exact dummy value on startup (fail-closed).

## GCP / Cloud Run

- **`--command` replaces ENTRYPOINT. `--args` replaces only CMD.** Getting this backwards skips `entrypoint.sh` entirely — no Postgres wait, no config-cache, no APP_KEY check. Always `--args`, never `--command`, for the serve command.
- **`--no-traffic` is invalid on a service's first-ever revision.** Valid on revision 2+ only.
- **Workload Identity Federation (WIF) pool must be scoped to `refs/heads/main`** or the provider will trust any branch.
- **`gcloud auth configure-docker asia-southeast1-docker.pkg.dev` is required** after WIF auth — WIF alone doesn't wire Docker's credential helper.
- **The deploy service account needs `cloudscheduler.jobs.create`** to create the scheduler trigger on first deploy.
- **`GITHUB_TOKEN` cannot read/write repo secrets/variables via API.** Set `ARH_BACA_APP_URL` manually after the first deploy reveals the URL.

## Neon

- **`DATABASE_URL` is computed fresh every deploy** via `neonctl connection-string`, not stored as a static secret.
- Migrations use the **direct** connection string; the running service uses the **pooled** connection string.
- Neon project should be in `aws-ap-southeast-1` (Singapore) to stay co-located with Cloud Run and R2.

## Storage (Backblaze B2)

- This project reuses the Backblaze B2 keys from the shared ARH vault, mapped to the standard Laravel S3 driver:
  - `AWS_ACCESS_KEY_ID` → `B2_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY` → `B2_SECRET_ACCESS_KEY`
  - `AWS_ENDPOINT` → B2 S3 endpoint (e.g. `https://s3.us-east-005.backblazeb2.com`)
  - `AWS_BUCKET` → B2 bucket name
  - `AWS_USE_PATH_STYLE_ENDPOINT=true`
- Keep the bucket private and generate presigned URLs for user-facing media — same discipline as `arh-urus` uses for R2.

## Deploy trigger

- `.github/workflows/deploy.yml` triggers on `workflow_run: [CI]` with `conclusion == 'success'`, not a bare `push`. This prevents deploying broken commits.
- Manual deploys are available via `workflow_dispatch`.

## Scheduler

- A Cloud Run Job `arh-baca-scheduler` runs `php artisan schedule:run`.
- Cloud Scheduler invokes it every minute. Laravel's own scheduler decides what's actually due.
