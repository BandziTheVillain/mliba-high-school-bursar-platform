#!/bin/sh

# Abort script on first error
set -e

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Start the actual application (passed from Docker CMD)
exec "$@"
