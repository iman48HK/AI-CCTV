#!/usr/bin/env bash
# Run ON the Linux server (after app lives at APP_ROOT). Usage:
#   sudo bash remote-bootstrap-https.sh /root/kwh-face-app 203.0.113.50
set -euo pipefail
APP_ROOT="${1:-/root/kwh-face-app}"
PUBLIC_IP="${2:-}"

if [[ -z "$PUBLIC_IP" ]]; then
  PUBLIC_IP="$(curl -sSf https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx openssl

mkdir -p /etc/nginx/ssl
if [[ ! -f /etc/nginx/ssl/kwh.crt ]]; then
  openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/kwh.key \
    -out /etc/nginx/ssl/kwh.crt \
    -subj "/CN=${PUBLIC_IP}" \
    -addext "subjectAltName=IP:${PUBLIC_IP}" 2>/dev/null \
  || openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/kwh.key \
    -out /etc/nginx/ssl/kwh.crt \
    -subj "/CN=${PUBLIC_IP}"
fi

sed "s|/root/kwh-face-app|${APP_ROOT}|g" "${APP_ROOT}/deploy/nginx-kwh.conf" > /etc/nginx/sites-available/kwh
ln -sf /etc/nginx/sites-available/kwh /etc/nginx/sites-enabled/kwh
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl enable nginx
systemctl restart nginx

ENV_FILE="${APP_ROOT}/backend/.env"
if [[ -f "$ENV_FILE" ]] && ! grep -q '^CORS_ALLOW_HTTPS=' "$ENV_FILE" 2>/dev/null; then
  echo 'CORS_ALLOW_HTTPS=true' >> "$ENV_FILE"
fi

cd "$APP_ROOT"
npm run build

fuser -k 1000/tcp 2>/dev/null || true
pkill -f 'vite --host' 2>/dev/null || true
pkill -f 'node src/server.js' 2>/dev/null || true
pkill -f '[m]ongod' 2>/dev/null || true
sleep 2

mkdir -p "${APP_ROOT}/../mongo-data" 2>/dev/null || mkdir -p /root/mongo-data
MONGO_DATA="${APP_ROOT}/../mongo-data"
[[ -d "$MONGO_DATA" ]] || MONGO_DATA=/root/mongo-data

if command -v mongod >/dev/null 2>&1; then
  nohup mongod --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 >> /root/mongod.log 2>&1 &
elif [[ -x /opt/mongodb/bin/mongod ]]; then
  nohup /opt/mongodb/bin/mongod --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 >> /root/mongod.log 2>&1 &
else
  echo "mongod not found in PATH; start MongoDB manually." >&2
fi
sleep 2

cd "${APP_ROOT}/backend"
nohup node src/server.js >> /root/kwh-backend.log 2>&1 &

systemctl restart nginx
echo "Done. Open https://${PUBLIC_IP}:1000 (accept certificate warning for self-signed cert)."
