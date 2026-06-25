# -*- coding: utf-8 -*-
# 阶段1 · 素材资产层:扫客户素材目录 → 梳理(打标)→ 优化(ffmpeg归一化竖屏)→ 存(assets.db)
# spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md
# 打标优先级:GLM-5V(有 ZHIPU_API_KEY 时,新素材)> inventory.json 缓存(已打标,省钱)> 文件夹兜底
# 归一化:取中段 ~3.6s,scale+crop 到 1080x1920 @30fps,坏/太短的剔除
# 用法: py -3.14 asset_ingest.py --src "G:/素材" --db assets.db --normdir norm_clips [--seed inventory.json] [--tag] [--limit N]
import os, sys, json, sqlite3, subprocess, base64, argparse, urllib.request, urllib.error

VIDEO_EXT = (".mp4", ".mov", ".m4v", ".avi")
ZHIPU_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
ZHIPU_MODEL = os.environ.get("ZHIPU_VISION_MODEL", "glm-5v-turbo")

def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")

def probe(path):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,bit_rate:format=duration",
             "-of", "json", path])
    try:
        d = json.loads(r.stdout)
        st = d.get("streams", [{}])[0]
        return {"w": int(st.get("width", 0)), "h": int(st.get("height", 0)),
                "bitrate": int(st.get("bit_rate", 0) or 0),
                "dur": float(d.get("format", {}).get("duration", 0) or 0)}
    except Exception:
        return {"w": 0, "h": 0, "bitrate": 0, "dur": 0}

def quality_heuristic(info):
    # 0-1 启发式:分辨率达标 + 时长够 + 码率;GLM-5V 接入后由模型给真分
    q = 0.0
    if min(info["w"], info["h"]) >= 1080: q += 0.5
    elif min(info["w"], info["h"]) >= 720: q += 0.3
    if info["dur"] >= 2.5: q += 0.3
    elif info["dur"] >= 1.5: q += 0.15
    if info["bitrate"] >= 8_000_000: q += 0.2
    elif info["bitrate"] >= 3_000_000: q += 0.1
    return round(min(q, 1.0), 2)

def motion_heuristic(fname):
    return "drone" if "DJI" in fname.upper() else "handheld"

def glm_tag(frame_jpg, key):
    """有 key 时调 GLM-5V 给 scene/category/motion/quality/desc"""
    b64 = base64.b64encode(open(frame_jpg, "rb").read()).decode()
    prompt = ("你是短视频素材标注员。看这一帧,输出严格 JSON(不要多余文字):"
              '{"scene":"场景(如 展厅货架/仓库内景/客户选品/装货发货)",'
              '"category":"主体品类(如 五金/数码/美妆/家居/无)",'
              '"motion":"运镜(drone/推拉/横移/跟拍/固定)",'
              '"quality":0到1的可用质量分,"desc":"一句中文描述"}')
    body = json.dumps({"model": ZHIPU_MODEL, "messages": [{"role": "user", "content": [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}]}]}).encode()
    req = urllib.request.Request(ZHIPU_URL, data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        out = json.loads(r.read())
    txt = out["choices"][0]["message"]["content"]
    s = txt[txt.find("{"): txt.rfind("}") + 1]
    return json.loads(s)

def normalize(src, dst, dur):
    if dur < 1.5:
        return None  # 太短,剔除
    ss = min(1.0, dur * 0.15)
    t = min(3.6, dur - ss)
    r = run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(ss), "-i", src, "-t", str(t),
             "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
             "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", dst])
    return dst if r.returncode == 0 and os.path.exists(dst) else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--db", default="assets.db")
    ap.add_argument("--normdir", default="norm_clips")
    ap.add_argument("--seed", help="inventory.json 已打标缓存")
    ap.add_argument("--tag", action="store_true", help="强制 GLM-5V 打标(需 ZHIPU_API_KEY)")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    key = os.environ.get("ZHIPU_API_KEY", "")
    seed = {}
    if args.seed and os.path.exists(args.seed):
        for c in json.load(open(args.seed, encoding="utf-8")):
            seed[(c.get("folder", ""), c.get("file", ""))] = c

    os.makedirs(args.normdir, exist_ok=True)
    con = sqlite3.connect(args.db)
    con.execute("""CREATE TABLE IF NOT EXISTS assets(
        id INTEGER PRIMARY KEY AUTOINCREMENT, src_path TEXT UNIQUE, folder TEXT, file TEXT,
        scene TEXT, category TEXT, motion TEXT, quality REAL, descr TEXT,
        norm_path TEXT, src_dur REAL, norm_dur REAL, w INTEGER, h INTEGER, tag_source TEXT)""")

    files = []
    for root, _, names in os.walk(args.src):
        for n in names:
            if n.lower().endswith(VIDEO_EXT):
                files.append(os.path.join(root, n))
    files.sort()
    if args.limit: files = files[: args.limit]
    print(f">> 扫到 {len(files)} 个视频", flush=True)

    n_ok = n_skip = n_tag_glm = n_tag_seed = 0
    for i, src in enumerate(files):
        folder = os.path.basename(os.path.dirname(src))
        fname = os.path.basename(src)
        if con.execute("SELECT 1 FROM assets WHERE src_path=?", (src,)).fetchone():
            continue
        info = probe(src)
        # 打标
        tagsrc, scene, category, motion, quality, descr = "fallback", folder, "无", motion_heuristic(fname), quality_heuristic(info), ""
        sc = seed.get((folder, fname))
        if sc:
            tagsrc, scene, category, descr = "seed", sc.get("scene", folder), sc.get("products", "无"), sc.get("desc", "")
            n_tag_seed += 1
        elif args.tag and key:
            try:
                fr = os.path.join(args.normdir, "_f.jpg")
                run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(min(1.0, info["dur"] * 0.3)), "-i", src, "-frames:v", "1", "-vf", "scale=720:-1", fr])
                g = glm_tag(fr, key)
                tagsrc, scene, category, motion, quality, descr = "glm5v", g.get("scene", folder), g.get("category", "无"), g.get("motion", motion), float(g.get("quality", quality)), g.get("desc", "")
                n_tag_glm += 1
            except Exception as e:
                print(f"   GLM-5V 失败 {fname}: {str(e)[:60]}", flush=True)
        # 归一化
        norm = os.path.join(args.normdir, f"asset_{i:03d}.mp4")
        norm = normalize(src, norm, info["dur"])
        if not norm:
            n_skip += 1
            print(f"   [{i+1}/{len(files)}] 剔除(太短/失败) {fname}", flush=True)
            continue
        ninfo = probe(norm)
        con.execute("""INSERT OR REPLACE INTO assets
            (src_path,folder,file,scene,category,motion,quality,descr,norm_path,src_dur,norm_dur,w,h,tag_source)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (src, folder, fname, scene, category, motion, quality, descr, os.path.abspath(norm),
             round(info["dur"], 2), round(ninfo["dur"], 2), info["w"], info["h"], tagsrc))
        con.commit()
        n_ok += 1
        if (i + 1) % 10 == 0:
            print(f"   [{i+1}/{len(files)}] 入库 {n_ok}", flush=True)
    con.close()
    print(f">> 完成:入库 {n_ok} / 剔除 {n_skip} | 打标 GLM-5V {n_tag_glm} · 缓存 {n_tag_seed} · 兜底 {n_ok - n_tag_glm - n_tag_seed}", flush=True)

if __name__ == "__main__":
    main()
