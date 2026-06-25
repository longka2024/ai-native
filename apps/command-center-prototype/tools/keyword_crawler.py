# -*- coding: utf-8 -*-
# 关键词洞察层·第一层(免费·零风险):百度搜索下拉词扩词 → 真实搜索意图地图。
# 把"我拍脑袋编的先验词"换成"真实用户联想词"。诚实边界:sug 只给"有没有人这么搜+意图类型",
# 不给"多少人搜"(搜索量/竞争度=下一层 MediaCrawlerPro 笔记量 / 指数,本期不编量)。
# 铁律:免费(无 API)·零风险(公开 sug 接口,非高危笔记采集)·脚本判意图(确定性,不靠 LLM)。
# spec: docs/specs/2026-06-24-content-factory-pipeline-spec.md(阶段2.5)
#
# 用法: py -3.14 keyword_crawler.py --config seo_regions_mizan.json --depth 1 --out keywords_baidu.json
import urllib.request, urllib.parse, json, time, argparse, os

BAIDU_SUG = "https://www.baidu.com/sugrec?prod=pc&wd="

# 种子词模板(地区 × 业态)——每个种子去百度拿真实联想词
SEED_TMPL = ["{r}华人超市", "{r}百元店", "{r}百货", "{r}超市进货", "{r}开店进货", "{r}华人超市进货"]

# 意图分类(脚本规则,确定性)
TXN = ["进货", "货源", "批发", "代购", "代采", "拿货", "怎么开", "开店", "加盟", "供应链",
       "厂家", "一手", "档口", "进货渠道", "进货群", "采购", "拿什么货", "卖什么"]   # 交易意图·最值钱
INFO = ["在哪", "有哪些", "怎么样", "现状", "叫什么", "是什么", "攻略", "经验",
        "多少钱", "贵不贵", "好做吗", "能做吗", "利润", "赚钱"]                       # 信息意图·中
NOISE = ["招聘", "求职", "工作", "薪", "事件", "打架", "被抢", "抢劫", "新闻", "论坛",
         "分类信息", "律师", "欧浪", "快报", "王常德", "签证", "机票", "定居", "移民",
         "治安", "枪", "遇害", "车祸", "命案", "罢工", "服务工作", "女服务"]          # 噪音·剔除

INTENT_SCORE = {"transaction": 5, "info": 3, "other": 2}


def sug(word):
    url = BAIDU_SUG + urllib.parse.quote(word)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        raw = urllib.request.urlopen(req, timeout=8).read().decode("utf-8", "ignore")
        data = json.loads(raw)
        return [g.get("q", "") for g in data.get("g", []) if g.get("q")]
    except Exception as e:
        print(f"   ! sug 失败 [{word}]: {e}", flush=True)
        return []


def classify(kw):
    if any(n in kw for n in NOISE):
        return "noise"
    if any(t in kw for t in TXN):
        return "transaction"
    if any(i in kw for i in INFO):
        return "info"
    return "other"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="seo_regions_mizan.json")
    ap.add_argument("--depth", type=int, default=1, help="1=种子扩一层;2=对交易词再扩一层(更多长尾,更多请求)")
    ap.add_argument("--out", default="keywords_baidu.json")
    args = ap.parse_args()

    cfg = json.load(open(args.config, encoding="utf-8"))
    regions = [r["name"] for r in cfg["regions"]]

    by_region = {}
    all_rows = []
    print(f">> 百度 sug 扩词 · {len(regions)} 地区 × {len(SEED_TMPL)} 种子 · depth={args.depth}\n", flush=True)

    for rn in regions:
        found = {}  # kw -> {type, seed}
        seeds = [t.format(r=rn) for t in SEED_TMPL]
        for seed in seeds:
            for kw in sug(seed):
                if kw not in found:
                    t = classify(kw)
                    if t != "noise":
                        found[kw] = {"type": t, "seed": seed}
            time.sleep(0.3)
        # depth 2:对交易意图词再扩一层(挖长尾)
        if args.depth >= 2:
            for kw, meta in list(found.items()):
                if meta["type"] == "transaction":
                    for kw2 in sug(kw):
                        if kw2 not in found:
                            t = classify(kw2)
                            if t != "noise":
                                found[kw2] = {"type": t, "seed": kw}
                    time.sleep(0.3)

        rows = []
        for kw, meta in found.items():
            rows.append({"keyword": kw, "intent": meta["type"],
                         "score": INTENT_SCORE[meta["type"]], "seed": meta["seed"]})
        rows.sort(key=lambda x: (-x["score"], x["keyword"]))
        txn = [r for r in rows if r["intent"] == "transaction"]
        info = [r for r in rows if r["intent"] == "info"]
        by_region[rn] = {"transaction": txn, "info": info,
                         "other": [r for r in rows if r["intent"] == "other"]}
        all_rows.extend([{**r, "region": rn} for r in rows])

        print(f"【{rn}】交易意图 {len(txn)} · 信息意图 {len(info)} · 其他 {len(by_region[rn]['other'])}", flush=True)
        for r in txn[:8]:
            print(f"   🎯 {r['keyword']}", flush=True)
        for r in info[:3]:
            print(f"   ·  {r['keyword']}", flush=True)
        print("", flush=True)

    all_rows.sort(key=lambda x: (-x["score"], x["region"]))
    out = {"industry": cfg["industry"], "source": "baidu_sug",
           "note": "意图来自真实联想词;无搜索量(量待 MediaCrawler/指数层)",
           "by_region": by_region, "all": all_rows}
    json.dump(out, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    txn_total = sum(len(v["transaction"]) for v in by_region.values())
    print(f">> 共扩出 {len(all_rows)} 真实词(交易意图 {txn_total} 个最值钱)→ {args.out}", flush=True)
    print(">> 下一步:交易意图词喂 seo_keyword_miner 生成 70/30 文案;量化热度待 MediaCrawler 层", flush=True)


if __name__ == "__main__":
    main()
