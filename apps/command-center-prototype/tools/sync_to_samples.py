#!/usr/bin/env python3
"""sync_to_samples.py — MediaCrawlerPro SQLite 暂存库 → 122 PG 样本库 增量同步

依据 spec: docs/specs/2026-06-12-collection-pipeline-rebuild-spec.md
- 暂存区: Pro 的 media_crawler.db (SQLite, 不改 Pro 源码)
- 资产库: longka_content_samples (复用现有表, 不新建平行样本表)
- 增量: 按 last_modify_ts 与 longka_sync_watermarks 水位比较
- 清洗: "1.2万"→12000 等互动数转整数; 时间统一 timestamptz
- 幂等: ON CONFLICT (platform, source_id) DO UPDATE 刷新 metrics/comments

用法:
  export DATABASE_URL=postgresql://user:pass@122.51.218.154:5432/dbname
  python sync_to_samples.py --platform xhs --workspace 美容
  python sync_to_samples.py --platform all --dry-run
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_SQLITE = r"E:\Codex\MediaCrawlerPro\MediaCrawlerPro-Python\media_crawler.db"
KEYWORD_MAP_FILE = Path(__file__).parent / "workspace-keywords.json"
COMMENTS_TOP_N = 50

# ─── 平台映射：Pro 表字段 → longka_content_samples 字段 ──────────────────
# metrics 键: likes / comments / collects / shares / views
PLATFORMS = {
    "xhs": {
        "table": "xhs_note",
        "source_id": "note_id",
        "title": "title",
        "body": "desc",
        "author_id": "user_id",
        "author_name": "nickname",
        "url": "note_url",
        "publish_ts": "time",
        "metrics": {
            "likes": "liked_count",
            "comments": "comment_count",
            "collects": "collected_count",
            "shares": "share_count",
        },
        "comment_table": "xhs_note_comment",
        "comment_fk": "note_id",
    },
    "dy": {
        "table": "douyin_aweme",
        "source_id": "aweme_id",
        "title": "title",
        "body": "desc",
        "author_id": "user_id",
        "author_name": "nickname",
        "url": "aweme_url",
        "publish_ts": "create_time",
        "metrics": {
            "likes": "liked_count",
            "comments": "comment_count",
            "collects": "collected_count",
            "shares": "share_count",
        },
        "comment_table": "douyin_aweme_comment",
        "comment_fk": "aweme_id",
    },
    "wb": {
        "table": "weibo_note",
        "source_id": "note_id",
        "title": None,
        "body": "content",
        "author_id": "user_id",
        "author_name": "nickname",
        "url": "note_url",
        "publish_ts": "create_time",
        "metrics": {
            "likes": "liked_count",
            "comments": "comments_count",
            "shares": "shared_count",
        },
        "comment_table": "weibo_note_comment",
        "comment_fk": "note_id",
    },
    "bili": {
        "table": "bilibili_video",
        "source_id": "video_id",
        "title": "title",
        "body": "desc",
        "author_id": "user_id",
        "author_name": "nickname",
        "url": "video_url",
        "publish_ts": "create_time",
        "metrics": {
            "likes": "liked_count",
            "comments": "video_comment",
            "views": "video_play_count",
        },
        "comment_table": "bilibili_video_comment",
        "comment_fk": "video_id",
    },
    "zhihu": {
        "table": "zhihu_content",
        "source_id": "content_id",
        "title": "title",
        "body": "content_text",
        "author_id": "user_id",
        "author_name": "user_nickname",
        "url": "content_url",
        "publish_ts": "created_time",
        "metrics": {
            "likes": "voteup_count",
            "comments": "comment_count",
        },
        "comment_table": "zhihu_comment",
        "comment_fk": "content_id",
    },
}

CREATOR_TABLES = {
    "xhs": {
        "table": "xhs_creator",
        "platform_id": "user_id",
        "nickname": "nickname",
        "fans": "fans",
        "description": "desc",
    },
}

# ─── 清洗工具 ───────────────────────────────────────────────────────────

_UNIT = {"万": 10_000, "w": 10_000, "W": 10_000, "亿": 100_000_000, "k": 1_000, "K": 1_000}


def parse_count(value):
    """'1.2万' → 12000, '3亿' → 300000000, None/'' / '点赞' 等异常 → 0"""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().replace(",", "").replace("+", "")
    if not text:
        return 0
    for unit, mult in _UNIT.items():
        if text.endswith(unit):
            try:
                return int(float(text[: -len(unit)]) * mult)
            except ValueError:
                return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def parse_publish_ts(value):
    """epoch 秒/毫秒/日期字符串 → aware datetime（无法解析返回 None）"""
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if re.fullmatch(r"\d{10,13}", text):
            value = int(text)
        else:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
                try:
                    return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
                except ValueError:
                    continue
            return None
    try:
        ts = int(value)
    except (TypeError, ValueError):
        return None
    if ts <= 0:
        return None
    if ts > 10**12:  # 毫秒
        ts = ts // 1000
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def sanitize_id(text):
    """对齐 collector-hub.mjs 的 id 规则: 非 [\\w:.-] 字符替换为 '-'，截断 180"""
    return re.sub(r"[^\w:.-]+", "-", text)[:180]


def load_workspace_map():
    try:
        return json.loads(KEYWORD_MAP_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        print(f"[warn] 工作台映射文件读取失败 ({err})，workspace 将为空", file=sys.stderr)
        return {}


def resolve_workspace(keyword, ws_map, override):
    if override:
        return override
    if not keyword:
        return None
    for workspace, words in ws_map.items():
        if workspace.startswith("_"):
            continue
        if any(w and w in keyword for w in words):
            return workspace
    return None


# ─── PG schema 增量（幂等） ──────────────────────────────────────────────

ENSURE_SQL = [
    "ALTER TABLE longka_content_samples ADD COLUMN IF NOT EXISTS workspace TEXT",
    """CREATE INDEX IF NOT EXISTS idx_longka_content_samples_workspace
       ON longka_content_samples(workspace, published_at DESC)""",
    """CREATE TABLE IF NOT EXISTS longka_creators (
         id            BIGSERIAL PRIMARY KEY,
         platform      TEXT NOT NULL,
         platform_id   TEXT NOT NULL,
         nickname      TEXT,
         fans          BIGINT DEFAULT 0,
         notes_count   INT DEFAULT 0,
         description   TEXT,
         extra         JSONB DEFAULT '{}',
         workspace     TEXT,
         is_benchmark  BOOLEAN DEFAULT false,
         created_at    TIMESTAMPTZ DEFAULT now(),
         updated_at    TIMESTAMPTZ DEFAULT now(),
         UNIQUE(platform, platform_id)
       )""",
    """CREATE TABLE IF NOT EXISTS longka_sync_watermarks (
         source_table  TEXT PRIMARY KEY,
         last_add_ts   BIGINT DEFAULT 0,
         last_sync_at  TIMESTAMPTZ
       )""",
]

UPSERT_SAMPLE_SQL = """
INSERT INTO longka_content_samples (
  id, collector_type, platform, source_type, source_url, source_id,
  author_name, author_id, title, body, language, keyword, label_type,
  metrics, comments, raw_json, published_at, workspace, collected_at
) VALUES (
  %(id)s, 'mediacrawler_pro', %(platform)s, %(source_type)s, %(source_url)s, %(source_id)s,
  %(author_name)s, %(author_id)s, %(title)s, %(body)s, 'zh', %(keyword)s, 'unknown',
  %(metrics)s::jsonb, %(comments)s::jsonb, %(raw_json)s::jsonb, %(published_at)s, %(workspace)s, now()
)
ON CONFLICT (platform, source_id) DO UPDATE SET
  metrics = EXCLUDED.metrics,
  comments = CASE WHEN EXCLUDED.comments != '[]'::jsonb
                  THEN EXCLUDED.comments ELSE longka_content_samples.comments END,
  raw_json = EXCLUDED.raw_json,
  workspace = COALESCE(EXCLUDED.workspace, longka_content_samples.workspace),
  collected_at = now()
