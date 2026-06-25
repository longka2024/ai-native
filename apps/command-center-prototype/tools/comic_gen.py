#!/usr/bin/env python3
# comic_gen.py — 小妹漫画生成器(被 server.mjs spawn)。
# 入参: jobId。读 media/comic/<jobId>/content.txt → 调 xiaomei-scenes skill → 每格 Kie nano-banana-edit(小妹人设图当参考,强制无字)
# → PIL 叠中文对白(Noto CJK)+ 拼网格 → media/comic/<jobId>/comic.jpg。全程写 status.json。
import json, time, urllib.request, os, sys, math

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.environ.get("XIAOMEI_REF_URL", "http://122.51.218.154/ai-native-v2/media/persona/full_flat.jpg")
SKILL_API = os.environ.get("SKILL_API", "http://localhost:3760/api/skills/run")
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
NOTEXT = " . IMPORTANT: absolutely NO text, no Chinese characters, no letters, no numbers, no speech bubbles, no captions, no labels anywhere in the image. Clean wordless illustration only."

jobId = sys.argv[1]
D = os.path.join(APP, "media", "comic", jobId)
os.makedirs(D, exist_ok=True)

def status(**kw):
    cur = {"status": "running", "done": 0, "total": 4, "url": "", "error": ""}
    p = os.path.join(D, "status.json")
    if os.path.exists(p):
        try: cur.update(json.load(open(p)))
        except: pass
    cur.update(kw)
    json.dump(cur, open(p, "w"), ensure_ascii=False)

def kie_key():
    for line in open(os.path.join(APP, ".env")):
        if line.startswith("KIE_API_KEY"):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

def main():
    try:
        content = open(os.path.join(D, "content.txt"), encoding="utf-8").read()
        status(status="running", done=0)
        # 1) 调 skill 拿分镜
        req = urllib.request.Request(SKILL_API, data=json.dumps({"skill": "xiaomei-scenes", "content": content}).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        sk = json.loads(urllib.request.urlopen(req, timeout=90).read().decode())
        shots = ((sk.get("result") or {}).get("shots") or [])[:4]
        if not shots:
            status(status="error", error="skill_no_shots"); return
        status(total=len(shots))
        key = kie_key()
        def post(b):
            r = urllib.request.Request("https://api.kie.ai/api/v1/jobs/createTask", data=json.dumps(b).encode(),
                                       headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"}, method="POST")
            return json.loads(urllib.request.urlopen(r, timeout=40).read().decode())
        def get(t):
            r = urllib.request.Request("https://api.kie.ai/api/v1/jobs/recordInfo?taskId=" + t, headers={"Authorization": "Bearer " + key})
            return json.loads(urllib.request.urlopen(r, timeout=40).read().decode()).get("data") or {}
        # 2) 每格出图(无字)
        tasks = {}
        for i, s in enumerate(shots):
            p = (s.get("imagePrompt") or "") + NOTEXT
            try:
                tasks[i] = (post({"model": "google/nano-banana-edit", "input": {"prompt": p, "image_urls": [REF]}}).get("data") or {}).get("taskId")
            except Exception as e:
                pass
        panels = {}
        for _ in range(45):
            time.sleep(6)
            for i, tid in tasks.items():
                if i in panels or not tid: continue
                try:
                    dd = get(tid); st = dd.get("state")
                    if st == "success":
                        obj = json.loads(dd.get("resultJson")) if isinstance(dd.get("resultJson"), str) else (dd.get("resultJson") or {})
                        urls = obj.get("resultUrls") or obj.get("urls") or []
                        if urls:
                            rq = urllib.request.Request(urls[0], headers={"User-Agent": "Mozilla/5.0"})
                            open(os.path.join(D, "clean_%d.jpg" % i), "wb").write(urllib.request.urlopen(rq, timeout=60).read())
                            panels[i] = 1
                    elif st == "fail":
                        panels[i] = 0
                except Exception:
                    pass
            status(done=sum(1 for v in panels.values() if v == 1))
            if len(panels) >= len(tasks): break
        ok = [i for i in range(len(shots)) if panels.get(i) == 1]
        if not ok:
            status(status="error", error="all_panels_failed"); return
        # 3) PIL 叠字 + 拼网格
        from PIL import Image, ImageDraw, ImageFont
        def font(sz):
            for idx in (2, 0, 1):
                try: return ImageFont.truetype(FONT, sz, index=idx)
                except: pass
            return ImageFont.load_default()
        F = font(34)
        W, H = 720, 960
        def wrap(d, txt, fnt, maxw):
            lines, cur = [], ""
            for ch in txt:
                if ch == "\n": lines.append(cur); cur = ""; continue
                if d.textlength(cur + ch, font=fnt) <= maxw: cur += ch
                else: lines.append(cur); cur = ch
            if cur: lines.append(cur)
            return lines
        def panel(i, cap):
            im = Image.open(os.path.join(D, "clean_%d.jpg" % i)).convert("RGB")
            r = max(W / im.width, H / im.height)
            im = im.resize((int(im.width * r), int(im.height * r)))
            x = (im.width - W) // 2; y = (im.height - H) // 2
            im = im.crop((x, y, x + W, y + H))
            d = ImageDraw.Draw(im)
            if cap:
                lines = wrap(d, cap, F, W - 70); lh = 46; bh = len(lines) * lh + 28
                d.rectangle([0, H - bh, W, H], fill=(255, 255, 255))
                d.line([0, H - bh, W, H - bh], fill=(230, 225, 215), width=2)
                ty = H - bh + 14
                for ln in lines:
                    tw = d.textlength(ln, font=F); d.text(((W - tw) // 2, ty), ln, font=F, fill=(40, 30, 20)); ty += lh
            return im
        caps = [(shots[i].get("caption") or "") for i in ok]
        n = len(ok)
        cols = 1 if n == 1 else 2
        rows = math.ceil(n / cols)
        G = 10
        canvas = Image.new("RGB", (W * cols + G * (cols + 1), H * rows + G * (rows + 1)), (245, 242, 236))
        for idx, i in enumerate(ok):
            rr, cc = idx // cols, idx % cols
            canvas.paste(panel(i, caps[idx]), (G + cc * (W + G), G + rr * (H + G)))
        canvas.save(os.path.join(D, "comic.jpg"), quality=92)
        status(status="done", done=n, url="media/comic/%s/comic.jpg" % jobId)
    except Exception as e:
        status(status="error", error=str(e)[:200])

main()
