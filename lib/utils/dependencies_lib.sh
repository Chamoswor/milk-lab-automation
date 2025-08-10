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

NON_INTERACTIVE="${NON_INTERACTIVE:-false}"

# Enkle checks
_check_docker_install_success() {
  if sudo docker version &>/dev/null; then
    return 0
  else
    err "Docker not found after installation."
    return 1
  fi
}

install_prereqs() {
  info "Installing prerequisites: gnupg2, lsb-release, ca-certificates, curl, apt-transport-https"
  sudo apt-get update -qq
  sudo apt-get install -y gnupg2 lsb-release ca-certificates curl apt-transport-https
}

install_docker_debian() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    info "Docker Compose v2 already installed."
    return 0
  fi

  install_prereqs

  info "Adding Docker's official GPG key and repository for Debian"
  sudo install -m0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor \
    | sudo tee /etc/apt/keyrings/docker-archive-keyring.gpg >/dev/null
  sudo chmod a+r /etc/apt/keyrings/docker-archive-keyring.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) \
    signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/debian \
    $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -qq
  info "Installing Docker packages"
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
                          docker-buildx-plugin docker-compose-plugin

  info "Enabling and starting Docker service"
  sudo systemctl enable --now docker

  _check_docker_install_success
}

install_docker_ubuntu() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    info "Docker Compose v2 already installed."
    return 0
  fi

  install_prereqs

  info "Adding Docker's official GPG key and repository for Ubuntu"
  sudo install -m0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor \
    | sudo tee /etc/apt/keyrings/docker-archive-keyring.gpg >/dev/null
  sudo chmod a+r /etc/apt/keyrings/docker-archive-keyring.gpg

  codename=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
  echo \
    "deb [arch=$(dpkg --print-architecture) \
    signed-by=/etc/apt/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu \
    ${codename} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -qq
  info "Installing Docker packages"
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
                          docker-buildx-plugin docker-compose-plugin

  info "Enabling and starting Docker service"
  sudo systemctl enable --now docker

  _check_docker_install_success

}

# shellcheck disable=SC2120
check_or_add_docker_group() {
  if ! groups | grep -q docker; then
    info "Adding user to docker group..." 
    sudo usermod -aG docker "$USER"
    exec sg docker "$0 $*"
  fi
  return 0
}

init_docker_install() {
  if [[ ! -f /etc/os-release ]]; then
    err "/etc/os-release not found - ukjent distribusjon."
    return 1
  fi

  . /etc/os-release
  case "${ID,,}" in
    debian) install_docker_debian ;;
    ubuntu) install_docker_ubuntu ;;
    *)
      err "Unsupported Linux distribution: $ID. Installer Docker manuelt."
      return 1
      ;;
  esac
  check_or_add_docker_group || {
    err "Failed to add user to docker group. Please run the script again after adding yourself to the docker group."
    return 1
  }
  info "Docker installed successfully."
  return 0
}

install_minikube() {
  ARCH=$(uname -m)
  if ! [[ "$ARCH" == "x86_64" ]]; then
    return 1
  fi
  
  if command -v minikube >/dev/null 2>&1; then
    info "Minikube is already installed."
    return 0
  fi
  if ${NON_INTERACTIVE}; then
    err "Non-interactive mode active, but Minikube is not installed."
    return 1
  fi

  read -rp "Minikube is not installed. Do you want to install it? [y/N]: " ans
  if [[ $ans =~ ^[Yy]$ ]]; then
    info "Installing Minikube ..."
    curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64

    if ! minikube start --driver=docker; then
      err "Failed to start Minikube. Please check your Docker installation."
      return 1
    fi
    info "Minikube installed and started successfully."
  else
    warn "Skipping Minikube installation."
  fi
  return 0
}


init_install_kubectl() {
  if command -v kubectl &>/dev/null; then
    info "kubectl is already installed."
    return 0
  fi

  check_or_add_docker_group || {
    err "Failed to add user to docker group. Please run the script again after adding yourself to the docker group."
    return 1
  }
  
  ARCH=$(uname -m)
  if [[ "$ARCH" == "x86_64" ]]; then
    ARCH="amd64"
  elif [[ "$ARCH" == "aarch64" ]]; then
    ARCH="arm64"
  else
    err "Unsupported architecture: $ARCH"
    return 1
  fi

  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/$ARCH/kubectl"
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

  if command -v kubectl &>/dev/null; then
    info "kubectl installed successfully."
    install_minikube
    return 0
  else
    err "Failed to install kubectl."
    return 1
  fi
}

install_debs() {
  local install_type="both"

  if [[ "${1:-}" == "1" ]]; then
    install_type="kubectl"
  elif [[ "${1:-}" == "2" ]]; then
    install_type="docker"
  fi
  

  if [[ "$install_type" == "docker" || "$install_type" == "both" ]]; then
    if command -v docker &>/dev/null && docker compose version &>/dev/null; then
      info "Docker Compose v2 is already installed."
      return 0
    fi

    if [[ "${NON_INTERACTIVE:-false}" == "true" ]]; then
      err "Non-interactive mode - kan ikke installere Docker Compose automatisk."
      return 1
    fi

    important "Install by typing 'y'"
    read -rp "Install Docker Compose v2 now? [y/N]: " ans
    if [[ ${ans,,} == "y" ]]; then
      init_docker_install || return 1
      sudo usermod -aG docker "$USER"
    else
      warn "Bruker valgte å hoppe over Docker Compose-installasjon."
    fi
  fi


  if [[ "$install_type" == "kubectl" || "$install_type" == "both" ]]; then
    if command -v kubectl &>/dev/null; then
      info "kubectl is already installed."
    else
      if [[ "${NON_INTERACTIVE:-false}" == "true" ]]; then
        err "Non-interactive mode - cannot install kubectl automatically."
        return 1
      fi
      important "Install by typing 'y'"
      read -rp "Install kubectl now? [y/N]: " ans
      if [[ ${ans,,} == "y" ]]; then
        init_install_kubectl || return 1
      else
        warn "User chose to skip kubectl installation."
      fi
    fi
  fi
}

check_dependencies() {
  info "Checking dependencies …"

  # Detect Python binary
  local py_bin=""
  if command -v python3 >/dev/null 2>&1;   then py_bin="python3"
  elif command -v python  >/dev/null 2>&1; then py_bin="python"
  else err "Python 3 is not installed."; return 1; fi
  export PYTHON_BIN="${py_bin}"

  # Docker Compose v2
  if ! docker compose version >/dev/null 2>&1; then
    warn "Docker Compose v2 not installed."
    install_debs "2" || return 1
  else
    info "Docker Compose v2 is installed."
  fi

  
  local dc_ver
  dc_ver="$(docker compose version --short)"
  [[ "$dc_ver" =~ ^(2|3)\. ]] || { err "Docker Compose v2 required, found '$dc_ver'."; return 1; }

  if command -v kubectl >/dev/null 2>&1; then
    info "kubectl found - Kubernetes support enabled."
  else
    warn "kubectl not found."
    
    if install_debs "1"; then
      info "Kubernetes support enabled."
    else
      warn "Skipping Kubernetes operations."
      return 0
    fi
  fi

  info "All minimum dependencies OK."
}

install_optional_dependencies() {
  install_debs "1" || return 1
  install_minikube || return 1

  return 0
}
