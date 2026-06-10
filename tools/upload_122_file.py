import argparse
import hashlib
import os
import sys
from pathlib import Path

import paramiko


def build_host_config() -> dict:
    hostname = os.environ.get("DEPLOY_HOST")
    username = os.environ.get("DEPLOY_USER")
    password = os.environ.get("DEPLOY_PASSWORD")
    if not hostname or not username or not password:
        print(
            "Missing env vars: DEPLOY_HOST / DEPLOY_USER / DEPLOY_PASSWORD",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return {"hostname": hostname, "username": username, "password": password}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--local", required=True)
    parser.add_argument("--remote", required=True)
    args = parser.parse_args()

    local = Path(args.local)
    if not local.exists():
        raise FileNotFoundError(local)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        look_for_keys=False,
        allow_agent=False,
        timeout=20,
        banner_timeout=20,
        auth_timeout=20,
        **build_host_config(),
    )
    sftp = client.open_sftp()
    sftp.put(str(local), args.remote)
    sftp.close()
    local_hash = sha256_file(local)
    stdin, stdout, stderr = client.exec_command(f"sha256sum {args.remote}", get_pty=False, timeout=60)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    code = stdout.channel.recv_exit_status()
    client.close()
    if err:
        print(err)
    print(f"local  {local_hash}")
    print(f"remote {out}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
