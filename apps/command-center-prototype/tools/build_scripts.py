# -*- coding: utf-8 -*-
# 编排器(骨架主入口)—— 把三层串起来:人群定位 → 取该人群真实词(按桶)→ 套脚本框架 → 吐可渲染脚本。
# 链路: personas_mizan.json + keywords_baidu.json(真实sug词) + seo_regions_mizan.json → topic_<slug>_<bucket>.json
# 这些 topic 直接喂 matcher.py 配镜头 → build_voice 配音 → 渲染。
# 铁律3:含真实料占位(__REAL_DATA__)的脚本会被标 ⚠️,需真实料填充才能出片,绝不带占位出。
# spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md(阶段2.5)
#
# 用法: py -3.14 build_scripts.py --persona P1 --out-dir .
import json, os, argparse
import script_frames as sf

# 没真实 sug 词时的兜底关键词(每桶一条通用词)
DEFAULT_KW = {
    "price": "{r}华人超市进货多少钱", "channel": "{r}华人超市在哪进货",
    "selection": "{r}开店进什么货好卖", "profit": "{r}开超市赚钱吗",
    "concern": "{r}华人超市从中国直采靠谱吗", "story": "{r}华人超市进货经历",
}


def pick_real_keyword(all_words, region, bucket):
    """从真实 sug 词里(已按 score 排序)找该地区、该桶的最优词。"""
    for w in all_words:
        if w["region"] == region and sf.bucket_of(w["keyword"]) == bucket:
            return w["keyword"], "baidu_sug"
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--personas", default="personas_mizan.json")
    ap.add_argument("--regions", default="seo_regions_mizan.json")
    ap.add_argument("--keywords", default="keywords_baidu.json")
    ap.add_argument("--persona", help="只跑某人群(如 P1);省略=全部")
    ap.add_argument("--region-limit", type=int, default=0, help="只跑前 N 个地区(0=全部)")
    ap.add_argument("--purposes", default="", help="传播目的: 空=框架原版; all=全5种; 或逗号列 expose,collect,comment,convert,persona")
    ap.add_argument("--out-dir", default=".")
    args = ap.parse_args()

    if args.purposes.strip() == "all":
        purposes = list(sf.PURPOSES.keys())
    elif args.purposes.strip():
        purposes = [p.strip() for p in args.purposes.split(",") if p.strip() in sf.PURPOSES]
    else:
        purposes = [None]  # 框架原版(不套传播目的)

    personas_cfg = json.load(open(args.personas, encoding="utf-8"))
    regions_cfg = json.load(open(args.regions, encoding="utf-8"))
    facts = regions_cfg["product_facts"]
    regions = regions_cfg["regions"]
    if args.region_limit:
        regions = regions[:args.region_limit]

    all_words = []
    if os.path.exists(args.keywords):
        all_words = json.load(open(args.keywords, encoding="utf-8")).get("all", [])

    personas = personas_cfg["personas"]
    if args.persona:
        personas = [p for p in personas if p["id"] == args.persona]

    os.makedirs(args.out_dir, exist_ok=True)
    rows, need_realdata = [], []
    print(f">> 人群定位层 → 脚本骨架 · {len(personas)} 人群 × 各自桶 × {len(regions)} 地区\n", flush=True)
    print(f"{'人群':<5}{'桶':<10}{'地区':<7}{'真实关键词(来源)':<30}料", flush=True)

    for p in personas:
        for bucket in p["buckets"]:
            frame = sf.FRAMES.get(bucket)
            if not frame:
                continue
            for region in regions:
                rn = region["name"]
                kw, src = pick_real_keyword(all_words, rn, bucket)
                if not kw:
                    kw, src = DEFAULT_KW[bucket].format(r=rn), "default"
                title, title_hl, beats0, seo_title, seo_tags = frame(region, facts, kw)
                for purpose in purposes:
                    beats = sf.apply_purpose(beats0, purpose, region, facts) if purpose else beats0
                    holes = [b for b in beats if b.get("_placeholder")]
                    topic = {
                        "industry": regions_cfg["industry"], "brand": regions_cfg["brand"],
                        "watermark": regions_cfg.get("watermark", "longka 制作"),
                        "persona": p["id"], "bucket": bucket, "keyword": kw, "keyword_source": src,
                        "title": title, "titleHl": title_hl,
                        "seo_title": seo_title, "seo_tags": seo_tags, "beats": beats,
                    }
                    if purpose:
                        pp = sf.PURPOSES[purpose]
                        topic["purpose"] = purpose            # 传播目的(曝光/收藏/评论/转化/人设)
                        topic["purpose_label"] = pp["label"]
                        topic["purpose_kpi"] = pp["kpi"]      # 该目的的主指标(复盘看这个)
                        topic["fit_formats"] = [pp["label"]]  # 适配形态(对标库 fit_formats 字段)
                    suffix = f"_{purpose}" if purpose else ""
                    fn = f"topic_{region['slug']}_{bucket}{suffix}.json"
                    json.dump(topic, open(os.path.join(args.out_dir, fn), "w", encoding="utf-8"),
                              ensure_ascii=False, indent=2)
                    flag = "⚠️待料" if holes else "✅"
                    src_tag = "真" if src == "baidu_sug" else "兜底"
                    plabel = sf.PURPOSES[purpose]["label"] if purpose else "原版"
                    print(f"{p['id']:<5}{bucket:<10}{rn:<7}{plabel:<7}{kw + '(' + src_tag + ')':<26}{flag}", flush=True)
                    rows.append({"persona": p["id"], "bucket": bucket, "region": rn, "keyword": kw,
                                 "purpose": purpose, "keyword_source": src, "file": fn, "needs_realdata": bool(holes)})
                    if holes:
                        need_realdata.append(fn)

    json.dump({"rows": rows, "need_realdata": need_realdata},
              open(os.path.join(args.out_dir, "build_report.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    real_n = sum(1 for r in rows if r["keyword_source"] == "baidu_sug")
    print(f"\n>> 生成 {len(rows)} 份脚本({real_n} 份用真实 sug 词,{len(rows)-real_n} 份兜底)→ {args.out_dir}", flush=True)
    if need_realdata:
        print(f">> ⚠️ {len(need_realdata)} 份含真实料占位(选品类),需 mizan/评论料填充才能出片:", flush=True)
        for f in need_realdata:
            print(f"     - {f}", flush=True)
    print(">> 下一步: matcher.py 配镜头 → build_voice 配音 → 渲染(选品类先补料)", flush=True)


if __name__ == "__main__":
    main()
