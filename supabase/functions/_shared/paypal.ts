// PayPal server-side payment handling for the Adam shop (Supabase Edge Functions).
//
// Security model
//  * The PayPal client SECRET and the Supabase service key exist only here (Edge Function secrets), never in the browser.
//  * The amount sent to PayPal is read from the database (server-calculated order total), never from the browser.
//  * An order is marked "paid" only after PayPal reports the capture as COMPLETED with exactly the order total,
//    currency EUR and our order number (custom_id) – checked again inside the database function.
//  * Webhooks are accepted only after PayPal confirms the signature (verify-webhook-signature) and only once per event id.
//  * Links from webhook payloads are followed only to the PayPal API host (no SSRF).
//
// The handlers take (request, env, fetch) so they can be unit-tested outside Deno.

export type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export function cors(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin') || '';
  const ok = allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : (allowed[0] || 'null'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

export const ppBase = (env: Env) => (env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : (env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'));

function need(env: Env, keys: string[]) {
  const miss = keys.filter(k => !env[k]);
  if (miss.length) throw Object.assign(new Error('server_not_configured'), { code: 'server_not_configured', missing: miss });
}

export async function ppToken(env: Env, fx: Fetch): Promise<string> {
  const auth = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const r = await fx(ppBase(env) + '/v1/oauth2/token', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  if (!r.ok) throw Object.assign(new Error('paypal_auth'), { code: 'paypal_auth' });
  return (await r.json()).access_token;
}

async function db(env: Env, fx: Fetch, fn: string, args: Record<string, unknown>) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json', apikey: key };
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  const r = await fx(`${(env.SUPABASE_URL || '').replace(/\/+$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify(args) });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error('db'), { code: (body && body.message) || 'db_error' });
  if (body && body.error_code) throw Object.assign(new Error(body.error_code), { code: body.error_code });
  return body;
}

const clientIp = (req: Request) => (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'edge').trim().slice(0, 64);
const isNo = (s: unknown) => typeof s === 'string' && /^[A-Z]{2}-\d{1,9}$/.test(s.trim().toUpperCase());
const isEmail = (s: unknown) => typeof s === 'string' && s.length <= 120 && /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(s.trim());
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

async function readBody(req: Request, max = 20000) {
  const t = await req.text();
  if (t.length > max) throw Object.assign(new Error('too_big'), { code: 'too_big' });
  try { return { text: t, data: JSON.parse(t || '{}') }; } catch { throw Object.assign(new Error('bad_json'), { code: 'bad_json' }); }
}

function fail(e: any, c: Record<string, string>) {
  const code = (e && e.code) || 'error';
  const status = ['not_found', 'cancelled', 'already_paid', 'not_paypal', 'bad_request', 'bad_json', 'too_big', 'amount_mismatch', 'order_mismatch', 'not_completed'].includes(code) ? 400
    : code === 'rate_limited' ? 429 : code === 'server_not_configured' ? 503 : 502;
  return json({ error: code }, status, c);
}

/** POST {no, email} -> {id}  – creates the PayPal order with the amount from the database */
export async function handleCreate(req: Request, env: Env, fx: Fetch = fetch): Promise<Response> {
  const c = cors(req, env);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, c);
  try {
    need(env, ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'SUPABASE_URL']);
    const { data } = await readBody(req);
    if (!isNo(data.no) || !isEmail(data.email)) throw Object.assign(new Error('bad_request'), { code: 'bad_request' });
    const o = await db(env, fx, 'shop_srv_paypal_order', { p_no: String(data.no).toUpperCase(), p_email: data.email, p_ip: clientIp(req) });
    const token = await ppToken(env, fx);
    const r = await fx(ppBase(env) + '/v2/checkout/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `adam-create-${o.no}-${money(o.total)}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ reference_id: o.no, custom_id: o.no, invoice_id: o.no, description: `${o.shop} ${o.no}`.slice(0, 127), amount: { currency_code: 'EUR', value: money(o.total) } }],
        application_context: { shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
      }),
    });
    const pp = await r.json().catch(() => ({}));
    if (!r.ok || !pp.id) throw Object.assign(new Error('paypal_create'), { code: 'paypal_create' });
    await db(env, fx, 'shop_srv_paypal_attach', { p_no: o.no, p_pp_order: pp.id });
    return json({ id: pp.id }, 200, c);
  } catch (e) { return fail(e, c); }
}

/** POST {no, email, orderID} -> {status:'paid'} – captures and verifies on the server */
export async function handleCapture(req: Request, env: Env, fx: Fetch = fetch): Promise<Response> {
  const c = cors(req, env);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, c);
  try {
    need(env, ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'SUPABASE_URL']);
    const { data } = await readBody(req);
    if (!isNo(data.no) || !isEmail(data.email) || typeof data.orderID !== 'string' || !/^[A-Z0-9]{8,40}$/.test(data.orderID)) throw Object.assign(new Error('bad_request'), { code: 'bad_request' });
    const o = await db(env, fx, 'shop_srv_paypal_order', { p_no: String(data.no).toUpperCase(), p_email: data.email, p_ip: clientIp(req) });
    if (o.ppOrder && o.ppOrder !== data.orderID) throw Object.assign(new Error('order_mismatch'), { code: 'order_mismatch' });
    const token = await ppToken(env, fx);
    const r = await fx(ppBase(env) + `/v2/checkout/orders/${data.orderID}/capture`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `adam-capture-${data.orderID}` },
    });
    const pp = await r.json().catch(() => ({}));
    const cap = pp && pp.purchase_units && pp.purchase_units[0] && pp.purchase_units[0].payments && pp.purchase_units[0].payments.captures && pp.purchase_units[0].payments.captures[0];
    if (!r.ok || !cap) throw Object.assign(new Error('paypal_capture'), { code: 'paypal_capture' });
    if (cap.custom_id !== o.no) throw Object.assign(new Error('order_mismatch'), { code: 'order_mismatch' });
    if (cap.status !== 'COMPLETED') {
      await db(env, fx, 'shop_srv_paypal_result', { p_no: o.no, p_pp_order: data.orderID, p_capture: cap.id, p_status: cap.status, p_amount: Number(cap.amount && cap.amount.value), p_currency: cap.amount && cap.amount.currency_code, p_source: 'capture' }).catch(() => null);
      throw Object.assign(new Error('not_completed'), { code: 'not_completed' });
    }
    await db(env, fx, 'shop_srv_paypal_result', { p_no: o.no, p_pp_order: data.orderID, p_capture: cap.id, p_status: 'COMPLETED', p_amount: Number(cap.amount.value), p_currency: cap.amount.currency_code, p_source: 'capture' });
    return json({ status: 'paid', capture: cap.id }, 200, c);
  } catch (e) { return fail(e, c); }
}

