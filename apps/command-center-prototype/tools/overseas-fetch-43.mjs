// overseas-fetch-43.mjs — 部署在 43(纽约)的「海外抓取代理」。
// 122(国内,GFW)抓不到的海外/JS 页面 → 转给 43 抓,回传干净正文+配图。
// 抓取主力 = Firecrawl Keyless(无需 API key,每月 1000 免费额度,自带反爬/JS/markdown);失败回落 DIY fetch。
// 独立进程,不碰 personal-image-report-demo。PM2 名 longka-fetch,监听 0.0.0.0:8870。
// 鉴权:IP 白名单——只接受来自 122 的请求(防被当公开 SSRF 代理)。无密钥、不漏密码。

import { createServer } from 'node:http';

const PORT = Number(process.env.LONGKA_FETCH_PORT || 8870);
const TIMEOUT = Number(process.env.LONGKA_FETCH_TIMEOUT || 20000);        // DIY 兜底超时
const FC_TIMEOUT = Number(process.env.LONGKA_FETCH_FC_TIMEOUT || 45000);  // Firecrawl 超时(JS 页面慢)
const FC_BASE = (process.env.FIRECRAWL_BASE || 'https://api.firecrawl.dev/v2').replace(/\/$/, '');
const FC_KEY = process.env.FIRECRAWL_API_KEY || ''; // 可选:有 key 走 key(额度高);没有就 keyless
const ALLOW_IPS = (process.env.LONGKA_FETCH_ALLOW_IP || '122.51.218.154,127.0.0.1,::1').split(',').map((s) => s.trim()).filter(Boolean);

function ipAllowed(req) {
  const ip = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  return ALLOW_IPS.includes(ip);
}
function fcHeaders() {
  const h = { 'content-type': 'application/json' };
  if (FC_KEY) h.authorization = `Bearer ${FC_KEY}`; // 无 key 时不带 Authorization = keyless
  return h;
}
function badImg(u) {
  return !u || !/^https?:\/\//i.test(u)
    || /\.(svg|gif|html?)(\?|$)|sprite|icon|logo|avatar|favicon|placeholder|blank|1x1|spacer|loading|loadimg|pixel\.|\/ads?\//i.test(u);
}
// 从 markdown 抽图(![](url))+ og:image,过滤图标,留主图+少量
function imagesFromMarkdown(md, ogImage) {
  const out = [];
  const push = (u) => { if (!badImg(u) && !out.includes(u)) out.push(u); };
  push(ogImage);
  for (const m of String(md || '').matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) push(m[1]);
  return out.slice(0, 4);
}
// 轻量 markdown → 纯文本(去图片/链接语法,保留文字)
function mdToText(md) {
  return String(md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 8000);
}

// 主力:Firecrawl keyless 抓正文+图
async function fetchViaFirecrawl(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FC_TIMEOUT);
  try {
    const r = await fetch(`${FC_BASE}/scrape`, {
      method: 'POST', signal: ctrl.signal, headers: fcHeaders(),
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success || !j.data) throw new Error(`firecrawl_${r.status}_${(j.error || '').slice(0, 80)}`);
    const d = j.data, meta = d.metadata || {};
    return {
      ok: true, title: meta.title || meta.ogTitle || '', body: mdToText(d.markdown),
      images: imagesFromMarkdown(d.markdown, meta.ogImage || meta['og:image']),
      url, via: FC_KEY ? '43-firecrawl-key' : '43-firecrawl-keyless',
    };
  } finally { clearTimeout(timer); }
}

// Firecrawl 搜索(选题信号/海外资讯发现)
async function searchViaFirecrawl(query, limit) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FC_TIMEOUT);
  try {
    const r = await fetch(`${FC_BASE}/search`, {
      method: 'POST', signal: ctrl.signal, headers: fcHeaders(),
      body: JSON.stringify({ query, limit: Math.min(Math.max(Number(limit) || 5, 1), 10) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success) throw new Error(`fc_search_${r.status}`);
    const web = (j.data && j.data.web) || j.data || [];
    return { ok: true, results: (Array.isArray(web) ? web : []).map((x) => ({ title: x.title, url: x.url, description: x.description })), via: '43-firecrawl' };
  } finally { clearTimeout(timer); }
}

// 兜底:DIY 直抓
function extractArticleImages(html, baseUrl) {
  const out = [];
  const push = (u) => { if (!u) return; try { u = new URL(u, baseUrl).href; } catch { return; } if (!badImg(u) && !out.includes(u)) out.push(u); };
  const s = String(html || '');
  for (const m of s.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of s.matchAll(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["']/gi)) push(m[1]);
  return out.slice(0, 4);
}
function extractArticleText(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<\/(p|div|br|li|h[1-6]|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000);
}
async function fetchDiy(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
    } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return { ok: true, title: titleMatch ? titleMatch[1].trim() : '', body: extractArticleText(html), images: extractArticleImages(html, url), url, via: '43-diy' };
  } finally { clearTimeout(timer); }
}

function send(res, obj, code = 200) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

createServer(async (req, res) => {
  if (req.method === 'GET') return send(res, { ok: true, service: 'longka-overseas-fetch', engine: FC_KEY ? 'firecrawl-key' : 'firecrawl-keyless', via: '43-ny' });
  if (req.method !== 'POST') return send(res, { ok: false, error: 'method_not_allowed' }, 405);
  if (!ipAllowed(req)) return send(res, { ok: false, error: 'forbidden_ip' }, 403);
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { return send(res, { ok: false, error: 'bad_json' }, 400); }
    // 搜索模式
    if (payload.search) {
      try { return send(res, await searchViaFirecrawl(String(payload.search), payload.limit)); }
      catch (e) { return send(res, { ok: false, error: String(e.message || e), via: '43-ny' }, 502); }
    }
    // 抓取模式
    const url = String(payload.url || '').trim();
    if (!/^https?:\/\//i.test(url)) return send(res, { ok: false, error: 'missing_url' }, 400);
    try {
      return send(res, await fetchViaFirecrawl(url)); // 主力
    } catch (fcErr) {
      try { const diy = await fetchDiy(url); diy.fallbackFrom = String(fcErr.message || fcErr).slice(0, 120); return send(res, diy); } // 兜底
      catch (e) { return send(res, { ok: false, error: `firecrawl+diy both failed: ${String(e.message || e)}`, via: '43-ny' }, 502); }
    }
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[longka-fetch] on 0.0.0.0:${PORT} | engine=${FC_KEY ? 'firecrawl-key' : 'firecrawl-keyless'} | allow=${ALLOW_IPS.join(',')}`);
});
