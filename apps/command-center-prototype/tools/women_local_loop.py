#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""women_local_loop.py — 本地住宅IP 逐帖采评论(防批量限流)

Pro 单账号批量采,一个请求失败5次就整个崩。改成:一帖一个独立 Pro 进程、
每帖间隔、单帖失败只跳过不影响其余。慢但稳。本地跑,采完评论进本地 media_crawler.db。
"""
import os
import sqlite3
import subprocess
import sys
import time

PRO = r"E:\Codex\MediaCrawlerPro\MediaCrawlerPro-Python"
PY = PRO + r"\.venv\Scripts\python.exe"
DB = PRO + r"\media_crawler.db"
URLS_FILE = r"E:\Codex\MediaCrawlerPro\xhs_urls.txt"
SLEEP_BETWEEN = 7
PER_NOTE_TIMEOUT = 120


def have_comments(nid: str) -> int:
    try:
        con = sqlite3.connect(DB)
        n = con.execute("select count(*) from xhs_note_comment where note_id=?", (nid,)).fetchone()[0]
        con.close()
        return n
    except Exception:
        return 0


def main():
    urls = [l.strip() for l in open(URLS_FILE, encoding="utf-8") if "explore/" in l]
    env = dict(
        os.environ,
        DB_TYPE="sqlite", ACCOUNT_POOL_SAVE_TYPE="xlsx", ENABLE_GET_COMMENTS="true",
        SIGN_SRV_HOST="localhost", SIGN_SRV_PORT="8989", PYTHONIOENCODING="utf-8",
    )
    done = skipped = failed = 0
    for i, u in enumerate(urls, 1):
        nid = u.split("explore/")[1].split("?")[0]
        if have_comments(nid) >= 10:
            skipped += 1
            print(f"[{i}/{len(urls)}] skip {nid} (已有 {have_comments(nid)})", flush=True)
            continue
        try:
            subprocess.run(
                [PY, "main.py", "--platform", "xhs", "--type", "detail", "--urls", u],
                cwd=PRO, env=env, capture_output=True, timeout=PER_NOTE_TIMEOUT,
            )
            n = have_comments(nid)
            if n > 0:
                done += 1
                print(f"[{i}/{len(urls)}] ok {nid} 评论 {n}", flush=True)
            else:
                failed += 1
                print(f"[{i}/{len(urls)}] FAIL {nid} (无评论)", flush=True)
        except subprocess.TimeoutExpired:
            failed += 1
            print(f"[{i}/{len(urls)}] TIMEOUT {nid}", flush=True)
        except Exception as e:
            failed += 1
            print(f"[{i}/{len(urls)}] ERR {nid} {e}", flush=True)
        time.sleep(SLEEP_BETWEEN)
    print(f"LOOP_DONE ok={done} skip={skipped} fail={failed}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
