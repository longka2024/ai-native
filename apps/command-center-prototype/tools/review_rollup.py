# -*- coding: utf-8 -*-
# 复盘聚合器 —— 把 longka_review 的发布数据,脚本聚合成固定 3 问的答案。
# 把"我觉得这条不错"变成"数据说这类被点开/被看完/被评论"。铁律4:脚本聚合,不靠 LLM 现场推理。
# spec: docs/specs/2026-06-26-content-system-completion-spec.md(Phase 3)
#
# 用法:
#   py -3.14 review_rollup.py --sample          # 用内置样例数据验证(无需DB)
#   py -3.14 review_rollup.py --dsn "$DATABASE_URL"   # 连 PG longka_review(122 上跑)
import argparse, json, sys
from collections import defaultdict

# 内置样例(验证聚合逻辑用;真实数据从 longka_review 来)
SAMPLE = [
    {"purpose": "expose",  "topic_type": "channel", "hook_style": "反常识", "duration_sec": 38, "views": 12000, "complete_rate": 0.62, "saves": 180, "comments": 95, "shares": 40},
    {"purpose": "collect", "topic_type": "channel", "hook_style": "清单",   "duration_sec": 55, "views": 7000,  "complete_rate": 0.71, "saves": 640, "comments": 30, "shares": 22},
    {"purpose": "comment", "topic_type": "price",   "hook_style": "提问",   "duration_sec": 32, "views": 9000,  "complete_rate": 0.58, "saves": 90,  "comments": 410, "shares": 60},
    {"purpose": "convert", "topic_type": "price",   "hook_style": "痛点",   "duration_sec": 45, "views": 5000,  "complete_rate": 0.66, "saves": 120, "comments": 50, "shares": 18},
    {"purpose": "persona", "topic_type": "profit",  "hook_style": "过来人", "duration_sec": 60, "views": 8000,  "complete_rate": 0.69, "saves": 210, "comments": 140, "shares": 75},
    {"purpose": "expose",  "topic_type": "price",   "hook_style": "反常识", "duration_sec": 35, "views": 15000, "complete_rate": 0.64, "saves": 160, "comments": 110, "shares": 55},
    {"purpose": "collect", "topic_type": "selection","hook_style": "清单",  "duration_sec": 52, "views": 6500,  "complete_rate": 0.73, "saves": 720, "comments": 28, "shares": 19},
    {"purpose": "comment", "topic_type": "channel", "hook_style": "提问",   "duration_sec": 30, "views": 8500,  "complete_rate": 0.55, "saves": 80,  "comments": 380, "shares": 66},
]


def _avg(rows, key):
    vals = [r[key] for r in rows if r.get(key) is not None]
    return sum(vals) / len(vals) if vals else 0.0


def _rate(rows, num_keys):
    # (Σ num) / (Σ views) —— 互动率口径
    v = sum(r.get("views", 0) for r in rows) or 1
    n = sum(sum(r.get(k, 0) for k in num_keys) for r in rows)
    return n / v


def group(rows, key):
    g = defaultdict(list)
    for r in rows:
        g[r.get(key, "?")].append(r)
    return g


def rollup(rows):
    # Q1 哪类"选题/目的"更容易被点开(用 views 当点开量代理,按 topic_type×purpose)
    q1 = sorted(((k, round(_avg(v, "views")), len(v)) for k, v in group(rows, "topic_type").items()),
                key=lambda x: -x[1])
    q1p = sorted(((k, round(_avg(v, "views")), len(v)) for k, v in group(rows, "purpose").items()),
                 key=lambda x: -x[1])
    # Q2 哪类"结构/开头"更容易被看完(完播率,按 hook_style)
    q2 = sorted(((k, round(_avg(v, "complete_rate"), 3), len(v)) for k, v in group(rows, "hook_style").items()),
                key=lambda x: -x[1])
    # Q3 哪类"观点/目的"更容易引评论收藏(互动率,按 purpose)
    q3 = sorted(((k, round(_rate(v, ["comments", "saves"]), 4), len(v)) for k, v in group(rows, "purpose").items()),
                key=lambda x: -x[1])
    return q1, q1p, q2, q3


def label_purpose(p):
    return {"expose": "曝光型", "collect": "收藏型", "comment": "评论型",
            "convert": "转化型", "persona": "人设型"}.get(p, p)


def report(rows):
    if not rows:
        print(">> longka_review 没有数据,先发几条再复盘。"); return
    q1, q1p, q2, q3 = rollup(rows)
    print(f"\n== 复盘固定3问(基于 {len(rows)} 条发布数据)==\n")
    print("① 哪类更容易被【点开】(均播放量):")
    print("   按选题类型:", " > ".join(f"{k}{v}" for k, v, _ in q1[:3]))
    print("   按传播目的:", " > ".join(f"{label_purpose(k)}{v}" for k, v, _ in q1p[:3]))
    print("\n② 哪类更容易被【看完】(完播率):")
    print("   按开头方式:", " > ".join(f"{k}{int(v*100)}%" for k, v, _ in q2[:3]))
    print("\n③ 哪类更容易引【评论+收藏】(互动率=(评论+收藏)/播放):")
    print("   按传播目的:", " > ".join(f"{label_purpose(k)}{round(v*100,2)}%" for k, v, _ in q3[:3]))
    # 下一轮建议(脚本规则,不靠LLM)
    best_open = q1p[0][0] if q1p else None
    best_finish = q2[0][0] if q2 else None
    best_engage = q3[0][0] if q3 else None
    print("\n>> 下一轮建议:")
    if best_open:   print(f"   · 拉曝光多做「{label_purpose(best_open)}」")
    if best_finish: print(f"   · 想完播,开头用「{best_finish}」")
    if best_engage: print(f"   · 想评论收藏,多做「{label_purpose(best_engage)}」")


def load_from_pg(dsn):
    import psycopg
    rows = []
    with psycopg.connect(dsn) as conn:
        for r in conn.execute("""select purpose,topic_type,hook_style,duration_sec,views,
                                 complete_rate,saves,comments,shares from longka_review"""):
            rows.append(dict(zip(["purpose", "topic_type", "hook_style", "duration_sec", "views",
                                  "complete_rate", "saves", "comments", "shares"], r)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dsn", help="PG DSN(DATABASE_URL);连 longka_review")
    ap.add_argument("--sample", action="store_true", help="用内置样例数据验证")
    args = ap.parse_args()
    if args.sample:
        report(SAMPLE)
    elif args.dsn:
        report(load_from_pg(args.dsn))
    else:
        print("需 --sample 或 --dsn。", file=sys.stderr); sys.exit(1)


if __name__ == "__main__":
    main()
