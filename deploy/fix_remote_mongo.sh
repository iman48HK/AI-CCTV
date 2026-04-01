#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
. /etc/os-release
# MongoDB apt repo may not list non-LTS codenames (e.g. oracular); use noble for 24.x
case "${VERSION_CODENAME:-}" in
  oracular|mantic|lunar) CODENAME=noble ;;
  *) CODENAME="${VERSION_CODENAME:-jammy}" ;;
esac
rm -f /usr/share/keyrings/mongodb-server-8.0.gpg
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --batch --yes --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update -qq
apt-get install -y -qq mongodb-org
mkdir -p /root/mongo-data
mkdir -p /var/log/mongodb
chown -R mongodb:mongodb /var/log/mongodb 2>/dev/null || true
chown -R mongodb:mongodb /root/mongo-data 2>/dev/null || true
cat > /etc/mongod.conf <<'EOF'
storage:
  dbPath: /root/mongo-data
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 127.0.0.1
processManagement:
  fork: false
EOF
systemctl daemon-reload
systemctl enable mongod
systemctl restart mongod
sleep 4
systemctl is-active mongod
ss -tlnp | grep 27017 || true
systemctl restart kwh-backend
sleep 2
systemctl is-active kwh-backend
curl -s http://127.0.0.1:4000/health || true
