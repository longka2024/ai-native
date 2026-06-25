#!/usr/bin/env bash
# montage_demo.sh — 批量混剪引擎 v0(本机 ffmpeg,零云费)。
# 一套客户素材 + 多组"分镜文案" → 批量出竖屏短视频。横片自动模糊底转竖、烧大字、可选BGM。
set -u
FONT='C\:/Windows/Fonts/msyhbd.ttc'
DUR=2.6
OUTDIR="/tmp/montage_out"; mkdir -p "$OUTDIR"
BGM="/tmp/bgm.mp3"

norm_clip() { # $1 src  $2 caption  $3 outfile
  local f="$1" txt="$2" out="$3"
  [ -f "$f" ] || { echo "  缺片: $f"; return 1; }
  ffmpeg -y -loglevel error -ss 0.4 -t "$DUR" -i "$f" -filter_complex \
"[0:v]split[a][b];[b]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=26[bg];[a]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p,drawtext=fontfile='$FONT':text='$txt':fontcolor=white:fontsize=60:borderw=6:bordercolor=black@0.75:x=(w-text_w)/2:y=h-230,drawtext=fontfile='$FONT':text='longka 制作':fontcolor=white@0.72:fontsize=32:borderw=2:bordercolor=black@0.5:x=w-text_w-34:y=48[v]" \
-map "[v]" -an -c:v libx264 -preset veryfast -t "$DUR" "$out"
}

build_demo() { # $1 name ; rest: "src|||caption"
  local name="$1"; shift
  local work="$OUTDIR/work_$name"; rm -rf "$work"; mkdir -p "$work"; : > "$work/list.txt"
  local i=0
  for pair in "$@"; do
    local f="${pair%%|||*}" txt="${pair##*|||}"; i=$((i+1))
    if norm_clip "$f" "$txt" "$work/n$i.mp4"; then printf "file 'n%d.mp4'\n" "$i" >> "$work/list.txt"; fi
  done
  ( cd "$work" && ffmpeg -y -loglevel error -f concat -safe 0 -i list.txt -c copy silent.mp4 )
  if [ -f "$BGM" ]; then
    ffmpeg -y -loglevel error -i "$work/silent.mp4" -i "$BGM" -map 0:v -map 1:a -c:v copy -af "afade=t=in:d=0.6" -shortest "$OUTDIR/demo_$name.mp4"
  else cp "$work/silent.mp4" "$OUTDIR/demo_$name.mp4"; fi
  echo "✅ demo_$name.mp4  $(ffprobe -v error -show_entries format=duration -of default=nw=1 "$OUTDIR/demo_$name.mp4")s"
}

W=/g/素材/仓库; Z=/g/素材/展厅; K=/g/素材/客户来展厅参观选品

build_demo A_scale \
 "$W/DJI_20260506140830_0153_D.MP4|||你店里的货 源头在这" \
 "$W/DJI_20260506140941_0155_D.MP4|||整仓自营 大场面" \
 "$W/2025_07_08_09_28_IMG_9701.MOV|||海量现货 常年备货" \
 "$W/2025_07_08_10_20_IMG_9729.MOV|||源头直发 全球" \
 "$W/DJI_20260506142021_0172_D.MP4|||实力大仓 放心合作"

build_demo B_products \
 "$Z/2025_09_18_15_41_12_IMG_3569.MOV|||百元店全品类" \
 "$Z/2025_09_18_15_47_33_IMG_3590.MOV|||一站选齐 不用东奔西跑" \
 "$Z/2025_10_17_13_38_IMG_4121.MOV|||爆款现货 拿了就走" \
 "$Z/2025_09_18_15_52_47_IMG_3610.MOV|||源头价 没有中间商" \
 "$Z/2025_10_23_10_32_IMG_4540.MOV|||新品周周上"

build_demo C_trust \
 "$K/2026_06_11_09_26_14_IMG_3943.MOV|||全球客户 到仓选品" \
 "$K/2025_07_07_10_52_IMG_9661.MOV|||眼见为实 现场看货" \
 "$K/2025_08_05_10_38_IMG_0843.MOV|||一手货源 当面谈" \
 "$K/2026_05_25_11_28_13_IMG_3327.MOV|||回头客都说好" \
 "$W/DJI_20260506142216_0174_D.MP4|||实力大仓 放心合作"

echo "全部完成,输出在 $OUTDIR"
