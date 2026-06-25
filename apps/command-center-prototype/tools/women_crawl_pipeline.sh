#!/bin/bash
# 女性成长 93 条评论:慢速采 → 回填 PG → 深挖真实料。一次性后台管线。
LOG=/home/ubuntu/women-crawl.log
: > "$LOG"
exec >> "$LOG" 2>&1
PRO=/home/ubuntu/MediaCrawlerPro/MediaCrawlerPro-MediaCrawlerPro-Python-901205cd4d66e62dfb4323397687edb4dd2081db
APP=/home/ubuntu/ai-native-command-center-v2
DSN=$(python3 -c "print([l.split('=',1)[1].strip().strip('\"').strip(\"'\") for l in open('$APP/.env') if l.startswith('DATABASE_URL=')][0])")

echo "=== STEP A 取女性成长URL $(date) ==="
URLS=$(psql "$DSN" -t -A -c "select source_url from longka_content_samples where coalesce(workspace,'')='女性成长' and platform='xiaohongshu' and source_url like '%xsec_token%';" | paste -sd, -)
CNT=$(printf '%s' "$URLS" | tr ',' '\n' | grep -c xsec_token)
echo "待采URL条数: $CNT"

echo "=== STEP B 慢速 detail 采评论(sleep4/每帖封顶50)$(date) ==="
cd "$PRO" || exit 1
sed -i 's/^CRAWLER_TIME_SLEEP = .*/CRAWLER_TIME_SLEEP = 4/' config/base_config.py
sed -i 's/^PER_NOTE_MAX_COMMENTS_COUNT = .*/PER_NOTE_MAX_COMMENTS_COUNT = 50/' config/base_config.py
env DB_TYPE=sqlite ACCOUNT_POOL_SAVE_TYPE=xlsx ENABLE_GET_COMMENTS=true \
    SIGN_SRV_HOST=localhost SIGN_SRV_PORT=8989 \
    .venv/bin/python main.py --platform xhs --type detail --urls "$URLS" 2>&1 \
    | grep -vE '声明|⚠️|robots|LICENSE' | grep -iE 'comment|finished|error|warning|note_id' | tail -50
echo "采集结束 $(date)"

echo "=== STEP C 回填 PG 女性成长样本 $(date) ==="
PRO_DB="$PRO/media_crawler.db" DATABASE_URL="$DSN" python3 /home/ubuntu/backfill_women_comments.py

echo "=== STEP D 深挖真实料 $(date) ==="
JID=$(curl -s -X POST 'http://localhost:3760/api/comments/mine/start' -H 'content-type: application/json' -d '{"workspace":"女性成长","minComments":5}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("jobId",""))')
echo "mine job: $JID"
for i in $(seq 1 300); do
  sleep 5
  S=$(curl -s "http://localhost:3760/api/comments/mine/status?jobId=$JID")
  echo "$(date +%H:%M:%S) $S"
  echo "$S" | grep -qE '"status":"(done|error)"' && break
done

echo "=== 女性成长真实料聚合 ==="
WS=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("女性成长"))')
curl -s "http://localhost:3760/api/comments/real-material?workspace=$WS"
echo
echo "=== PIPELINE_DONE $(date) ==="
