# -*- coding: utf-8 -*-
# 脚本框架库 —— 关键词桶 → 对应回答框架。"一词一片各不同"的来源:问题类型不同,回答方式就不同。
# 铁律3:框架用"结构性真话"(价差来自中间层级 等),绝不编具体数字/品类;选品类真实料留占位待来源。
# 被 build_scripts.py import。spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md(阶段2.5)

# ── 关键词分桶规则(顺序敏感:price/profit/selection 先判,channel 兜底)──
BUCKET_RULES = [
    ("price",     ["多少钱", "价格", "进货价", "价多少", "价格表", "贵不贵"]),
    ("profit",    ["赚钱", "赚多少", "利润", "一年赚", "挣", "能赚"]),
    ("selection", ["卖什么", "好卖", "畅销", "选品", "什么货好", "进什么"]),
    ("channel",   ["在哪进", "进货渠道", "批发市场", "货源", "拿货", "怎么进", "哪里进",
                   "进货流程", "进货要求", "怎么开", "开店要", "进货群", "代购", "代采", "批发商", "进货"]),
]


def bucket_of(kw):
    for b, kws in BUCKET_RULES:
        if any(k in kw for k in kws):
            return b
    return None


def warehouse_beats(region, facts):
    """海外仓有/无差异话术——守铁律3:无仓地区不编仓。"""
    if region.get("warehouse"):
        return {"text": f"{region['name']}有自营海外仓，就近补货，{region['warehouse_eta']}到。",
                "kind": "selling", "feature": "loading", "hl": [region["name"], "海外仓"]}
    return {"text": "工厂直接发货，不用先囤一仓库货压着钱。",
            "kind": "selling", "feature": "loading", "hl": ["工厂直接发货", "不用囤"]}


def _sku_beat(facts, tail):
    """十万 SKU 数字拍(mizan 真实事实,可用)。tail = 该框架的落点句尾。"""
    return {"text": f"{facts['sku']}货、{facts['price']}，{facts['moq']}，{tail}", "kind": "number",
            "feature": "wall", "hl": [facts["sku"], facts["moq"]],
            "num": {"to": 10, "unit": "万", "label": "SKU 工厂价", "decimals": 0}}


# ── 框架1:盘渠道(三条路)· bucket=channel · persona P1/P3 ──
def frame_channel(region, facts, keyword):
    rn, bs = region["name"], facts["brand_short"]
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
        _sku_beat(facts, "不用囤货。"),
        warehouse_beats(region, facts),
        {"text": f"在{rn}进货，别再飞回国折腾了，认准{bs}。", "kind": "closing", "feature": "drone", "hl": [rn, bs]},
    ]
    return (f"{rn}开店进货\n货源在哪进?", [rn, "货源在哪进"], beats,
            f"{rn}开店进货,货源到底在哪进?华人超市进货避坑",
            [f"{rn}百元店", "华人超市进货", "海外开店货源", f"{rn}华人", "mizan"])


# ── 框架2:揭价格 · bucket=price · persona P1/P3 ──
def frame_price(region, facts, keyword):
    rn, bs = region["name"], facts["brand_short"]
    beats = [
        {"text": f"在{rn}开超市，进货到底要多少钱？", "kind": "contrast", "feature": "wall", "hl": [rn, "多少钱"]},
        {"text": "这么说吧——同样一批货，你可能比同行多掏一半。", "kind": "contrast", "feature": "aisle", "hl": ["多掏一半"]},
        {"text": "差就差在，你走的是第几手货。", "kind": "selling", "feature": "people", "hl": ["第几手"]},
        {"text": "飞回国自己跑批发，机票住宿压货全摊进成本。", "kind": "contrast", "feature": "loading", "hl": ["全摊进成本"]},
        {"text": "拼海运是便宜，可起订量大、还得压一个多月。", "kind": "contrast", "feature": "loading", "hl": ["压一个多月"]},
        {"text": "找货代省心，但中间一层层加价。", "kind": "contrast", "feature": "wall", "hl": ["层层加价"]},
        {"text": "每多过一道手，你的进货价就贵一截。", "kind": "contrast", "feature": "aisle", "hl": ["贵一截"]},
        {"text": "真正便宜的，是直接拿到工厂价。", "kind": "selling", "feature": "wall", "hl": ["工厂价"]},
        {"text": f"现在用{bs}，中国站工厂价直接下单。", "kind": "selling", "feature": "drone", "hl": [bs, "工厂价"]},
        _sku_beat(facts, "中间那几层全省了。"),
        warehouse_beats(region, facts),
        {"text": f"在{rn}进货别再当冤大头，工厂价直供才是底价。", "kind": "closing", "feature": "drone", "hl": [rn, "工厂价直供"]},
    ]
    return (f"{rn}进货多少钱?\n同行可能多掏一半", [rn, "多掏一半"], beats,
            f"{rn}华人超市进货多少钱?工厂价直供才是底价",
            [f"{rn}华人超市", "进货多少钱", "工厂价进货", f"{rn}华人", "mizan"])


