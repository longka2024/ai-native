# -*- coding: utf-8 -*-
# replica_compare.py — 对标复刻对齐验证(质检中台·候选 vs 对标参考)。
# 内化自 reference-video-replica-qc(Pluviobyte),改成我们规范:utf-8输出/GBK修复/尺寸不同自动缩放对齐/保真度分级。
# 哲学:证据驱动,别凭感觉宣称"像素级"——pixel 级要硬证据(字节相同 或 PSNR=inf 或 SSIM≈1)。
# 用法: py -3.14 replica_compare.py <参考.mp4> <候选.mp4> [--level pixel|visual|style] [--json]
#   配 golden_check.py(暗角SSIM vs 自家基准)用:这个是"候选 vs 外部对标参考"的全片对齐。
import subprocess, hashlib, json, argparse, os, sys, re, shutil

try:
    sys.stdout.reconfigure(encoding="utf-8"); sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def probe(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate", "-show_entries", "format=duration",
        "-of", "json", path]).stdout
    d = json.loads(out or "{}")
    st = (d.get("streams") or [{}])[0]; fm = d.get("format", {})
    rfr = st.get("r_frame_rate", "0/1"); n, dn = rfr.split("/")
    fps = round(float(n) / float(dn)) if float(dn) else 0
    return {"w": int(st.get("width", 0)), "h": int(st.get("height", 0)), "fps": fps,
            "dur": round(float(fm.get("duration", 0) or 0), 2)}


def bit_exact(a, b):
    # 文件大小不同直接非字节相同;相同再 sha 比
    if os.path.getsize(a) != os.path.getsize(b):
        return False
    return sha256(a) == sha256(b)


def metric(reference, candidate, ref_wh, name):
    """跑 PSNR/SSIM。候选自动缩放到参考尺寸(对标爆款分辨率常不同)。"""
    rw, rh = ref_wh
    lavfi = f"[1:v]scale={rw}:{rh}:flags=bicubic,setsar=1[c];[0:v]setsar=1[r];[r][c]{name}"
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", reference, "-i", candidate, "-lavfi", lavfi, "-f", "null", os.devnull])
    err = (r.stderr or "") + (r.stdout or "")
    if name == "psnr":
        m = re.search(r"average:([\d.]+|inf)", err)
        return m.group(1) if m else "?"
    m = re.search(r"All:([\d.]+)", err)
    return m.group(1) if m else "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("reference"); ap.add_argument("candidate")
    ap.add_argument("--level", choices=["pixel", "visual", "style"], default="visual",
                    help="要求的保真度:pixel=逐像素 / visual=视觉级对齐 / style=只借风格")
    ap.add_argument("--ssim-visual", type=float, default=0.92, help="visual 级 SSIM 通过线")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print("需要 ffmpeg/ffprobe"); sys.exit(2)

    be = bit_exact(a.reference, a.candidate)
    rp, cp = probe(a.reference), probe(a.candidate)
    psnr = "inf" if be else metric(a.reference, a.candidate, (rp["w"], rp["h"]), "psnr")
    ssim = "1.0" if be else metric(a.reference, a.candidate, (rp["w"], rp["h"]), "ssim")
    try:
        ssim_f = float(ssim)
    except ValueError:
        ssim_f = -1.0
    psnr_inf = (psnr == "inf")

    # 保真度判定(证据驱动,别 over-claim)
    pixel_ok = be or psnr_inf or ssim_f >= 0.999
    visual_ok = ssim_f >= a.ssim_visual
    if a.level == "pixel":
        passed = pixel_ok; need = "字节相同 / PSNR=inf / SSIM≥0.999"
    elif a.level == "visual":
        passed = visual_ok; need = f"SSIM≥{a.ssim_visual}"
    else:  # style 级靠人/VLM 判风格,不靠像素
        passed = True; need = "风格级(像素指标仅供参考,风格对齐靠人/VLM判)"

    res = {"reference": os.path.basename(a.reference), "candidate": os.path.basename(a.candidate),
           "level": a.level, "pass": passed, "bit_exact": be, "psnr": psnr, "ssim": ssim,
           "ref": rp, "cand": cp, "size_mismatch": (rp["w"], rp["h"]) != (cp["w"], cp["h"]),
           "dur_diff": round(abs(rp["dur"] - cp["dur"]), 2)}
    if a.json:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        print(f"== 复刻对齐 [{a.level}级] : {'✅ 通过' if passed else '❌ 未对齐'} ==")
        print(f"  字节相同={be} | PSNR={psnr} | SSIM={ssim}")
        print(f"  参考 {rp['w']}x{rp['h']}@{rp['fps']} {rp['dur']}s  vs  候选 {cp['w']}x{cp['h']}@{cp['fps']} {cp['dur']}s")
        if res["size_mismatch"]:
            print(f"  ⚠️ 尺寸不同(已缩放候选到参考尺寸再比 SSIM)")
        if res["dur_diff"] > 0.5:
            print(f"  ⚠️ 时长差 {res['dur_diff']}s(可能有镜头缺失/多余,需逐时间戳核)")
        print(f"  要求({a.level}级):{need}")
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
