# -*- coding: utf-8 -*-
# render_preflight.py — 渲染前资产闸(质检中台·qc_gate 上游)。
# 内化自 hyperframes-motion-director/check_assets.mjs,改我们规范:扫 Remotion props(m15_*.json)
# 里引用的所有素材(clip/配音/bgm/封面图/flag/字体),校验在 public/ 本地存在 + 揪远程 URL。
# 哲学(hyperframes-stability 铁律):渲染期不准网络拉取——远程 URL=不确定/可能挂;缺素材=渲出黑/废片。
# 用法: py -3.14 render_preflight.py <props.json> [--public <dir>] [--strict]
#   缺本地素材→exit 1;远程 URL→warn(--strict 升 exit 1)。接 build_mizan/批渲前跑,堵"渲成功但素材缺"。
import json, os, sys, re, argparse

try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

ASSET_EXT = re.compile(r"\.(?:png|jpe?g|webp|gif|svg|mp3|wav|m4a|aac|mp4|mov|webm|woff2?|ttf|otf)$", re.I)
REMOTE = re.compile(r"^https?://", re.I)


def walk_strings(obj):
    """递归吐出 JSON 里所有字符串值(带路径定位)。"""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from walk_strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk_strings(v)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("props", help="Remotion props json(如 m15_xxx.json)")
    ap.add_argument("--public", default=None, help="public 目录(默认 props 同级的 ../video-remotion/public 或 ./public)")
    ap.add_argument("--strict", action="store_true", help="远程 URL 也判废")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    if not os.path.exists(a.props):
        print(f"props 不存在: {a.props}"); sys.exit(2)
    # 定位 public 目录
    pub = a.public
    if not pub:
        base = os.path.dirname(os.path.abspath(a.props))
        for cand in [os.path.join(base, "public"), os.path.join(base, "video-remotion", "public"),
                     os.path.join(base, "..", "video-remotion", "public")]:
            if os.path.isdir(cand):
                pub = cand; break
    pub = pub or "public"

    try:
        data = json.load(open(a.props, encoding="utf-8"))
    except Exception as e:
        print(f"props 解析失败: {e}"); sys.exit(2)

    seen, missing, remote = set(), [], []
    for s in walk_strings(data):
        if s in seen:
            continue
        seen.add(s)
        if REMOTE.match(s):
            remote.append(s)
        elif ASSET_EXT.search(s):
            # staticFile 路径相对 public/(去掉开头斜杠)
            rel = s.lstrip("/")
            if not os.path.exists(os.path.join(pub, rel)):
                missing.append(s)

    res = {"props": os.path.basename(a.props), "public": pub, "missing": missing, "remote": remote,
           "pass": len(missing) == 0 and not (a.strict and remote)}
    if a.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"== 渲前资产闸 {os.path.basename(a.props)} : {'✅ 过' if res['pass'] else '❌ 不过'} ==")
        print(f"  public: {pub}")
        if missing:
            print(f"  ❌ 缺本地素材 {len(missing)} 个(渲会出黑/废):")
            for m in missing: print(f"     - {m}")
        if remote:
            tag = "❌" if a.strict else "⚠️"
            print(f"  {tag} 远程 URL {len(remote)} 个(渲染期网络拉取=不确定,应先落本地):")
            for r in remote: print(f"     - {r}")
        if not missing and not remote:
            print("  全部素材本地齐备、无远程引用")
    sys.exit(0 if res["pass"] else 1)


if __name__ == "__main__":
    main()