# ── 框架3:选品 · bucket=selection · persona P2 ── 真实料(具体品类/利润)留占位,不编 ──
def frame_selection(region, facts, keyword):
    rn, bs = region["name"], facts["brand_short"]
    beats = [
        {"text": f"在{rn}开店，到底进什么货好卖？", "kind": "contrast", "feature": "wall", "hl": [rn, "什么货好卖"]},
        {"text": "进错货，等于压一仓库卖不动——这是新手最容易踩的坑。", "kind": "contrast", "feature": "aisle", "hl": ["压一仓库", "踩的坑"]},
        {"text": "选品有个原则：跟着当地刚需走，别凭自己喜好。", "kind": "selling", "feature": "people", "hl": ["当地刚需"]},
        # === 真实料占位:此处需 mizan / 评论深挖提供「{rn}华人超市真实热销品类 + 利润」,绝不编 ===
        {"text": "__REAL_DATA__热销品类(待真实料)", "kind": "selling", "feature": "product", "hl": [], "_placeholder": "real_selection"},
        {"text": "与其赌大批量，不如小批量多试几款，卖得动再补。", "kind": "selling", "feature": "wall", "hl": ["小批量", "多试几款"]},
        {"text": f"这恰恰是{bs}的好处——{facts['sku']}货，{facts['moq']}。", "kind": "selling", "feature": "drone", "hl": [bs, facts["moq"]]},
        _sku_beat(facts, "想试什么品类先进几件试水。"),
        warehouse_beats(region, facts),
        {"text": f"在{rn}选品不靠赌、靠小批量试，{bs}让你试错成本最低。", "kind": "closing", "feature": "drone", "hl": [rn, "试错成本最低"]},
    ]
    return (f"{rn}开店\n进什么货好卖?", [rn, "什么货好卖"], beats,
            f"{rn}华人超市进什么货好卖?选品避坑+小批量试错",
            [f"{rn}华人超市", "进什么货好卖", "选品避坑", f"{rn}开店", "mizan"])


# ── 框架4:算账 · bucket=profit · persona P4 ──
def frame_profit(region, facts, keyword):
    rn, bs = region["name"], facts["brand_short"]
    beats = [
        {"text": f"在{rn}开华人超市，到底赚不赚钱？", "kind": "contrast", "feature": "wall", "hl": [rn, "赚不赚钱"]},
        {"text": "我给你算笔账，你就明白钱从哪来。", "kind": "selling", "feature": "people", "hl": ["算笔账"]},
        {"text": "开店赚的钱，等于售价减成本，成本大头是进货。", "kind": "selling", "feature": "aisle", "hl": ["成本大头是进货"]},
        {"text": "房租人工是死的，真正能动的，是进货成本。", "kind": "contrast", "feature": "wall", "hl": ["进货成本"]},
        {"text": "进货每便宜一成，利润就厚一成。", "kind": "selling", "feature": "wall", "hl": ["便宜一成", "厚一成"]},
        {"text": "所以会做生意的，都在死磕进货价。", "kind": "selling", "feature": "people", "hl": ["死磕进货价"]},
        {"text": "怎么压？砍掉中间商，直接拿工厂价。", "kind": "selling", "feature": "wall", "hl": ["砍掉中间商"]},
        {"text": f"现在用{bs}，中国站工厂价直接下单。", "kind": "selling", "feature": "drone", "hl": [bs, "工厂价"]},
        _sku_beat(facts, "进货成本一压,利润就出来了。"),
        warehouse_beats(region, facts),
        {"text": f"在{rn}开店想多赚，先把进货成本打下来，这才是真功夫。", "kind": "closing", "feature": "drone", "hl": [rn, "进货成本打下来"]},
    ]
    return (f"{rn}开超市\n到底赚不赚钱?", [rn, "赚不赚钱"], beats,
            f"{rn}开华人超市赚钱吗?算笔账:利润在进货成本",
            [f"{rn}华人超市", "开超市赚钱吗", "海外开店利润", f"{rn}华人", "mizan"])


FRAMES = {"channel": frame_channel, "price": frame_price,
          "selection": frame_selection, "profit": frame_profit}
