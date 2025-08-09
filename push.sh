#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Deploy script                                                                #
#                                                                              #
#  * Push to GitHub                                                            #
#  * Build & push Docker images locally, via SSH, or combined (multi-arch)     #
#  * Creates a manifest once both architectures are pushed                     #
################################################################################

################################################################################
# {{ .env.github }}                                                            #
# VERSION="${VERSION:-1.0}"                                                    #
#                                                                              #
# EMAIL="email@example.com"                                                    #
# NAME="Your Name"                                                             #
# USERNAME="yourusername"                                                      #
# REPO_NAME="your-repo-name"                                                   #
#                                                                              #
# GITHUB_REPO="${USERNAME}/${REPO_NAME}.git"                                   #
# GHCR_URL="ghcr.io/${USERNAME}"                                               #
# SERVICES=(nginx frontend python backend)                                     #
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Colors & logging helpers
# ---------------------------------------------------------------------------
_RED="\e[31m"; _GRN="\e[32m"; _YEL="\e[33m"; _RST="\e[0m"
info() { printf "%b[INFO]%b %s\n"    "${_GRN}" "${_RST}" "$1"; }
warn() { printf "%b[WARNING]%b %s\n" "${_YEL}" "${_RST}" "$1"; }
err()  { printf "%b[ERROR]%b %s\n"   "${_RED}" "${_RST}" "$1" >&2; }
trap 'err "Unexpected error on line $LINENO"' ERR
set -o errtrace

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
ensure_context() {
  local ctx="$1"
  docker context inspect "$ctx" &>/dev/null || { err "Docker context '$ctx' does not exist"; return 1; }
}

load_env() {
  local env_file="$SCRIPT_DIR/.env.github"
  [[ -f "$env_file" ]] || { err ".env.github not found"; exit 1; }
  chmod 600 "$env_file"
  # shellcheck disable=SC1090
  source "$env_file"
  for var in VERSION EMAIL NAME USERNAME GITHUB_REPO GHCR_URL SERVICES; do
    [[ -n "${!var:-}" ]] || { err "Environment variable $var is not set."; exit 1; }
  done
}

# ---------------------------------------------------------------------------
# GHCR token initialisation & login
# ---------------------------------------------------------------------------
init_ghcr() {
  # If a valid token is already exported we keep it; otherwise decrypt or create
  local enc_path="$SCRIPT_DIR/GHCR_TOKEN.enc"

  # 1) Early‑out if GHCR_TOKEN already works ----------------------------------
  if [[ -n "${GHCR_TOKEN:-}" ]]; then
    if echo "$GHCR_TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin &>/dev/null; then
      info "Using existing GHCR_TOKEN from environment."
      export GHCR_TOKEN
      return 0
    else
      warn "Existing GHCR_TOKEN appears to be invalid - will try decrypt/create."
    fi
  fi

  # 2) Decrypt stored token if file exists ------------------------------------
  if [[ -f "$enc_path" ]]; then
    read -rsp "Decryption password: " ghcr_pass; echo
    GHCR_TOKEN="$(printf "%s" "$ghcr_pass" | \
      openssl enc -d -aes-256-cbc -a -salt -pbkdf2 -pass stdin -in "$enc_path" 2>/dev/null || true)"
    unset ghcr_pass

    if [[ -z "$GHCR_TOKEN" ]]; then
      err "Decryption failed - wrong password or corrupt file."; return 1;
    fi
    info "Token decrypted successfully."
  else
    # 3) Ask user for a new token and store it encrypted ----------------------
    read -rsp "Enter new GHCR token: " GHCR_TOKEN; echo
    read -rsp "Set encryption password: " ghcr_pass; echo

    printf "%s" "$GHCR_TOKEN" | \
      openssl enc -e -aes-256-cbc -a -salt -pbkdf2 -pass pass:"$ghcr_pass" | \
      tee "$enc_path" >/dev/null || { err "Could not write $enc_path"; return 1; }
    chmod 600 "$enc_path"
    unset ghcr_pass
    info "Encrypted GHCR token stored at $enc_path"
  fi

  # 4) Final verification & export -------------------------------------------
  if ! echo "$GHCR_TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin &>/dev/null; then
    err "Login to GHCR failed - token likely invalid."; return 1;
  fi
  export GHCR_TOKEN
  info "Authenticated to ghcr.io successfully."
}

# ---------------------------------------------------------------------------
# Git push
# ---------------------------------------------------------------------------
push_git() {
  local commit_msg="${1:-Automatic commit from deploy script}"
  command -v git >/dev/null || { err "Git is not installed."; return 1; }

  init_ghcr

  git config --global user.email "$EMAIL"
  git config --global user.name  "$NAME"
  git remote get-url origin &>/dev/null || git remote add origin "https://github.com/${GITHUB_REPO}"
  git config --global credential.helper "cache --timeout=3600"
  printf "protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n" "$USERNAME" "$GHCR_TOKEN" | git credential approve

  if git add -A --dry-run | grep -q '.'; then
    git add -A
  else
      warn "No changes to add"
  fi
  
  if git diff --cached --quiet; then
    info "No changes to commit."
    return 0
  fi
  git commit -m "$commit_msg"
  git push -u origin HEAD:main
  info "Push to GitHub completed."
}

