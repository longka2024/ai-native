# -*- coding: utf-8 -*-
# batch9.py — 一条龙批量出 9 条 mizan 视频(第三人称专业洞察口吻)。
# 链路/条: 写beats → assign_clips(--used去重) → build_mizan(问句/丰满封面轮换,克隆男声) → remotion渲染
#          → loudnorm换音轨(BGM ad1/ad2/hype轮换,响度归一化) → 抽封面 → qc_gate质检。
# 跑: py -3.14 batch9.py   (本机;build_mizan 走 G: py312)
import os, json, subprocess, sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
VR = os.path.normpath(os.path.join(TOOLS, "..", "video-remotion"))
PUB = os.path.join(VR, "public")
IDX = "G:/index-tts_v2.5"; PY312 = "G:/index-tts_v2.5/py312/python.exe"
OUT = "G:/longka-demo/batch10"
USED = os.path.join(TOOLS, "mizan_scripts", "used_clips.json")
MVOICE = "voices_real/voice_mizan_male.wav"
BGM = {"ad1": "bgm_ad1_even.mp3", "ad2": "bgm_ad2_even.mp3", "hype": "suno_hype_even.mp3"}
os.makedirs(OUT, exist_ok=True)

# beats: (text, feature[, num]).  feature: people/wall/aisle/loading/drone/product/category(录屏)/download(录屏)
N = {"to": 10, "unit": "万", "label": "SKU 工厂价", "decimals": 0}
T = [
 {"vid":"it_zhongjian","num":"02","cs":"lingzao","voice":MVOICE,"bgm":"ad2",
  "title":"进货\n亏在哪?","hl":"亏在哪","locale":"意大利","flag":"it","sub":"利润别被中间商吃","tags":"工厂价,砍中间层,一件起订",
  "beats":[("在意大利开店的华人,辛苦一年算下来,利润常常薄得吓人。","people"),("可问题往往不在卖货,在进货。","wall"),
   ("一件货从工厂到你店里,要过多少手?","aisle"),("一级批发、二级分销、再到零售,每层都抽一道。","loading"),
   ("等你拿到手,价早翻了不止一倍,你卖的其实是第三、第四手货。","wall"),
   ("更亏的是,有人贪一批低价货,到手一半临期、款式过季,压仓库卖不动。","aisle"),
   ("做久的老板都看明白了:省下的每一分利润,都藏在你走的是第几手货里。","people"),
   ("而米站,就是把中间这几层全砍掉。","category"),("直接对接中国源头,工厂出厂价,手机一件起订,工厂直接发货。","drone"),
   ("十万多种货、工厂价,不用先囤一大堆压着钱。","wall",N),
   ("进货价压到底,利润才是你自己的。","people"),("想让利润不再被中间商一层层吃掉,应用商店搜米站。","download")]},

 {"vid":"cl_xuanpin","num":"03","cs":"question","voice":MVOICE,"bgm":"hype",
  "title":"选品\n该赌吗?","hl":"该赌吗","sub":"小批量试,别压死钱","tags":"",
  "beats":[("在智利海外开店,最容易把钱压死的,不是房租,是赌错了货。","people"),
   ("很多新手一上来就赌大的,看哪个好像好卖就一口气进一大批。","aisle"),
   ("结果款式过季、当地不认,几百件压在仓库,活钱全变死钱。","wall"),
   ("其实做久的都懂:选品不是赌博,是试出来的。","people"),
   ("先小批量上几款,哪个动得快补哪个,卖不动的及时止损。","aisle"),
   ("可难就难在,本地批发起订量大,你想小批量试都试不了。","loading"),
   ("而米站,十万多种货、工厂价,八成支持一件起订。","category",N),
   ("想试什么先拿几件铺货架,智利还有自营仓,哪款卖爆随时就近补。","loading"),
   ("选品不靠赌,靠小步快试。","people"),("想把选品风险降到最低,应用商店搜米站。","download")]},

 {"vid":"pt_feihuiguo","num":"04","cs":"lingzaoTop","voice":MVOICE,"bgm":"ad1",
  "title":"进货\n还飞回国?","hl":"还飞回国","locale":"葡萄牙","flag":"pt","sub":"手机下单不用飞","tags":"工厂价,一件起订,海外仓",
  "beats":[("在海外开店的华人,过去补货几乎都靠一件事:一年飞回国一两趟。","people"),
   ("跑义乌、广州的批发市场,听着风光,实际多累自己知道。","loading"),
   ("来回机票、住一礼拜酒店,白天泡市场一件件挑,晚上还得对账打包。","aisle"),
   ("更别说一趟得备齐大半年的货,资金一次压一大笔,选错还砸手里。","wall"),
   ("人折腾一圈,钱没省多少,店里还得找人盯。","people"),
   ("其实现在,这趟可以不用飞了。","drone"),
   ("米站把整个义乌、广州的源头搬上了手机。","category"),
   ("随时打开按品类挑货,工厂价、一件起订,葡萄牙还有自营仓就近补,十来天到。","loading",N),
   ("补货从飞一趟变成点几下,省下的精力全花在守店上。","people"),
   ("想告别年年飞回国进货,应用商店搜米站。","download")]},

 {"vid":"ag_fabudao","num":"05","cs":"question","voice":MVOICE,"bgm":"ad2",
  "title":"好货\n发不到你那?","hl":"发不到","sub":"中国站直发到店","tags":"",
  "beats":[("在阿根廷,或者南美偏远些的城市开店,常碰到一个尴尬。","people"),
   ("看上的好货源,一问发货,对方一句:发不到你那。","wall"),
   ("本地批发品类配不齐、价又高;想从中国进,又怕货卡在中途。","aisle"),
   ("所以很多人宁可凑合用本地贵货,也不敢碰跨境。","people"),
   ("其实这几年从中国源头直发,反而比层层转运更稳、更透明。","loading"),
   ("米站,中国站工厂价直接下单,十万多种货、一件起订,直发到店。","category",N),
   ("走哪条线、大概多久到,下单页写得清清楚楚,不用提心吊胆等。","drone"),
   ("开店在偏一点的地方,一样能进到便宜又全的货。","people"),
   ("想让好货源也能发到你这,应用商店搜米站。","download")]},

 {"vid":"mx_zhuanxing","num":"06","cs":"lingzao","voice":MVOICE,"bgm":"hype",
  "title":"百元店\n还能做吗?","hl":"还能做吗","locale":"墨西哥","flag":"mx","sub":"转型货源一站配齐","tags":"26大类,工厂价,海外仓",
  "beats":[("这两年海外的百元店、一欧店越来越难做,关的比开的还多。","people"),
   ("不是华人不会做生意,是纯靠低价杂货走量这套,利润越摊越薄。","wall"),
   ("活下来、做大的,几乎都在干同一件事:往超市、专业店转,品类往上做。","aisle"),
   ("可转型最大的坎是货源:专业品类,本地批发根本配不齐。","loading"),
   ("家居、家电、五金、汽车用品想一站备齐,你得到处找供应商,累还凑不全。","aisle"),
   ("而米站,十万多种货、二十六个大类,基本一站备齐。","category",N),
   ("工厂价、一件起订,墨西哥还有自营仓就近补。","loading"),
   ("转型不用一次压一大笔货,按品类一步步上。","people"),
   ("想从百元店顺利转型升级,应用商店搜米站。","download")]},

 {"vid":"gr_haiyun","num":"07","cs":"lingzaoTop","voice":MVOICE,"bgm":"ad1",
  "title":"拼海运\n划算吗?","hl":"划算吗","locale":"希腊","flag":"gr","sub":"一件起订,不用凑大单","tags":"工厂价,一件起订,直发",
  "beats":[("海外开店的华人想省钱进货,常会去拼海运,可拼过的都知道里头的坑。","people"),
   ("看着单价便宜,起订量却动不动一大批,一个品类就得吃下几百上千件。","aisle"),
   ("钱一次压进去一大笔,货还得在海上漂一个多月。","loading"),
   ("最怕赶不上节奏:旺季要补货,船期一拖,等货到旺季都过了。","wall"),
   ("做生意要的其实是灵活,要多少拿多少,缺什么补什么。","people"),
   ("米站正好这样:中国站工厂价、一件起订,十万多种货直发到店。","category",N),
   ("不用凑大单、不用等长船期,旺季要补随时下单。","drone"),
   ("进货别再被起订量和船期绑住手脚,应用商店搜米站。","download")]},

 {"vid":"es_tonghang","num":"08","cs":"question","voice":MVOICE,"bgm":"ad2",
  "title":"同行\n凭啥更便宜?","hl":"凭啥","sub":"进价压到底=工厂价","tags":"",
  "beats":[("同一条街两家中国店,卖的货差不多,结局却天差地别。","people"),
   ("一家利润厚、扛得住打折,一家天天喊难、勉强糊口。","wall"),
   ("差别常常不在会不会卖,在进货价。","aisle"),
   ("这行的账很实在:进价每低一成,利润就厚一成。","wall"),
   ("同样标价,你进得便宜,人家打价格战你跟得起。","people"),
   ("那进价怎么压到底?核心一条:少过几道手,直接拿工厂价。","aisle"),
   ("米站,对接中国源头工厂,出厂价、一件起订,把中间环节全省掉。","category",N),
   ("当你的进价就是别人拿不到的底价,这门生意才真有竞争力。","drone"),
   ("想让进价成为你的优势,应用商店搜米站。","download")]},

 {"vid":"cl_zhanting","num":"09","cs":"lingzao","voice":MVOICE,"bgm":"hype",
  "title":"中国直采\n差多少?","hl":"差多少","locale":"智利","flag":"cl","sub":"义乌展厅一看就懂","tags":"工厂价,一件起订,海外仓",
  "beats":[("很多海外开店的老板,第一次听说手机就能直接从中国工厂进货,都不太敢信。","people"),
   ("哪有这么好的事,会不会是套路。","wall"),
   ("直到有机会去义乌的展厅走一圈,看到同样一件货摆在那、标着出厂价。","aisle"),
   ("他们才愣住:原来自己这些年,多掏了这么多钱。","people"),
   ("中国直采和当地拿货的差距,常常不是一点半点,而是成倍。","wall"),
   ("米站,就是把义乌这个源头搬上手机。","category"),
   ("工厂价、一件起订,智利还有自营仓就近补。","loading",N),
   ("不用专门飞一趟,先小批量进几件试,值不值自己一算就知道。","people"),
   ("眼见为实,应用商店搜米站,自己上去比比价。","download")]},

 {"vid":"ec_yizhan","num":"10","cs":"lingzaoTop","voice":MVOICE,"bgm":"ad1",
  "title":"全店的货\n配得齐吗?","hl":"配得齐","locale":"厄瓜多尔","flag":"ec","sub":"十万SKU一站搞定","tags":"26大类,一件起订,直发",
  "beats":[("在海外开一家百货店或超市,真正麻烦的不是卖,是进。","people"),
   ("要备的货又杂又多:厨房、家居、收纳、五金、玩具、文具。","aisle"),
   ("再加上节日、换季的应季品,一家店动辄要几十上百个品类。","wall"),
   ("靠本地供应商,你得一家家对接、一家家比价,跑断腿还经常这缺那少。","people"),
   ("做这行的都梦想有个一站就能配齐的货源。","aisle"),
   ("米站,十万多种货、二十六个大类,从日用到家电、从工具到饰品基本都有。","category",N),
   ("工厂价、一件起订、直发到店。","drone"),
   ("不用再满世界找供应商,一个平台把货备齐。","people"),
   ("想一站搞定全店进货,应用商店搜米站。","download")]},
]

