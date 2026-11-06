// Tests the PayPal Edge Function logic (supabase/functions/_shared/paypal.ts) under Node 22 against
// (1) a local PayPal API mock and (2) the real database functions via the local Supabase stand-in (service role).
// Run: npx tsx tests/paypal_functions.test.mts   (needs tests/start.sh running)
import http from 'node:http';
import { handleCreate, handleCapture, handleWebhook } from '../supabase/functions/_shared/paypal.ts';

const API = 'http://localhost:54321';
const PP_PORT = 8999, PP = `http://localhost:${PP_PORT}`;
const env = { PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'TOP-SECRET-PP', PAYPAL_WEBHOOK_ID: 'WH-TEST', PAYPAL_API_BASE: PP, PAYPAL_ENV: 'sandbox',
  SUPABASE_URL: API, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test', ALLOWED_ORIGINS: 'https://shop.example' };
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, info: unknown = '') => { results.push([name, ok, ok ? '' : JSON.stringify(info).slice(0, 220)]); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(info).slice(0, 220))); };

// ---------------- PayPal mock ----------------
const S = { orders: new Map<string, any>(), seen: [] as string[], captureOverride: null as any, foreignHits: 0, nextId: 1 };
const pp = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  S.seen.push(`${req.method} ${req.url}`);
  const send = (code: number, o: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (req.url === '/v1/oauth2/token') return req.headers.authorization === 'Basic ' + Buffer.from('test-client:TOP-SECRET-PP').toString('base64') ? send(200, { access_token: 'AT-1' }) : send(401, {});
  if (req.headers.authorization !== 'Bearer AT-1') return send(401, {});
  if (req.url === '/v2/checkout/orders' && req.method === 'POST') {
    // like PayPal: the same PayPal-Request-Id returns the same order (idempotency)
    const rid = String(req.headers['paypal-request-id'] || ''); const known = [...S.orders.values()].find(o => o.rid === rid);
    if (rid && known) return send(200, { id: known.id, status: 'CREATED' });
    const b = JSON.parse(body); const id = 'PPORDER' + String(S.nextId++).padStart(6, '0');
    S.orders.set(id, { id, rid, pu: b.purchase_units[0] }); return send(201, { id, status: 'CREATED' });
  }
  const m = /^\/v2\/checkout\/orders\/([A-Z0-9]+)\/capture$/.exec(req.url || '');
  if (m) {
    const o = S.orders.get(m[1]); if (!o) return send(404, {});
    const cap = Object.assign({ id: 'CAP-' + m[1], status: 'COMPLETED', amount: { currency_code: o.pu.amount.currency_code, value: o.pu.amount.value }, custom_id: o.pu.custom_id }, S.captureOverride || {});
    return send(201, { id: m[1], status: 'COMPLETED', purchase_units: [{ payments: { captures: [cap] } }] });
  }
  if (req.url === '/v1/notifications/verify-webhook-signature') { const b = JSON.parse(body); return send(200, { verification_status: b.transmission_sig === 'GOOD-SIG' && b.webhook_id === 'WH-TEST' ? 'SUCCESS' : 'FAILURE' }); }
  const cp = /^\/v2\/payments\/captures\/(CAP-[A-Z0-9]+)$/.exec(req.url || '');
  if (cp) { const id = cp[1].slice(4); const o = S.orders.get(id); return o ? send(200, { id: cp[1], status: 'REFUNDED', custom_id: o.pu.custom_id }) : send(404, {}); }
  send(404, {});
});
const foreign = http.createServer((req, res) => { S.foreignHits++; res.end('{}'); });
await new Promise<void>(r => pp.listen(PP_PORT, r)); await new Promise<void>(r => foreign.listen(8998, r));

// ---------------- helpers ----------------
async function rpc(fn: string, args: unknown, key = 'sb_publishable_test') {
  const r = await fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', 'x-test-ip': '10.66.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(args) });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const D = new Date(Date.now() + 4 * 864e5).toISOString().slice(0, 10);
