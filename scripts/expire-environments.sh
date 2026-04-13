#!/bin/bash
#
# Cron script to expire and clean up stale Canton developer sandbox environments.
#
# This script identifies Docker Compose projects created for the sandbox,
# checks their age, and tears down any that have exceeded the defined
# expiration period. This prevents resource exhaustion on the host machine.
#
# Usage:
#   ./expire-environments.sh
#
# Recommended cron setup (e.g., to run every hour):
#   0 * * * * /path/to/canton-developer-sandbox/scripts/expire-environments.sh

set -euo pipefail

# --- Configuration ---

# Environments older than this many hours will be expired and removed.
# Setting to 24 hours by default.
readonly EXPIRATION_HOURS=24

# The prefix used to identify sandbox Docker Compose projects.
# This should match the project_name prefix used when spinning up environments.
readonly PROJECT_PREFIX="sandbox_"

# Optional: Log output to a file for auditing.
# Ensure the directory exists and the cron user has write permissions.
readonly LOG_FILE="/var/log/canton-sandbox-expirer.log"

# --- Script ---

# A simple logging function that prepends a timestamp and writes to stdout and a log file.
log() {
  echo "$(date --iso-8601=seconds) - $*" | tee -a "$LOG_FILE"
}

main() {
  log "Starting sandbox environment expiration check."

  local expiration_seconds=$((EXPIRATION_HOURS * 3600))
  local current_ts
  current_ts=$(date +%s)

  # Get a unique list of all Docker Compose project names matching our prefix.
  # We search containers in any state (-a) to catch stopped/stale projects.
  local projects
  projects=$(docker ps -a --format '{{.Label "com.docker.compose.project"}}' | grep -E "^${PROJECT_PREFIX}[a-zA-Z0-9_.-]+" | sort -u)

  if [[ -z "$projects" ]]; then
    log "No active sandbox projects found with prefix '${PROJECT_PREFIX}'. Exiting."
    exit 0
  fi

  log "Found candidate projects: ${projects//$'\n'/, }"

  for project in $projects; do
    log "Processing project: ${project}"

    # Get the ID of an arbitrary container within the project to inspect its metadata.
    # Using 'head -n 1' is sufficient as all containers in a project are created together.
    local container_id
    container_id=$(docker ps -aq --filter "label=com.docker.compose.project=${project}" | head -n 1)

    if [[ -z "$container_id" ]]; then
      log "Warning: Project '${project}' has no running or stopped containers. Skipping."
      continue
    fi

    # Fetch the container's creation timestamp and the path to its compose file from its labels.
    # We fetch both in one 'docker inspect' call for efficiency.
    local inspect_output
    inspect_output=$(docker inspect -f '{{.Created}} {{.Config.Labels.com\.docker\.compose\.project\.config_files}}' "${container_id}")
    local created_at compose_file
    created_at=$(echo "$inspect_output" | awk '{print $1}')
    compose_file=$(echo "$inspect_output" | awk '{print $2}')

    if [[ -z "$created_at" ]] || [[ -z "$compose_file" ]]; then
        log "Error: Could not determine creation time or compose file for project '${project}'. Manual cleanup may be required."
        continue
    fi

    # Convert the ISO 8601 timestamp to a Unix epoch timestamp for comparison.
    # This requires GNU date, which is standard on Linux servers.
    local created_ts age_seconds
    created_ts=$(date -d "${created_at}" +%s)
    age_seconds=$((current_ts - created_ts))

    log "Project '${project}' is ${age_seconds} seconds old (Created at: ${created_at})."

    if (( age_seconds > expiration_seconds )); then
      log "Project '${project}' has EXPIRED (age > ${expiration_seconds}s). Tearing down..."

      if [[ ! -f "$compose_file" ]]; then
        log "Error: Compose file '${compose_file}' for project '${project}' not found on disk. Cannot tear down gracefully. Manual cleanup may be required."
        continue
      fi

      # Tear down the entire Docker Compose stack, including containers, networks, and volumes.
      # --timeout 0 speeds up shutdown for these ephemeral environments.
      if docker compose -p "${project}" -f "${compose_file}" down --volumes --remove-orphans --timeout 0; then
        log "Successfully tore down project '${project}'."
      else
        log "Error: 'docker compose down' failed for project '${project}'. Manual cleanup may be required."
      fi
    else
      log "Project '${project}' is still within its valid lifetime."
    fi
  done

  log "Expiration check complete. Pruning dangling Docker resources."
  # Clean up any Docker volumes and networks that are not associated with any container.
  # This acts as a safety net for any resources orphaned by incomplete shutdowns.
  docker volume prune -f
  docker network prune -f

  log "Script finished successfully."
}

# Ensure the log file exists and is writable, then run the main function.
touch "$LOG_FILE" &>/dev/null || { echo "ERROR: Cannot write to log file $LOG_FILE. Exiting."; exit 1; }
main "$@"