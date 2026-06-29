# -*- coding: utf-8 -*-
# qc_gate.py — 视频质检闸门(质检中台 L1+L2)。脚本必抓,过不了非零退出,别靠肉眼。
# L1 确定性(ffprobe):分辨率/帧率/时长/音轨。
# L2 数值(OpenCV,本机免费):暗角(左右边缘中段 vs 中心亮度比,避开顶部角标+底部字幕)、模糊(Laplacian 方差)。
# 用法: py -3.14 qc_gate.py <video.mp4> [--w 1620 --h 2880 --fps 60 --vignette 0.78 --blur 60 --json]
# 退出码 0=过,1=不过。golden SSIM 回归(L3 后续单独加)。
import subprocess, json, argparse, tempfile, os, sys, glob

def ffprobe(path):
    out = subprocess.run(["ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=width,height,r_frame_rate","-show_entries","format=duration",
        "-of","json",path], capture_output=True, text=True).stdout
    d = json.loads(out)
    st = d.get("streams",[{}])[0]; fm = d.get("format",{})
    w = int(st.get("width",0)); h = int(st.get("height",0))
    rfr = st.get("r_frame_rate","0/1"); n,dn = rfr.split("/"); fps = round(float(n)/float(dn)) if float(dn) else 0
    dur = float(fm.get("duration",0) or 0)
    a = subprocess.run(["ffprobe","-v","error","-select_streams","a","-show_entries","stream=index","-of","csv=p=0",path],capture_output=True,text=True).stdout.strip()
    return {"w":w,"h":h,"fps":fps,"dur":round(dur,2),"has_audio":bool(a)}

def sample_frames(path, n=8):
    import cv2
    tmp = tempfile.mkdtemp()
    info = ffprobe(path); dur = info["dur"] or 1
    paths=[]
    for i in range(n):
        t = dur*(i+1)/(n+1)
        p = os.path.join(tmp,f"f{i}.png")
        subprocess.run(["ffmpeg","-y","-loglevel","error","-ss",str(t),"-i",path,"-vframes","1",p],check=False)
        if os.path.exists(p): paths.append(p)
    return paths, tmp

def analyze(path, n=8):
    import cv2, numpy as np
    paths, tmp = sample_frames(path, n)
    ratios=[]; blurs=[]
    for p in paths:
        img = cv2.imread(p);
        if img is None: continue
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype("float32")
        h,w = g.shape
        # 暗角:左右边缘竖直中段(避开顶部角标/底部字幕) vs 中心
        y0,y1 = int(h*0.35), int(h*0.65)
        left  = g[y0:y1, 0:int(w*0.07)].mean()
        right = g[y0:y1, int(w*0.93):w].mean()
        center= g[y0:y1, int(w*0.42):int(w*0.58)].mean()
        ratio = (left+right)/2.0 / max(center,1.0)
        ratios.append(ratio)
        blurs.append(cv2.Laplacian(g, cv2.CV_32F).var())
    for p in paths:
        try: os.remove(p)
        except: pass
    try: os.rmdir(tmp)
    except: pass
    return {"vignette_ratio": round(float(np.mean(ratios)),3) if ratios else 0,
            "blur_var": round(float(np.mean(blurs)),1) if blurs else 0,
            "frames": len(ratios)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--w", type=int, default=1620); ap.add_argument("--h", type=int, default=2880)
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--vignette", type=float, default=0.90, help="左右/中心亮度比下限,低于=暗角(越接近1越无暗角;实测有暗角0.81/无0.98+)")
    ap.add_argument("--blur", type=float, default=40.0, help="Laplacian方差下限,低于=糊")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    l1 = ffprobe(a.video)
    l2 = analyze(a.video)
    # 硬闸(L1 确定性):不过=判废
    checks = []
    def chk(name, ok, got, want): checks.append({"check":name,"pass":bool(ok),"got":got,"want":want})
    chk("分辨率", l1["w"]==a.w and l1["h"]==a.h, f'{l1["w"]}x{l1["h"]}', f'{a.w}x{a.h}')
    chk("帧率",   l1["fps"]==a.fps, l1["fps"], a.fps)
    chk("时长>0", l1["dur"]>0, l1["dur"], ">0")
    chk("有音轨", l1["has_audio"], l1["has_audio"], True)
    passed = all(c["pass"] for c in checks)
    # 预警(L2 数值启发式):跨内容亮度阈值不可靠(暗场景会误杀),只提示人/复核,不判废。
    # 暗角的"硬毙"靠 golden_check.py(同内容 SSIM 比基准,零误杀)。
    warnings = []
    if l2["vignette_ratio"] < a.vignette:
        warnings.append(f'暗角嫌疑(左右/中心亮度比 {l2["vignette_ratio"]} < {a.vignette})→ 复核,或跑 golden_check 确认引擎没漂')
    if l2["blur_var"] < a.blur:
        warnings.append(f'画面偏糊(Laplacian {l2["blur_var"]} < {a.blur})→ 复核')

    if a.json:
        print(json.dumps({"video":os.path.basename(a.video),"pass":passed,"checks":checks,"warnings":warnings,"l1":l1,"l2":l2}, ensure_ascii=False, indent=2))
    else:
        print(f"== 质检 {os.path.basename(a.video)} : {'✅ 过(硬指标)' if passed else '❌ 不过'} ==")
        for c in checks:
            print(f"  {'✅' if c['pass'] else '❌'} {c['check']:6} 实测={c['got']} 要求={c['want']}")
        for w in warnings:
            print(f"  ⚠️ {w}")
        if not warnings: print("  ⚠️ 预警:无(暗角/模糊数值正常)")
    sys.exit(0 if passed else 1)

if __name__ == "__main__":
    main()
