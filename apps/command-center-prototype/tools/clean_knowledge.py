# -*- coding: utf-8 -*-
# 知识卡洗炼器 —— 把白皮书 HTML 按 Part 分块喂 DeepSeek,洗成干净原子知识卡(准标签、删噪音、不编)。
# 铁律3:只用原文事实,绝不编造。spec: docs/specs/2026-06-26-private-school-knowledge-base-spec.md
#
# 用法: DEEPSEEK_API_KEY=... py -3.14 clean_knowledge.py --html "<白皮书.html>" --school 圣乔治 --workspace 私校留学 --out knowledge_stgeorges.json
import re, json, os, argparse, urllib.request, hashlib, time

API = "https://api.deepseek.com/chat/completions"
MODEL = os.environ.get("COPY_DRAFT_MODEL", "deepseek-v4-flash")

SYS = """你是私校招生知识整理员。把给你的招生白皮书片段,洗成一组干净的"原子知识卡"。
严格要求:
1. 只用原文事实,绝不编造、不推测、不夸大;原文没有的不写。
2. 删掉页码、章节大标题、导航目录这类非知识噪音。
3. 每张卡 = 一个独立自洽、可直接引用的知识点(一两句话)。把"标题+列表"拆成多张原子卡。
4. 每张卡输出字段:
   - grade: 该知识点针对哪个年级,从 [KG,G4,G6,G8,G9,G11,通用] 选(泛用=通用)。
   - category: 从 [学校概况,名额竞争,时间轴,评估,内部洞察,常见错误,准备建议] 选。
   - point: 知识点正文(中文,自洽,含具体数字/名称就保留)。
   - tags: 2-5 个中文关键词(供按选题检索)。
只输出 JSON 数组,不要任何解释。"""


def clean(s):
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"&[a-z]+;", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def call_deepseek(key, chunk):
    body = json.dumps({
        "model": MODEL, "temperature": 0.2,
        "messages": [{"role": "system", "content": SYS},
                     {"role": "user", "content": chunk}],
    }, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(API, data=body, method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.loads(r.read())["choices"][0]["message"]["content"]
    m = re.search(r"\[.*\]", out, re.S)
    return json.loads(m.group(0)) if m else []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html", required=True)
    ap.add_argument("--school", required=True)
    ap.add_argument("--workspace", default="私校留学")
    ap.add_argument("--out", default="knowledge.json")
    args = ap.parse_args()
    key = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("AIGOCODE_API_KEY")
    if not key:
        raise SystemExit("缺 DEEPSEEK_API_KEY")

    txt = clean(open(args.html, encoding="utf-8", errors="ignore").read())
    # 按 Part 分块(每块 ~2000 字,DeepSeek 一次洗一块)
    parts = re.split(r"(?=Part\s*\d\s*·)", txt)
    chunks = [p for p in parts if len(p) > 60] or [txt]
    print(f">> 白皮书分 {len(chunks)} 块,逐块喂 DeepSeek({MODEL})洗卡...", flush=True)

    cards, seen = [], set()
    for i, ch in enumerate(chunks, 1):
        try:
            raw = call_deepseek(key, ch[:6000])
        except Exception as e:
            print(f"   块{i} 失败: {str(e)[:80]}", flush=True); continue
        for c in raw:
            pt = (c.get("point") or "").strip()
            if len(pt) < 16:
                continue
            k = hashlib.md5(pt[:60].encode("utf-8")).hexdigest()[:10]
            if k in seen:
                continue
            seen.add(k)
            cards.append({"id": f"{args.school}_{k}", "workspace": args.workspace, "school": args.school,
                          "grade": c.get("grade", "通用"), "category": c.get("category", "学校概况"),
                          "point": pt, "tags": c.get("tags", []), "source": f"{args.school}白皮书"})
        print(f"   块{i}/{len(chunks)} → 累计 {len(cards)} 卡", flush=True)
        time.sleep(0.5)

    json.dump(cards, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    from collections import Counter
    print(f"\n>> 洗出 {len(cards)} 张干净知识卡 → {args.out}")
    print(">> 年级:", dict(Counter(c["grade"] for c in cards)))
    print(">> 类别:", dict(Counter(c["category"] for c in cards)))


if __name__ == "__main__":
    main()