async function order(pay = 'paypal', email = `pp${Math.floor(Math.random() * 1e9)}@example.org`) {
  const r = await rpc('shop_order_place', { p: { name: 'PP Test', email, phone: '0151 1234567', method: 'pickup', pay, bill: { name: 'P', street: 'S 1', zip: '20099', city: 'HH' },
    items: [{ id: 'i', pid: 'rosenbox-herz', D: { f: { name: 'PP' }, opt: {} }, qty: 1, unit: 59.9, preview: '' }], date: D, lang: 'de' } });
  if (r.status !== 200) throw new Error('order failed ' + JSON.stringify(r.body));
  return { no: r.body.no as string, email, total: r.body.totals.total as number };
}
const call = async (h: Function, body: unknown, headers: Record<string, string> = {}, e: any = env) => {
  const res: Response = await h(new Request('https://fn.local/', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://shop.example', ...headers }, body: JSON.stringify(body) }), e, fetch);
  const text = await res.text(); return { status: res.status, body: JSON.parse(text || '{}'), text, headers: res.headers };
};
const orderState = async (no: string, email: string) => (await rpc('shop_order_get', { p_no: no, p_email: email })).body;

// the settings must allow PayPal for these orders
const owner = (await rpc('shop_admin_login', { p_user: 'Inhaber', p_pw: process.env.OWNER_PW || 'TestPasswort123!' })).body.token;
const pull = (await rpc('shop_admin_pull', { p_token: owner, p_since: 0 })).body;
const settings = pull.kv.settings; settings.payments = Object.assign({}, settings.payments, { paypal: true, card: true }); settings.paypal = { clientId: 'test-client' };
await rpc('shop_admin_push', { p_token: owner, p_kv: { settings }, p_items: [] });

// ---------------- tests ----------------
try {
  // 1 browser cannot use the service functions
  const direct = await rpc('shop_srv_paypal_result', { p_no: 'AD-1', p_pp_order: 'X', p_capture: 'X', p_status: 'COMPLETED', p_amount: 1, p_currency: 'EUR', p_source: 'x' });
  check('Browser key cannot call the PayPal service functions (mark as paid)', direct.status === 404 || direct.status === 400 && /permission|denied/.test(JSON.stringify(direct.body)), direct);

  // 2 create uses the database total
  const a = await order();
  const cr = await call(handleCreate, { no: a.no, email: a.email, amount: '0.01' });
  const sent = S.orders.get(cr.body.id);
  check('Create: PayPal order created', cr.status === 200 && /^PPORDER/.test(cr.body.id), cr);
  check('Create: amount comes from the database, not from the browser', sent && sent.pu.amount.value === a.total.toFixed(2) && sent.pu.amount.currency_code === 'EUR', sent && sent.pu);
  check('Create: our order number is sent as custom_id', sent && sent.pu.custom_id === a.no);
  check('Create: CORS only for the shop origin', cr.headers.get('access-control-allow-origin') === 'https://shop.example');
  const crEvil = await call(handleCreate, { no: a.no, email: a.email }, { origin: 'https://evil.example' });
  check('Create: foreign origin is not echoed in CORS', crEvil.headers.get('access-control-allow-origin') !== 'https://evil.example', crEvil.headers.get('access-control-allow-origin'));
  check('Create: wrong e-mail refused', (await call(handleCreate, { no: a.no, email: 'x@example.org' })).body.error === 'not_found');
  const v = await order('vorkasse');
  check('Create: non-PayPal order refused', (await call(handleCreate, { no: v.no, email: v.email })).body.error === 'not_paypal');
  check('Create: malformed input refused', (await call(handleCreate, { no: "AD-1' or 1=1", email: a.email })).body.error === 'bad_request');

  // 3 capture success
  const cap = await call(handleCapture, { no: a.no, email: a.email, orderID: cr.body.id });
  const st = await orderState(a.no, a.email);
  check('Capture: order marked paid only after server-side verification', cap.status === 200 && st.pay.status === 'bezahlt' && st.pay.verified === 'paypal-server' && st.pay.capture === 'CAP-' + cr.body.id, { cap: cap.body, pay: st.pay });
  check('Capture: responses never contain the PayPal secret', !cr.text.includes('TOP-SECRET') && !cap.text.includes('TOP-SECRET'));
  check('Capture: already paid order cannot be paid again', (await call(handleCreate, { no: a.no, email: a.email })).body.error === 'already_paid');

  // 4 amount manipulated at PayPal side (e.g. buyer paid less)
  const b = await order(); const crb = await call(handleCreate, { no: b.no, email: b.email });
  S.captureOverride = { amount: { currency_code: 'EUR', value: '1.00' } };
  const capb = await call(handleCapture, { no: b.no, email: b.email, orderID: crb.body.id }); S.captureOverride = null;
  const stb = await orderState(b.no, b.email);
  check('Capture: lower paid amount is NOT accepted, order stays unpaid with a warning', capb.status === 400 && capb.body.error === 'amount_mismatch' && stb.pay.status === 'offen' && /passt nicht/.test(stb.pay.problem || ''), { capb: capb.body, pay: stb.pay });
  S.captureOverride = { amount: { currency_code: 'USD', value: String(b.total.toFixed(2)) } };
  const capc = await call(handleCapture, { no: b.no, email: b.email, orderID: crb.body.id }); S.captureOverride = null;
  check('Capture: wrong currency is NOT accepted', capc.body.error === 'amount_mismatch' && (await orderState(b.no, b.email)).pay.status === 'offen', capc.body);

  // 5 PayPal order of another shop order
  const c = await order(); await call(handleCreate, { no: c.no, email: c.email });
  check('Capture: PayPal order belonging to a different shop order refused', (await call(handleCapture, { no: c.no, email: c.email, orderID: crb.body.id })).body.error === 'order_mismatch');

  // 6 pending capture
  const d = await order(); const crd = await call(handleCreate, { no: d.no, email: d.email });
  S.captureOverride = { status: 'PENDING' };
  const capd = await call(handleCapture, { no: d.no, email: d.email, orderID: crd.body.id }); S.captureOverride = null;
  check('Capture: PENDING payment does not mark the order paid', capd.body.error === 'not_completed' && (await orderState(d.no, d.email)).pay.status === 'offen', capd.body);

  // 7 webhook: bad signature
  const e = await order(); const cre = await call(handleCreate, { no: e.no, email: e.email });
  const RUN = Date.now().toString(36); const evt = (id: string, type: string, resource: unknown) => ({ id: id + '-' + RUN, event_type: type, resource });
  const sig = (good: boolean) => ({ 'paypal-transmission-id': 'T1', 'paypal-transmission-sig': good ? 'GOOD-SIG' : 'FORGED', 'paypal-transmission-time': new Date().toISOString(), 'paypal-cert-url': PP + '/cert', 'paypal-auth-algo': 'SHA256withRSA' });
  const capRes = (o: any, id: string) => ({ id: 'CAP-' + id, status: 'COMPLETED', custom_id: o.no, amount: { currency_code: 'EUR', value: o.total.toFixed(2) }, supplementary_data: { related_ids: { order_id: id } } });
  const forged = await call(handleWebhook, evt('WH-EVT-1', 'PAYMENT.CAPTURE.COMPLETED', capRes(e, cre.body.id)), sig(false));
  check('Webhook: forged signature refused, order unchanged', forged.status === 400 && (await orderState(e.no, e.email)).pay.status === 'offen', forged.body);
  const unsigned = await call(handleWebhook, evt('WH-EVT-1', 'PAYMENT.CAPTURE.COMPLETED', capRes(e, cre.body.id)), {});
  check('Webhook: request without PayPal signature headers refused', unsigned.status === 400);
  // 8 valid
  const ok1 = await call(handleWebhook, evt('WH-EVT-2', 'PAYMENT.CAPTURE.COMPLETED', capRes(e, cre.body.id)), sig(true));
  check('Webhook: verified COMPLETED event marks the order paid', ok1.status === 200 && (await orderState(e.no, e.email)).pay.status === 'bezahlt', ok1.body);
  // 9 duplicate
  const dup = await call(handleWebhook, evt('WH-EVT-2', 'PAYMENT.CAPTURE.COMPLETED', capRes(e, cre.body.id)), sig(true));
  check('Webhook: same event id processed only once', dup.body.duplicate === true);
  // webhook with lower amount
  const f = await order(); const crf = await call(handleCreate, { no: f.no, email: f.email });
  await call(handleWebhook, evt('WH-EVT-3', 'PAYMENT.CAPTURE.COMPLETED', Object.assign(capRes(f, crf.body.id), { amount: { currency_code: 'EUR', value: '0.50' } })), sig(true));
  check('Webhook: COMPLETED with a lower amount does NOT mark paid', (await orderState(f.no, f.email)).pay.status === 'offen');
  // 10 refund via 'up' link
  const ref = await call(handleWebhook, evt('WH-EVT-4', 'PAYMENT.CAPTURE.REFUNDED', { id: 'REF-1', links: [{ rel: 'up', href: `${PP}/v2/payments/captures/CAP-${cre.body.id}` }] }), sig(true));
  check('Webhook: refund marks the order refunded', ref.status === 200 && (await orderState(e.no, e.email)).pay.status === 'erstattet', ref.body);
  const before = S.foreignHits;
  await call(handleWebhook, evt('WH-EVT-5', 'PAYMENT.CAPTURE.REFUNDED', { id: 'REF-2', links: [{ rel: 'up', href: 'http://localhost:8998/steal' }] }), sig(true));
  check('Webhook: links to non-PayPal hosts are never fetched (SSRF)', S.foreignHits === before, S.foreignHits);
  // 11 approved but browser closed -> server captures
  const g = await order(); const crg = await call(handleCreate, { no: g.no, email: g.email });
  await call(handleWebhook, evt('WH-EVT-6', 'CHECKOUT.ORDER.APPROVED', { id: crg.body.id, purchase_units: [{ custom_id: g.no, reference_id: g.no }] }), sig(true));
  check('Webhook: approved order is captured by the server if the browser was closed', (await orderState(g.no, g.email)).pay.status === 'bezahlt');
  // 12 not configured
  const nc = await call(handleCreate, { no: g.no, email: g.email }, {}, Object.assign({}, env, { PAYPAL_CLIENT_SECRET: '' }));
  check('Missing secrets -> 503, nothing leaks', nc.status === 503 && !nc.text.includes('PAYPAL_CLIENT_SECRET'), nc);
} finally {
  settings.payments.paypal = false; settings.payments.card = false; settings.paypal = { clientId: '' };
  await rpc('shop_admin_push', { p_token: owner, p_kv: { settings }, p_items: [] });
  pp.close(); foreign.close();
}
const fails = results.filter(r => !r[1]);
console.log(`\n${results.length - fails.length} PASS, ${fails.length} FAIL`);
process.exit(fails.length ? 1 : 0);
