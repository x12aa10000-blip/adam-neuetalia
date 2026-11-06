// Serves a built site (dist/site) and applies its _headers file like Cloudflare Pages / Netlify:
// path patterns with one '*' splat, all matching rules apply, repeated header names are joined with ", ".
// Test-only: the API origin of the local stand-in is added to connect-src (it is http://localhost here).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(process.argv[2] || 'dist/site'), PORT = +(process.argv[3] || 8790), API = process.env.API || 'http://localhost:54321';
const rules = []; let cur = null;
for (const line of fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) { cur = { re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('*', '.*') + '$'), h: [] }; rules.push(cur); continue; }
  const i = line.indexOf(':'); cur.h.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.woff': 'font/woff', '.txt': 'text/plain' };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  if (u === '/_headers') { res.writeHead(404); return res.end(); } // never served as a file
  const f = path.join(ROOT, path.normalize(u)); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('nf'); }
    const h = {};
    for (const r of rules) if (r.re.test(u)) for (const [k, v] of r.h) h[k] = h[k] ? h[k] + ', ' + v : v;
    if (h['Content-Security-Policy']) h['Content-Security-Policy'] = h['Content-Security-Policy'].replace("connect-src 'self'", "connect-src 'self' " + API).replace('; upgrade-insecure-requests', '');
    if (path.extname(f) === '.html') b = Buffer.from(String(b).replace("connect-src 'self'", "connect-src 'self' " + API).replace('; upgrade-insecure-requests', ''));
    h['Content-Type'] = TYPES[path.extname(f)] || 'application/octet-stream';
    res.writeHead(200, h); res.end(b);
  });
}).listen(PORT, () => console.log('site with _headers on', PORT));
