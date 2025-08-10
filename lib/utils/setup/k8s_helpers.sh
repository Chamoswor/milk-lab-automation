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

ensure_kubectl_api() {
  if kubectl version --request-timeout='10s' >/dev/null 2>&1; then
    return 0
  fi

  warn "API connection failed. Trying to start Minikube if installed ..."
  if minikube start --driver=docker >/dev/null 2>&1; then
    return 0
  fi

  err "Could not connect to Kubernetes API server. Check that Minikube/K3s is running and kubeconfig is correct."
  exit 1
}

migrate_env_to_kubectl() {
  command -v kubectl >/dev/null 2>&1 || { warn "kubectl not installed - skipping."; return 0; }
  local env_file="$SCRIPT_DIR/.env"; [[ -f "$env_file" ]] || { err ".env is missing."; return 1; }
  local out="$K8S_DIR/env-configmap.yaml"
  kubectl create configmap env --from-env-file="$env_file" --dry-run=client -o yaml > "$out" || return 1
  chmod 600 "$out"
  
  ensure_kubectl_api
  kubectl apply -f "$out" --namespace "$K8S_NS" || return 1
  info "Migrated .env to ConfigMap ($out) in namespace $K8S_NS."
}


migrate_secrets_to_kubectl() {
  command -v kubectl >/dev/null 2>&1 || { warn "kubectl not installed - skipping."; return 0; }

  [[ -d "$SECRETS_DIR" ]] || { err "Secrets directory is missing."; return 1; }
  mkdir -p "$K8S_DIR"

  local secret_name="${K8S_SECRET_NAME:-$(basename "$SECRETS_DIR")}"
  local out="$K8S_DIR/${secret_name}.yaml"

  local from_args=()
  for secret_file in "$SECRETS_DIR"/*; do
    [[ -f "$secret_file" ]] || continue
    local key
    key="$(basename "$secret_file")" || {
      if [[ -z "$key" ]]; then
        err "Secret file '$secret_file' has no valid name."
        return 1
      fi
    }
    from_args+=(--from-file="$key=$secret_file")
  done

  if [[ ${#from_args[@]} -eq 0 ]]; then
    err "No files found in $SECRETS_DIR"; return 1
  fi

  kubectl create secret generic "$secret_name" \
          "${from_args[@]}" \
          --dry-run=client -o yaml > "$out" || return 1

  chmod 600 "$out"

  ensure_kubectl_api
  kubectl apply -f "$out" --namespace "$K8S_NS" || {
    err "Apply failed for $secret_name"
    return 1
  }

  info "Secret $secret_name migrated with ${#from_args[@]} keys."

  for file in "$K8S_DIR"/*.yaml; do
    if [[ -f "$file" ]]; then
      sed -i "s/\${secrets_name}/$secret_name/g" "$file"
      info "Updated $file with secrets_name=$secret_name"
    else
      warn "No YAML files found in $K8S_DIR."
      return 0
    fi
  done
}

build_k8s_deployments() {
  info "Building Kubernetes deployment files …"
  cd "$K8S_DIR" || { err "Could not change to $K8S_DIR"; return 1; }

  for svc in "${SERVICES[@]}"; do
    [[ -f "${svc}-deployment.yaml.tpl" ]] || { err "Missing template: ${svc}-deployment.yaml.tpl"; return 1; }
  done

  [[ -n "${VERSION_APP:-}" ]] || { err "VERSION_APP is not set."; return 1; }

  case "$(uname -m)" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    *) err "Unknown architecture: $(uname -m)"; exit 1 ;;
  esac
  info "Detected architecture: $ARCH"
  export VERSION_APP ARCH

  for svc in "${SERVICES[@]}"; do
    envsubst '$VERSION_APP $ARCH' < "${svc}-deployment.yaml.tpl" > "${svc}-deployment.yaml"
    info "Built ${svc}-deployment.yaml for $ARCH"
  done
  cd - >/dev/null 2>&1 || return 1
  info "Finished building deployment files."

  local ingress_file="$K8S_DIR/ingress-nginx.yaml"
  if [[ -f "$ingress_file" ]]; then
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
      # shellcheck source=/dev/null
      source "$SCRIPT_DIR/.env"
      if [[ -n "${NGINX_SERVER_NAME:-}" ]]; then
        sed -i "s/\${DOMAIN_NAME}/$NGINX_SERVER_NAME/g" "$ingress_file"
        info "Updated $ingress_file with DOMAIN_NAME=$NGINX_SERVER_NAME"
      else
        warn "DOMAIN_NAME is not set in .env"
      fi
    fi
  fi
}

replace_k8s_namespace() {
  local namespace="${K8S_NS:-default}"
  info "Replacing namespace in Kubernetes YAML files with '$namespace' ..."
  for file in "$K8S_DIR"/*.yaml; do
    if [[ -f "$file" ]]; then
      sed -i "s/namespace: .*/namespace: $namespace/" "$file"
      info "Updated namespace in $file"
    else
      warn "No YAML files found in $K8S_DIR."
      return 0
    fi
  done
  info "Namespace replacement complete."
}

