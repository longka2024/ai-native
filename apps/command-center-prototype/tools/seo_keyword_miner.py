# -*- coding: utf-8 -*-
# 关键词洞察层 / SEO 选词器(根基层)——把"搜词→摸热度→定选词→70/30写文案"这套脑力过程固化成确定性脚本。
# 铁律:脚本>大模型(骨架填空,不靠 LLM 自由发挥);能不花钱就不花钱(零 API);绝不编数据(地区事实来自 config,须核对)。
# spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md(阶段2.5) · 策略: docs/strategy/mizan-seo-keyword-strategy.md
#
# 用法:
#   py -3.14 seo_keyword_miner.py --config seo_regions_mizan.json --top 4 --out-dir .
#   (可选采热度覆盖先验)  --heat heat.json   # {"西班牙华人超市在哪进货": 笔记量, ...}
# 产出:
#   seo_picks.json          —— 全候选词排序 + 选中清单(选词报告)
#   topic_<slug>_<cat>.json —— 每个选中词一份 70/30 文案(直接喂 matcher.py)
import os, sys, json, argparse

# ── 词模板库:把策略文档的定性判断编码成先验分(0-5)。intent=转化意图 traffic=流量盘 comp=竞争度(低=好排) ──
# 类别:intake=进货意图词(最值钱·高转化) format=业态大词(老流量盘) longtail=地名长尾(竞争小好排)
WORD_TEMPLATES = [
    # (类别,      关键词模板,                    intent, traffic, comp, 骨架)
    ("intake",   "{region}华人超市在哪进货",        5,      3,      2,    "intake"),
    ("intake",   "{region}开店进货 货源在哪",        5,      3,      2,    "intake"),
    ("intake",   "在{region}怎么开中国超市",         4,      3,      2,    "intake"),
    ("intake",   "{region}开店货源怎么找不踩坑",      5,      2,      1,    "intake"),
    ("format",   "{region}百元店",                  2,      5,      4,    "format"),
    ("format",   "{region}百货批发",                3,      4,      3,    "format"),
    ("longtail", "{region}华人超市 货源",            4,      2,      1,    "intake"),
]

# 打分权重:意图最重(高转化),流量次之,竞争扣分。
W_INTENT, W_TRAFFIC, W_COMP = 3.0, 1.5, 1.2


def score_kw(intent, traffic, comp):
    return round(intent * W_INTENT + traffic * W_TRAFFIC - comp * W_COMP, 2)


def warehouse_beats(region, facts):
    """海外仓有/无的差异话术——'天然各不同'的一个点,且守铁律3不编仓。"""
    if region.get("warehouse"):
        return {
            "text": f"{region['name']}有自营海外仓，就近补货，{region['warehouse_eta']}到。",
            "kind": "selling", "feature": "loading", "hl": [region["name"], "海外仓"],
        }
    # 无仓地区:不编仓,改'中国站直发'真实话术
    return {
        "text": "工厂直接发货，不用先囤一仓库货压着钱。",
        "kind": "selling", "feature": "loading", "hl": ["工厂直接发货", "不用囤"],
    }


def skeleton_intake(region, facts, keyword):
    """进货意图骨架:三条路 + 第四条(mizan)。70%干货=三条真实路子+坑,30%营销=mizan。"""
    rn, bs = region["name"], facts["brand_short"]
    title = f"{rn}开店进货\n货源在哪进?"
    beats = [
        {"text": f"在{rn}开{region['store_types']}，货到底从哪进？", "kind": "contrast", "feature": "wall", "hl": [rn, "从哪进"]},
        {"text": "说白了就三条路，我挨个给你捋清楚。", "kind": "selling", "feature": "people", "hl": ["三条路"]},
        {"text": f"第一条，飞回中国，跑{region['market']}。", "kind": "selling", "feature": "loading", "hl": ["飞回中国"]},
        {"text": "货是全，可来回机票住宿、压一堆货，一趟下来累死还砸钱。", "kind": "contrast", "feature": "aisle", "hl": ["压一堆货", "砸钱"]},
        {"text": "第二条，本地华人进货群，拼海运。", "kind": "selling", "feature": "people", "hl": ["拼海运"]},
        {"text": "便宜是便宜，但起订量大、等船一个多月，品类还少。", "kind": "contrast", "feature": "loading", "hl": ["等船一个多月"]},
        {"text": "第三条，找货代代采，省心。", "kind": "selling", "feature": "people", "hl": ["货代代采"]},
        {"text": "可中间一层层加价，利润就薄了。", "kind": "contrast", "feature": "wall", "hl": ["层层加价"]},
        {"text": f"现在多了第四条，也是最省事的——{facts['channel']}。", "kind": "selling", "feature": "drone", "hl": [bs, "直接下单"]},
        {"text": f"{facts['sku']}货、{facts['price']}，{facts['moq']}，不用囤货。", "kind": "number", "feature": "wall",
         "hl": [facts["sku"], facts["moq"]], "num": {"to": 10, "unit": "万", "label": "SKU 工厂价", "decimals": 0}},
        warehouse_beats(region, facts),
        {"text": f"在{rn}开店进货，别再飞回国折腾了，认准{bs}。", "kind": "closing", "feature": "drone", "hl": [rn, bs]},
    ]
    seo_title = f"{rn}开店进货,货源到底在哪进?华人超市进货避坑"
    seo_tags = [f"{rn}百元店", "华人超市进货", "海外开店货源", f"{rn}华人", "mizan"]
    return title, [rn, "货源在哪进"], beats, seo_title, seo_tags


