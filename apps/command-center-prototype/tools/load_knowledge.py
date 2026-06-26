# -*- coding: utf-8 -*-
# 灌库:把洗好的知识卡 JSON 写进 PG longka_knowledge(幂等 upsert,按 id 覆盖)。
# PG 只在 122,故这脚本在 122 上跑(或本地能连 PG 时)。spec: 2026-06-26-private-school-knowledge-base-spec.md
# 用法: DATABASE_URL=... py -3.14 load_knowledge.py --in knowledge_stgeorges.json
import os, json, argparse


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL", ""))
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("缺 DATABASE_URL(PG DSN)")
    cards = json.load(open(args.inp, encoding="utf-8"))

    import psycopg
    n = 0
    with psycopg.connect(args.dsn) as conn:
        with conn.cursor() as cur:
            for c in cards:
                cur.execute("""
                    insert into longka_knowledge (id,workspace,school,grade,category,point,tags,source)
                    values (%s,%s,%s,%s,%s,%s,%s,%s)
                    on conflict (id) do update set
                      workspace=excluded.workspace, school=excluded.school, grade=excluded.grade,
                      category=excluded.category, point=excluded.point, tags=excluded.tags, source=excluded.source
                """, (c["id"], c.get("workspace", ""), c.get("school", ""), c.get("grade", "通用"),
                      c.get("category", ""), c["point"], json.dumps(c.get("tags", []), ensure_ascii=False),
                      c.get("source", "")))
                n += 1
        conn.commit()
    print(f">> 灌入/更新 {n} 张知识卡 → longka_knowledge")


if __name__ == "__main__":
    main()
