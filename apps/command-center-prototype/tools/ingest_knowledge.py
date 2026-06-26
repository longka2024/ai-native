# -*- coding: utf-8 -*-
# 知识库入库器 —— 把权威资料(招生白皮书等 HTML)脚本拆成"知识卡"(带年级/类别/来源标签)。
# 私校线第6步「二次改写」按选题检索这些卡、注入真实知识点(铁律3:只用原文、可追溯、绝不编)。
# spec: docs/specs/2026-06-26-private-school-knowledge-base-spec.md
#
# 用法: py -3.14 ingest_knowledge.py --html "<白皮书.html>" --school "圣乔治" --workspace 私校留学 --out knowledge_stgeorges.json
import re, json, argparse, hashlib

# 类别判定(顺序敏感:先判内部洞察/常见错误,再判评估)
CATEGORY_RULES = [
    ("内部洞察", ["招生官", "洞察", "insight", "wait pool", "候补", "真正看", "官网", "competition", "金字塔", "魔力"]),
    ("常见错误", ["常见错误", "忽略", "错误", "不适合", "被拒", "劣势"]),
    ("名额竞争", ["名额", "spaces", "竞争程度", "竞争", "录取率", "offer"]),
    ("时间轴",   ["时间轴", "timeline", "截止", "deadline", "early", "申请开放", "wave"]),
    ("评估",     ["assessment", "评估", "ssat", "面试", "interview", "group", "academic", "六维"]),
    ("准备建议", ["准备重点", "准备方向", "checklist", "清单", "建议", "tip", "何时开始", "最晚开始"]),
    ("学校概况", ["history", "历史", "理念", "特色", "why", "overview", "毕业", "适合", "boarding", "house", "leadership", "athletics", "arts"]),
]
GRADE_RULES = [
    ("KG",  ["kindergarten", "jk/k", "(jk", "幼儿园", "孩子4岁", "孩子3岁"]),
    ("G4",  ["grade 4", "grade4", "gr 4", "gr4"]),
    ("G6",  ["grade 6", "gr 6", "grade6"]),
    ("G8",  ["grade 8", "gr 8", "grade8"]),
    ("G9",  ["grade 9", "gr 9", "grade9"]),
    ("G11", ["grade 10", "grade 11", "grade 12", "gr 10", "gr 11"]),
]


def clean(s):
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&[a-z]+;", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def detect(text, rules, default):
    low = text.lower()
    for tag, kws in rules:
        if any(k in low for k in kws):
            return tag
    return default


def extract_tags(text):
    # 抽中文/英文关键词锚点(供检索匹配选题)
    tags = set()
    for kw in ["圣乔治", "St. George", "SGS", "男校", "寄宿", "Boarding", "SSAT", "Group Assessment",
               "面试", "Interview", "推荐信", "Wait Pool", "招生官", "名额", "时间", "财务援助", "Financial Aid",
               "Kindergarten", "Grade 4", "Grade 6", "Grade 8", "Grade 9", "领导力", "体育", "毕业去向"]:
        if kw.lower() in text.lower():
            tags.add(kw)
    return sorted(tags)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", required=True)
    ap.add_argument("--school", required=True)
    ap.add_argument("--workspace", default="私校留学")
    ap.add_argument("--out", default="knowledge.json")
    ap.add_argument("--min-len", type=int, default=24, help="知识点最短字数(过滤空段)")
    args = ap.parse_args()

    html = open(args.html, encoding="utf-8", errors="ignore").read()
    html = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)

    # 按 h2/h3/h4 标题切段:每个标题 + 其后内容(到下一标题)= 一张卡的原料
    heads = list(re.finditer(r"<h([234])[^>]*>(.*?)</h\1>", html, flags=re.S | re.I))
    cards, seen = [], set()
    cur_part = ""
    for i, m in enumerate(heads):
        title = clean(m.group(2))
        body_raw = html[m.end(): heads[i + 1].start() if i + 1 < len(heads) else len(html)]
        # 记住所属 Part(source 用)
        if re.match(r"Part\s*\d", title, re.I) or "认识" in title or "全图解" in title:
            cur_part = title[:40]
        body = clean(body_raw)
        if not title or title.lower().startswith(("contents", "目录")):
            continue
        point = (title + " — " + body) if body and body[:20] != title[:20] else (title + " " + body)
        point = point.strip(" —").strip()
        if len(point) < args.min_len:
            continue
        point = point[:420]  # 控长,保持知识点紧凑
        key = hashlib.md5(point[:80].encode("utf-8")).hexdigest()[:10]
        if key in seen:
            continue
        seen.add(key)
        scope = title + " " + body[:300]
        cards.append({
            "id": f"{args.school}_{key}",
            "workspace": args.workspace,
            "school": args.school,
            "grade": detect(scope, GRADE_RULES, "通用"),
            "category": detect(scope, CATEGORY_RULES, "学校概况"),
            "point": point,
            "tags": extract_tags(scope),
            "source": cur_part or "白皮书",
        })

    json.dump(cards, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    from collections import Counter
    print(f">> 拆出 {len(cards)} 张知识卡 → {args.out}")
    print(">> 年级分布:", dict(Counter(c["grade"] for c in cards)))
    print(">> 类别分布:", dict(Counter(c["category"] for c in cards)))


if __name__ == "__main__":
    main()
