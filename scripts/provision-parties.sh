#!/usr/bin/env bash
#
# Provisions parties and funds the FaucetOperator for the Canton Developer Sandbox.
# This script is designed to be run after `docker-compose up` has been executed
# and the Canton participant node is healthy. It is idempotent and can be run
# multiple times without causing errors.

set -euo pipefail

# --- Configuration ---
PARTICIPANT_URL="http://localhost:10011/v1"
DOCKER_COMPOSE_FILE="docker/multi-party.yml"
PARTICIPANT_CONTAINER="participant1"
PARTIES_TO_PROVISION=("FaucetOperator" "Alice" "Bob" "Charlie" "Mediator")
FAUCET_FUNDING_AMOUNT="1000000.00" # One million Canton Coins (CC)

# --- Helper Functions ---

# Logs a message with a timestamp.
log() {
  echo >&2 "$(date -u +"%Y-%m-%dT%H:%M:%SZ") - INFO: $1"
}

# Makes a JSON-RPC request to the participant node.
# $1: JSON-RPC method (e.g., "parties.list")
# $2: JSON parameters object (e.g., '{ "filter_display_name": "Alice" }')
json_rpc() {
  local method="$1"
  local params="$2"
  local id
  id=$(date +%s) # Unique ID for the request

  curl -s -X POST \
    -H "Content-Type: application/json" \
    --data "{ \"jsonrpc\": \"2.0\", \"method\": \"$method\", \"params\": $params, \"id\": $id }" \
    "$PARTICIPANT_URL"
}

# Checks for the availability of the participant's admin API.
wait_for_participant() {
  log "Waiting for participant node at $PARTICIPANT_URL to be healthy..."
  local retries=30
  local delay=5

  for ((i=1; i<=retries; i++)); do
    # /health endpoint returns 200 OK if the service is running
    if curl -s -f "$PARTICIPANT_URL/health" > /dev/null; then
      log "Participant node is healthy."
      return 0
    fi
    log "Participant not ready yet (attempt $i/$retries). Retrying in $delay seconds..."
    sleep $delay
  done

  log "ERROR: Participant node did not become healthy after $((retries * delay)) seconds."
  exit 1
}

# Provisions a single party if it doesn't already exist.
# Sets a global variable PROVISIONED_PARTY_ID with the party's ID.
provision_party() {
  local party_name="$1"
  log "Checking for party '$party_name'..."

  # Check if party with the display name already exists
  local response
  response=$(json_rpc "parties.list" "{ \"filter_display_name\": \"$party_name\", \"limit\": 1 }")
  local existing_party_id
  existing_party_id=$(echo "$response" | jq -r '.result.parties[0].party.id | select(. != null)')

  if [[ -n "$existing_party_id" ]]; then
    log "Party '$party_name' already exists with ID: $existing_party_id"
    PROVISIONED_PARTY_ID="$existing_party_id"
    return
  fi

  log "Party '$party_name' does not exist. Allocating..."
  response=$(json_rpc "parties.allocate" "{ \"display_name\": \"$party_name\" }")
  local new_party_id
  new_party_id=$(echo "$response" | jq -r '.result.party.id | select(. != null)')

  if [[ -z "$new_party_id" ]]; then
    log "ERROR: Failed to allocate party '$party_name'. Response: $response"
    exit 1
  fi

  log "Successfully allocated party '$party_name' with ID: $new_party_id"

  log "Enabling party '$new_party_id'..."
  response=$(json_rpc "parties.enable" "{ \"party\": \"$new_party_id\" }")
  local success
  success=$(echo "$response" | jq -r '.result.enabled')

  if [[ "$success" != "true" ]]; then
    log "ERROR: Failed to enable party '$new_party_id'. Response: $response"
    exit 1
  fi

  log "Successfully enabled party '$new_party_id'."
  PROVISIONED_PARTY_ID="$new_party_id"
}

# --- Main Script ---

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
    log "ERROR: 'jq' command not found. Please install jq to run this script."
    exit 1
fi

wait_for_participant

FAUCET_OPERATOR_PARTY_ID=""

for party in "${PARTIES_TO_PROVISION[@]}"; do
  PROVISIONED_PARTY_ID="" # Reset global var to avoid using a stale value
  provision_party "$party"
  if [[ "$party" == "FaucetOperator" ]]; then
    FAUCET_OPERATOR_PARTY_ID="$PROVISIONED_PARTY_ID"
  fi
  echo >&2 # Add a newline for readability in logs
done

if [[ -z "$FAUCET_OPERATOR_PARTY_ID" ]]; then
  log "ERROR: Could not determine FaucetOperator party ID. Cannot proceed with funding."
  exit 1
fi

log "Funding FaucetOperator ($FAUCET_OPERATOR_PARTY_ID) with $FAUCET_FUNDING_AMOUNT CC..."

# Construct the Canton Console command. This gives coins from the domain to the specified party.
# `participant1` is the name of the participant node in the Canton config.
CANTON_COMMAND="participant1.coins.give(party.from_string(\"$FAUCET_OPERATOR_PARTY_ID\"), $FAUCET_FUNDING_AMOUNT).map(res => println(res))"

# Execute the command inside the running participant container.
# The -T flag disables pseudo-tty allocation, which is needed for scripting.
FUNDING_RESPONSE=$(docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T "$PARTICIPANT_CONTAINER" \
  /opt/canton/bin/canton-console <<< "$CANTON_COMMAND"
)

# A successful response from `coins.give` will contain the transaction ID.
# We check for the presence of "transaction_id" as a success indicator.
if echo "$FUNDING_RESPONSE" | grep -q "transaction_id"; then
  log "Successfully funded FaucetOperator."
else
  log "ERROR: Failed to fund FaucetOperator. Response from Canton Console:"
  echo >&2 "$FUNDING_RESPONSE"
  exit 1
fi

log "--- Provisioning complete ---"
log "All parties have been provisioned and the FaucetOperator is funded."
log "FaucetOperator Party ID: $FAUCET_OPERATOR_PARTY_ID"
log "You can now start the frontend and use the application."
# Print the party ID to stdout so it can be captured by other scripts if needed
echo "$FAUCET_OPERATOR_PARTY_ID"