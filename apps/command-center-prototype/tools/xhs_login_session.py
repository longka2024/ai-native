#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""xhs_login_session.py — 122 服务端"可交互"小红书扫码登录会话

spec: docs/specs/2026-06-19-comment-mining-spec.md L1
机房 IP 登录会触发小红书验证码/滑块风控。为了不去猜随时改版的验证 DOM,
本脚本把 122 无头浏览器画面做成"实时镜像":
  - 每 ~0.6s 截一帧 frame.png(整个登录模态)
  - 轮询 cmds/ 目录里的指令(click/type/key),转发到浏览器(坐标驱动,不依赖选择器)
  - 持续判定登录成功(web_session 变化 + 登录框消失)→ 抓 cookie → 推 CookieBridge

server.mjs 把 frame.png 投到登录页, 把用户的点击/输入写进 cmds/。
"""
import argparse
import json
import time
import urllib.request
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
VIEW_W, VIEW_H = 900, 680


def write_status(outdir: Path, payload: dict) -> None:
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


def drain_commands(cmds_dir: Path, page) -> None:
    """按文件名顺序执行 cmds/ 里的指令并删除。坐标基于 VIEW_W×VIEW_H 视口。"""
    if not cmds_dir.exists():
        return
    for f in sorted(cmds_dir.glob("*.json")):
        try:
            cmd = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            f.unlink(missing_ok=True)
            continue
        try:
            action = cmd.get("action")
            if action == "click":
                page.mouse.click(float(cmd.get("x", 0)), float(cmd.get("y", 0)))
            elif action == "type":
                page.keyboard.type(str(cmd.get("value", "")), delay=40)
            elif action == "key":
                page.keyboard.press(str(cmd.get("value", "Enter")))
            elif action == "reload":
                page.reload(wait_until="domcontentloaded")
        except Exception:
            pass
        f.unlink(missing_ok=True)


def run(outdir: Path, bridge_url: str, platform: str, timeout: int) -> int:
    from playwright.sync_api import sync_playwright

    outdir.mkdir(parents=True, exist_ok=True)
    cmds_dir = outdir / "cmds"
    cmds_dir.mkdir(exist_ok=True)
    # 清空旧指令
    for f in cmds_dir.glob("*.json"):
        f.unlink(missing_ok=True)
    frame_path = outdir / "frame.png"
    write_status(outdir, {"status": "starting", "ts": int(time.time())})

    p = sync_playwright().start()
    browser = p.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    )
    ctx = browser.new_context(user_agent=UA, viewport={"width": VIEW_W, "height": VIEW_H}, locale="zh-CN")
    page = ctx.new_page()

    def get_web_session() -> str:
        for c in ctx.cookies():
            if c.get("name") == "web_session":
                return c.get("value", "")
        return ""

    try:
        page.goto("https://www.xiaohongshu.com/explore", wait_until="domcontentloaded", timeout=40000)
        page.wait_for_timeout(3500)
        initial_ws = get_web_session()
        write_status(outdir, {"status": "interactive", "ts": int(time.time()),
                              "view": {"w": VIEW_W, "h": VIEW_H},
                              "hint": "扫码;若要验证码/滑块,直接在画面上点和输入"})

        deadline = time.time() + timeout
        while time.time() < deadline:
            # 1) 转发用户指令
            drain_commands(cmds_dir, page)
            # 2) 截一帧(整页, 模态居中)
            try:
                page.screenshot(path=str(frame_path), full_page=False)
            except Exception:
                pass
            # 3) 成功判定: web_session 变化 + 登录框消失(验证中登录框仍在, 排除误判)
            cur_ws = get_web_session()
            try:
                modal = page.locator(".login-container").count()
            except Exception:
                modal = 1
            if cur_ws and cur_ws != initial_ws and modal == 0:
                cookies = ctx.cookies()
                xhs = [c for c in cookies if "xiaohongshu" in (c.get("domain") or "")]
                cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in xhs if c.get("value"))
                try:
                    pushed = push_cookie_to_bridge(bridge_url, platform, cookie_str)
                except Exception as e:
                    write_status(outdir, {"status": "error", "msg": f"cookie 推送失败: {e}", "ts": int(time.time())})
                    return 3
                write_status(outdir, {"status": "success", "ts": int(time.time()),
                                      "cookieCount": len(xhs), "bridge": pushed})
                return 0
            time.sleep(0.6)

        write_status(outdir, {"status": "timeout", "msg": "超时未完成登录", "ts": int(time.time())})
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
    ap.add_argument("--timeout", type=int, default=300)
    args = ap.parse_args()
    return run(Path(args.outdir), args.cookiebridge, args.platform, args.timeout)


if __name__ == "__main__":
    import sys
    sys.exit(main())