def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, shell=isinstance(cmd, str), capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r

results = []
for t in T:
    vid = t["vid"]; print(f"\n========== {t['num']} {vid} ({t['cs']}/{t['bgm']}) ==========", flush=True)
    if os.path.exists(f"{OUT}/{t['num']}_{vid}.mp4"):  # 已出且好的(如问句样式)跳过,不重做
        print(">> 已存在,跳过"); results.append((vid, "skip已存在")); continue
    # 1) beats
    beats = []
    for b in t["beats"]:
        be = {"text": b[0], "kind": "selling", "feature": b[1], "hl": []}
        if len(b) > 2: be["num"] = b[2]; be["kind"] = "number"
        beats.append(be)
    bp = os.path.join(TOOLS, "mizan_scripts", f"beats_{vid}.json")
    json.dump(beats, open(bp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    mp = os.path.join(TOOLS, "mizan_scripts", f"beats_{vid}_matched.json")
    # 2) assign_clips
    r = run([sys.executable,"assign_clips.py","--beats",f"mizan_scripts/beats_{vid}.json","--vid",vid,"--out",f"mizan_scripts/beats_{vid}_matched.json","--used","mizan_scripts/used_clips.json"], cwd=TOOLS)
    if not os.path.exists(mp): print("配镜失败:", r.stderr[-400:]); results.append((vid,"FAIL配镜")); continue
    # 3) build_mizan(配音+props)
    args = [PY312,"build_mizan.py","--beats",mp,"--voice",t["voice"],"--voice-out",f"voice_{vid}.mp3","--out",f"mizan_{vid}.json","--workdir",f"outputs/{vid}","--speed","1.2","--cover-style",t["cs"],"--title",t["title"],"--title-hl",t["hl"]]
    if t.get("locale"): args += ["--cover-locale",t["locale"]]
    if t.get("sub"): args += ["--cover-sub",t["sub"]]
    if t.get("tags"): args += ["--cover-tags",t["tags"]]
    if t.get("flag"): args += ["--cover-flag",t["flag"]]
    r = run(args, cwd=IDX)
    if not os.path.exists(os.path.join(VR, f"mizan_{vid}.json")): print("配音失败:", r.stderr[-400:]); results.append((vid,"FAIL配音")); continue
    # 4) render
    raw = f"{OUT}/{t['num']}_{vid}_raw.mp4"
    r = run(f'npx remotion render Mizan "{raw}" --props=mizan_{vid}.json --scale=1.5 --crf=16', cwd=VR)
    if not os.path.exists(raw): print("渲染失败:", r.stderr[-500:]); results.append((vid,"FAIL渲染")); continue
    # 5) loudnorm 换音轨(BGM 轮换 + 响度归一化)
    fin = f"{OUT}/{t['num']}_{vid}.mp4"
    bgmf = os.path.join(PUB, BGM[t["bgm"]]); voicef = os.path.join(PUB, f"voice_{vid}.mp3")
    run(["ffmpeg","-y","-loglevel","error","-i",raw,"-i",voicef,"-i",bgmf,"-filter_complex",
         "[1:a]volume=1.0[v];[2:a]volume=0.10[b];[v][b]amix=inputs=2:duration=first:normalize=0[m];[m]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
         "-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k",fin])
    if os.path.exists(fin): os.remove(raw)
    # 6) 封面
    run(["ffmpeg","-y","-loglevel","error","-i",fin,"-vframes","1",f"{OUT}/cover_{t['num']}_{vid}.jpg"])
    # 7) qc
    r = run([sys.executable,"qc_gate.py",fin,"--json"], cwd=TOOLS)
    try: qc = json.loads(r.stdout); ok = qc.get("pass"); dur = qc.get("l1",{}).get("dur")
    except: ok = "?"; dur = "?"
    print(f">> {t['num']} {vid} 完成 dur={dur} qc={'过' if ok else ok}", flush=True)
    results.append((vid, f"OK dur={dur} qc={'过' if ok else ok}"))

print("\n===== 批量结果 =====")
for v,s in results: print(f"  {v}: {s}")
