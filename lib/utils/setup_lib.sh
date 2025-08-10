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

cmd_help() { 
  local cmd="$1"
  local desc="$2"
  printf "Use '%b%s%b' %s \n" "${_CYN}" "$cmd" "${_RST}" "$desc"
}

# ---------- Global defaults ----------
K8S_NS="${K8S_NS:-default}"
NON_INTERACTIVE="${NON_INTERACTIVE:-false}"

SECRETS_DIR="${SECRETS_DIR:-DIR_NAME_SECRETS}"

source "$SCRIPT_DIR/lib/utils/setup/secrets_utils.sh"
source "$SCRIPT_DIR/lib/utils/setup/env_setup.sh"
source "$SCRIPT_DIR/lib/utils/setup/docker_helpers.sh"
source "$SCRIPT_DIR/lib/utils/setup/k8s_helpers.sh"

# Kubernetes architecture handling
configure_k8s_architecture() {
  local arch
  arch=$(uname -m)

  case "$arch" in
    x86_64)
      info "Initializing for AMD64 architecture..."
      init_amd64 || return 1
      ;;
    aarch64 | arm64)
      info "Initializing for ARM64 architecture..."
      init_arm64 || return 1
      ;;
    *)
      err "Unsupported architecture: $arch, no compatible installation method available."
      return 1
      ;;
  esac
  return 0
}


core_setup() {
  purge_mysql_data           || return 1
  create_or_edit_secrets     || return 1
  create_or_edit_env_file    || return 1
  init_docker_compose        || return 1
  inject_env                 || return 1
  build_with_docker          || return 1
}

display_kubernetes_instructions() {
  echo
  info "Run the following 3 commands in order to successfully start the Minikube cluster:"
  cmd_help "minikube start" "to start the Minikube cluster."
  cmd_help "minikube tunnel" "in a separate terminal to expose services."
  cmd_help "kubectl apply -f k8s/" "to deploy your services."
  info "After starting the Minikube cluster, you can use the following commands:"
  cmd_help "kubectl get pods -n $K8S_NS" "to check pod status."
  cmd_help "kubectl describe pod <pod-name> -n $K8S_NS" "for detailed info."
  cmd_help "kubectl logs <pod-name> -n $K8S_NS" "to view logs."
  cmd_help "kubectl exec -it <pod-name> -n $K8S_NS -- /bin/bash" "to access a pod shell."
  cmd_help "kubectl delete -f k8s/" "to clean up all resources."
  echo "For more help, refer to the Kubernetes documentation."
}

print_permission_reminder() {
  echo
  important "Remember to set up Docker permissions correctly:"
  cmd_help "sudo usermod -aG docker $USER" "to add your user to the docker group."
  cmd_help "newgrp docker" "to apply the group changes without logging out."
  echo
}

print_web_details() {
  source "$SCRIPT_DIR/.env"

  local url
  if [[ -n "${NGINX_SERVER_NAME:-}" ]]; then
    url="http://${NGINX_SERVER_NAME}"
  else
    url="http://localhost"
  fi

  info "Admin portal will be accessible at: $url after starting the services."
  important "Admin portal available at $url/login"
  important "Username: 'admin'"
  important "Password: The one you configured during setup"

}

init_with_both() {
  core_setup                 || return 1
  build_k8s_deployments      || return 1
  migrate_env_to_kubectl     || return 1
  migrate_secrets_to_kubectl || return 1
  replace_k8s_namespace      || return 1
  create_namespace_if_not_exists || return 1
  configure_k8s_architecture        || return 1

  info "Kubernetes and docker compose setup complete."
  print_web_details
  display_kubernetes_instructions
  info "You can also run the application locally. Make sure minikube is not running."
  cmd_help "minikube stop" "to stop the Minikube cluster."
  cmd_help "docker compose up -d" "to run the application locally."
  cmd_help "docker compose down" "to stop the application."
  print_permission_reminder
  exit 0

}

init_with_kubectl() {
  if ! command -v kubectl >/dev/null 2>&1; then
    err "kubectl is not installed. Please install it first."
    return 1
  fi

  create_or_edit_secrets     || return 1
  create_or_edit_env_file    || return 1

  source "$SCRIPT_DIR/.env" || {
    err "Failed to source .env file."
    return 1
  }

  build_k8s_deployments      || return 1
  migrate_env_to_kubectl     || return 1
  migrate_secrets_to_kubectl || return 1
  replace_k8s_namespace      || return 1
  create_namespace_if_not_exists || return 1
  configure_k8s_architecture        || return 1

  info "Kubernetes and docker compose setup complete."
  print_web_details
  display_kubernetes_instructions
  print_permission_reminder
  
  exit 0

}

init_with_docker() {
  core_setup || return 1

  info "Docker setup complete."
  echo
  cmd_help "docker compose up -d" "to run the application locally."
  cmd_help "docker compose down" "to stop the application."
  print_permission_reminder
  
  exit 0
}