/** PayPal webhook: signature checked by PayPal, events processed once */
export async function handleWebhook(req: Request, env: Env, fx: Fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  try {
    need(env, ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'SUPABASE_URL']);
    const { data: event } = await readBody(req, 200000);
    const h = (k: string) => req.headers.get(k) || '';
    const certUrl = h('paypal-cert-url');
    if (!h('paypal-transmission-id') || !h('paypal-transmission-sig') || !certUrl) return json({ error: 'unsigned' }, 400);
    const token = await ppToken(env, fx);
    const v = await fx(ppBase(env) + '/v1/notifications/verify-webhook-signature', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_algo: h('paypal-auth-algo'), cert_url: certUrl, transmission_id: h('paypal-transmission-id'), transmission_sig: h('paypal-transmission-sig'), transmission_time: h('paypal-transmission-time'), webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: event }),
    });
    const vr = await v.json().catch(() => ({}));
    if (!v.ok || vr.verification_status !== 'SUCCESS') return json({ error: 'bad_signature' }, 400);
    if (!(await db(env, fx, 'shop_srv_webhook_once', { p_id: String(event.id || ''), p_kind: String(event.event_type || '') }))) return json({ ok: true, duplicate: true });

    const type = String(event.event_type || ''); const res = event.resource || {};
    const api = ppBase(env);
    const getUp = async () => { // the capture behind a refund/reversal – only from the PayPal API host
      const up = (res.links || []).find((l: any) => l.rel === 'up' && typeof l.href === 'string');
      if (!up) return null;
      const u = new URL(up.href); if (u.origin !== api) return null;
      const r = await fx(u.toString(), { headers: { Authorization: `Bearer ${token}` } }); return r.ok ? r.json() : null;
    };
    if (type === 'PAYMENT.CAPTURE.COMPLETED' || type === 'PAYMENT.CAPTURE.DENIED') {
      const no = String(res.custom_id || ''); if (!isNo(no)) return json({ ok: true, ignored: 'no_custom_id' });
      await db(env, fx, 'shop_srv_paypal_result', { p_no: no, p_pp_order: res.supplementary_data && res.supplementary_data.related_ids && res.supplementary_data.related_ids.order_id || null, p_capture: res.id, p_status: res.status, p_amount: Number(res.amount && res.amount.value), p_currency: res.amount && res.amount.currency_code, p_source: 'webhook' }).catch(e => { if (!['amount_mismatch', 'order_mismatch', 'not_found'].includes(e.code)) throw e; });
    } else if (type === 'PAYMENT.CAPTURE.REFUNDED' || type === 'PAYMENT.CAPTURE.REVERSED') {
      const cap = await getUp();
      if (cap && isNo(cap.custom_id)) await db(env, fx, 'shop_srv_paypal_result', { p_no: cap.custom_id, p_pp_order: null, p_capture: cap.id, p_status: cap.status === 'PARTIALLY_REFUNDED' ? 'PARTIALLY_REFUNDED' : (type.endsWith('REVERSED') ? 'REVERSED' : 'REFUNDED'), p_amount: null, p_currency: null, p_source: 'webhook' }).catch(() => null);
    } else if (type === 'CHECKOUT.ORDER.APPROVED') {
      // customer approved but the browser was closed before capture: capture on the server (idempotent)
      const pu = (res.purchase_units || [])[0] || {}; const no = String(pu.custom_id || pu.reference_id || '');
      if (isNo(no) && /^[A-Z0-9]{8,40}$/.test(String(res.id || ''))) {
        const r = await fx(api + `/v2/checkout/orders/${res.id}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `adam-capture-${res.id}` } });
        const pp = await r.json().catch(() => ({}));
        const cap = pp && pp.purchase_units && pp.purchase_units[0] && pp.purchase_units[0].payments && pp.purchase_units[0].payments.captures && pp.purchase_units[0].payments.captures[0];
        if (cap && cap.custom_id === no) await db(env, fx, 'shop_srv_paypal_result', { p_no: no, p_pp_order: res.id, p_capture: cap.id, p_status: cap.status, p_amount: Number(cap.amount.value), p_currency: cap.amount.currency_code, p_source: 'webhook' }).catch(() => null);
      }
    }
    return json({ ok: true });
  } catch (e: any) {
    const code = (e && e.code) || 'error';
    return json({ error: code }, code === 'server_not_configured' ? 503 : 500); // non-2xx → PayPal retries later
  }
}
