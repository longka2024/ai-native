# -*- coding: utf-8 -*-
# batch_fix.py — 修 15终版的撞车+失败:v1/v2/v3 改全新痛点(重写文案+配镜+渲染),08 补渲。
# 顺序渲染(避开4并发偶发失败)。输出覆盖 G:/longka-demo/mizan_15终版。
import os, json, subprocess, sys
TOOLS=os.path.dirname(os.path.abspath(__file__)); VR=os.path.normpath(os.path.join(TOOLS,"..","video-remotion"))
PUB=os.path.join(VR,"public"); IDX="G:/index-tts_v2.5"; PY312="G:/index-tts_v2.5/py312/python.exe"
OUT="G:/longka-demo/mizan_15终版"
MV="voices_real/voice_mizan_male.wav"; FV="voices_real/voice_03.wav"
N={"to":10,"unit":"万","label":"SKU 工厂价","decimals":0}

# vid,num,cs,voice,bgm(public相对),title,hl,locale,flag,sub,tags,beats(None=复用matched)
ITEMS=[
 {"vid":"v1","num":"11","cs":"lingzao","voice":MV,"bgm":"bgmpool/ad2_1_even.mp3",
  "title":"进的货\n包装看不懂?","hl":"看不懂","locale":"海外开店","flag":"","sub":"包装多国语言·直接上架","tags":"多国语言,直接上架,一件起订",
  "beats":[("在海外开店的华人,从国内进了一批货,到手才发现一个麻烦。","people"),
   ("包装全是中文,当地客人拿起来一脸茫然,看不懂成分也看不懂用法。","aisle"),
   ("想上架,还得自己一件件贴标、翻译,费时又不专业。","wall"),
   ("有的货干脆因为包装不合规,卡在上架这一步。","loading"),
   ("做久的都知道:货好不好卖,包装能不能直接上架是第一关。","people"),
   ("而米站的货,包装本身就支持多国语言。","category"),
   ("到了当地不用重新贴标,直接上架就能卖。","product"),
   ("十万多种货、工厂价、一件起订,省下的全是你的时间和成本。","wall",N),
   ("进货不止要便宜,还要能省心地卖出去。","people"),
   ("想让进的货到店直接上架,应用商店搜mizan。","download")]},
 {"vid":"v2","num":"12","cs":"question","voice":FV,"bgm":"bgmpool/ad2_2_even.mp3",
  "title":"货架\n总是老几样?","hl":"老几样","locale":"","flag":"","sub":"十万SKU源头直采·选择多","tags":"",
  "beats":[("在海外开店的华人,常被客人问同一句话:就这些吗,有没有新的?","people"),
   ("本地批发能拿的就那么几样,款式老、更新又慢。","aisle"),
   ("货架一年到头老面孔,回头客来两次就没了新鲜感。","wall"),
   ("想上新,本地又找不到货源,只能干着急。","people"),
   ("其实留住客人的关键,是货架常换常新。","aisle"),
   ("米站对接的是中国源头工厂,十万多种货、二十六个大类。","category",N),
   ("从日用到家居、从饰品到家电,选择多到挑花眼。","product"),
   ("工厂价、一件起订,想上什么新品随时补。","loading"),
   ("货架新鲜了,客人才愿意一次次回来。","people"),
   ("想让货架常换常新,应用商店搜mizan。","download")]},
 {"vid":"v3","num":"13","cs":"lingzaoTop","voice":MV,"bgm":"bgmpool/upbeat_1_even.mp3",
  "title":"从中国进货\n很麻烦?","hl":"很麻烦","locale":"海外开店","flag":"","sub":"手机App中文下单·像网购","tags":"手机下单,中文界面,工厂直发",
  "beats":[("很多海外开店的华人都动过从中国进货的念头,又很快打了退堂鼓。","people"),
   ("怕流程复杂、怕语言不通、怕不会操作、怕货到不了。","wall"),
   ("听起来跨境进货,好像是件很专业、很麻烦的事。","aisle"),
   ("但现在,它其实比你想的简单得多。","drone"),
   ("米站就是一个手机App,中文界面,像网购一样下单。","category"),
   ("十万多种货、工厂价、一件起订,挑好下单工厂直发到店。","wall",N),
   ("不用飞回国、不用找货代、不用懂外贸。","loading"),
   ("手机点几下,源头的货就到你店里。","product"),
   ("进货这件事,早就不该那么麻烦了。","people"),
   ("想像网购一样从源头进货,应用商店搜mizan。","download")]},
 {"vid":"es_tonghang","num":"08","cs":"question","voice":MV,"bgm":"bgmpool/upbeat_2_even.mp3",
  "title":"同行\n凭啥更便宜?","hl":"凭啥","locale":"","flag":"","sub":"进价压到底是工厂价","tags":"","beats":None},  # 08 复用已有matched
]
def run(cmd,cwd=None): return subprocess.run(cmd,cwd=cwd,shell=isinstance(cmd,str),capture_output=True,text=True,encoding="utf-8",errors="replace")
res=[]
for it in ITEMS:
    vid=it["vid"]; num=it["num"]; print(f"\n===== {num} {vid} =====",flush=True)
    matched=os.path.join(TOOLS,"mizan_scripts",f"beats_{vid}_matched.json")
    if it["beats"] is not None:  # 新文案:写beats+配镜
        beats=[]
        for b in it["beats"]:
            be={"text":b[0],"kind":"selling","feature":b[1],"hl":[]}
            if len(b)>2: be["num"]=b[2]; be["kind"]="number"
            beats.append(be)
        bp=os.path.join(TOOLS,"mizan_scripts",f"beats_{vid}.json")
        json.dump(beats,open(bp,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
        run([sys.executable,"assign_clips.py","--beats",f"mizan_scripts/beats_{vid}.json","--vid",vid,"--out",f"mizan_scripts/beats_{vid}_matched.json","--used","mizan_scripts/used_clips.json"],cwd=TOOLS)
        if not os.path.exists(matched): print("配镜失败"); res.append((num,"FAIL配镜")); continue
    args=[PY312,"build_mizan.py","--beats",matched,"--voice",it["voice"],"--voice-out",f"voice15_{vid}.mp3","--out",f"m15_{vid}.json","--workdir",f"outputs/m15_{vid}","--speed","1.2","--cover-style",it["cs"],"--title",it["title"],"--title-hl",it["hl"]]
    if it["locale"]: args+=["--cover-locale",it["locale"]]
    if it["flag"]: args+=["--cover-flag",it["flag"]]
    if it["sub"]: args+=["--cover-sub",it["sub"]]
    if it["tags"]: args+=["--cover-tags",it["tags"]]
    r=run(args,cwd=IDX)
    if not os.path.exists(os.path.join(VR,f"m15_{vid}.json")): print("配音失败",r.stderr[-300:]); res.append((num,"FAIL配音")); continue
    raw=f"{OUT}/{num}_{vid}_raw.mp4"
    run(f'npx remotion render Mizan "{raw}" --props=m15_{vid}.json --scale=1.5 --crf=16 --concurrency=8',cwd=VR)
    if not os.path.exists(raw): print("渲染失败"); res.append((num,"FAIL渲染")); continue
    fin=f"{OUT}/{num}_{vid}.mp4"; bgm=os.path.join(PUB,it["bgm"]); voicef=os.path.join(PUB,f"voice15_{vid}.mp3")
    run(["ffmpeg","-y","-loglevel","error","-i",raw,"-i",voicef,"-i",bgm,"-filter_complex",
         "[1:a]volume=1.0[v];[2:a]volume=0.10[b];[v][b]amix=inputs=2:duration=first:normalize=0[m];[m]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
         "-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k",fin])
    if os.path.exists(fin): os.remove(raw)
    run(["ffmpeg","-y","-loglevel","error","-i",fin,"-vframes","1",f"{OUT}/cover_{num}_{vid}.jpg"])
    r=run([sys.executable,"qc_gate.py",fin,"--json"],cwd=TOOLS)
    try: q=json.loads(r.stdout); ok=q.get("pass"); dur=q.get("l1",{}).get("dur")
    except: ok="?"; dur="?"
    print(f">> {num} {vid} dur={dur} qc={'过' if ok else ok}",flush=True); res.append((num,f"OK dur={dur} qc={'过' if ok else ok}"))
print("\n===== 修复结果 =====")
for n,s in sorted(res): print(f"  {n}: {s}")
# 删掉撞车的旧 11_v1(已被新内容覆盖,文件名同 11_v1.mp4 会被新版覆盖,无需额外删)
print("注:11/12/13 已是新内容;01/03/09 各自独立,不再撞车。")
