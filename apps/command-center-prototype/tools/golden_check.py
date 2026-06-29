# -*- coding: utf-8 -*-
# golden_check.py — golden SSIM 回归(质检中台·焊死引擎视觉漂移=暗角)。
# 原理:固定测试 props(golden/golden_test.json)用"当前引擎"渲一段 → 抽固定帧 → 跟"人工批准的基准帧"比 SSIM。
#       引擎被偷改(加暗角/字号退化/转场变了)→ SSIM 掉 → 退出码非零 = 漂移报警。同内容比,零误杀。
# 用法:
#   py -3.14 golden_check.py --update-baseline   # 渲当前引擎、存为基准(只在人工确认引擎是认可状态时跑)
#   py -3.14 golden_check.py                      # 渲当前引擎、跟基准比;SSIM 低于阈值=漂移=退出1
import subprocess, os, sys, argparse, tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "video-remotion"))
BASE = os.path.join(VR, "golden", "baseline")
TIMES = [1.2, 2.0, 3.6]  # 固定抽帧时刻:封面/实拍(暗角层)/数字图表
THRESH = 0.97            # 干净≈0.99-1.0;暗角漂移掉到0.93-0.956。0.97 卡中间,两边都有间距

def render_tmp():
    out = os.path.join(tempfile.gettempdir(), "golden_render.mp4")
    if os.path.exists(out): os.remove(out)
    cmd = f'npx remotion render Mizan "{out}" --props=golden/golden_test.json --scale=1 --crf=18'
    r = subprocess.run(cmd, cwd=VR, shell=True, capture_output=True, text=True)
    if not os.path.exists(out):
        print("渲染失败:\n", r.stderr[-800:] or r.stdout[-800:]); sys.exit(2)
    return out

def extract(mp4, prefix):
    paths = []
    for i, t in enumerate(TIMES):
        p = os.path.join(tempfile.gettempdir(), f"{prefix}_{i}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", mp4, "-vframes", "1", p], check=False)
        paths.append(p)
    return paths

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--update-baseline", action="store_true")
    ap.add_argument("--thresh", type=float, default=THRESH)
    a = ap.parse_args()
    import cv2
    from skimage.metrics import structural_similarity as ssim

    mp4 = render_tmp()
    frames = extract(mp4, "cur")

    if a.update_baseline:
        os.makedirs(BASE, exist_ok=True)
        for i, f in enumerate(frames):
            import shutil; shutil.copyfile(f, os.path.join(BASE, f"golden_{i}.png"))
        print(f"✅ 基准已更新({len(frames)} 帧)→ {BASE}\n   (确认当前引擎=认可状态才该跑这个)")
        return

    if not os.path.isdir(BASE) or not os.listdir(BASE):
        print("❌ 没有基准帧,先跑 --update-baseline"); sys.exit(2)

    worst = 1.0; rows = []
    for i, f in enumerate(frames):
        b = os.path.join(BASE, f"golden_{i}.png")
        cur = cv2.cvtColor(cv2.imread(f), cv2.COLOR_BGR2GRAY)
        base = cv2.cvtColor(cv2.imread(b), cv2.COLOR_BGR2GRAY)
        if cur.shape != base.shape:
            cur = cv2.resize(cur, (base.shape[1], base.shape[0]))
        s = ssim(base, cur)
        worst = min(worst, s)
        rows.append((i, TIMES[i], round(float(s), 4)))
    drift = worst < a.thresh
    print(f"== golden SSIM 回归 : {'❌ 漂移!引擎被改动(查暗角/字幕/转场)' if drift else '✅ 无漂移,引擎跟认可基准一致'} ==")
    for i, t, s in rows:
        print(f"  帧{i}(t={t}s) SSIM={s} {'❌<'+str(a.thresh) if s < a.thresh else '✅'}")
    print(f"  最低 SSIM={round(float(worst),4)} 阈值={a.thresh}")
    sys.exit(1 if drift else 0)

if __name__ == "__main__":
    main()