def skeleton_format(region, facts, keyword):
    """业态大词骨架:百元店还能做吗→转型升级→货源。与 intake 完全不同结构=一词一片各不同。"""
    rn, bs = region["name"], facts["brand_short"]
    title = f"{rn}百元店\n现在还能做吗?"
    beats = [
        {"text": f"{rn}的百元店、一欧店，现在还能做吗？", "kind": "contrast", "feature": "wall", "hl": [rn, "还能做吗"]},
        {"text": "实话说，纯靠低价拼的，越来越难了。", "kind": "contrast", "feature": "aisle", "hl": ["越来越难"]},
        {"text": "成本涨、利润薄，光便宜已经拼不过了。", "kind": "contrast", "feature": "wall", "hl": ["利润薄"]},
        {"text": "但我观察下来，转对方向的，反而活得更好。", "kind": "selling", "feature": "people", "hl": ["转对方向"]},
        {"text": "怎么转？往超市、专业店走——美容、饰品、数码这些。", "kind": "selling", "feature": "product", "hl": ["专业店"]},
        {"text": "品类升级，客单价上去，利润才稳得住。", "kind": "selling", "feature": "wall", "hl": ["品类升级"]},
        {"text": "可新问题来了：新品类的货，从哪进？", "kind": "contrast", "feature": "people", "hl": ["从哪进"]},
        {"text": "老路子是飞回国跑批发，累、压货、还慢。", "kind": "contrast", "feature": "loading", "hl": ["压货", "慢"]},
        {"text": f"现在更省的——{facts['channel']}。", "kind": "selling", "feature": "drone", "hl": [bs, "直接下单"]},
        {"text": f"{facts['sku']}货、{facts['price']}，{facts['moq']}，想试什么品类都能小批量上。", "kind": "number", "feature": "wall",
         "hl": [facts["sku"], "小批量"], "num": {"to": 10, "unit": "万", "label": "SKU 工厂价", "decimals": 0}},
        warehouse_beats(region, facts),
        {"text": f"在{rn}做店别死磕老路子，品类升级加源头进货，才有得赚。", "kind": "closing", "feature": "drone", "hl": [rn, "源头进货"]},
    ]
    seo_title = f"{rn}百元店还能做吗?转型超市+源头进货才有得赚"
    seo_tags = [f"{rn}百元店", f"{rn}华人超市", "海外开店", "百元店转型", "mizan"]
    return title, [rn, "还能做吗"], beats, seo_title, seo_tags


SKELETONS = {"intake": skeleton_intake, "format": skeleton_format}


