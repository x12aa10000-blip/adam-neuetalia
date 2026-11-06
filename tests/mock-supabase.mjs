// Local stand-in for Supabase's REST RPC endpoint (POST /rest/v1/rpc/<fn>) backed by the real local Postgres.
// Runs every call as role "anon", exactly like the real API key would.
import http from 'node:http';
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
const PORT = +process.env.PORT || 54321, DB = process.env.DB || 'shoptest';
const lit = v => { if (v === null || v === undefined) return 'NULL'; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); const tag = '$q' + crypto.randomBytes(4).toString('hex') + '$'; return tag + s + tag; };
function call(fn, args, ip) {
  const named = Object.entries(args || {}).map(([k, v]) => `${k} => ${lit(v)}`).join(', ');
  const sql = `set request.headers = ${lit(JSON.stringify({ 'x-forwarded-for': ip }))}; set role anon; select coalesce(to_json(public.${fn}(${named}))::text, 'null');`;
  return new Promise(res => { const ch = execFile('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', DB], { maxBuffer: 64 << 20 }, (err, out, errout) => res({ err: err ? (errout || String(err)) : null, out })); ch.stdin.end(sql); });
}
http.createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const m = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(req.url);
  if (req.method !== 'POST' || !m) { res.writeHead(404, cors); return res.end('{}'); }
  if (!req.headers.apikey) { res.writeHead(401, cors); return res.end('{"message":"No API key found in request"}'); }
  let body = ''; for await (const c of req) body += c;
  let args = {}; try { args = body ? JSON.parse(body) : {}; } catch (e) { res.writeHead(400, cors); return res.end('{"message":"bad json"}'); }
  const ip = req.headers['x-test-ip'] || '10.0.0.1';
  const r = await call(m[1], args, ip);
  if (r.err) {
    console.error(m[1], r.err.slice(0, 300));
    const msg = (/ERROR:\s+(.*)/.exec(r.err) || [, 'error'])[1].trim();
    const notFound = /function .* does not exist/.test(msg);
    res.writeHead(notFound ? 404 : 400, Object.assign({ 'Content-Type': 'application/json' }, cors));
    return res.end(JSON.stringify({ code: notFound ? 'PGRST202' : 'P0001', message: msg }));
  }
  res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(r.out.trim().split('\n').pop());
}).listen(PORT, () => console.log('mock supabase on', PORT));
