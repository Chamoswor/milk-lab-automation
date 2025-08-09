#!/usr/bin/env sh
# Expands any env var ending in `_FILE` to the contents of the file it points to.
set -e
for var in $(env | awk -F= '$1 ~ /_FILE$/ {print $1}'); do
  dest="${var%_FILE}"
  path="$(printenv "$var")"

  if [ -f "$path" ]; then
    export "$dest"="$(cat "$path")"
  fi
done