create_namespace_if_not_exists() {
  command -v kubectl >/dev/null 2>&1 || { warn "kubectl not installed - skipping namespace creation."; return 0; }
  if ! kubectl get namespace "$K8S_NS" >/dev/null 2>&1; then
    info "Creating Kubernetes namespace '$K8S_NS' ..."
    kubectl create namespace "$K8S_NS" || { err "Failed to create namespace $K8S_NS"; return 1; }
  else
    info "Namespace '$K8S_NS' already exists."
  fi
}

run_tunnel() {
  local pidfile="$HOME/minikube-tunnel.pid"
  local logfile="$HOME/minikube-tunnel.log"

  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && sudo kill -0 "$pid" 2>/dev/null; then
      if sudo ps -o args= -p "$pid" 2>/dev/null | grep -q "minikube tunnel"; then
        return 0
      fi
    fi
  fi

  sudo bash -c "nohup minikube tunnel >> '$logfile' 2>&1 & echo \$! > '$pidfile'"

  sleep 0.3
  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"
  if [[ -z "$pid" ]] || ! sudo kill -0 "$pid" 2>/dev/null; then
    return 1
  fi
}

cleanup_minikube_tunnel() {
  local pidfile="$HOME/minikube-tunnel.pid"
  local logfile="$HOME/minikube-tunnel.log"
  local killed_by_pid=0

  if [[ -f "$pidfile" ]]; then
    local pid
    pid="$(cat "$pidfile" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && sudo kill -0 "$pid" 2>/dev/null; then
      if sudo ps -o args= -p "$pid" 2>/dev/null | grep -q "minikube tunnel"; then
        sudo kill "$pid" 2>/dev/null || true

        for _ in {1..20}; do
          sleep 0.1
          sudo kill -0 "$pid" 2>/dev/null || { killed_by_pid=1; break; }
        done

        if [[ $killed_by_pid -eq 0 ]] && sudo kill -0 "$pid" 2>/dev/null; then
          sudo kill -9 "$pid" 2>/dev/null || true
          killed_by_pid=1
        fi
      fi
    fi

    rm -f "$pidfile" 2>/dev/null || sudo rm -f "$pidfile" 2>/dev/null || true
    rm -f "$logfile" 2>/dev/null || true
  fi

  sudo pkill -f "[m]inikube(.+)?tunnel" 2>/dev/null || true

  sudo rm -f ~/.minikube/tunnel.lock /var/lib/minikube/tunnel.lock 2>/dev/null || true
  sudo chown -R "$USER:$USER" ~/.minikube ~/.kube 2>/dev/null || true
}



setup_minikube_tunnel() {
  command -v minikube >/dev/null 2>&1 || { warn "Minikube not installed - skipping tunnel setup."; return 0; }
    ensure_kubectl_api
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml

    kubectl -n ingress-nginx patch svc ingress-nginx-controller \
      -p '{"spec":{"type":"LoadBalancer"}}'
    kubectl rollout status deployment ingress-nginx-controller \
      -n ingress-nginx --timeout=120s || return 1

    run_tunnel

    kubectl apply -f "$K8S_DIR/" \
      --selector='app.kubernetes.io/name!=ingress-nginx' || return 1

    cleanup_minikube_tunnel || {
      err "Failed to clean up Minikube tunnel."
      return 1
    }

    kubectl apply -f "$K8S_DIR/" >/dev/null || {
      err "Failed to apply Kubernetes configurations."
      return 1
    }
}

