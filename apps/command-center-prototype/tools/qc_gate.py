# -*- coding: utf-8 -*-
# qc_gate.py — 视频质检闸门(质检中台 L1+L2)。脚本必抓,过不了非零退出,别靠肉眼。
# L1 确定性硬闸(判废): 分辨率/帧率/时长/音轨 + 静音 + 声画时长错位 + 黑屏 + 动态承诺。
# L2 启发式预警(不误杀,只提示复核): 暗角/模糊/削峰/运动量低/重复画面。
# 用法: py -3.14 qc_gate.py <video.mp4> [--w 1620 --h 2880 --fps 60 --kind mixed --json]
#   --kind motion|mixed|static : 动态承诺。motion/mixed 实测运动量过低 → 判废(治 PPT 感/静态片)。
# 退出码 0=过,1=不过。暗角硬毙靠 golden_check.py(同内容 SSIM 比基准,零误杀)。
import subprocess
import json
import argparse
import tempfile
import os
import sys
import re

# Windows 控制台默认 GBK,emoji/中文会 UnicodeEncodeError → 强制 utf-8 输出(自包含,不依赖调用方 env)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def ffprobe(path: str) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate", "-show_entries", "format=duration",
        "-of", "json", path], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
    d = json.loads(out or "{}")
    st = (d.get("streams") or [{}])[0]
    fm = d.get("format", {})
    w = int(st.get("width", 0))
    h = int(st.get("height", 0))
    rfr = st.get("r_frame_rate", "0/1")
    n, dn = rfr.split("/")
    fps = round(float(n) / float(dn)) if float(dn) else 0
    dur = float(fm.get("duration", 0) or 0)
    a = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", path], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout.strip()
    return {"w": w, "h": h, "fps": fps, "dur": round(dur, 2), "has_audio": bool(a)}


def audio_stats(path: str) -> dict:
    """音轨响度(ffmpeg volumedetect)+ 音频时长。静音/削峰/声画错位用。"""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", os.devnull],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    err = r.stderr or ""
    mean = re.search(r"mean_volume:\s*(-?[\d.]+) dB", err)
    mx = re.search(r"max_volume:\s*(-?[\d.]+) dB", err)
    adur = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "csv=p=0", path], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout.strip()
    try:
        adur_f = float(adur)
    except ValueError:
        adur_f = 0.0
    return {"mean_db": float(mean.group(1)) if mean else None,
            "max_db": float(mx.group(1)) if mx else None,
            "audio_dur": round(adur_f, 2)}


def scene_pacing(path: str, dur: float, thresh: float = 0.3) -> dict:
    """节奏校验(ffmpeg 内置 scene 检测,免费):切镜次数 / 每分钟切镜 / 最长单镜头秒数。
    切太少+某镜头停太久=PPT感/拖;太碎=切碎堆料。阈值内容相关 → 只报数值作预警。"""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path,
        "-filter:v", f"select='gt(scene,{thresh})',metadata=print", "-an", "-f", "null", os.devnull],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    times = sorted(float(t) for t in re.findall(r"pts_time:([\d.]+)", r.stderr or ""))
    cuts = len(times)
    bounds = [0.0] + times + [dur if dur > 0 else (times[-1] if times else 0.0)]
    gaps = [b - a for a, b in zip(bounds, bounds[1:]) if b > a]
    max_shot = round(max(gaps), 2) if gaps else round(dur, 2)
    cpm = round(cuts / (dur / 60.0), 1) if dur > 0 else 0.0
    return {"cuts": cuts, "cuts_per_min": cpm, "max_shot_s": max_shot}


def _ahash(gray) -> "list":
    """8x8 average hash → 64 bool,用于查重复画面。"""
    import cv2
    s = cv2.resize(gray, (8, 8))
    return (s > s.mean()).flatten()


