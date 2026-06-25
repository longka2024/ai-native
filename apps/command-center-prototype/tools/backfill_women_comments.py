#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""backfill_women_comments.py — 把 Pro 采到的评论回填进 PG 女性成长样本

江湖导入的 93 条样本 platform='xiaohongshu', source_id=note_id, comments 为空。
Pro detail 采的评论在本地 media_crawler.db 的 xhs_note_comment(note_id 同)。
按 note_id 匹配,UPDATE 现有样本的 comments 列(不新建平行 'xhs' 行)。
用 122 系统 python3(自带 psycopg2)+ stdlib sqlite3。
DATABASE_URL 经环境变量传入。
"""
import json
import os
import sqlite3
import sys

PRO_DB = os.environ.get(
    "PRO_DB",
    "/home/ubuntu/MediaCrawlerPro/MediaCrawlerPro-MediaCrawlerPro-Python-901205cd4d66e62dfb4323397687edb4dd2081db/media_crawler.db",
)
TOP_N = 80


def parse_count(v):
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    t = str(v).strip().replace(",", "").replace("+", "")
    if not t:
        return 0
    for u, m in {"万": 10000, "w": 10000, "W": 10000, "亿": 100000000, "k": 1000, "K": 1000}.items():
        if t.endswith(u):
            try:
                return int(float(t[:-len(u)]) * m)
            except ValueError:
                return 0
    try:
        return int(float(t))
    except ValueError:
        return 0


def main():
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL 未配置")
    import psycopg2

    lite = sqlite3.connect(PRO_DB)
    pg = psycopg2.connect(dsn)
    cur = pg.cursor()
    cur.execute(
        "select source_id from longka_content_samples "
        "where coalesce(workspace,'')='女性成长' and platform='xiaohongshu'"
    )
    note_ids = [r[0] for r in cur.fetchall()]
    updated, total_comments = 0, 0
    for nid in note_ids:
        try:
            rows = lite.execute(
                "select comment_id, content, nickname, like_count, create_time "
                "from xhs_note_comment where note_id = ?", (nid,)
            ).fetchall()
        except sqlite3.OperationalError:
            rows = []
        if not rows:
            continue
        comments = [{
            "id": r[0], "content": (r[1] or "").replace("\x00", ""),
            "author": r[2] or "", "likes": parse_count(r[3]), "ts": r[4] or 0,
        } for r in rows]
        comments.sort(key=lambda c: c["likes"], reverse=True)
        comments = comments[:TOP_N]
        cur.execute(
            "update longka_content_samples set comments=%s::jsonb "
            "where platform='xiaohongshu' and source_id=%s",
            (json.dumps(comments, ensure_ascii=False), nid),
        )
        updated += cur.rowcount
        total_comments += len(comments)
    pg.commit()
    lite.close()
    pg.close()
    print(f"回填样本数: {updated} | 评论总数: {total_comments} | 候选note: {len(note_ids)}")


if __name__ == "__main__":
    main()