cleanup_kube() {
  info "Cleaning up Kubernetes resources ..."
  kubectl delete -f "$K8S_DIR/" >/dev/null 2>&1 || true

  if command -v minikube >/dev/null 2>&1; then
    info "Stopping Minikube ..."
    minikube stop >/dev/null 2>&1 || true
  fi
  return 0
}

setup_traefik() {
  info "Setting up Traefik ingress controller ..."

  : "${K8S_DIR:?K8S_DIR is unset}"
  : "${SCRIPT_DIR:?SCRIPT_DIR is unset}"
  : "${K8S_NS:?K8S_NS is unset}"

  local ingress_file="$K8S_DIR/ingress-traefik.yaml.tpl"
  local ingress_out="$K8S_DIR/ingress-traefik.yaml"

  [[ -f "$ingress_file" ]] || { err "Missing template: $ingress_file"; return 1; }
  [[ -f "$SCRIPT_DIR/.env" ]] || { err "Missing .env: $SCRIPT_DIR/.env"; return 1; }

  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a

  [[ -n "${NGINX_SERVER_NAME:-}" ]] || { err "NGINX_SERVER_NAME not set in .env"; return 1; }

  if ! grep -q '\${NGINX_SERVER_NAME}' "$ingress_file"; then
    warn "Placeholder \${NGINX_SERVER_NAME} not found in $ingress_file"
  fi

  if ! envsubst '${NGINX_SERVER_NAME}' < "$ingress_file" > "$ingress_out"; then
    err "envsubst failed"
    return 1
  fi

  [[ -s "$ingress_out" ]] || { err "Output file is empty: $ingress_out"; return 1; }
  info "Ingress configuration written to $ingress_out"
  
  ensure_kubectl_api
  kubectl apply -n "$K8S_NS" -f "$ingress_out" || {
    err "Failed to apply Traefik ingress configuration."
    return 1
  }
}

init_amd64() {
  if command -v minikube >/dev/null 2>&1; then
    info "Minikube is already installed."
  else
    if ${NON_INTERACTIVE}; then
      err "Non-interactive mode active, but Minikube is not installed."
      return 1
    fi
    read -rp "Minikube is not installed. Do you want to install it? [y/N]: " ans
    if [[ $ans =~ ^[Yy]$ ]]; then
      info "Installing Minikube ..."
      curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
      sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64
      info "Minikube installed successfully."

      # Start Minikube with Docker driver
      if ! minikube start --driver=docker; then
        err "Failed to start Minikube. Ensure Docker is running."
        return 1
      fi
    else
      warn "Skipping Minikube installation."
    fi
  fi

  
  local ingress_file="$K8S_DIR/ingress-nginx.yaml.tpl"
  local ingress_out="$K8S_DIR/ingress-nginx.yaml"

  if [[ -f "$ingress_file" && -f "$SCRIPT_DIR/.env" ]]; then
    # shellcheck source=/dev/null
    source "$SCRIPT_DIR/.env"
    if [[ -n "${NGINX_SERVER_NAME:-}" ]]; then
      sed "s/\${NGINX_SERVER_NAME}/$NGINX_SERVER_NAME/g" "$ingress_file" > "$ingress_out"
    fi
  fi
  info "Ingress configuration written to $ingress_out"

  setup_minikube_tunnel || return 1
  cleanup_kube
}

init_arm64() {
  
  if command -v k3s >/dev/null 2>&1; then
    info "K3s is already installed."
  else
    if ${NON_INTERACTIVE}; then
      err "Non-interactive mode active, but K3s is not installed."
      return 1
    fi
    read -rp "K3s is not installed. Do you want to install it? [y/N]: " ans
    if [[ $ans =~ ^[Yy]$ ]]; then
      info "Installing K3s ..."
      curl -sfL https://get.k3s.io | sh -

      mkdir -p ~/.kube
      
      uid=$(id -u)
      gid=$(id -g)
      sudo chown "${uid}:${gid}" ~/.kube/config

      export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

      info "K3s installed successfully."

    else
      warn "Skipping K3s installation."
    fi
  fi

  setup_traefik || return 1
}