// Local stand-in for Supabase Edge Functions (+ PayPal API mock) used by the browser tests.
import http from 'node:http';
import { handleCreate, handleCapture, handleWebhook } from '../supabase/functions/_shared/paypal.ts';
const orders = new Map<string, any>(); let n = 1;
http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  const send = (code: number, o: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/v1/oauth2/token') return send(200, { access_token: 'AT-1' });
  if (req.url === '/v2/checkout/orders') { const rid = String(req.headers['paypal-request-id']); const k = [...orders.values()].find(o => o.rid === rid); if (k) return send(200, { id: k.id }); const id = 'PPWEB' + String(n++).padStart(6, '0'); orders.set(id, { id, rid, pu: JSON.parse(body).purchase_units[0] }); return send(201, { id }); }
  const m = /^\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/.exec(req.url || '');
  if (m) { const o = orders.get(m[1]); return o ? send(201, { purchase_units: [{ payments: { captures: [{ id: 'CAP-' + m[1], status: 'COMPLETED', amount: o.pu.amount, custom_id: o.pu.custom_id }] } }] }) : send(404, {}); }
  send(404, {});
}).listen(8997);
const env = { PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'local-only', PAYPAL_WEBHOOK_ID: 'WH', PAYPAL_API_BASE: 'http://localhost:8997', SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test', ALLOWED_ORIGINS: 'http://localhost:8780' };
const H: Record<string, Function> = { 'paypal-create-order': handleCreate, 'paypal-capture-order': handleCapture, 'paypal-webhook': handleWebhook };
http.createServer(async (req, res) => {
  const name = (req.url || '').replace(/^\/functions\/v1\//, '').split('?')[0];
  let body = ''; for await (const c of req) body += c;
  const h = H[name]; if (!h) { res.writeHead(404); return res.end(); }
  const r: Response = await h(new Request('http://fn' + req.url, { method: req.method, headers: req.headers as any, body: req.method === 'POST' ? body : undefined }), env, fetch);
  res.writeHead(r.status, Object.fromEntries(r.headers.entries())); res.end(await r.text());
}).listen(54323, () => console.log('functions on 54323'));
