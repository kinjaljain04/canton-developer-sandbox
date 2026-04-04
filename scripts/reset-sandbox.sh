#!/usr/bin/env bash
set -euo pipefail

echo "Canton Developer Sandbox — Reset"
echo "================================="
echo "⚠️  This will wipe all ledger state and re-seed test parties."
read -rp "Continue? [y/N] " confirm
[[ "$confirm" == "y" || "$confirm" == "Y" ]] || { echo "Aborted."; exit 0; }

docker compose -f docker/docker-compose.yml down -v
sleep 2
docker compose -f docker/docker-compose.yml up -d
sleep 5

echo "Re-seeding parties..."
./scripts/bootstrap.sh

echo ""
echo "✅ Sandbox reset complete."
echo "   Open http://localhost:3000 to claim testnet CC."
