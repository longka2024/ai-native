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


# ── 框架5:答顾虑(快问快答)· bucket=concern · persona P1/P3 · 料来自小红书评论真实7问 ──
# 评论原话:价格真吗/质量怎样/能不能混装/运费怎么算/多久到/有没有现货/海外仓有库存吗。
# 铁律3:能用事实卡答的(工厂价/一件起订/海外仓)直接答;答不了的(质量保障/运费/现货机制)留占位,绝不编。
def frame_concern(region, facts, keyword):
    rn, bs = region["name"], facts["brand_short"]
    beats = [
        {"text": f"想从中国直采，又怕踩坑？{rn}的老板下单前最常问这几个，今天一次说清。", "kind": "contrast", "feature": "wall", "hl": [rn, "怕踩坑"]},
        {"text": "第一个，价格是真的吗？——平台基本都是工厂出厂价，没有中间商再加一手。", "kind": "selling", "feature": "wall", "hl": ["工厂出厂价", "没有中间商"]},
        {"text": f"第二个，能不能少量混着拿？——八成的货{facts['moq']}，不同品类凑一单完全可以。", "kind": "selling", "feature": "aisle", "hl": [facts["moq"], "凑一单"]},
        # 真实料占位:质量保障机制——需 mizan 提供真实答案,绝不编
        {"text": "__REAL_DATA__质量怎么保障(待 mizan 真实答案)", "kind": "selling", "feature": "product", "hl": [], "_placeholder": "concern_quality"},
        # 真实料占位:运费算法——需 mizan 提供
        {"text": "__REAL_DATA__运费怎么算(待 mizan 真实答案)", "kind": "selling", "feature": "loading", "hl": [], "_placeholder": "concern_shipping"},
        {"text": "再就是，多久能到、补货快不快？", "kind": "contrast", "feature": "people", "hl": ["多久到"]},
        warehouse_beats(region, facts),
        # 真实料占位:现货/库存查询机制——需 mizan 提供
        {"text": "__REAL_DATA__有没有现货、库存怎么看(待 mizan 真实答案)", "kind": "selling", "feature": "wall", "hl": [], "_placeholder": "concern_stock"},
        {"text": "说到底，大家最担心的还是第一次合作。", "kind": "selling", "feature": "people", "hl": ["第一次合作"]},
        {"text": "很多老板来义乌展厅，第一句都是：中国直采跟当地拿货，差这么大。", "kind": "contrast", "feature": "wall", "hl": ["差这么大"]},
        {"text": f"{rn}的老板，别光听我说，应用商店搜「{bs}」，自己上去看价。", "kind": "closing", "feature": "drone", "hl": [rn, bs]},
    ]
    return (f"{rn}直采\n你担心的几个问题", [rn, "担心的问题"], beats,
            f"{rn}华人超市从中国直采靠谱吗?价格质量运费现货一次说清",
            [f"{rn}华人超市", "中国直采", "进货避坑", f"{rn}华人", "mizan"])


# ── 框架6:店主真实故事(第一人称·身份代入)· bucket=story · persona P1/P3 ──
# 料来自客户真实故事(事实卡 sec5:以前年年飞回国采购→现手机下单→省几次往返+落地成本低两成)。
# 想更强=用一个真实客户的具体故事(店名/年数/省了多少),向 mizan 索取后替换。
def frame_story(region, facts, keyword):
    rn, bs = region["name"], facts["brand_short"]
    beats = [
        {"text": f"在{rn}开店这些年，我进货的方式，完全变了。", "kind": "contrast", "feature": "people", "hl": [rn, "完全变了"]},
        {"text": "头几年，我每年都得飞回中国一趟，跑义乌、广州选货。", "kind": "selling", "feature": "loading", "hl": ["飞回中国"]},
        {"text": "机票酒店、住好几天，还得一件件自己挑，人累钱也花。", "kind": "contrast", "feature": "aisle", "hl": ["人累钱也花"]},
        {"text": "最怕的是，挑回来的货不一定好卖，压一仓库动不了。", "kind": "contrast", "feature": "wall", "hl": ["压一仓库"]},
        {"text": f"后来才知道，现在手机上就能直采——一个{bs}，中国站工厂价下单。", "kind": "selling", "feature": "drone", "hl": [bs, "工厂价"]},
        _sku_beat(facts, "想试什么先进几件。"),
        warehouse_beats(region, facts),
        {"text": "现在我一年能少飞好几趟，省下的时间精力，全用在守店上。", "kind": "selling", "feature": "people", "hl": ["少飞好几趟"]},
        {"text": "落地成本还比以前当地拿货，低了两成多。", "kind": "number", "feature": "wall", "hl": ["低了两成多"]},
        {"text": f"在{rn}开店的老乡，别再年年飞回国折腾了，手机搜「{bs}」，试一单就知道。", "kind": "closing", "feature": "drone", "hl": [rn, bs]},
    ]
    return (f"{rn}开店\n我进货方式变了", [rn, "进货方式变了"], beats,
            f"{rn}华人超市老板自述:从年年飞回国进货到手机直采省两成",
            [f"{rn}华人超市", "海外开店", "进货经历", f"{rn}华人", "mizan"])


