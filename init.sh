#!/usr/bin/env bash
#
# init.sh – Prepares secrets, sets up environment variables,
#           and initializes Docker services in the correct order.
#
set -euo pipefail

# ------------- ANSI colours --------------
_RED="\e[31m"; _GRN="\e[32m"; _YEL="\e[33m"; _RST="\e[0m"
_BLUE="\e[34m"; _MAG="\e[35m"; _CYN="\e[36m"

info() { printf "%b[INFO]%b  %s\n"  "${_GRN}" "${_RST}" "$1"; }
warn() { printf "%b[WARN]%b  %s\n"  "${_YEL}" "${_RST}" "$1"; }
important() { printf "%b[IMPORTANT]%b  %s\n"  "${_MAG}" "${_RST}" "$1"; }
err()  { printf "%b[ERROR]%b %s\n"  "${_RED}" "${_RST}" "$1" >&2; }
# ---------- End of ANSI colours ----------


SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_MARKER="$SCRIPT_DIR/.id"
EXPECTED_ID="milk-lab-automation"

if [[ ! -f "$PROJECT_MARKER" ]]; then
  err "Project marker file does not exist. Exiting."
  exit 1
fi

if [[ -L "$PROJECT_MARKER" ]]; then
  err "Project marker is a symbolic link, not a regular file. Exiting."
  exit 1
fi

if ! grep -qx "$EXPECTED_ID" "$PROJECT_MARKER"; then
  err "Project marker does not contain the expected project ID. Exiting."
  exit 1
fi


if [[ "$(id -u)" -eq 0 ]]; then
  warn "You are running this script as root. This may cause issues with the installation."
  read -rp "Do you want to continue? [y/N]: " ans
  if [[ ${ans,,} != "y" ]]; then
    echo "Exiting..."
    exit 0
  fi
fi

if [[ -f "$SCRIPT_DIR/init.conf" ]]; then
  tmpconf="$(mktemp)"
  trap 'rm -f "$tmpconf"' EXIT
  sed 's/\r$//' "$SCRIPT_DIR/init.conf" > "$tmpconf"
  # shellcheck disable=SC1090
  source "$tmpconf"
  : "${VERSION_APP:?init.conf must define VERSION_APP}"
  export VERSION_APP
else
  err "init.conf not found."
  exit 1
fi

K8S_DIR="$SCRIPT_DIR/$DIR_NAME_K8S"
SECRETS_DIR="$SCRIPT_DIR/$DIR_NAME_SECRETS"

if [[ "$(stat -c '%U' "$SCRIPT_DIR")" != "$USER" ]]; then
  if command -v sudo >/dev/null 2>&1; then
    sudo chown -R "$USER":"$USER" "$SCRIPT_DIR"
  else
    warn "Cannot change owner of $SCRIPT_DIR (sudo missing). Continuing."
  fi
fi

cd "$SCRIPT_DIR"

# Library imports
source "$SCRIPT_DIR/lib/utils/setup_lib.sh"
source "$SCRIPT_DIR/lib/utils/dependencies_lib.sh"
source "$SCRIPT_DIR/lib/utils/menu_lib.sh"


# Check for required dependencies
check_dependencies || {
  err "Dependencies check failed. Please install the required packages python3, docker, and kubectl(optional)."
  exit 1
}

# Check if user is in docker group, if not add them
check_or_add_docker_group || {
  err "Failed to check or add user to the docker group. Please ensure you have the necessary permissions."
  exit 1
}

main() {

  # Reset command count
  unset COMMAND_COUNT
  for var in $(env | grep -o "COMMAND_[0-9]\+_[A-Z]\+" | sort -u); do
    unset "$var"
  done

  echo
  echo "***********************************************"
  echo "* Welcome to the Dockerized Application Setup *"
  echo "***********************************************"
  echo

  # Add commands - format: "Description" "function_name" "Help text"
  add_command "Initialize with kubectl" "init_with_kubectl" "Set up the application using Kubernetes only."
  add_command "Initialize with Docker" "init_with_docker" "Set up the application using Docker containers only."
  add_command "Initialize with both" "init_with_both" "Set up the application with both Docker and Kubernetes support."
  add_command "Install optional dependencies" "install_optional_dependencies" "Install additional packages that may be required for extended functionality."
  add_command "Create or edit secrets" "create_or_edit_secrets" "Configure application secrets like API keys and passwords."
  add_command "Create or edit environment file" "create_or_edit_env_file" "Configure environment variables for the application."
  add_command "Migrate environment to kubectl" "migrate_env_to_kubectl" "Move environment settings from files to Kubernetes ConfigMaps."
  add_command "Migrate secrets to kubectl" "migrate_secrets_to_kubectl" "Move secrets from files to Kubernetes Secrets."
  add_command "Purge MySQL data" "purge_mysql_data" "Remove all MySQL data (WARNING: This is irreversible)."

  print_commands
  while true; do
    if choose_command; then
      break
    fi
  done

}

main "$@"
