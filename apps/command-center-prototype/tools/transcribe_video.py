#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""transcribe_video.py — 对标视频 → 转录文字稿(本地 openai-whisper)

取长补短:抖音工具的看家本事是"对标视频转录拆解"。本脚本补上"视频→文字"这一段,
产出的文字稿直接喂现成的「对标起锚」(/api/benchmark/anchor/start) 走 benchmark-deconstruct 拆解。
本机已装 openai-whisper(py -3.14) + base 模型 + ffmpeg,直接用。

用法:
  py -3.14 transcribe_video.py --src <本地mp4 或 http视频直链> [--model base] [--out out.txt]
"""
import argparse
import os
import sys
import tempfile
import urllib.request


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="本地视频/音频路径 或 http(s) 直链")
    ap.add_argument("--model", default=os.environ.get("WHISPER_MODEL", "base"))
    ap.add_argument("--language", default="zh")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    src = args.src
    tmp = None
    if src.lower().startswith("http"):
        tmp = os.path.join(tempfile.gettempdir(), "bm_video_dl.mp4")
        print(f"[下载] {src[:80]} ...", file=sys.stderr)
        req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
            f.write(r.read())
        src = tmp

    import whisper
    print(f"[转录] model={args.model} ...", file=sys.stderr)
    model = whisper.load_model(args.model)
    result = model.transcribe(src, language=args.language, fp16=False)
    text = (result.get("text") or "").strip()

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
    print(text)

    if tmp and os.path.exists(tmp):
        try:
            os.remove(tmp)
        except OSError:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
