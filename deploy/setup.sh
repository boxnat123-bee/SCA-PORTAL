#!/usr/bin/env bash
# =============================================================================
# SCA Portal — pemasangan sekali jalan di VPS Ubuntu 24.04 (Biznet NEO Lite).
#   curl -fsSLo setup.sh https://raw.githubusercontent.com/boxnat123-bee/SCA-PORTAL/update-nov-2026/deploy/setup.sh && sudo bash setup.sh
# Aman diulang: menarik kode terbaru & build ulang. Pengaturan rahasia hanya
# ditanyakan sekali dan disimpan di /opt/scaportal-env/app.env (bukan di GitHub).
# =============================================================================
set -euo pipefail
REPO="https://github.com/boxnat123-bee/SCA-PORTAL.git"
BRANCH="${BRANCH:-update-nov-2026}"
APP_DIR=/opt/scaportal
ENV_DIR=/opt/scaportal-env
ENV_FILE=$ENV_DIR/app.env
MONGO_HOST="laporanstocksca.gsz8myj.mongodb.net"
MONGO_USER="adminsca"

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "Jalankan dengan sudo"; exit 1; }

say "1/6 Swap 2 GB (memori cadangan untuk build)"
if ! swapon --show | grep -q swap; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

say "2/6 Docker & git"
if ! command -v docker >/dev/null; then
  apt-get update -y && apt-get install -y ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
fi
command -v git >/dev/null || apt-get install -y git

say "3/6 Ambil kode ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH" && git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi

say "4/6 Pengaturan aplikasi"
mkdir -p "$ENV_DIR" && chmod 700 "$ENV_DIR"
if [ ! -f "$ENV_FILE" ]; then
  echo "Isi pengaturan berikut (ketikan password TIDAK tampil di layar, itu normal)."
  read -rsp "Password database MongoDB (user adminsca): " MPASS </dev/tty; echo
  read -rp  "Username Superadmin website [Jeffsca]: " SU_USER </dev/tty; SU_USER=${SU_USER:-Jeffsca}
  while :; do
    read -rsp "Password Superadmin website (min 8 karakter): " SU_PASS </dev/tty; echo
    read -rsp "Ulangi password Superadmin: " SU_PASS2 </dev/tty; echo
    case "$SU_PASS" in *"'"*|*'"'*|*' '*) echo "Jangan pakai tanda kutip atau spasi, ulangi."; continue;; esac
    [ "$SU_PASS" = "$SU_PASS2" ] && [ ${#SU_PASS} -ge 8 ] && break
    echo "Tidak sama / kurang dari 8 karakter, ulangi."
  done
  ENC=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$MPASS")
  umask 077
  cat > "$ENV_FILE" <<EOV
MONGO_URL='mongodb+srv://${MONGO_USER}:${ENC}@${MONGO_HOST}/?retryWrites=true&w=majority&appName=LaporanStockSCA'
DB_NAME='scaportal_prod'
JWT_SECRET='$(openssl rand -hex 32)'
SUPERADMIN_USERNAME='${SU_USER}'
SUPERADMIN_PASSWORD='${SU_PASS}'
EOV
  echo "Tersimpan di $ENV_FILE"
else
  echo "Memakai pengaturan yang sudah ada ($ENV_FILE)"
fi

say "5/6 Firewall (22, 80, 443)"
if command -v ufw >/dev/null; then
  ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443 >/dev/null
  ufw --force enable >/dev/null || true
fi

say "6/6 Build & jalankan (5-10 menit pertama kali)"
cd "$APP_DIR/deploy"
docker compose up -d --build
docker image prune -f >/dev/null || true

IP=$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')
for i in $(seq 1 30); do
  if curl -fsS http://localhost/api/health >/dev/null 2>&1; then OK=1; break; fi; sleep 5
done
echo
if [ "${OK:-}" = 1 ]; then
  say "SELESAI. Aplikasi berjalan."
  echo "  Cek sementara : http://$IP"
  echo "  Setelah DNS   : https://scaportal.cloud"
else
  echo "Aplikasi belum merespons. Lihat log: cd $APP_DIR/deploy && docker compose logs --tail=80 app"
fi
