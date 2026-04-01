#!/usr/bin/env bash
# Run on the server after bundle is extracted to APP_ROOT (default /root/kwh-face-app).
set -euo pipefail
APP_ROOT="${1:-/var/www/kwh-face-app}"
PUBLIC_IP="${2:-143.198.80.165}"

export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

apt-get update -qq
apt-get install -y -qq nginx openssl curl

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

sed "s|/var/www/kwh-face-app|${APP_ROOT}|g" "${APP_ROOT}/deploy/nginx-kwh.conf" > /etc/nginx/sites-available/kwh
ln -sf /etc/nginx/sites-available/kwh /etc/nginx/sites-enabled/kwh
cp "${APP_ROOT}/deploy/nginx-kwh-http-redirect.conf" /etc/nginx/sites-available/kwh-http-redirect
ln -sf /etc/nginx/sites-available/kwh-http-redirect /etc/nginx/sites-enabled/00-kwh-http-redirect
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl enable nginx

JWT_SECRET="$(openssl rand -hex 32)"
ENV_FILE="${APP_ROOT}/backend/.env"
cat > "$ENV_FILE" <<EOF
MONGODB_URI=mongodb://127.0.0.1:27017/kwh_face_app
JWT_SECRET=${JWT_SECRET}
PORT=4000
CORS_ALLOW_HTTPS=true
NODE_ENV=production
EOF

mkdir -p "${APP_ROOT}/backend/uploads/siteplans"

cd "${APP_ROOT}/backend"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev

MONGO_DATA="/root/mongo-data"
mkdir -p "$MONGO_DATA"

fuser -k 1000/tcp 2>/dev/null || true
pkill -f 'node.*server.js' 2>/dev/null || true
pkill -f '[m]ongod' 2>/dev/null || true
sleep 2

if command -v mongod >/dev/null 2>&1; then
  nohup mongod --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 \
    --wiredTigerCacheSizeGB 1 >> /root/mongod.log 2>&1 &
elif [[ -x /opt/mongodb/bin/mongod ]]; then
  nohup /opt/mongodb/bin/mongod --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 >> /root/mongod.log 2>&1 &
else
  echo "Installing MongoDB..."
  rm -f /usr/share/keyrings/mongodb-server-7.0.gpg
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --batch --yes --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  # shellcheck source=/dev/null
  . /etc/os-release
  case "${VERSION_CODENAME:-}" in
    oracular|mantic|lunar) CODENAME=noble ;;
    *) CODENAME="${VERSION_CODENAME:-jammy}" ;;
  esac
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${CODENAME}/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -qq
  apt-get install -y -qq mongodb-org mongodb-mongosh || apt-get install -y -qq mongodb-org || true
  if command -v mongod >/dev/null 2>&1; then
    nohup mongod --dbpath "$MONGO_DATA" --bind_ip 127.0.0.1 --port 27017 \
      --wiredTigerCacheSizeGB 1 >> /root/mongod.log 2>&1 &
  fi
fi

sleep 5
for i in $(seq 1 20); do
  if command -v mongosh >/dev/null 2>&1; then
    mongosh --quiet --eval 'db.runCommand({ ping: 1 })' "mongodb://127.0.0.1:27017" >/dev/null 2>&1 && break
  elif command -v mongo >/dev/null 2>&1; then
    mongo --quiet --eval 'db.runCommand({ ping: 1 })' "mongodb://127.0.0.1:27017" >/dev/null 2>&1 && break
  else
    (echo >/dev/tcp/127.0.0.1/27017) >/dev/null 2>&1 && break
  fi
  sleep 1
done

if [[ -d "${APP_ROOT}/mongo-dump/kwh_face_app" ]]; then
  mongorestore --drop --uri "mongodb://127.0.0.1:27017" "${APP_ROOT}/mongo-dump" || true
fi

cat > /etc/systemd/system/kwh-backend.service <<UNIT
[Unit]
Description=KWH Face App API
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_ROOT}/backend
EnvironmentFile=${ENV_FILE}
ExecStart=$(command -v node) ${APP_ROOT}/backend/src/server.js
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable kwh-backend
systemctl restart kwh-backend
systemctl restart nginx

echo "OK https://${PUBLIC_IP}:1000/"
