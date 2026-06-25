#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""xhs_qr_login.py — 122 服务端小红书扫码登录(给采集内部化用)

spec: docs/specs/2026-06-19-comment-mining-spec.md L1
铁律1: 采集内部化, 客户不碰 cookie; 登录与采集都在 122 同 IP, 降风控.

流程:
  无头 chromium 打开小红书登录 → 截二维码图 → 写 qr.png + status.json
  → 轮询直到出现 web_session(登录成功) → 抓 cookie 字符串
  → POST 给本机 CookieBridge /api/cookies/xhs/set(client_id=manual)
  → status=success

被 server.mjs 以子进程方式拉起; server 读 status.json、把 qr.png 显示在 ai-native-v2 界面.
"""
import argparse
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def write_status(outdir: Path, payload: dict) -> None:
    """原子写 status.json,避免 server 读到半截。"""
    tmp = outdir / "status.json.tmp"
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    tmp.replace(outdir / "status.json")


def push_cookie_to_bridge(bridge_url: str, platform: str, cookie_str: str) -> dict:
    body = json.dumps({"cookies": cookie_str, "client_id": "manual"}).encode("utf-8")
    req = urllib.request.Request(
        f"{bridge_url.rstrip('/')}/api/cookies/{platform}/set",
        data=body, headers={"content-type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run(outdir: Path, bridge_url: str, platform: str, timeout: int) -> int:
    from playwright.sync_api import sync_playwright

    outdir.mkdir(parents=True, exist_ok=True)
    qr_path = outdir / "qr.png"
    write_status(outdir, {"status": "starting", "ts": int(time.time())})

    p = sync_playwright().start()
    browser = p.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    )
    ctx = browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 900}, locale="zh-CN")
    page = ctx.new_page()
    try:
        page.goto("https://www.xiaohongshu.com/explore", wait_until="domcontentloaded", timeout=40000)
        page.wait_for_timeout(4000)

        # 确认登录框 + 二维码出现
        try:
            page.wait_for_selector("img.qrcode-img", timeout=15000)
        except Exception:
            write_status(outdir, {"status": "error", "msg": "未出现二维码(可能被风控或页面改版)", "ts": int(time.time())})
            return 2

        def get_web_session() -> str:
            for c in ctx.cookies():
                if c.get("name") == "web_session":
                    return c.get("value", "")
            return ""

        # 关键:游客态也有 web_session,记下初始值;真登录后小红书会换成新值。
        initial_ws = get_web_session()

        deadline = time.time() + timeout
        last_shot = 0
        while time.time() < deadline:
            # 周期性重截二维码(小红书二维码会过期刷新, 让界面始终是最新码)
            if time.time() - last_shot > 5:
                try:
                    page.locator("img.qrcode-img").first.screenshot(path=str(qr_path))
                    last_shot = time.time()
                    write_status(outdir, {"status": "waiting_scan", "ts": int(time.time()),
                                          "expireHint": "二维码有时效,过期会自动刷新"})
                except Exception:
                    pass

            # 登录成功判定: web_session 的值发生变化(游客值 → 登录后的真 session 值)
            cur_ws = get_web_session()
            modal_gone = page.locator("img.qrcode-img").count() == 0
            if cur_ws and cur_ws != initial_ws and modal_gone:
                cookies = ctx.cookies()
                xhs_cookies = [c for c in cookies if "xiaohongshu" in (c.get("domain") or "")]
                cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in xhs_cookies if c.get("value"))
                pushed = {"ok": False}
                try:
                    pushed = push_cookie_to_bridge(bridge_url, platform, cookie_str)
                except Exception as e:
                    write_status(outdir, {"status": "error", "msg": f"cookie 推送 CookieBridge 失败: {e}", "ts": int(time.time())})
                    return 3
                write_status(outdir, {
                    "status": "success", "ts": int(time.time()),
                    "cookieCount": len(xhs_cookies),
                    "bridge": pushed,
                })
                return 0

            page.wait_for_timeout(2000)

        write_status(outdir, {"status": "timeout", "msg": "超时未扫码登录", "ts": int(time.time())})
        return 4
    except Exception as e:
        write_status(outdir, {"status": "error", "msg": str(e)[:300], "ts": int(time.time())})
        return 1
    finally:
        try:
            browser.close()
        except Exception:
            pass
        p.stop()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--outdir", default="/home/ubuntu/ai-native-command-center-v2/data/collect-login")
    ap.add_argument("--cookiebridge", default="http://localhost:8274")
    ap.add_argument("--platform", default="xhs")
    ap.add_argument("--timeout", type=int, default=180)
    args = ap.parse_args()
    return run(Path(args.outdir), args.cookiebridge, args.platform, args.timeout)


if __name__ == "__main__":
    sys.exit(main())
