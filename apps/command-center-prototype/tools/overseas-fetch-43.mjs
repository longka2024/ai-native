// overseas-fetch-43.mjs — 部署在 43(纽约)服务器的「海外正文抓取代理」。
// 122(国内)抓不到的海外/JS 页面 URL 转发到这里，由 43 抓取正文回传。
// 独立进程，不碰 personal-image-report-demo。PM2 名建议 longka-fetch，监听 127.0.0.1:8870，Caddy /longka-fetch 反代。
// 鉴权：IP 白名单——只接受来自 122 的请求（防被当公开 SSRF 代理）。无需密钥、不漏密码。

import { createServer } from 'node:http';

const PORT = Number(process.env.LONGKA_FETCH_PORT || 8870);
const TIMEOUT = Number(process.env.LONGKA_FETCH_TIMEOUT || 20000);
// 只放行 122（及本机自测）。多个用逗号分隔。
const ALLOW_IPS = (process.env.LONGKA_FETCH_ALLOW_IP || '122.51.218.154,127.0.0.1,::1').split(',').map((s) => s.trim()).filter(Boolean);
function ipAllowed(req) {
  const ip = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  return ALLOW_IPS.includes(ip);
}

// 从正文 HTML 提取相关图片（og:image + 正文大图），过滤图标/logo/占位图，供封面/配图做参考
function extractArticleImages(html, baseUrl) {
  const out = [];
  const push = (u) => {
    if (!u) return;
    try { u = new URL(u, baseUrl).href; } catch { return; }
    if (!/^https?:\/\//i.test(u)) return;
    if (/\.svg(\?|$)|sprite|icon|logo|avatar|favicon|placeholder|blank|1x1|spacer|loading|pixel\.|\/ads?\//i.test(u)) return;
    if (!out.includes(u)) out.push(u);
  };
  const s = String(html || '');
  // og:image / twitter:image 优先（通常是主图）
  for (const m of s.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of s.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/gi)) push(m[1]);
  // 正文 <img>（含懒加载 data-src/srcset）
  for (const m of s.matchAll(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of s.matchAll(/<img[^>]+srcset=["']([^"', ]+)/gi)) push(m[1]);
  return out.slice(0, 4); // 只留主图+少量备选，绝不全抓
}

function extractArticleText(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ')
       .replace(/<style[\s\S]*?<\/style>/gi, ' ')
       .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
       .replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<\/(p|div|br|li|h[1-6]|section|article)>/gi, '\n')
       .replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000);
}

function send(res, obj, code = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(body);
}

createServer(async (req, res) => {
  if (req.method === 'GET') return send(res, { ok: true, service: 'longka-overseas-fetch', via: '43-ny' });
  if (req.method !== 'POST') return send(res, { ok: false, error: 'method_not_allowed' }, 405);
  if (!ipAllowed(req)) return send(res, { ok: false, error: 'forbidden_ip' }, 403);
  let raw = '';
  req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on('end', async () => {
    let articleUrl = '';
    try { articleUrl = (JSON.parse(raw || '{}').url || '').trim(); } catch { return send(res, { ok: false, error: 'bad_json' }, 400); }
    if (!/^https?:\/\//i.test(articleUrl)) return send(res, { ok: false, error: 'missing_url' }, 400);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
      const resp = await fetch(articleUrl, {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        },
      });
      clearTimeout(timer);
      if (!resp.ok) return send(res, { ok: false, error: `HTTP ${resp.status}` }, 502);
      const html = await resp.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      const body = extractArticleText(html);
      const images = extractArticleImages(html, articleUrl);
      return send(res, { ok: true, title, body, images, url: articleUrl, via: '43-ny' });
    } catch (error) {
      return send(res, { ok: false, error: String(error.message || error), via: '43-ny' }, 502);
    }
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`[longka-fetch] overseas fetch proxy on 0.0.0.0:${PORT} (allow: ${ALLOW_IPS.join(',')})`);
});