"""

UPSERT_CREATOR_SQL = """
INSERT INTO longka_creators (platform, platform_id, nickname, fans, description, extra, workspace)
VALUES (%(platform)s, %(platform_id)s, %(nickname)s, %(fans)s, %(description)s, %(extra)s::jsonb, %(workspace)s)
ON CONFLICT (platform, platform_id) DO UPDATE SET
  nickname = EXCLUDED.nickname,
  fans = EXCLUDED.fans,
  description = EXCLUDED.description,
  extra = EXCLUDED.extra,
  updated_at = now()
"""


# ─── 同步逻辑 ───────────────────────────────────────────────────────────

def fetch_comments(lite, spec, source_id):
    table, fk = spec.get("comment_table"), spec.get("comment_fk")
    if not table:
        return []
    try:
        rows = lite.execute(
            f"SELECT comment_id, content, nickname, like_count, create_time "
            f"FROM {table} WHERE {fk} = ?", (source_id,)
        ).fetchall()
    except sqlite3.OperationalError:
        # zhihu_comment 等表字段名不同，退化为通用列
        try:
            rows = lite.execute(
                f"SELECT comment_id, content, '' as nickname, like_count, 0 as create_time "
                f"FROM {table} WHERE {fk} = ?", (source_id,)
            ).fetchall()
        except sqlite3.OperationalError:
            return []
    comments = [
        {
            "id": r[0],
            "content": r[1] or "",
            "author": r[2] or "",
            "likes": parse_count(r[3]),
            "ts": r[4] or 0,
        }
        for r in rows
    ]
    comments.sort(key=lambda c: c["likes"], reverse=True)
    return comments[:COMMENTS_TOP_N]


def sync_platform(lite, pg, platform, spec, ws_map, ws_override, dry_run):
    table = spec["table"]
    cur = pg.cursor()
    cur.execute("SELECT last_add_ts FROM longka_sync_watermarks WHERE source_table = %s", (table,))
    row = cur.fetchone()
    watermark = row[0] if row else 0

    lite.row_factory = sqlite3.Row
    try:
        rows = lite.execute(
            f"SELECT * FROM {table} WHERE last_modify_ts > ? ORDER BY last_modify_ts", (watermark,)
        ).fetchall()
    except sqlite3.OperationalError as err:
        print(f"[warn] {platform}: 读取 {table} 失败 ({err})，跳过", file=sys.stderr)
        return 0

    if not rows:
        print(f"[{platform}] 无新增（水位 {watermark}）")
        return 0

    count = 0
    max_ts = watermark
    for r in rows:
        raw = dict(r)
        source_id = str(raw.get(spec["source_id"]) or "").strip()
        if not source_id:
            continue
        keyword = (raw.get("source_keyword") or "").strip()
        metrics = {k: parse_count(raw.get(col)) for k, col in spec["metrics"].items()}
        record = {
            "id": sanitize_id(f"{platform}-{source_id}"),
            "platform": platform,
            "source_type": "search" if keyword else "detail",
            "source_url": raw.get(spec["url"]) or "",
            "source_id": source_id,
            "author_name": raw.get(spec["author_name"]) or "",
            "author_id": str(raw.get(spec["author_id"]) or ""),
            "title": (raw.get(spec["title"]) or "") if spec["title"] else "",
            "body": raw.get(spec["body"]) or "",
            "keyword": keyword,
            "metrics": json.dumps(metrics, ensure_ascii=False),
            "comments": json.dumps(fetch_comments(lite, spec, source_id), ensure_ascii=False),
            "raw_json": json.dumps(raw, ensure_ascii=False, default=str),
            "published_at": parse_publish_ts(raw.get(spec["publish_ts"])),
            "workspace": resolve_workspace(keyword, ws_map, ws_override),
        }
        if not dry_run:
            cur.execute(UPSERT_SAMPLE_SQL, record)
        count += 1
        max_ts = max(max_ts, raw.get("last_modify_ts") or 0)

    if not dry_run:
        cur.execute(
            """INSERT INTO longka_sync_watermarks (source_table, last_add_ts, last_sync_at)
               VALUES (%s, %s, now())
               ON CONFLICT (source_table) DO UPDATE SET last_add_ts = EXCLUDED.last_add_ts, last_sync_at = now()""",
            (table, max_ts),
        )
        pg.commit()
    print(f"[{platform}] 同步 {count} 条{'（dry-run 未写入）' if dry_run else ''}，水位 {watermark} → {max_ts}")
    return count


def sync_creators(lite, pg, platform, ws_override, dry_run):
    spec = CREATOR_TABLES.get(platform)
    if not spec:
        return 0
    lite.row_factory = sqlite3.Row
    try:
        rows = lite.execute(f"SELECT * FROM {spec['table']}").fetchall()
    except sqlite3.OperationalError:
        return 0
    cur = pg.cursor()
    count = 0
    for r in rows:
        raw = dict(r)
        pid = str(raw.get(spec["platform_id"]) or "").strip()
        if not pid:
            continue
        record = {
            "platform": platform,
            "platform_id": pid,
            "nickname": raw.get(spec["nickname"]) or "",
            "fans": parse_count(raw.get(spec["fans"])),
            "description": raw.get(spec["description"]) or "",
            "extra": json.dumps(raw, ensure_ascii=False, default=str),
            "workspace": ws_override,
        }
        if not dry_run:
            cur.execute(UPSERT_CREATOR_SQL, record)
        count += 1
    if not dry_run and count:
        pg.commit()
    if count:
        print(f"[{platform}] 创作者同步 {count} 条{'（dry-run 未写入）' if dry_run else ''}")
    return count


def connect_pg(dsn):
    try:
        import psycopg
        return psycopg.connect(dsn)
    except ImportError:
        pass
    try:
        import psycopg2
        return psycopg2.connect(dsn)
    except ImportError:
        sys.exit("缺少 PG 驱动：pip install \"psycopg[binary]\" 或 psycopg2-binary")


def main():
    parser = argparse.ArgumentParser(description="MediaCrawlerPro SQLite → PG 样本库增量同步")
    parser.add_argument("--sqlite", default=os.environ.get("MCR_SQLITE", DEFAULT_SQLITE))
    parser.add_argument("--platform", default="all", help="xhs/dy/wb/bili/zhihu 或 all，逗号分隔")
    parser.add_argument("--workspace", default=None, help="本次采集强制归属的工作台")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.exit("DATABASE_URL 未配置（指向 122 PG），拒绝执行")
    if not Path(args.sqlite).exists():
        sys.exit(f"SQLite 暂存库不存在：{args.sqlite}")

    targets = list(PLATFORMS) if args.platform == "all" else [
        p.strip() for p in args.platform.split(",") if p.strip()
    ]
    unknown = [p for p in targets if p not in PLATFORMS]
    if unknown:
        sys.exit(f"不支持的平台：{unknown}（可选 {list(PLATFORMS)}）")

    ws_map = load_workspace_map()
    lite = sqlite3.connect(args.sqlite)
    pg = connect_pg(dsn)
    try:
        cur = pg.cursor()
        for sql in ENSURE_SQL:
            cur.execute(sql)
        pg.commit()

        total = 0
        for platform in targets:
            total += sync_platform(lite, pg, platform, PLATFORMS[platform], ws_map, args.workspace, args.dry_run)
            sync_creators(lite, pg, platform, args.workspace, args.dry_run)
        print(f"完成：共同步 {total} 条样本")
    finally:
        lite.close()
        pg.close()


if __name__ == "__main__":
    main()
