#!/usr/bin/env bash

# ==============================================================================
# Bootstrap Script for Canton Developer Sandbox
#
# Description:
#   This script initializes the Canton ledger by:
#   1. Waiting for the participant node's Ledger API to be available.
#   2. Building the Daml project to produce a DAR file if it doesn't exist.
#   3. Allocating necessary parties (CentralBank, FaucetOperator) on the ledger.
#   4. Running a Daml script to create an initial supply of the testnet currency
#      (CC) and transfer it to the FaucetOperator party.
#
# Usage:
#   Run this script after the Canton stack (e.g., via Docker Compose) has been
#   started. It is designed to be idempotent for party allocation.
#
# ==============================================================================

set -euo pipefail

# --- Configuration ---
readonly CANTON_HOST="localhost"
readonly PARTICIPANT_LEDGER_PORT=5011 # Default participant ledger API port in the sandbox
readonly DAR_PATH=".daml/dist/canton-developer-sandbox-0.1.0.dar"
readonly SCRIPT_NAME="Main:initialize"

# Parties to be created. The Daml script will identify them by these display names.
readonly CENTRAL_BANK_PARTY_NAME="CentralBank"
readonly FAUCET_OPERATOR_PARTY_NAME="FaucetOperator"

# --- Helper Functions ---
log() {
  echo "[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] [Bootstrap] INFO: $*"
}

log_error() {
  echo "[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] [Bootstrap] ERROR: $*" >&2
}

# --- Main Logic ---

main() {
  log "Starting Canton bootstrap process..."

  # Step 1: Wait for Canton participant to be available
  log "Waiting for Canton participant ledger API at ${CANTON_HOST}:${PARTICIPANT_LEDGER_PORT}..."
  local attempt=0
  local max_attempts=60
  while ! nc -z ${CANTON_HOST} ${PARTICIPANT_LEDGER_PORT}; do
    if [ ${attempt} -ge ${max_attempts} ]; then
      log_error "Canton participant did not become available after ${max_attempts} seconds."
      exit 1
    fi
    attempt=$((attempt+1))
    sleep 1
  done
  log "Canton participant is up and running!"

  # Step 2: Build the Daml model if DAR doesn't exist
  if [ ! -f "${DAR_PATH}" ]; then
    log "DAR file not found at ${DAR_PATH}. Building Daml project..."
    daml build
    log "Daml project built successfully."
  else
    log "DAR file already exists. Skipping build."
  fi

  # Step 3: Allocate parties on the ledger
  log "Allocating parties: '${CENTRAL_BANK_PARTY_NAME}' and '${FAUCET_OPERATOR_PARTY_NAME}'..."

  # The allocate-parties command is idempotent. It will not create duplicates.
  # We grep for the identifier and extract it from the command output.
  local central_bank_id
  central_bank_id=$(daml ledger allocate-parties --host ${CANTON_HOST} --port ${PARTICIPANT_LEDGER_PORT} ${CENTRAL_BANK_PARTY_NAME} | grep "identifier:" | awk '{print $2}')

  local faucet_operator_id
  faucet_operator_id=$(daml ledger allocate-parties --host ${CANTON_HOST} --port ${PARTICIPANT_LEDGER_PORT} ${FAUCET_OPERATOR_PARTY_NAME} | grep "identifier:" | awk '{print $2}')

  if [[ -z "${central_bank_id}" || -z "${faucet_operator_id}" ]]; then
      log_error "Failed to allocate one or more parties. Check Canton participant logs."
      exit 1
  fi

  log "Party '${CENTRAL_BANK_PARTY_NAME}' allocated with ID: ${central_bank_id}"
  log "Party '${FAUCET_OPERATOR_PARTY_NAME}' allocated with ID: ${faucet_operator_id}"


  # Step 4: Run the Daml initialization script
  log "Running Daml script '${SCRIPT_NAME}' to seed the ledger..."
  log "This will create the initial CC supply and fund the faucet."

  # The script is run with both parties as submitters, allowing the Daml script
  # to perform actions on behalf of either party (e.g., proposals and accepts).
  # The script will use listKnownParties to find parties by their display names.
  daml script \
    --dar "${DAR_PATH}" \
    --script-name "${SCRIPT_NAME}" \
    --ledger-host "${CANTON_HOST}" \
    --ledger-port "${PARTICIPANT_LEDGER_PORT}" \
    --party "${central_bank_id}" \
    --party "${faucet_operator_id}"

  log "Bootstrap script completed successfully!"
  log "The ledger is now initialized for the Canton Faucet."
}

# Execute the main function
main "$@"