FRAMES = {"channel": frame_channel, "price": frame_price,
          "selection": frame_selection, "profit": frame_profit,
          "concern": frame_concern, "story": frame_story}


# ── 5 传播目的(正交维:同一框架 × 不同目的 → 话题相同、目的不同)──
# 借自对标案例《用 Codex 做视频二创》。换"钩子开头 + 结尾CTA + 主指标",中段框架论证不变。
# 让批量 N 条不只话题不同,还目的不同、各有 KPI 意图。spec: 2026-06-26-content-system-completion-spec.md
def _hook(text, feature, hl): return {"text": text, "kind": "contrast", "feature": feature, "hl": hl}
def _cta(text, feature, hl):  return {"text": text, "kind": "closing",  "feature": feature, "hl": hl}

PURPOSES = {
    "expose":  {"label": "曝光型", "kpi": "完播率",
                "hook": lambda rn, bs: _hook(f"在{rn}开店进货，第一条路十个人九个走错。", "wall", ["走错"]),
                "cta":  lambda rn, bs: _cta(f"想少踩坑，看完这条——货源认准{bs}。", "drone", [bs])},
    "collect": {"label": "收藏型", "kpi": "收藏率",
                "hook": lambda rn, bs: _hook(f"在{rn}开店进货的几条路，我给你列清楚，建议先收藏。", "wall", [rn, "建议收藏"]),
                "cta":  lambda rn, bs: _cta(f"存下来，进货时照着挑，认准{bs}。", "drone", ["照着挑", bs])},
    "comment": {"label": "评论型", "kpi": "评论率",
                "hook": lambda rn, bs: _hook(f"在{rn}开店，你是飞回国进货，还是拼海运？", "people", [rn, "还是"]),
                "cta":  lambda rn, bs: _cta(f"你走的是哪条路？评论区聊聊，看看{bs}帮不帮得上。", "people", ["评论区", bs])},
    "convert": {"label": "转化型", "kpi": "线索转化",
                "hook": lambda rn, bs: _hook(f"在{rn}开店进货成本压不下来？问题出在你走第几手货。", "wall", [rn, "第几手货"]),
                "cta":  lambda rn, bs: _cta(f"工厂价、一件起订、就近海外仓——认准{bs}。", "drone", [bs, "工厂价"])},
    "persona": {"label": "人设型", "kpi": "关注转化",
                "hook": lambda rn, bs: _hook(f"在海外开店这些年，{rn}进货踩过的坑，今天一次说清。", "people", ["踩过的坑"]),
                "cta":  lambda rn, bs: _cta(f"做海外生意少走弯路，关注我；货源认准{bs}。", "drone", ["关注我", bs])},
}


def apply_purpose(beats, purpose, region, facts):
    """换钩子开头 + 结尾CTA,中段框架论证不变;返回新 beats(不改原列表)。未知 purpose 原样返回。"""
    p = PURPOSES.get(purpose)
    if not p or len(beats) < 3:
        return list(beats)
    rn, bs = region["name"], facts["brand_short"]
    return [p["hook"](rn, bs)] + list(beats[1:-1]) + [p["cta"](rn, bs)]
