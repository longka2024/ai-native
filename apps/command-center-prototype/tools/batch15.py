# -*- coding: utf-8 -*-
# batch15.py — 把 5 老 + 10 新统一成一套 15 条:复用已配镜 beats → 重配音(男/女轮换)
#   → 渲染(带 logo 动效 + 封面 emoji 已换国旗图/文字)→ 6段BGM轮换 + loudnorm响度归一化 → 封面 → qc。
# 跑: py -3.14 batch15.py
import os, json, subprocess, sys
TOOLS=os.path.dirname(os.path.abspath(__file__)); VR=os.path.normpath(os.path.join(TOOLS,"..","video-remotion"))
PUB=os.path.join(VR,"public"); IDX="G:/index-tts_v2.5"; PY312="G:/index-tts_v2.5/py312/python.exe"
OUT="G:/longka-demo/mizan_15终版"; os.makedirs(OUT,exist_ok=True)
MV="voices_real/voice_mizan_male.wav"; FV="voices_real/voice_03.wav"
POOL=["bgmpool/upbeat_1_even.mp3","bgmpool/upbeat_2_even.mp3","bgmpool/ad1_1_even.mp3","bgmpool/ad1_2_even.mp3","bgmpool/ad2_1_even.mp3","bgmpool/ad2_2_even.mp3"]

# vid, num, cs(封面样式), voice(m/f), title, hl, locale, flag, sub, tags
M=[
 ("xb_huoyuan","01","question","m","海外开店\n货从哪进?","货从哪进","","","补货不用再慌",""),
 ("it_zhongjian","02","lingzao","m","进货\n亏在哪?","亏在哪","意大利","it","利润别被中间商吃","工厂价,砍中间层,一件起订"),
 ("cl_xuanpin","03","question","f","选品\n该赌吗?","该赌吗","","","小批量试,别压死钱",""),
 ("pt_feihuiguo","04","lingzaoTop","m","进货\n还飞回国?","还飞回国","葡萄牙","pt","手机下单不用飞","工厂价,一件起订,海外仓"),
 ("ag_fabudao","05","question","m","好货\n发不到你那?","发不到","","","中国站直发到店",""),
 ("mx_zhuanxing","06","lingzao","f","百元店\n还能做吗?","还能做吗","墨西哥","mx","转型货源一站配齐","26大类,工厂价,海外仓"),
 ("gr_haiyun","07","lingzaoTop","m","拼海运\n划算吗?","划算吗","希腊","gr","一件起订不用凑大单","工厂价,一件起订,直发"),
 ("es_tonghang","08","question","m","同行\n凭啥更便宜?","凭啥","","","进价压到底是工厂价",""),
 ("cl_zhanting","09","lingzao","f","中国直采\n差多少?","差多少","智利","cl","义乌展厅一看就懂","工厂价,一件起订,海外仓"),
 ("ec_yizhan","10","lingzaoTop","m","全店的货\n配得齐吗?","配得齐","厄瓜多尔","ec","十万SKU一站搞定","26大类,一件起订,直发"),
 ("v1","11","question","m","海外华人超市\n货从哪进?","货从哪进","","","三条进货路 + 第四条",""),
 ("v2","12","lingzao","f","西班牙进货\n到底省多少?","省多少","西班牙开店","es","算笔账给你看","工厂价,省两成,海外仓直发"),
 ("v3","13","lingzaoTop","m","海外百货店\n进什么好卖?","什么好卖","海外百货","","欧美南美热销品类","10万SKU,26大类,一站选齐"),
 ("v4","14","question","m","海外开百货店\n稳不稳?","稳不稳","","","日用品月月复购",""),
 ("v5","15","lingzao","f","mizan\n三分钟开通","三分钟","手机开通","","手机注册教程","搜mizan,免费注册,工厂直采"),
]
from concurrent.futures import ThreadPoolExecutor
def run(cmd,cwd=None): return subprocess.run(cmd,cwd=cwd,shell=isinstance(cmd,str),capture_output=True,text=True,encoding="utf-8",errors="replace")

# ── 阶段1:配音+props(单 GPU,顺序)──
ready=[]
print(">> 阶段1 配音(15条·单卡顺序)",flush=True)
for i,(vid,num,cs,vo,title,hl,locale,flag,sub,tags) in enumerate(M):
    matched=os.path.join(TOOLS,"mizan_scripts",f"beats_{vid}_matched.json")
    if not os.path.exists(matched): print(f"  {num} 缺matched,跳"); continue
    voice=FV if vo=="f" else MV
    args=[PY312,"build_mizan.py","--beats",matched,"--voice",voice,"--voice-out",f"voice15_{vid}.mp3","--out",f"m15_{vid}.json","--workdir",f"outputs/m15_{vid}","--speed","1.2","--cover-style",cs,"--title",title,"--title-hl",hl]
    if locale: args+=["--cover-locale",locale]
    if flag: args+=["--cover-flag",flag]
    if sub: args+=["--cover-sub",sub]
    if tags: args+=["--cover-tags",tags]
    run(args,cwd=IDX)
    if os.path.exists(os.path.join(VR,f"m15_{vid}.json")): print(f"  {num} {vid} 配音OK",flush=True); ready.append((i,vid,num,vo))
    else: print(f"  {num} {vid} 配音失败",flush=True)

# ── 阶段2:渲染(并发,最多4条同时,每条--concurrency 5,吃满24核)──
print(f">> 阶段2 并发渲染({len(ready)}条·4并发)",flush=True)
def render_one(item):
    i,vid,num,vo=item; raw=f"{OUT}/{num}_{vid}_raw.mp4"
    run(f'npx remotion render Mizan "{raw}" --props=m15_{vid}.json --scale=1.5 --crf=16 --concurrency=5',cwd=VR)
    print(f"  {num} {vid} 渲染{'OK' if os.path.exists(raw) else '失败'}",flush=True)
    return (item, raw if os.path.exists(raw) else None)
with ThreadPoolExecutor(max_workers=4) as ex: rendered=list(ex.map(render_one,ready))

# ── 阶段3:换音轨(BGM轮换+loudnorm)+封面+qc(并发)──
print(">> 阶段3 换音轨+封面+质检",flush=True)
def finalize(rr):
    (i,vid,num,vo),raw=rr
    if not raw: return (num,"FAIL渲染")
    fin=f"{OUT}/{num}_{vid}.mp4"; bgm=os.path.join(PUB,POOL[i%len(POOL)]); voicef=os.path.join(PUB,f"voice15_{vid}.mp3")
    run(["ffmpeg","-y","-loglevel","error","-i",raw,"-i",voicef,"-i",bgm,"-filter_complex",
         "[1:a]volume=1.0[v];[2:a]volume=0.10[b];[v][b]amix=inputs=2:duration=first:normalize=0[m];[m]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
         "-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k",fin])
    if os.path.exists(fin): os.remove(raw)
    run(["ffmpeg","-y","-loglevel","error","-i",fin,"-vframes","1",f"{OUT}/cover_{num}_{vid}.jpg"])
    r=run([sys.executable,"qc_gate.py",fin,"--json"],cwd=TOOLS)
    try: q=json.loads(r.stdout); ok=q.get("pass"); dur=q.get("l1",{}).get("dur")
    except: ok="?"; dur="?"
    return (num,f"OK dur={dur} qc={'过' if ok else ok} {'女' if vo=='f' else '男'} {POOL[i%len(POOL)].split('/')[-1]}")
with ThreadPoolExecutor(max_workers=6) as ex: res=list(ex.map(finalize,rendered))
print("\n===== 15条结果 =====")
for n,s in sorted(res): print(f"  {n}: {s}")
