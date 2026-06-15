#!/usr/bin/env bash
# collect_and_sync.sh — 一条命令完成「MediaCrawlerPro 采集 → PG 样本库同步」
# 依据 spec: docs/specs/2026-06-12-collection-pipeline-rebuild-spec.md
#
# 用法:
#   ./collect_and_sync.sh <platform> <keywords> [--workspace 美容] [--type search|detail|creator] [--urls "id1,id2"]
# 示例:
#   ./collect_and_sync.sh xhs "轻医美,抗初老" --workspace 美容
#   ./collect_and_sync.sh xhs "" --type creator --urls "https://www.xiaohongshu.com/user/profile/xxx" --workspace 美容
#
# 前置:
#   - 环境变量 DATABASE_URL 指向 122 PG（禁止写进脚本）
#   - SignSrv(:8989) / CookieBridge(:8274) 已启动
set -euo pipefail

MCR_ROOT="${MCR_ROOT:-/e/Codex/MediaCrawlerPro/MediaCrawlerPro-Python}"
TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${PYTHON_BIN:-py}"

PLATFORM="${1:?用法: collect_and_sync.sh <platform> <keywords> [--workspace X] [--type search] [--urls ...]}"
KEYWORDS="${2:-}"
shift 2 || true

WORKSPACE=""
CRAWL_TYPE="search"
URLS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace) WORKSPACE="$2"; shift 2 ;;
    --type)      CRAWL_TYPE="$2"; shift 2 ;;
    --urls)      URLS="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL 未配置（指向 122 PG），拒绝执行" >&2
  exit 1
fi

# ── 1) 服务健康检查 ────────────────────────────────────────────────
echo "▶ 健康检查 SignSrv / CookieBridge ..."
curl -sf --max-time 5 "http://127.0.0.1:8989/signsrv/pong" > /dev/null \
  || { echo "❌ SignSrv(:8989) 未就绪，先启动签名服务" >&2; exit 1; }
curl -sf --max-time 5 "http://127.0.0.1:8274/ping" > /dev/null \
  || { echo "❌ CookieBridge(:8274) 未就绪，先启动 Cookie 服务" >&2; exit 1; }
echo "  服务正常"

# ── 2) Pro 采集（SQLite 暂存，不动 Pro 源码，纯环境变量注入）──────────
echo "▶ 采集 platform=$PLATFORM type=$CRAWL_TYPE keywords=「$KEYWORDS」..."
PRO_ARGS=(--platform "$PLATFORM" --type "$CRAWL_TYPE" --enable_comments)
[[ -n "$KEYWORDS" ]] && PRO_ARGS+=(--keywords "$KEYWORDS")
[[ -n "$URLS" ]] && PRO_ARGS+=(--urls "$URLS")

( cd "$MCR_ROOT" && DB_TYPE=sqlite SAVE_DATA_OPTION=db "$PY" main.py "${PRO_ARGS[@]}" )

# ── 3) 同步到 PG 样本库 ───────────────────────────────────────────
echo "▶ 同步 SQLite → PG 样本库 ..."
SYNC_ARGS=(--platform "$PLATFORM" --sqlite "$MCR_ROOT/media_crawler.db")
[[ -n "$WORKSPACE" ]] && SYNC_ARGS+=(--workspace "$WORKSPACE")
"$PY" "$TOOLS_DIR/sync_to_samples.py" "${SYNC_ARGS[@]}"

echo "✅ 采集+同步完成"
