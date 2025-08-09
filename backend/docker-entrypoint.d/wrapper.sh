#!/usr/bin/env sh
set -e

# Source all executable scripts in /docker-entrypoint.d to set environment variables.
if [ -d /docker-entrypoint.d ]; then
  for f in /docker-entrypoint.d/*; do
    if [ -x "$f" ]; then
      echo "→ Sourcing $f"
      . "$f"
    fi
  done
fi

# If ENTRYPOINT is run without a CMD, mimic the behavior of the base node image.
if [ "$#" -eq 0 ]; then
  set -- node
fi

exec "$@"
