#!/usr/bin/env python3
"""Pull kwh_face_app from remote MongoDB into deploy/mongo-dump for deploy_remote.py bundling."""
from __future__ import annotations

import io
import os
import shutil
import sys
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "deploy" / "mongo-dump"
HOST = os.environ.get("DEPLOY_HOST", "143.198.80.165")
USER = os.environ.get("DEPLOY_USER", "root")
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")


def main() -> int:
    if not PASSWORD:
        print("DEPLOY_SSH_PASSWORD not set; skip remote mongo pull.", file=sys.stderr)
        return 0
    try:
        import paramiko
    except ImportError:
        print("pip install paramiko", file=sys.stderr)
        return 1

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=90)

    dump_cmd = """
set -e
rm -rf /tmp/kwh_mongo_pull /tmp/kwh_mongo.tgz
mongodump --host 127.0.0.1 --port 27017 -d kwh_face_app -o /tmp/kwh_mongo_pull 2>&1
test -d /tmp/kwh_mongo_pull/kwh_face_app
cd /tmp/kwh_mongo_pull && tar czf /tmp/kwh_mongo.tgz kwh_face_app
echo OK
"""
    _, stdout, stderr = client.exec_command(dump_cmd, get_pty=True)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if code != 0:
        print("mongodump failed (continuing without mongo bundle):", out, err, file=sys.stderr)
        client.close()
        if OUT.is_dir():
            shutil.rmtree(OUT)
        return 0

    sftp = client.open_sftp()
    buf = io.BytesIO()
    with sftp.open("/tmp/kwh_mongo.tgz", "rb") as rf:
        buf.write(rf.read())
    sftp.close()
    client.close()

    if OUT.is_dir():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    buf.seek(0)
    with tarfile.open(fileobj=buf, mode="r:gz") as tar:
        tar.extractall(OUT)

    print(f"Pulled mongo dump to {OUT} ({len(buf.getvalue())} bytes tgz)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
