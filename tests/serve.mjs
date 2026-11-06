// Test web server: serves the shop and points it at the local mock Supabase (CSP widened for http://localhost only here).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(process.argv[2] || '.'), PORT = +process.env.WEB_PORT || 8780, API = process.env.API || 'http://localhost:54321';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff': 'font/woff', '.txt': 'text/plain', '.json': 'application/json' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  if (u === '/__csp_probe.js') u = '/tests/csp_probe.js'; // test-only probe
  const f = path.join(ROOT, path.normalize(u)); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('nf'); }
    const ext = path.extname(f);
    if (ext === '.html') b = Buffer.from(String(b).replace("connect-src 'self'", "connect-src 'self' " + API).replace('upgrade-insecure-requests', ''));
    if (u === '/js/config.js' && !process.env.LOCAL) b = Buffer.from(`window.SHOP_CONFIG = { url: '${API}', key: 'sb_publishable_test' };`);
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b);
  });
}).listen(PORT, () => console.log('web on', PORT));
