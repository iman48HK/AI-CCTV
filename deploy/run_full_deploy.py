#!/usr/bin/env python3
"""
Run fetch_remote_mongo, npm build, deploy_remote with DEPLOY_SSH_PASSWORD in the child env.

Usage (from project root):
  python deploy/run_full_deploy.py YOUR_SSH_PASSWORD
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    pw = (sys.argv[1] if len(sys.argv) > 1 else "").strip() or os.environ.get("DEPLOY_SSH_PASSWORD", "").strip()
    if not pw:
        print("Usage: python deploy/run_full_deploy.py <ssh_password>", file=sys.stderr)
        print("Or set DEPLOY_SSH_PASSWORD in the environment.", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env["DEPLOY_SSH_PASSWORD"] = pw
    env.setdefault("NODE_OPTIONS", env.get("NODE_OPTIONS", "--max-old-space-size=2048"))

    print("--- fetch_remote_mongo.py")
    subprocess.check_call([sys.executable, str(ROOT / "deploy" / "fetch_remote_mongo.py")], cwd=ROOT, env=env)
    print("--- npm run build")
    if sys.platform == "win32":
        subprocess.check_call("npm run build", cwd=ROOT, env=env, shell=True)
    else:
        subprocess.check_call(["npm", "run", "build"], cwd=ROOT, env=env)
    print("--- deploy_remote.py")
    subprocess.check_call([sys.executable, str(ROOT / "deploy" / "deploy_remote.py")], cwd=ROOT, env=env)
    return 0


if __name__ == "__main__":
    sys.exit(main())
