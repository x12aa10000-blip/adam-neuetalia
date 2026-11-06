// DHL shipping label for the Adam shop (Supabase Edge Function "dhl-label").
//
// Security model
//  * DHL API key, business-customer user/password and billing numbers exist only here (Edge Function secrets).
//  * Only a logged-in shop admin can create a label: the admin session token is checked inside the database
//    (shop_srv_dhl_order, callable with the service role only), which also returns the addresses – the browser
//    never sends addresses or prices to DHL itself.
//  * One request = one label for one DHL order; nothing is stored here.
//
// DHL Parcel DE Shipping API v2: POST {base}/orders  (Basic auth = business customer user, header dhl-api-key).
// Sandbox: https://api-sandbox.dhl.com/parcel/de/shipping/v2  ·  Production: https://api-eu.dhl.com/parcel/de/shipping/v2
// Production use needs DHL's approval after a successful sandbox test.

export type Env = Record<string, string | undefined>;
type Fetch = typeof fetch;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

export function cors(req: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || 'null'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

export const dhlBase = (env: Env) => env.DHL_API_BASE
  || (env.DHL_ENV === 'production' ? 'https://api-eu.dhl.com/parcel/de/shipping/v2' : 'https://api-sandbox.dhl.com/parcel/de/shipping/v2');

const ISO3: Record<string, string> = { DE: 'DEU', AT: 'AUT', NL: 'NLD', BE: 'BEL', FR: 'FRA', DK: 'DNK', PL: 'POL', CH: 'CHE', IT: 'ITA', ES: 'ESP', SE: 'SWE' };

/** "Lange Reihe 5a" -> ["Lange Reihe", "5a"] (DHL wants street and house number apart when possible) */
export function splitStreet(s: string): [string, string] {
  const t = String(s || '').trim();
  const m = /^(.*?\D)\s*(\d+\s*[a-zA-Z]?(?:\s*[-/]\s*\d+\s*[a-zA-Z]?)?)$/.exec(t);
  return m ? [m[1].trim().replace(/,$/, ''), m[2].replace(/\s+/g, '')] : [t, ''];
}

async function db(env: Env, fx: Fetch, fn: string, args: Record<string, unknown>) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json', apikey: key };
  if (key.startsWith('eyJ')) h.Authorization = `Bearer ${key}`;
  const r = await fx(`${(env.SUPABASE_URL || '').replace(/\/+$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify(args) });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error('db'), { code: 'db_error' });
  if (body && body.error_code) throw Object.assign(new Error(body.error_code), { code: body.error_code });
  return body;
}

const clean = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const orNull = (v: unknown, n: number) => { const s = clean(v, n); return s ? s : undefined; };

export function buildShipment(o: any, env: Env, kg: number) {
  const intl = o.method === 'eu';
  const c = o.consignee || {}; const sh = o.shipper || {};
  const [cs, ch] = splitStreet(c.street); const [ss, shn] = splitStreet(sh.street);
  const country = ISO3[String(c.country || 'DE').toUpperCase()] || 'DEU';
  return {
    profile: env.DHL_PROFILE || 'STANDARD_GRUPPENPROFIL',
    shipments: [{
      product: intl ? 'V53WPAK' : 'V01PAK',
      billingNumber: intl ? env.DHL_BILLING_INTL : env.DHL_BILLING_DE,
      refNo: clean(o.no, 35).padEnd(8, ' ').slice(0, 35),
      shipDate: new Date().toISOString().slice(0, 10),
      shipper: { name1: clean(sh.name, 50), addressStreet: clean(ss, 50), addressHouse: orNull(shn, 10), postalCode: clean(sh.zip, 10), city: clean(sh.city, 40), country: 'DEU', email: orNull(sh.email, 80), phone: orNull(sh.phone, 20) },
      consignee: { name1: clean(c.name, 50), addressStreet: clean(cs, 50), addressHouse: orNull(ch, 10), postalCode: clean(c.zip, 10), city: clean(c.city, 40), country, email: orNull(c.email, 80), phone: orNull(c.phone, 20) },
      details: { weight: { uom: 'kg', value: kg } },
    }],
  };
}

/** POST {token, no, kg} -> {shipmentNo, label (base64 PDF), warnings[]} */
export async function handleLabel(req: Request, env: Env, fx: Fetch = fetch): Promise<Response> {
  const c = cors(req, env);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: c });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, c);
  try {
    const t = await req.text(); if (t.length > 4000) return json({ error: 'too_big' }, 400, c);
    let d: any; try { d = JSON.parse(t || '{}'); } catch { return json({ error: 'bad_json' }, 400, c); }
    if (typeof d.token !== 'string' || !/^[a-f0-9]{64}$/.test(d.token)) return json({ error: 'auth' }, 401, c);
    if (typeof d.no !== 'string' || !/^[A-Z]{2}-\d{1,9}$/.test(d.no.trim().toUpperCase())) return json({ error: 'bad_request' }, 400, c);
    const kg = Math.round(Number(d.kg) * 1000) / 1000;
    if (!(kg >= 0.01 && kg <= 31.5)) return json({ error: 'weight' }, 400, c);
    const miss = ['DHL_API_KEY', 'DHL_USER', 'DHL_PASSWORD', 'DHL_BILLING_DE'].filter(k => !env[k]);
    if (miss.length) return json({ error: 'server_not_configured' }, 503, c);
    const o = await db(env, fx, 'shop_srv_dhl_order', { p_token: d.token, p_no: d.no.trim().toUpperCase() });
    if (o.method === 'eu' && !env.DHL_BILLING_INTL) return json({ error: 'intl_not_configured' }, 503, c);
    const body = buildShipment(o, env, kg);
    const r = await fx(dhlBase(env) + '/orders?docFormat=PDF&includeDocs=include', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Language': 'de-DE', 'dhl-api-key': String(env.DHL_API_KEY),
        Authorization: 'Basic ' + btoa(`${env.DHL_USER}:${env.DHL_PASSWORD}`) },
      body: JSON.stringify(body),
    });
    const res = await r.json().catch(() => null);
    const it = res && Array.isArray(res.items) ? res.items[0] : null;
    const msgs = (it && Array.isArray(it.validationMessages) ? it.validationMessages : []).map((m: any) => ({ field: clean(m.property, 80), text: clean(m.validationMessage, 300), state: clean(m.validationState, 20) }));
    if (!r.ok || !it || !it.shipmentNo) {
      const status = r.status === 401 || r.status === 403 ? 502 : 400;
      return json({ error: r.status === 401 || r.status === 403 ? 'dhl_auth' : 'dhl_rejected', messages: msgs.length ? msgs : [{ field: '', text: clean(res && (res.detail || res.title), 300), state: 'Error' }] }, status, c);
    }
    return json({ shipmentNo: clean(it.shipmentNo, 40), label: it.label && typeof it.label.b64 === 'string' ? it.label.b64 : null, labelUrl: it.label && it.label.url ? clean(it.label.url, 500) : null,
      warnings: msgs.filter((m: any) => m.state !== 'Error') }, 200, c);
  } catch (e: any) {
    const code = (e && e.code) || 'error';
    return json({ error: code }, code === 'auth' ? 401 : ['not_found', 'not_dhl', 'closed'].includes(code) ? 400 : 502, c);
  }
}
