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

add_command() {
  local cmd_count=${COMMAND_COUNT:-0}
  local desc="$1"
  local cmd="$2"
  local help_text="${3:-No help available}"

  export COMMAND_COUNT=$((cmd_count + 1))
  export "COMMAND_${COMMAND_COUNT}_DESC=$desc"
  export "COMMAND_${COMMAND_COUNT}_CMD=$cmd"
  export "COMMAND_${COMMAND_COUNT}_HELP=$help_text"
}
 
choose_command() {
  local cmd_count=${COMMAND_COUNT:-0}
  read -rp "Enter your choice (1-$cmd_count, h for help): " choice

  if [[ "$choice" == "exit" ]]; then
    echo "Exiting..."
    exit 0
  fi

  if [[ "$choice" == "h" ]]; then
    show_help
    return 0
  fi

  if ! [[ "$choice" =~ ^[0-9]+$ ]]; then
    err "Invalid choice: '$choice'. Please enter a number."
    return 1
  fi

  if [[ -n "$choice" && "$choice" -ge 1 && "$choice" -le "$cmd_count" ]]; then
    local cmd_var="COMMAND_${choice}_CMD"
    local desc_var="COMMAND_${choice}_DESC"
    
    if [[ -n "${!cmd_var}" ]]; then
      local function_to_run="${!cmd_var}"
      local description="${!desc_var}"
      
      echo "Menu item: $description"
      
      if ! declare -F "$function_to_run" > /dev/null; then
        err "Function '$function_to_run' not found! Check that this is a valid function name."
        return 1
      fi
      
      # read -rp "Enter any arguments (press Enter for none): " cmd_args
      local cmd_args=""
      
      if [[ -z "$cmd_args" ]]; then
        "$function_to_run" || { err "Failed: $function_to_run"; return 1; }
      else
        eval "$function_to_run $cmd_args" || { err "Failed: $function_to_run with args: $cmd_args"; return 1; }
      fi
    fi
  else
    err "Choice out of range: Please enter a number between 1 and $cmd_count"
    return 1
  fi
}

print_commands() {
  local cmd_count=${COMMAND_COUNT:-0}
  for i in $(seq 1 "$cmd_count"); do
    local desc_var="COMMAND_${i}_DESC"
    if [[ -n "${!desc_var}" ]]; then
      printf "%b%2d) %b%s%b\n" "${_CYN}" "$i" "${_RST}" "${!desc_var}"
    fi
  done
  printf "\n%bh) %bHelp%b\n" "${_CYN}" "${_RST}" "${_RST}"
}

show_help() {
  local cmd_count=${COMMAND_COUNT:-0}
  echo
  printf "%b===== COMMAND HELP =====%b\n\n" "${_BLUE}" "${_RST}"
  
  for i in $(seq 1 "$cmd_count"); do
    local desc_var="COMMAND_${i}_DESC"
    local cmd_var="COMMAND_${i}_CMD"
    local help_var="COMMAND_${i}_HELP"
    if [[ -n "${!desc_var}" ]]; then
      printf "%b%2d) %b%s%b\n" "${_CYN}" "$i" "${_MAG}" "${!desc_var}" "${_RST}"
      printf "    Command: %s\n" "${!cmd_var}"
      printf "    Help: %s\n\n" "${!help_var}"
    fi
  done
}
