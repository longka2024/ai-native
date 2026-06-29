# -*- coding: utf-8 -*-
# batch_render.py — 只重渲(去暗幕引擎),复用已有 props(m15_*.json)+配音(voice15_*.mp3)。
# 不重配音,所以快。BGM 轮换沿用 batch15 的 POOL[i%6]。
import os, json, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
TOOLS=os.path.dirname(os.path.abspath(__file__)); VR=os.path.normpath(os.path.join(TOOLS,"..","video-remotion"))
PUB=os.path.join(VR,"public"); OUT="G:/longka-demo/mizan_15终版"
POOL=["bgmpool/upbeat_1_even.mp3","bgmpool/upbeat_2_even.mp3","bgmpool/ad1_1_even.mp3","bgmpool/ad1_2_even.mp3","bgmpool/ad2_1_even.mp3","bgmpool/ad2_2_even.mp3"]
# (vid, num) 顺序与 batch15 一致,i 决定 BGM
ITEMS=[("xb_huoyuan","01"),("it_zhongjian","02"),("cl_xuanpin","03"),("pt_feihuiguo","04"),("ag_fabudao","05"),
 ("mx_zhuanxing","06"),("gr_haiyun","07"),("es_tonghang","08"),("cl_zhanting","09"),("ec_yizhan","10"),
 ("v1","11"),("v2","12"),("v3","13"),("v4","14"),("v5","15")]
def run(cmd,cwd=None): return subprocess.run(cmd,cwd=cwd,shell=isinstance(cmd,str),capture_output=True,text=True,encoding="utf-8",errors="replace")
def render_one(t):
    i=ITEMS.index(t); vid,num=t
    props=os.path.join(VR,f"m15_{vid}.json")
    if not os.path.exists(props): print(f"{num} 无props,跳"); return (num,"FAIL无props")
    raw=f"{OUT}/{num}_{vid}_raw.mp4"
    run(f'npx remotion render Mizan "{raw}" --props=m15_{vid}.json --scale=1.5 --crf=16 --concurrency=5',cwd=VR)
    if not os.path.exists(raw): print(f"{num} 渲染失败"); return (num,"FAIL渲染")
    fin=f"{OUT}/{num}_{vid}.mp4"; bgm=os.path.join(PUB,POOL[i%len(POOL)]); voicef=os.path.join(PUB,f"voice15_{vid}.mp3")
    run(["ffmpeg","-y","-loglevel","error","-i",raw,"-i",voicef,"-i",bgm,"-filter_complex",
         "[1:a]volume=1.0[v];[2:a]volume=0.10[b];[v][b]amix=inputs=2:duration=first:normalize=0[m];[m]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
         "-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k",fin])
    if os.path.exists(fin): os.remove(raw)
    run(["ffmpeg","-y","-loglevel","error","-i",fin,"-vframes","1",f"{OUT}/cover_{num}_{vid}.jpg"])
    print(f">> {num} {vid} 重渲OK",flush=True); return (num,"OK")
print(">> 去暗幕·重渲 15 条(4并发)",flush=True)
with ThreadPoolExecutor(max_workers=4) as ex: res=list(ex.map(render_one,ITEMS))
print("\n===== 结果 =====");
for n,s in sorted(res): print(f"  {n}: {s}")
