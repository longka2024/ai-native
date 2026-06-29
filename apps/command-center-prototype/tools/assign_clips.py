# -*- coding: utf-8 -*-
# 配镜:按 beat 的 feature 从 assets.db 选真实素材(竖屏归一化片),复制到 public/<vid>/,回填 beat.clip。
# 声画同步:feature→场景关键词映射;同一条片内不重复用同一素材;优先高画质。
# 用法: py -3.14 assign_clips.py --beats mizan_scripts/beats_v1.json --vid v1 --out mizan_scripts/beats_v1_matched.json
import sqlite3, json, os, shutil, argparse, subprocess, urllib.request, urllib.parse

# Pexels 竖屏空镜:只给"很合适"的抽象概念拍用(飞机/海运/手机下单/工厂),mizan 实拍真配不上时才补
def fetch_pexels(query, key, used, dst, want_sec=6.0):
    if not key:
        return False
    try:
        UA = "Mozilla/5.0"
        u = f"https://api.pexels.com/videos/search?query={urllib.parse.quote(query)}&orientation=portrait&size=medium&per_page=15"
        req = urllib.request.Request(u, headers={"Authorization": key, "User-Agent": UA})
        data = json.load(urllib.request.urlopen(req, timeout=20))
        for v in data.get("videos", []):
            vid = v.get("id")
            if f"pexels:{vid}" in used:
                continue
            files = [f for f in v.get("video_files", []) if "mp4" in (f.get("file_type") or "") and (f.get("height") or 0) >= 1280 and (f.get("width") or 0) < (f.get("height") or 1)]
            files.sort(key=lambda f: f.get("height", 0))
            pick = files[0] if files else None
            if not pick:
                continue
            raw = dst + ".raw.mp4"
            dreq = urllib.request.Request(pick["link"], headers={"User-Agent": UA})
            with urllib.request.urlopen(dreq, timeout=60) as resp, open(raw, "wb") as f:
                shutil.copyfileobj(resp, f)
            # 归一化 1080x1920 + 取前 want_sec 秒(够念白)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-t", str(want_sec), "-i", raw,
                            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30",
                            "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", dst], check=True)
            os.remove(raw)
            used.add(f"pexels:{vid}")
            return True
    except Exception as ex:
        print(f"    Pexels 抓取失败({query}): {ex}")
    return False

FEATURE_SCENE = {
    "people":  ["客户选品", "客户来展厅参观选品", "参观", "选品"],
    "wall":    ["展厅货架", "展厅"],
    "aisle":   ["仓库内景", "仓库"],
    "loading": ["装货发货", "发货", "物流"],
    "product": ["展厅货架", "客户选品"],
    "drone":   ["装货发货", "仓库内景", "展厅货架"],
}

def pick(conn, scenes, used, min_dur=2.5):
    for sc in scenes:
        for (np,) in conn.execute(
            "select norm_path from assets where scene like ? and norm_dur>=? order by quality desc",
            (sc + "%", min_dur)):
            if np and np not in used and os.path.exists(np):
                used.add(np); return np, sc
    # 兜底:任意未用过的高质量片
    for (np,) in conn.execute("select norm_path from assets where norm_dur>=? order by quality desc", (min_dur,)):
        if np and np not in used and os.path.exists(np):
            used.add(np); return np, "兜底"
    return None, None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--beats", required=True)
    ap.add_argument("--vid", required=True)
    ap.add_argument("--db", default="assets.db")
    ap.add_argument("--pub", default="../video-remotion/public")
    ap.add_argument("--out", required=True)
    ap.add_argument("--used", default="", help="跨视频已用素材集 json(5条不重复用同一片)")
    ap.add_argument("--pexels-key", dest="pexels_key", default=os.environ.get("PEXELS_API_KEY", ""), help="Pexels key(抽象概念空镜)")
    a = ap.parse_args()
    conn = sqlite3.connect(a.db)
    beats = json.load(open(a.beats, encoding="utf-8"))
    outdir = os.path.join(a.pub, a.vid)
    os.makedirs(outdir, exist_ok=True)
    used = set(json.load(open(a.used, encoding="utf-8"))) if (a.used and os.path.exists(a.used)) else set()
    SHARED = {"download": "shared/mizan-download.mp4", "category": "shared/mizan-category.mp4"}
    REG = ["shared/mizan-reg1.mp4", "shared/mizan-reg2.mp4", "shared/mizan-reg3.mp4", "shared/mizan-reg4.mp4"]
    reg_i = 0
    for i, b in enumerate(beats):
        f = b.get("feature")
        if f in SHARED:  # 录屏共享片段(下载/品类浏览,不从素材库选)
            b["clip"] = SHARED[f]; print(f"  beat{i:2} {f} → 录屏(shared)"); continue
        if f == "register":  # 注册分步,轮换避免画面重复
            b["clip"] = REG[reg_i % len(REG)]; reg_i += 1; print(f"  beat{i:2} register → {b['clip'].split('/')[-1]}"); continue
        if b.get("broll") and a.pexels_key:  # 很合适的抽象概念才用 Pexels 空镜(飞机/海运/手机下单等)
            dst = os.path.join(outdir, f"s{i+1}.mp4")
            if fetch_pexels(b["broll"], a.pexels_key, used, dst):
                b["clip"] = f"{a.vid}/s{i+1}.mp4"; print(f"  beat{i:2} broll → Pexels「{b['broll']}」"); continue
            print(f"  beat{i:2} broll 抓取失败,回退实拍")
        scenes = FEATURE_SCENE.get(b.get("feature", "product"), ["展厅货架"])
        np, hit = pick(conn, scenes, used)
        if not np:
            raise SystemExit(f"配镜失败 beat{i}({b.get('feature')})")
        dst = f"s{i+1}.mp4"
        shutil.copyfile(np, os.path.join(outdir, dst))
        b["clip"] = f"{a.vid}/{dst}"
        print(f"  beat{i:2} {b.get('feature',''):8} → {hit:10} {os.path.basename(np)}")
    if a.used:  # 回写已用集,下一条视频避开
        json.dump(sorted(used), open(a.used, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(beats, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f">> 配镜完成,{len(beats)} 拍 → {a.out} + public/{a.vid}/")

if __name__ == "__main__":
    main()
