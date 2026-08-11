#!/bin/sh

set -e

echo "ARH-Baca - Starting application..."

# The Dockerfile bakes a known dummy APP_KEY so `composer install` can run
# `package:discover` during build. It must never reach production traffic:
# if it's still set here, either the real secret failed to inject or nobody
# overrode the build-time default - fail loudly rather than silently
# encrypting Vault entries with a key baked into every public image build.
KNOWN_DUMMY_APP_KEY="base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
if [ "$APP_KEY" = "$KNOWN_DUMMY_APP_KEY" ]; then
    echo "FATAL: APP_KEY is still the Dockerfile's build-time dummy value." >&2
    echo "The real APP_KEY secret was not injected into this container. Refusing to start." >&2
    exit 1
fi

# Auto-generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:" ]; then
    # Check if a key was previously generated and persisted
    if [ -f "/data/.app_key" ]; then
        export APP_KEY=$(cat /data/.app_key)
        echo "Loaded APP_KEY from /data/.app_key"
    else
        echo "No APP_KEY found, generating one..."
        php artisan key:generate --force --show > /tmp/app_key_output
        GENERATED_KEY=$(cat /tmp/app_key_output | tr -d '[:space:]')
        rm -f /tmp/app_key_output
        export APP_KEY="$GENERATED_KEY"

        # Persist to data volume if available
        if [ -d "/data" ]; then
            echo "$GENERATED_KEY" > /data/.app_key
            echo "APP_KEY persisted to /data/.app_key"
        fi
    fi
    # Update .env so artisan commands within this container work
    if grep -q '^APP_KEY=' .env 2>/dev/null; then
        sed -i "s|^APP_KEY=.*|APP_KEY=$APP_KEY|" .env
    else
        echo "APP_KEY=$APP_KEY" >> .env
    fi
fi

# Database initialization
if [ "$DB_CONNECTION" = "sqlite" ]; then
    echo "Using SQLite database..."

    # Create the SQLite file and parent directory if they don't exist
    DB_DIR=$(dirname "$DB_DATABASE")
    if [ ! -d "$DB_DIR" ]; then
        echo "Creating database directory: $DB_DIR"
        mkdir -p "$DB_DIR"
    fi
    if [ ! -f "$DB_DATABASE" ]; then
        echo "Creating SQLite database: $DB_DATABASE"
        touch "$DB_DATABASE"
    fi

    echo "SQLite is ready!"
else
    # Wait for PostgreSQL to be ready. Uses a one-line PDO check via the PHP
    # already in this image (pdo_pgsql is installed) instead of shelling out
    # to psql - the postgresql-client package was never actually in this
    # image (only libpq, the runtime lib; postgresql-dev/client tooling lives
    # in the build-deps virtual package that gets `apk del`'d), so a
    # psql-based wait would just fail with "psql: not found" every time.
    echo "Waiting for PostgreSQL..."
    ATTEMPTS=0
    MAX_ATTEMPTS=30
    until php -r '
        $url = getenv("DATABASE_URL");
        if ($url) {
            // Cloud Run path: only DATABASE_URL is set, no discrete DB_* vars.
            $p = parse_url($url);
            $host = $p["host"]; $port = $p["port"] ?? 5432; $db = ltrim($p["path"] ?? "", "/");
            $user = $p["user"] ?? null; $pass = $p["pass"] ?? null;
        } else {
            // docker-compose.homeserver.yml path: discrete DB_* vars.
            $host = getenv("DB_HOST"); $port = getenv("DB_PORT") ?: 5432;
            $db = getenv("DB_DATABASE"); $user = getenv("DB_USERNAME"); $pass = getenv("DB_PASSWORD");
        }
        $dsn = "pgsql:host={$host};port={$port};dbname={$db};sslmode=" . (getenv("DB_SSLMODE") ?: "prefer");
        try {
            new PDO($dsn, $user, $pass);
            exit(0);
        } catch (Throwable $e) {
            exit(1);
        }
    ' 2>/dev/null; do
        ATTEMPTS=$((ATTEMPTS + 1))
        if [ $ATTEMPTS -gt $MAX_ATTEMPTS ]; then
            echo "PostgreSQL failed to start in time"
            exit 1
        fi
        echo "PostgreSQL not ready yet... ($ATTEMPTS/$MAX_ATTEMPTS)"
        sleep 1
    done

    echo "PostgreSQL is ready!"
fi

# Run migrations (safe to run even if already up to date). Skipped when
# SKIP_AUTO_MIGRATE=true - Cloud Run runs migrations as an explicit,
# controlled deploy-time Job instead, not on every container boot where
# concurrent cold-started instances could race each other.
if [ "$SKIP_AUTO_MIGRATE" = "true" ]; then
    echo "SKIP_AUTO_MIGRATE=true - skipping automatic migrations."
else
    echo "Running migrations..."
    php artisan migrate --force
fi

# Cache configuration in production
if [ "$APP_ENV" = "production" ]; then
    echo "Caching configuration..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

echo "Application initialization complete!"

# Execute the main command (php-fpm, queue:work, artisan serve, etc.)
exec "$@"
