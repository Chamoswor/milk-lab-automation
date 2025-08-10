#!/usr/bin/env bash
# ==========================================================
# File: lib/utils/init_lib.sh
# Purpose: Common setup helpers
# ==========================================================
# NOTE! This file must be *sourced* by init.sh – do not run it directly.
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  printf "This script must be sourced, not executed directly.\n" >&2
  return 1 2>/dev/null || exit 1
fi

purge_mysql_data() {
  local data_dir="$SCRIPT_DIR/mysql/data"

  [[ -d "$data_dir" ]] || { info "No MySQL data directory to delete."; return 0; }

  if ${NON_INTERACTIVE}; then
    warn "Skipping deletion of $data_dir in non-interactive mode."
    return 0
  fi

  read -rp "Delete existing MySQL data (users/passwords)? [y/N]: " ans
  [[ $ans =~ ^[Yy]$ ]] || { info "Existing data kept."; return 0; }

  info "Stopping containers and removing volumes …"
  docker compose down -v
  info "Deleting $data_dir …"
  rm -rf "$data_dir"
  info "Data directory removed. MySQL will initialise fresh on next start-up."
}

wait_for_mysql() {
  local cid
  cid=$(docker compose ps -q mysql) || {
    err "Failed to retrieve log for mysql container"
    return 1
  }

  local want=2 seen=0
  local timeout=60 
  local start

  start=$(date +%s) || {
    if ! docker logs "$cid" >/dev/null 2>&1; then
      err "Kunne ikke hente logg for mysql-containeren"
      return 1
    fi
  }

  echo "Waiting for MySQL (max ${timeout}s) …"

  while IFS= read -r line; do
    [[ $line == *"ready for connections"* ]] && ((seen++))
    if (( seen >= want )); then
      echo "MySQL is ready."
      break
    fi
    if (( $(date +%s) - start > timeout )); then
      echo "Timeout: MySQL is not ready."
      return 1
    fi
  done < <(docker logs -f "$cid" 2>&1)

  return 0
}


build_with_docker() {
  info "Building Docker images …"
  docker compose build
  info "Starting mysql service …"
  docker compose up mysql -d
  info "Waiting for database to be ready …"
  wait_for_mysql || return 1
  docker compose down
}



init_docker_compose() {
  info "Creating docker-compose.yaml from template …"
  local template="$SCRIPT_DIR/docker-compose.template.yaml"
  [[ -f "$template" ]] || { err "Template $template not found."; return 1; }

  local out="$SCRIPT_DIR/docker-compose.yaml"

  #check if the .env file does not exist
  if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    err ".env file is missing. Please create it first."
    return 1
  fi
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/.env"

  if [[ -z "${SUBNET:-}" ]]; then
    err "SUBNET variable is not set in .env file."
    return 1
  fi

  export SUBNET NGINX_IP FRONTEND_IP BACKEND_IP MYSQL_IP PYTHON_IP
  envsubst < "$template" > "$out" || { err "Failed to create $out"; return 1; }
}