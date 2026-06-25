# -*- coding: utf-8 -*-
# 内容工厂·一条龙出片:topic → 配镜头 → 配音 → 声画同步换Pexels空镜 → 渲染 → 成片
# 把原来手工跑的 4 步串成一条命令。前置(采词 keyword_crawler / 选题 build_scripts)产出 topic,频率低、单独跑。
# 用法: py -3.14 make_video.py --topic topic_yidali_price.json --out "G:/longka-demo/x.mp4" [--voice voices_real/voice_03.wav] [--skip-broll]
# spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md ; 声画同步铁律见记忆 video-audio-sync-mandatory
import argparse, os, subprocess, sys, time, paramiko

APPDIR = r"D:\AInative\ai-native\apps\command-center-prototype"
TOOLS = os.path.join(APPDIR, "tools")
VREMOTION = os.path.join(APPDIR, "video-remotion")
PUBLIC = os.path.join(VREMOTION, "public")
TTS = r"G:\index-tts_v2.5"
TTS_PY = os.path.join(TTS, "py312", "python.exe")
REMOTION = os.path.join(VREMOTION, "node_modules", ".bin", "remotion.cmd")


def step(n, msg):
    print(f"\n{'=' * 6} [{n}/4] {msg} {'=' * 6}", flush=True)


def read_122_keys():
    """从 122 .env 借 Pexels/DeepSeek key 给 fill_broll(只进内存,不落文件)。"""
    need = ["PEXELS_API_KEY", "DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "COPY_MODEL"]
    host = os.environ.get("DEPLOY_HOST", "122.51.218.154")
    user = os.environ.get("DEPLOY_USER", "ubuntu")
    pw = os.environ.get("DEPLOY_PASS") or os.environ.get("DEPLOY_PASSWORD")
    if not pw:
        sys.exit("缺少 122 登录密码：请设置环境变量 DEPLOY_PASS（绝不硬编码进 git，public 仓库）。")
    c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, look_for_keys=False, allow_agent=False, timeout=20)
    pat = "|".join("^" + k + "=" for k in need)
    i, o, e = c.exec_command(f"grep -E '{pat}' /home/ubuntu/ai-native-command-center-v2/.env")
    lines = o.read().decode("utf-8", "replace").strip().splitlines(); c.close()
    env = dict(os.environ)
    for ln in lines:
        k, _, v = ln.partition("="); k = k.strip(); v = v.strip().strip("'\"")
        if k in need and v:
            env[k] = v
    return env


def run(cmd, cwd, env=None, label=""):
    r = subprocess.run(cmd, cwd=cwd, env=env)
    if r.returncode != 0:
        print(f"\n!! {label} 失败 (exit {r.returncode}),中止。命令: {' '.join(str(x) for x in cmd)}")
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", required=True, help="topic json(相对 tools/ 或绝对路径)")
    ap.add_argument("--out", required=True, help="输出 mp4 路径")
    ap.add_argument("--voice", default="voices_real/voice_04.wav")
    ap.add_argument("--skip-broll", action="store_true", help="跳过 Pexels,纯真实素材")
    args = ap.parse_args()

    topic = args.topic if os.path.isabs(args.topic) else os.path.join(TOOLS, args.topic)
    if not os.path.exists(topic):
        print(f"!! 找不到 topic: {topic}"); sys.exit(1)
    name = os.path.basename(topic).replace("topic_", "").replace(".json", "")
    matched = os.path.join(TOOLS, f"matched_{name}.json")
    final = os.path.join(VREMOTION, f"final_{name}.json")
    out = os.path.abspath(args.out)
    t0 = time.time()
    print(f">> 一条龙出片: {name}  →  {out}")

    step(1, "配镜头 matcher")
    run(["py", "-3.14", "matcher.py", "--db", "assets.db", "--script", topic, "--out", matched, "--public", "../video-remotion/public"], cwd=TOOLS, label="matcher")

    step(2, "配音 IndexTTS(本机GPU,约2-3min)")
    run([TTS_PY, "build_voice.py", "--script", matched, "--voice", args.voice, "--out", final, "--public", PUBLIC], cwd=TTS, label="build_voice")

    if not args.skip_broll:
        step(3, "声画同步·换 Pexels 空镜(约3-5min)")
        run(["node", "fill_broll.mjs", final, PUBLIC], cwd=APPDIR, env=read_122_keys(), label="fill_broll")
    else:
        step(3, "跳过 Pexels(纯真实素材)")

    step(4, "渲染 Remotion(约2min)")
    run(["cmd", "/c", REMOTION, "render", "src/index.ts", "Mizan", out, f"--props={final}", "--concurrency=4"], cwd=VREMOTION, label="render")

    print(f"\n🎬 成片完成: {out}   (总耗时 {round((time.time() - t0) / 60, 1)} min)")


if __name__ == "__main__":
    main()
