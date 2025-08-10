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

prompt_secret() {
  local prompt="$1" file="$2" val=""

  if [[ ${use_same,,} == "y" ]]; then
    while true; do
      read -rsp "Enter password for all secrets: " val; printf "\n"
      if [[ -n "$val" ]]; then
        break
      else
        warn "Value cannot be empty. Try again."
      fi
    done
    printf '%s' "$val" > "$file" && chmod 600 "$file"
    info "Saved to $file"
    return 0
  fi

  while true; do
    ${NON_INTERACTIVE} && { err "Non-interactive mode active, but secret required ($prompt)."; return 1; }
    read -rsp "${prompt}: " val; printf "\n"
    if [[ -n "$val" ]]; then
      break
    else
      warn "Value cannot be empty. Try again."
    fi
  done
  printf '%s' "$val" > "$file" && chmod 600 "$file"
  info "Saved to $file"
}



create_or_edit_secrets() {
  info "Creating/updating secrets …"
  local secrets_dir="$SECRETS_DIR" ans
  if [[ -d "$secrets_dir" && ${NON_INTERACTIVE} == false ]]; then
    read -rp "Secrets directory exists. Overwrite? [y/N]: " ans
    [[ $ans =~ ^[Yy]$ ]] || { warn "Cancelled by user."; return 0; }
  fi
  mkdir -p "$secrets_dir" && chmod 700 "$secrets_dir"

  declare -A prompts=(
    [admin-password]="Password for backend user \"admin\""
    [db-password]="Password for MySQL user"
    [mysql-root-password]="Password for MySQL root"
    [session-secret]="Session secret (cookie signing)"
  )
  echo
  important "MySQL root, MySQL user, admin (web-login), og session secrets will be created."
  read -rp "Use same password for all secrets? [y/N]: " use_same
  use_same="${use_same,,}"

  if [[ "$use_same" == "y" ]]; then
    local val file key
    while true; do
      read -rsp "Enter password for all secrets: " val; printf "\n"
      if [[ -n "$val" ]]; then
        break
      else
        warn "Value cannot be empty. Try again."
      fi
    done
    for key in "${!prompts[@]}"; do
      file="$secrets_dir/$key"
      printf '%s' "$val" > "$file" && chmod 600 "$file"
      info "Saved to $file"
    done
    return 0
  fi

  for key in "${!prompts[@]}"; do
    prompt_secret "${prompts[$key]}" "$secrets_dir/$key" || return 1
  done

  info "All secrets saved."
}