#!/usr/bin/env bash
# Update ke kode terbaru di GitHub:  sudo bash /opt/scaportal/deploy/update.sh
set -euo pipefail
BRANCH="${BRANCH:-update-nov-2026}"
git -C /opt/scaportal fetch --depth 1 origin "$BRANCH"
git -C /opt/scaportal reset --hard "origin/$BRANCH"
cd /opt/scaportal/deploy && docker compose up -d --build && docker image prune -f >/dev/null
echo "Update selesai."