def analyze(path: str, n: int = 10) -> dict:
    """抽 n 帧,算: 暗角/模糊(原有)+ 黑屏/纯色 + 运动量 + 重复画面。"""
    import cv2
    import numpy as np
    info = ffprobe(path)
    dur = info["dur"] or 1
    tmp = tempfile.mkdtemp()
    grays = []
    ratios, blurs, means, stds = [], [], [], []
    for i in range(n):
        t = dur * (i + 1) / (n + 1)
        p = os.path.join(tmp, f"f{i}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", path, "-vframes", "1", p], check=False)
        if not os.path.exists(p):
            continue
        img = cv2.imread(p)
        os.remove(p)
        if img is None:
            continue
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype("float32")
        h, w = g.shape
        y0, y1 = int(h * 0.35), int(h * 0.65)
        left = g[y0:y1, 0:int(w * 0.07)].mean()
        right = g[y0:y1, int(w * 0.93):w].mean()
        center = g[y0:y1, int(w * 0.42):int(w * 0.58)].mean()
        ratios.append((left + right) / 2.0 / max(center, 1.0))
        blurs.append(cv2.Laplacian(g, cv2.CV_32F).var())
        means.append(float(g.mean()))
        stds.append(float(g.std()))
        grays.append(g)
    try:
        os.rmdir(tmp)
    except OSError:
        pass

    # 片尾黑屏专检(客户反馈核心):抽最后一帧,亮度极低=片尾黑(判废)
    tail_mean = 999.0
    tp = os.path.join(tempfile.mkdtemp(), "tail.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(max(0, dur - 0.08)), "-i", path, "-vframes", "1", tp], check=False)
    if os.path.exists(tp):
        ti = cv2.imread(tp)
        if ti is not None:
            tail_mean = float(cv2.cvtColor(ti, cv2.COLOR_BGR2GRAY).mean())
        os.remove(tp)

    # 黑屏/纯色: 整帧亮度极低(near-black) 或 标准差极低(纯色/单色块)
    black = sum(1 for m in means if m < 12)
    flat = sum(1 for s in stds if s < 6)
    # 运动量: 相邻帧灰度平均绝对差 / 255 (0静止 ~ 越大越动)
    motions = []
    for a, b in zip(grays, grays[1:]):
        if a.shape == b.shape:
            motions.append(float(np.abs(a - b).mean()) / 255.0)
    motion = round(float(np.mean(motions)), 4) if motions else 0.0
    # 重复画面: 两两 aHash 汉明距 < 6 视为雷同
    hashes = [_ahash(g) for g in grays]
    dup_pairs = 0
    for i in range(len(hashes)):
        for j in range(i + 1, len(hashes)):
            if int((hashes[i] != hashes[j]).sum()) < 6:
                dup_pairs += 1

    return {"vignette_ratio": round(float(np.mean(ratios)), 3) if ratios else 0,
            "blur_var": round(float(np.mean(blurs)), 1) if blurs else 0,
            "frames": len(grays),
            "black_frames": black, "flat_frames": flat, "tail_mean": round(tail_mean, 1),
            "motion": motion, "dup_pairs": dup_pairs}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--w", type=int, default=1620)
    ap.add_argument("--h", type=int, default=2880)
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--kind", choices=["motion", "mixed", "static"], default="mixed",
                    help="动态承诺: motion/mixed 实测运动量过低=判废(治PPT感)")
    ap.add_argument("--vignette", type=float, default=0.90)
    ap.add_argument("--blur", type=float, default=40.0)
    ap.add_argument("--silence-db", type=float, default=-50.0, help="mean_volume 低于此=静音(判废)")
    ap.add_argument("--min-motion", type=float, default=0.012, help="motion/mixed 形态运动量下限")
    ap.add_argument("--sync-tol", type=float, default=1.0, help="声画时长差容忍秒数")
    ap.add_argument("--min-cpm", type=float, default=3.0, help="每分钟切镜下限,低于=节奏偏慢(预警)")
    ap.add_argument("--max-shot", type=float, default=9.0, help="单镜头最长秒数,超过=停太久(预警)")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    l1 = ffprobe(a.video)
    au = audio_stats(a.video)
    l2 = analyze(a.video)
    pace = scene_pacing(a.video, l1["dur"])

    checks: list = []
    def chk(name, ok, got, want):
        checks.append({"check": name, "pass": bool(ok), "got": got, "want": want})

    # ── L1 硬闸(判废) ──
    chk("分辨率", l1["w"] == a.w and l1["h"] == a.h, f'{l1["w"]}x{l1["h"]}', f'{a.w}x{a.h}')
    chk("帧率", l1["fps"] == a.fps, l1["fps"], a.fps)
    chk("时长>0", l1["dur"] > 0, l1["dur"], ">0")
    chk("有音轨", l1["has_audio"], l1["has_audio"], True)
    # 静音: 有音轨但整体响度极低
    if l1["has_audio"]:
        chk("非静音", au["mean_db"] is not None and au["mean_db"] > a.silence_db,
            f'{au["mean_db"]}dB', f'>{a.silence_db}dB')
    # 声画时长错位: 视频 vs 音频(有符号)。+ = 视频比音频长(片尾无声 outro,正常);
    # 音频比视频长 > tol = 被截断(判废);视频比音频长 > 2.5s = 死黑/挂尾(判废)。
    if l1["has_audio"] and au["audio_dur"] > 0:
        diff = round(l1["dur"] - au["audio_dur"], 2)
        chk("声画同步", (diff >= -a.sync_tol) and (diff <= 2.5), f'视频长音频{diff}s', f'-{a.sync_tol}~+2.5s')
    # 黑屏: 抽样帧里出现近黑帧(≥2 或占比≥30%)=渲染翻车
    blackbad = l2["black_frames"] >= max(2, int(l2["frames"] * 0.3)) if l2["frames"] else False
    chk("无黑屏", not blackbad, f'{l2["black_frames"]}/{l2["frames"]}黑帧', "0")
    # 片尾黑屏专检(客户核心反馈):最后一帧亮度极低=片尾黑,判废
    chk("片尾非黑", l2["tail_mean"] >= 14, f'末帧亮度{l2["tail_mean"]}', "≥14")
    # 动态承诺: 声明 motion/mixed 但运动量过低 = PPT感/静态,判废
    if a.kind in ("motion", "mixed"):
        chk(f"运动量({a.kind})", l2["motion"] >= a.min_motion, l2["motion"], f'≥{a.min_motion}')

    passed = all(c["pass"] for c in checks)

    # ── L2 预警(不误杀,只复核) ──
    warnings: list = []
    if l2["vignette_ratio"] < a.vignette:
        warnings.append(f'暗角嫌疑(左右/中心亮度比 {l2["vignette_ratio"]} < {a.vignette})→ 跑 golden_check 确认引擎没漂')
    if l2["blur_var"] < a.blur:
        warnings.append(f'画面偏糊(Laplacian {l2["blur_var"]} < {a.blur})→ 复核')
    if au["max_db"] is not None and au["max_db"] >= -0.1:
        warnings.append(f'音频削峰嫌疑(max_volume {au["max_db"]}dB 触顶)→ 复核响度归一化')
    if l2["flat_frames"] >= max(2, int(l2["frames"] * 0.3)):
        warnings.append(f'纯色/单调画面偏多({l2["flat_frames"]}/{l2["frames"]})→ 复核是否信息量不足')
    if l2["dup_pairs"] >= 3:
        warnings.append(f'重复画面嫌疑(雷同帧对 {l2["dup_pairs"]})→ 复核是否换壳复读/配镜撞画面')
    # 节奏(scene_pacing): scene 检测只抓硬切,软转场(擦除/淡)会被漏算成超长镜头 → 不能单靠它判,
    # 只在「切得少 ﹠ 画面也静」(真 PPT 感)才预警;运动量高=有软转场/动感,不误杀。数值始终打印。
    if l1["dur"] >= 8 and pace["cuts_per_min"] < a.min_cpm and l2["motion"] < 0.05:
        warnings.append(f'疑似PPT感(每分钟切镜 {pace["cuts_per_min"]}<{a.min_cpm} 且 运动量 {l2["motion"]}<0.05 双低)→ 复核节奏/留人')

    if a.json:
        print(json.dumps({"video": os.path.basename(a.video), "pass": passed, "kind": a.kind,
                          "checks": checks, "warnings": warnings, "l1": l1, "audio": au, "l2": l2, "pacing": pace},
                         ensure_ascii=False, indent=2))
    else:
        print(f"== 质检 {os.path.basename(a.video)} [{a.kind}] : {'✅ 过' if passed else '❌ 不过'} ==")
        for c in checks:
            print(f"  {'✅' if c['pass'] else '❌'} {c['check']:10} 实测={c['got']} 要求={c['want']}")
        print(f"  ℹ️ 节奏: 切镜{pace['cuts']}次 / {pace['cuts_per_min']}每分钟 · 最长单镜头{pace['max_shot_s']}s | 运动量{l2['motion']}")
        for w in warnings:
            print(f"  ⚠️ {w}")
        if not warnings:
            print("  ⚠️ 预警:无")
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
