# -*- coding: utf-8 -*-
# 阶段2 · 内容→档匹配器:喂文案节拍 → 从 assets.db 语义配镜头 + 选风格档 → 吐可渲染 Script JSON
# spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md
# 输入(--script in.json): {industry, brand, beats:[{text,kind,feature?,hl?,num?}]}
# 输出(--out matched.json): {styleId,theme,brand,cap,beats:[{...,clip}]} + 把选中归一化clip拷进 public/
# 用法: py -3.14 matcher.py --db assets.db --script topic.json --out matched.json --public ../video-remotion/public
import os, sys, json, sqlite3, shutil, argparse

# 风格档库(与 video-remotion/src/engine/styles-library.ts 对齐;此处供匹配器选档)
STYLE_PRESETS = [
    {"id": "datahard-gold", "styleId": "datahard", "theme": "#F2B33D", "cap": "glow",
     "fit": ["商超采购", "供应链", "批发", "外贸", "电商"]},
    {"id": "punchy-emerald", "styleId": "punchy", "theme": "#19c37d", "cap": "highlight",
     "fit": ["美妆", "种草", "快消", "美食"]},
    {"id": "premium-cream", "styleId": "premium", "theme": "#e8d6a8", "cap": "glow",
     "fit": ["留学", "教育", "高端", "品牌"]},
]
# 品类关键词(文案里出现 → 优先配该品类素材)
CATEGORY_KW = ["五金", "厨房", "家居", "家电", "玩具", "美妆", "数码", "电子", "耳机", "箱包",
               "鞋", "发饰", "饰品", "卫浴", "家电", "充电", "音箱", "手表", "手环"]
# 镜头特色 → 场景/运镜偏好
FEATURE_PREF = {
    "drone":   {"motion": ["drone"], "scene": ["仓库", "装货", "外景"]},
    "aisle":   {"motion": [], "scene": ["仓库内景"]},
    "wall":    {"motion": [], "scene": ["展厅货架"]},
    "people":  {"motion": [], "scene": ["客户"]},
    "product": {"motion": [], "scene": ["展厅货架"]},
    "loading": {"motion": [], "scene": ["装货发货"]},
}

def pick_preset(industry):
    for p in STYLE_PRESETS:
        if any(k in industry for k in p["fit"]):
            return p
    return STYLE_PRESETS[0]

def score(asset, beat, used):
    sc, cat, mot, q, _id = asset["scene"], asset["category"], asset["motion"], asset["quality"], asset["id"]
    s = q * 1.0  # 质量基分
    text = beat.get("text", "") + " ".join(beat.get("hl", []))
    # 品类命中(文案提到的品类 == 素材品类)
    wanted_cats = [k for k in CATEGORY_KW if k in text]
    if wanted_cats and any(k in cat for k in wanted_cats):
        s += 4.0
    # 镜头特色命中场景/运镜
    pref = FEATURE_PREF.get(beat.get("feature", ""), {})
    if pref.get("motion") and mot in pref["motion"]:
        s += 3.0
    if any(k in sc for k in pref.get("scene", [])):
        s += 2.5
    # 已用过的扣分(允许复用但优先没用过的)
    if _id in used:
        s -= 5.0
    return s

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="assets.db")
    ap.add_argument("--script", required=True)
    ap.add_argument("--out", default="matched.json")
    ap.add_argument("--public", default="../video-remotion/public")
    args = ap.parse_args()

    spec = json.load(open(args.script, encoding="utf-8"))
    industry = spec.get("industry", "")
    preset = pick_preset(industry)

    con = sqlite3.connect(args.db)
    con.row_factory = sqlite3.Row
    assets = [dict(r) for r in con.execute(
        "SELECT id,scene,category,motion,quality,norm_path FROM assets WHERE norm_path IS NOT NULL")]
    con.close()

    os.makedirs(args.public, exist_ok=True)
    used = set()
    out_beats = []
    print(f">> 行业「{industry}」→ 选档「{preset['id']}」(theme {preset['theme']}, cap {preset['cap']})\n", flush=True)
    print(f"{'beat':>4} {'kind':<9} {'配到的镜头(场景/品类/运镜)':<34} 文案", flush=True)
    for i, beat in enumerate(spec["beats"]):
        ranked = sorted(assets, key=lambda a: score(a, beat, used), reverse=True)
        best = ranked[0]
        used.add(best["id"])
        clip_name = f"m_{i:02d}.mp4"
        shutil.copyfile(best["norm_path"], os.path.join(args.public, clip_name))
        nb = dict(beat)
        nb["clip"] = clip_name
        out_beats.append(nb)
        tag = f"{best['scene']}/{best['category']}/{best['motion']}"
        print(f"{i:>4} {beat.get('kind',''):<9} {tag:<34} {beat['text'][:18]}", flush=True)

    matched = {
        "styleId": preset["styleId"], "theme": preset["theme"], "cap": preset["cap"],
        "brand": spec.get("brand", ""), "watermark": spec.get("watermark", "longka 制作"),
        "title": spec.get("title"), "titleHl": spec.get("titleHl"),
        "voice": "voice.mp3", "bgm": "bgm.mp3",
        "beats": out_beats,
    }
    json.dump(matched, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\n>> 匹配完成 → {args.out}(clips 已拷进 {args.public});下一步交配音/时间轴(build_mizan)+渲染", flush=True)

if __name__ == "__main__":
    main()
