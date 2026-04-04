# Canton Developer Sandbox — Quickstart Guide

## What is this?
A one-command local Canton development environment with:
- Participant node + sequencer
- Faucet service to claim testnet CC
- Pre-funded Alice + Bob test parties

## Start the sandbox
```bash
git clone https://github.com/kinjaljain04/canton-developer-sandbox
cd canton-developer-sandbox
docker compose -f docker/docker-compose.yml up -d
```

## Claim testnet CC
Open `http://localhost:3000` and enter your party ID.
The faucet sends 1,000 CC per party per day.

## Reset the sandbox
```bash
./scripts/reset-sandbox.sh
```
This wipes all ledger state and re-seeds Alice + Bob.
