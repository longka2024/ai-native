#!/usr/bin/env python3
# compliance_scan.py — 小红书发布前「合规门」硬扫(脚本,零成本,确定性)。
# 检测交易导流违规风险:① 联系方式 ② 承诺/夸大 ③ 招揽/中介身份口吻 ④ 高危行业。
# 用法: echo '<标题>\n<正文>' | python3 compliance_scan.py   或   python3 compliance_scan.py <文件>
# 输出 JSON: {risk: high|medium|low, hits:[{category,term,snippet}], advice}
import sys, re, json

# 规则词库(命中即风险)。教育/留学是小红书重点盯防的高危导流行业。
RULES = {
    "contact": [  # 联系方式 = 最硬违规
        "微信", "weixin", "vx", "v信", "＋v", "+v", "加v", "qq", "扣扣", "公号", "公众号",
        "私我", "私信我", "加我", "滴滴我", "dd我", "扣1", "扣一", "联系我", "咨询请", "加好友",
        "主页", "简介", "置顶", "评论区见", "看签名", "see profile",
    ],
    "promise": [  # 承诺/夸大结果 = 教育/医美高危触发
        "搞定", "逆袭", "必过", "保过", "包过", "包录取", "包offer", "包你", "100%", "百分百",
        "稳过", "稳拿", "稳进", "必上", "必录", "绝对", "秒过", "速成", "一次过", "轻松搞定", "马上见效",
    ],
    "solicit": [  # 招揽/中介身份口吻 = "我在卖服务"
        "我帮", "帮你", "帮家庭", "帮孩子", "我的学员", "我带的", "咨询我", "找我", "报名", "名额",
        "名额有限", "私聊", "付费咨询", "我们机构", "我们团队", "我们工作室", "一对一", "测评领取",
        "领取", "扫码", "限时", "优惠", "课程", "训练营", "申请规划", "咨询规划", "做规划",
    ],
    "industry": [  # 高危行业(本身不违规,+招揽/承诺则风险升级)
        "留学", "私校", "国际学校", "申请", "offer", "文书", "中介", "雅思", "托福", "ssat",
        "医美", "植发", "整形", "减肥", "贷款", "配资", "代购", "微整",
    ],
}

def scan(text):
    low = text.lower()
    hits = []
    cats = set()
    # 11 位手机号
    for m in re.finditer(r"(?<!\d)1[3-9]\d{9}(?!\d)", text):
        hits.append({"category": "contact", "term": "手机号", "snippet": m.group(0)})
        cats.add("contact")
    # 微信号样式(字母+数字 6-20,夹在加微语境)
    for cat, words in RULES.items():
        for w in words:
            idx = low.find(w.lower())
            if idx >= 0:
                s = max(0, idx - 8)
                hits.append({"category": cat, "term": w, "snippet": text[s:idx + len(w) + 8].replace("\n", " ")})
                cats.add(cat)
    # 风险定级
    if "contact" in cats:
        risk = "high"
    elif ("solicit" in cats or "promise" in cats) and "industry" in cats:
        risk = "high"   # 高危行业 + 招揽/承诺 = 当年那批被封的特征
    elif "promise" in cats or "solicit" in cats:
        risk = "medium"
    elif "industry" in cats:
        risk = "medium"
    else:
        risk = "low"
    advice = {
        "high": "高风险!命中导流违规特征,直接发大概率封号。必须走「合规门」改写:删联系方式/去承诺/把招揽口吻改成过来人分享。",
        "medium": "中风险:有承诺/招揽/高危行业痕迹,建议过「合规门」改写成过来人口吻再发。",
        "low": "低风险:未命中明显导流特征。仍建议导流只走平台官方工具(企业号/留资卡)。",
    }[risk]
    return {"risk": risk, "categories": sorted(cats), "hits": hits, "advice": advice}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        text = open(sys.argv[1], encoding="utf-8").read()
    else:
        text = sys.stdin.read()
    print(json.dumps(scan(text), ensure_ascii=False, indent=2))