def build_topic(cfg, region, tmpl, keyword):
    facts = cfg["product_facts"]
    title, title_hl, beats, seo_title, seo_tags = SKELETONS[tmpl[5]](region, facts, keyword)
    return {
        "industry": cfg["industry"],
        "brand": cfg["brand"],
        "watermark": cfg.get("watermark", "longka 制作"),
        "keyword": keyword,
        "title": title,
        "titleHl": title_hl,
        "seo_title": seo_title,
        "seo_tags": seo_tags,
        "beats": beats,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="seo_regions_mizan.json")
    ap.add_argument("--heat", help="可选:{关键词:笔记量} JSON,覆盖 traffic 先验")
    ap.add_argument("--top", type=int, default=4, help="每地区选前 N 个词出文案")
    ap.add_argument("--out-dir", default=".")
    args = ap.parse_args()

    cfg = json.load(open(args.config, encoding="utf-8"))
    heat = {}
    if args.heat and os.path.exists(args.heat):
        heat = json.load(open(args.heat, encoding="utf-8"))

    # 1. 词矩阵 + 打分
    candidates = []
    for region in cfg["regions"]:
        rn = region["name"]
        for tmpl in WORD_TEMPLATES:
            cat, pat, intent, traffic, comp, skel = tmpl
            kw = pat.format(region=rn)
            # heat 插槽:有真实笔记量则归一化覆盖 traffic 先验(0-5)
            traffic_eff = traffic
            heat_note = ""
            if kw in heat:
                notes = heat[kw]
                traffic_eff = min(5.0, notes / 200.0)  # 1000 笔记≈满分,粗归一
                heat_note = f"(真热度 {notes} 笔记)"
            s = score_kw(intent, traffic_eff, comp)
            candidates.append({
                "region": rn, "slug": region["slug"], "cat": cat, "skeleton": skel,
                "keyword": kw, "score": s, "intent": intent, "traffic": round(traffic_eff, 1),
                "comp": comp, "heat": heat_note, "tmpl": tmpl, "region_obj": region,
            })

    candidates.sort(key=lambda c: c["score"], reverse=True)

    # 2. 选词报告
    print(f"\n>> 行业「{cfg['industry']}」· {len(cfg['regions'])} 地区 × {len(WORD_TEMPLATES)} 词模板 = {len(candidates)} 候选词", flush=True)
    print(f"   排序权重: 意图×{W_INTENT} + 流量×{W_TRAFFIC} - 竞争×{W_COMP}" + ("  | 已注入真热度" if heat else "  | 用先验(未采热度)"), flush=True)
    print(f"\n{'排名':>3} {'分':>5} {'类别':<9} {'意图/流量/竞争':<13} 关键词", flush=True)
    for i, c in enumerate(candidates[:20]):
        print(f"{i+1:>3} {c['score']:>5} {c['cat']:<9} {c['intent']}/{c['traffic']}/{c['comp']:<7} {c['keyword']} {c['heat']}", flush=True)

    # 3. 每地区按结构(骨架)选词:同地区同骨架文案雷同 → 每骨架只留最高分的一条,top 控制出几种结构。
    #    这样一地区出的多条是"结构不同"(三条路 vs 转型),而非"换地名重复" → 守"一词一片各不同"。
    os.makedirs(args.out_dir, exist_ok=True)
    picked, written = [], []
    per_region = {}
    for c in candidates:  # 已按分降序
        rn = c["region"]
        per_region.setdefault(rn, {})
        if c["skeleton"] in per_region[rn]:
            continue  # 该地区该结构已有更高分词
        if len(per_region[rn]) >= args.top:
            continue
        per_region[rn][c["skeleton"]] = c

    for rn, by_skel in per_region.items():
        for c in by_skel.values():
            topic = build_topic(cfg, c["region_obj"], c["tmpl"], c["keyword"])
            fn = os.path.join(args.out_dir, f"topic_{c['slug']}_{c['skeleton']}.json")
            json.dump(topic, open(fn, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            written.append(os.path.basename(fn))
            picked.append({"region": rn, "keyword": c["keyword"], "cat": c["cat"],
                           "skeleton": c["skeleton"], "score": c["score"], "file": os.path.basename(fn)})

    json.dump({"weights": {"intent": W_INTENT, "traffic": W_TRAFFIC, "comp": W_COMP},
               "heat_injected": bool(heat), "candidates": candidates and [
                   {k: c[k] for k in ("region", "keyword", "cat", "score", "intent", "traffic", "comp")}
                   for c in candidates], "picked": picked},
              open(os.path.join(args.out_dir, "seo_picks.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    print(f"\n>> 选中 {len(picked)} 词 → 生成 {len(written)} 份文案(可直接喂 matcher.py):", flush=True)
    for w in written:
        print(f"   - {w}", flush=True)
    print(f">> 选词报告 → seo_picks.json", flush=True)
    print(f"\n下一步: 文案过质量门(dbs-ai-check+humanizer-zh)→ matcher.py 配镜头 → build_voice 配音 → 渲染", flush=True)


if __name__ == "__main__":
    main()
