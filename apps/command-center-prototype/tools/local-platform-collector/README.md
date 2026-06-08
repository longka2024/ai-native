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

## Jianghu Toolbox Import

Jianghu Toolbox is the current practical Xiaohongshu collection route. It collects on the operator's local PC, then exports TXT/JSON. Longka does not replace it; Longka imports the export into the 122 PostgreSQL content asset library.

Dry-run a Jianghu export first:

```powershell
node jianghu-importer.mjs --file "C:\Users\longfei\Desktop\作品列表勾选数据20260609041605.txt" --dry-run
```

Upload after the preview looks right:

```powershell
node jianghu-importer.mjs --file "C:\Users\longfei\Desktop\作品列表勾选数据20260609041605.txt" --upload --base http://122.51.218.154/ai-native-v2 --operator longfei --device-name longfei-desktop --query "AI自媒体"
```

The importer adds Longka quality metadata under `rawJson.longkaQuality`:

- `image_post_complete_body`: image post with enough body text, priority for creation.
- `image_post_usable_body`: image post with usable body text, can enter creation.
- `image_post_short_body_hot`: hot but short image post, good for topic/title reference.
- `video_needs_transcript_hot`: hot video, store it but wait for transcript.
- `video_needs_transcript`: video source, wait for transcript.
- `low_signal`: weak or unclear source, keep for training/reference only after review.

For Xiaohongshu creation, prioritize image posts with `readyForCreation: true`. Video exports usually do not include the full spoken content, so do not force them into rewrite until transcript/body is added.

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
