# Longka Local Platform Collector

Purpose: run collection on an operator's own computer, then upload real collected items to the 122 PostgreSQL content asset library.

This is for platforms where server-side collection is unstable because login, captcha, device trust, or residential IP matters.

## Flow

```text
operator computer
-> local browser / platform crawler / manual export
-> batch JSON
-> upload to 122
-> PostgreSQL longka_content_samples
-> Today Workbench collection batch
```

## Supported Platform IDs

- `xiaohongshu`
- `wechat`
- `toutiao`
- `douyin`
- `kuaishou`
- `bilibili`
- `zhihu`
- `rss`
- `webpage`

Use `xiaohongshu` for Xiaohongshu. `xhs` is accepted as an alias by the server.

## Upload

```powershell
node upload-batch.mjs --file .\sample-xhs-batch.json --base http://122.51.218.154/ai-native-v2
```

The upload endpoint is:

```text
POST /api/collectors/local-platform/import-batch
```

## Batch Schema

```json
{
  "platform": "xiaohongshu",
  "batchName": "2026-06-09 xhs ai content creators",
  "operator": "xiaomei",
  "deviceName": "xiaomei-laptop",
  "sourceMode": "local-browser",
  "query": "AI自媒体 内容资产库",
  "samples": [
    {
      "sourceId": "xhs-note-id",
      "sourceUrl": "https://www.xiaohongshu.com/explore/...",
      "authorName": "author",
      "authorId": "author-id",
      "title": "note title",
      "body": "note body",
      "metrics": {
        "likes": 100,
        "collects": 40,
        "comments": 12,
        "shares": 3
      },
      "comments": [
        "comment text"
      ],
      "publishedAt": "2026-06-09T10:00:00+08:00"
    }
  ]
}
```

## Rule

Do not upload fake samples as real. If collection fails, upload nothing and show the failure in the local helper.
