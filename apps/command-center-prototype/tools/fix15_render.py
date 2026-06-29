# -*- coding: utf-8 -*-
# fix15_render.py — 复用已有 m15_*.json props(v2/it 已改文案+重配音,其余13条沿用)
#   渲染全15(黑屏引擎已修)→ 换音轨(BGM轮换+loudnorm)→ 封面 → qc。输出新目录保留原版可对比。
import os, json, subprocess, sys
TOOLS = os.path.dirname(os.path.abspath(__file__))
VR = os.path.normpath(os.path.join(TOOLS, "..", "video-remotion"))
PUB = os.path.join(VR, "public")
OUT = "G:/longka-demo/mizan_15修复"; os.makedirs(OUT, exist_ok=True)
POOL = ["bgmpool/upbeat_1_even.mp3", "bgmpool/upbeat_2_even.mp3", "bgmpool/ad1_1_even.mp3",
        "bgmpool/ad1_2_even.mp3", "bgmpool/ad2_1_even.mp3", "bgmpool/ad2_2_even.mp3"]
# (vid, num, voice性别) —— 顺序同 batch15(决定 BGM 轮换 index)
M = [("xb_huoyuan","01","m"),("it_zhongjian","02","m"),("cl_xuanpin","03","f"),("pt_feihuiguo","04","m"),
     ("ag_fabudao","05","m"),("mx_zhuanxing","06","f"),("gr_haiyun","07","m"),("es_tonghang","08","m"),
     ("cl_zhanting","09","f"),("ec_yizhan","10","m"),("v1","11","m"),("v2","12","f"),
     ("v3","13","m"),("v4","14","m"),("v5","15","f")]
from concurrent.futures import ThreadPoolExecutor
def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), capture_output=True, text=True, encoding="utf-8", errors="replace")

print(">> 渲染(2并发降资源·跳过已成功的)", flush=True)
# 只渲: 有 props 且 最终成品还不存在(已成功的不重渲)
items = [(i, vid, num, vo) for i, (vid, num, vo) in enumerate(M)
         if os.path.exists(os.path.join(VR, f"m15_{vid}.json")) and not os.path.exists(f"{OUT}/{num}_{vid}.mp4")]
print(f"  待渲 {len(items)} 条: {[x[2] for x in items]}", flush=True)
def render_one(it):
    i, vid, num, vo = it; raw = f"{OUT}/{num}_{vid}_raw.mp4"
    run(f'npx remotion render Mizan "{raw}" --props=m15_{vid}.json --scale=1.5 --crf=16 --concurrency=4', cwd=VR)
    ok = os.path.exists(raw); print(f"  {num} {vid} 渲染{'OK' if ok else '失败'}", flush=True)
    return (it, raw if ok else None)
with ThreadPoolExecutor(max_workers=1) as ex:
    rendered = list(ex.map(render_one, items))

print(">> 换音轨(BGM轮换+loudnorm)+封面+质检", flush=True)
def finalize(rr):
    (i, vid, num, vo), raw = rr
    if not raw: return (num, "FAIL渲染")
    fin = f"{OUT}/{num}_{vid}.mp4"; bgm = os.path.join(PUB, POOL[i % len(POOL)]); voicef = os.path.join(PUB, f"voice15_{vid}.mp3")
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-i", voicef, "-i", bgm, "-filter_complex",
         "[1:a]volume=1.0[v];[2:a]volume=0.10[b];[v][b]amix=inputs=2:duration=first:normalize=0[m];[m]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
         "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", fin])
    if os.path.exists(fin): os.remove(raw)
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", fin, "-vframes", "1", f"{OUT}/cover_{num}_{vid}.jpg"])
    r = run([sys.executable, "qc_gate.py", fin, "--json"], cwd=TOOLS)
    try:
        q = json.loads(r.stdout); ok = q.get("pass"); dur = q.get("l1", {}).get("dur")
        warns = len(q.get("warnings", []))
    except Exception:
        ok = "?"; dur = "?"; warns = "?"
    return (num, f"OK dur={dur} qc={'过' if ok else ok} 预警{warns} {POOL[i % len(POOL)].split('/')[-1]}")
with ThreadPoolExecutor(max_workers=6) as ex:
    res = list(ex.map(finalize, rendered))
print("\n===== 15条修复结果 =====")
for n, s in sorted(res):
    print(f"  {n}: {s}")
