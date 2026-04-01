#!/usr/bin/env python3
"""
Pack dist + backend + deploy, upload to server, run remote_install.sh.
Usage (from project root):
  set DEPLOY_SSH_PASSWORD=yourpassword
  python deploy/deploy_remote.py

Requires: pip install paramiko
"""
from __future__ import annotations

import io
import os
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = os.environ.get("DEPLOY_HOST", "143.198.80.165")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
APP_ROOT_REMOTE = "/var/www/kwh-face-app"
PUBLIC_IP = os.environ.get("DEPLOY_PUBLIC_IP", "143.198.80.165")


def main() -> int:
    if not PASSWORD:
        print("Set DEPLOY_SSH_PASSWORD", file=sys.stderr)
        return 1

    try:
        import paramiko
    except ImportError:
        print("Install: pip install paramiko", file=sys.stderr)
        return 1

    dist = ROOT / "dist"
    if not dist.is_dir() or not (dist / "index.html").is_file():
        print("Run npm run build first (dist/index.html missing).", file=sys.stderr)
        return 1

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add(dist, arcname="dist")
        b = ROOT / "backend"
        tar.add(b / "src", arcname="backend/src")
        for name in ("package.json", "package-lock.json"):
            p = b / name
            if p.is_file():
                tar.add(p, arcname=f"backend/{name}")
        for path in (ROOT / "deploy").rglob("*"):
            if path.is_file() and path.name != "deploy_remote.py":
                tar.add(path, arcname=f"deploy/{path.relative_to(ROOT / 'deploy')}")
        mongo_dump = ROOT / "deploy" / "mongo-dump"
        if mongo_dump.is_dir() and any(mongo_dump.iterdir()):
            tar.add(mongo_dump, arcname="mongo-dump")

    bundle = buf.getvalue()
    print(f"Bundle size: {len(bundle) / 1024 / 1024:.2f} MB")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=60)

    sftp = client.open_sftp()
    try:
        sftp.putfo(io.BytesIO(bundle), "/tmp/kwh-deploy.tgz")
    finally:
        sftp.close()

    remote_script = f"""
set -e
rm -rf {APP_ROOT_REMOTE}
mkdir -p {APP_ROOT_REMOTE}
tar -xzf /tmp/kwh-deploy.tgz -C {APP_ROOT_REMOTE}
sed -i 's/\\r$//' {APP_ROOT_REMOTE}/deploy/remote_install.sh
chmod +x {APP_ROOT_REMOTE}/deploy/remote_install.sh
bash {APP_ROOT_REMOTE}/deploy/remote_install.sh {APP_ROOT_REMOTE} {PUBLIC_IP}
"""

    stdin, stdout, stderr = client.exec_command(remote_script, get_pty=True)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    client.close()

    print(out)
    if err:
        print(err, file=sys.stderr)
    exit_code = stdout.channel.recv_exit_status()
    if exit_code != 0:
        print(f"Remote exit code: {exit_code}", file=sys.stderr)
        return exit_code

    print(f"\nOpen: https://{PUBLIC_IP}:1000/ (accept self-signed cert warning)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