# ---------------------------------------------------------------------------
# Local Docker build & push (single arch)
# ---------------------------------------------------------------------------
push_pkg() {
  local host_arch
  case "$(uname -m)" in
    x86_64|amd64) host_arch="amd64" ;;
    aarch64|arm64) host_arch="arm64" ;;
    *) err "Unknown architecture: $(uname -m)"; return 1 ;;
  esac

  init_ghcr
  for svc in "${SERVICES[@]}"; do
    local tag="${GHCR_URL}/${svc}:${VERSION}-${host_arch}"
    info "Local build: ${svc} (${host_arch})"
    docker build --platform "linux/${host_arch}" -t "$tag" "$SCRIPT_DIR/$svc"
    docker push "$tag"
  done
}

# ---------------------------------------------------------------------------
# Docker build via SSH context (single arch remote)
# ---------------------------------------------------------------------------
push_pkg_ssh() {
  local ctx="$1" arch="$2"
  ensure_context "$ctx"
  init_ghcr
  echo "$GHCR_TOKEN" | docker --context "$ctx" login ghcr.io -u "$USERNAME" --password-stdin > /dev/null
  for svc in "${SERVICES[@]}"; do
    local tag="${GHCR_URL}/${svc}:${VERSION}-${arch}"
    info "SSH build: ${svc} (${arch}) via $ctx"
    docker --context "$ctx" build --platform "linux/${arch}" -t "$tag" "$SCRIPT_DIR/$svc"
    docker --context "$ctx" push "$tag"
  done
}

# ---------------------------------------------------------------------------
# Multi-arch: local + remote SSH build + manifest
# ---------------------------------------------------------------------------
push_pkg_multi() {
  # Can be called as --pkg-multi <ctx> <arch> or with env vars
  local ssh_ctx="${1:-${SSH_CONTEXT:-}}"
  local remote_arch="${2:-${SSH_ARCH:-}}"
  [[ -z "$ssh_ctx" || -z "$remote_arch" ]] && { err "--pkg-multi requires <context> <arch> or SSH_CONTEXT/SSH_ARCH env vars"; return 1; }

  ensure_context "$ssh_ctx"

  local host_arch
  case "$(uname -m)" in
    x86_64|amd64) host_arch="amd64" ;;
    aarch64|arm64) host_arch="arm64" ;;
    *) err "Unknown architecture: $(uname -m)"; return 1 ;;
  esac

  init_ghcr
  echo "$GHCR_TOKEN" | docker --context "$ssh_ctx" login ghcr.io -u "$USERNAME" --password-stdin > /dev/null

  for svc in "${SERVICES[@]}"; do
    local tag_base="${GHCR_URL}/${svc}:${VERSION}"

    # Local build
    info "Local build: ${svc} (${host_arch})"
    docker build --platform "linux/${host_arch}" -t "${tag_base}-${host_arch}" "$SCRIPT_DIR/$svc"
    docker push "${tag_base}-${host_arch}"

    # Remote build
    info "Remote build: ${svc} (${remote_arch}) via ${ssh_ctx}"
    docker --context "$ssh_ctx" build --platform "linux/${remote_arch}" -t "${tag_base}-${remote_arch}" "$SCRIPT_DIR/$svc"
    docker --context "$ssh_ctx" push "${tag_base}-${remote_arch}"

    # Manifest
    info "Creating manifest for ${svc}"
    docker manifest create "${tag_base}" \
      --amend "${tag_base}-${host_arch}" \
      --amend "${tag_base}-${remote_arch}" 2>/dev/null || true
    docker manifest push "${tag_base}" || true
  done
}

push_pkg_buildx() {
  init_ghcr
  docker buildx create --use --name multiarch-builder
  for svc in "${SERVICES[@]}"; do
    local tag="${GHCR_URL}/${svc}:${VERSION}"
    docker buildx build --platform linux/amd64,linux/arm64 \
      -t "$tag" --push "$SCRIPT_DIR/$svc"
  done
}

# ---------------------------------------------------------------------------
# CLI help
# ---------------------------------------------------------------------------
print_help() {
  cat <<EOF
Available flags
  --git [message]              Push to GitHub
  --pkg                        Build & push locally (host architecture)
  --pkg-ssh <ctx> <arch>       Build & push via Docker context <ctx> for one arch
  --pkg-multi <ctx> <arch>     Build locally + via SSH, create manifest (two archs)
  --pkg-buildx                 Build multi-arch images using buildx
  --help                       Show this help
EOF
}

# ---------------------------------------------------------------------------
# Entrypoint / flag parsing
# ---------------------------------------------------------------------------
main() {
  [[ $# -eq 0 ]] && { print_help; exit 0; }

  load_env  # read .env.github

  case "$1" in
    --git)
      shift; push_git "${1:-}" ;;
    --pkg)
      push_pkg ;;
    --pkg-ssh)
      [[ $# -lt 3 ]] && { err "Usage: --pkg-ssh <context> <arch>"; exit 1; }
      shift; push_pkg_ssh "$1" "$2" ;;
    --pkg-multi)
      [[ $# -lt 3 ]] && { err "Usage: --pkg-multi <context> <arch>"; exit 1; }
      shift; push_pkg_multi "$1" "$2" ;;
    --pkg-buildx)
      push_pkg_buildx ;;
    --help)
      print_help ;;
    *)
      warn "Unknown flag: $1"; print_help; exit 1 ;;
  esac
}

main "$@"
