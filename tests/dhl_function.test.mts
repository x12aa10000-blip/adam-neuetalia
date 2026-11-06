// Tests the DHL label Edge Function logic (supabase/functions/_shared/dhl.ts) under Node 22 against
// (1) a local DHL API mock and (2) the real database functions via the local Supabase stand-in (service role).
// Run: npx tsx tests/dhl_function.test.mts   (needs tests/start.sh running)
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { handleLabel, splitStreet } from '../supabase/functions/_shared/dhl.ts';

const API = 'http://localhost:54321';
const DHL_PORT = 8996, DHL = `http://localhost:${DHL_PORT}`;
const full = { DHL_API_BASE: DHL, DHL_API_KEY: 'DHL-KEY-TEST', DHL_USER: 'user-valid', DHL_PASSWORD: 'SandboxPasswort2023!', DHL_BILLING_DE: '33333333330102',
  SUPABASE_URL: API, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test', ALLOWED_ORIGINS: 'https://shop.example' };
const results: [string, boolean][] = [];
const check = (name: string, ok: boolean, info: unknown = '') => { results.push([name, ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(info).slice(0, 260))); };
const sql = (q: string) => execFileSync('su', ['postgres', '-c', `psql -X -At -d shoptest -c "${q}"`]).toString().trim();

// ---------------- DHL mock ----------------
const S = { last: null as any, headers: {} as any, mode: 'ok' as 'ok' | 'invalid' | 'auth', hits: 0 };
const dhl = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  S.hits++; S.headers = req.headers; S.last = { url: req.url, body: body ? JSON.parse(body) : null };
  const send = (code: number, o: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (S.mode === 'auth' || req.headers['dhl-api-key'] !== 'DHL-KEY-TEST' || req.headers.authorization !== 'Basic ' + Buffer.from('user-valid:SandboxPasswort2023!').toString('base64')) return send(401, { title: 'Unauthorized', status: 401 });
  if (S.mode === 'invalid') return send(400, { status: { title: 'Bad Request', statusCode: 400 }, items: [{ sstatus: { title: 'Bad Request', statusCode: 400 }, validationMessages: [{ property: 'consignee.postalCode', validationMessage: 'Die Postleitzahl ist ungültig.', validationState: 'Error' }] }] });
  send(200, { status: { title: 'OK', statusCode: 200 }, items: [{ shipmentNo: '00340434161094000001', sstatus: { title: 'OK', statusCode: 200 }, label: { b64: Buffer.from('%PDF-1.4 test').toString('base64'), fileFormat: 'PDF' },
    validationMessages: [{ property: 'consignee.addressStreet', validationMessage: 'Hausnummer bitte prüfen.', validationState: 'Warning' }] }] });
});
await new Promise<void>(r => dhl.listen(DHL_PORT, r));

async function rpc(fn: string, args: unknown, key = 'sb_publishable_test') {
  const r = await fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', 'x-test-ip': '10.77.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) }, body: JSON.stringify(args) });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const call = (env: Record<string, string>, body: unknown) => handleLabel(new Request('https://fn/dhl-label', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://shop.example' }, body: JSON.stringify(body) }), env, fetch);

// ---------------- fixtures ----------------
sql("delete from shop.hits");
const login = await rpc('shop_admin_login', { p_user: 'Inhaber', p_pw: 'TestPasswort123!' });
const token = login.body && login.body.token;
check('admin login for the test', typeof token === 'string' && token.length === 64, login);
// a DHL order ready to ship (synthetic data, local test DB only)
sql("select shop.item_put('order', 'AD-990001', jsonb_build_object('no','AD-990001','status','bereit','lang','de','cust',jsonb_build_object('name','Erika Muster','email','erika@example.org','phone','0151 2345678'),'ship',jsonb_build_object('method','dhl','date',current_date::text,'addr',jsonb_build_object('name','Erika Muster','street','Lange Reihe 5a','zip','20099','city','Hamburg','country','DE')),'items','[]'::jsonb,'totals',jsonb_build_object('total',10),'pay',jsonb_build_object('method','vorkasse','status','bezahlt'),'history','[]'::jsonb))");
const dhlNo = 'AD-990001';
const pickNo = sql("select id from shop.items where kind='order' and data#>>'{ship,method}'='pickup' order by created_at desc limit 1");
check('test has a DHL order', /^AD-\d+$/.test(dhlNo), dhlNo);
const addr = JSON.parse(sql(`select data#>'{ship,addr}' from shop.items where kind='order' and id='${dhlNo}'`));

// ---------------- tests ----------------
let r = await call({ SUPABASE_URL: API, SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test' }, { token, no: dhlNo, kg: 1 });
check('without DHL secrets → 503 server_not_configured', r.status === 503 && (await r.json()).error === 'server_not_configured');

r = await call(full, { token: 'f'.repeat(64), no: dhlNo, kg: 1 });
check('unknown admin token → 401, DHL not called', r.status === 401 && S.hits === 0, [r.status, S.hits]);

r = await call(full, { token: 'x', no: dhlNo, kg: 1 });
check('malformed token → 401', r.status === 401);

r = await call(full, { token, no: dhlNo, kg: 99 });
check('weight over 31.5 kg → 400', r.status === 400 && (await r.json()).error === 'weight');

r = await call(full, { token, no: pickNo, kg: 1 });
check('pick-up order → refused (not_dhl)', r.status === 400 && (await r.json()).error === 'not_dhl');

r = await call(full, { token, no: dhlNo, kg: 1.2, consignee: { name: 'Attacker', street: 'Evil 1' }, billingNumber: '99999999999999' });
const j = await r.json();
check('valid request → shipment number + PDF label', r.status === 200 && j.shipmentNo === '00340434161094000001' && Buffer.from(j.label, 'base64').toString().startsWith('%PDF'), j);
check('DHL warnings are passed on, not treated as failure', Array.isArray(j.warnings) && j.warnings.length === 1);
const sh = S.last.body && S.last.body.shipments && S.last.body.shipments[0];
check('DHL called with API key + business user (Basic auth)', S.headers['dhl-api-key'] === 'DHL-KEY-TEST' && String(S.headers.authorization).startsWith('Basic '));
check('label as PDF requested', /docFormat=PDF/.test(S.last.url) && /includeDocs=include/.test(S.last.url), S.last.url);
check('address comes from the database, not from the request', sh && sh.consignee.name1 === addr.name && sh.consignee.postalCode === addr.zip && sh.consignee.name1 !== 'Attacker', sh && sh.consignee);
check('billing number from the server secret, not from the request', sh && sh.billingNumber === '33333333330102');
check('German parcel product + country DEU + weight', sh && sh.product === 'V01PAK' && sh.consignee.country === 'DEU' && sh.details.weight.value === 1.2);
check('sender = shop address from settings', sh && sh.shipper.city && sh.shipper.postalCode && sh.shipper.country === 'DEU', sh && sh.shipper);
check('secrets never in the answer', !JSON.stringify(j).includes('SandboxPasswort') && !JSON.stringify(j).includes('DHL-KEY-TEST'));

S.mode = 'invalid'; r = await call(full, { token, no: dhlNo, kg: 1 }); const jv = await r.json();
check('DHL validation error → 400 with readable message', r.status === 400 && jv.error === 'dhl_rejected' && jv.messages[0].text.includes('Postleitzahl'), jv);
S.mode = 'auth'; r = await call(full, { token, no: dhlNo, kg: 1 });
check('DHL rejects credentials → dhl_auth', r.status === 502 && (await r.json()).error === 'dhl_auth');
S.mode = 'ok';

const direct = await rpc('shop_srv_dhl_order', { p_token: token, p_no: dhlNo });
check('browser key cannot call shop_srv_dhl_order directly', direct.status >= 400 || (direct.body && direct.body.error_code), direct.status);

const pre = await handleLabel(new Request('https://fn/dhl-label', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), full, fetch);
check('CORS: foreign origin not allowed', pre.headers.get('access-control-allow-origin') !== 'https://evil.example');

check('street split: "Lange Reihe 5a"', JSON.stringify(splitStreet('Lange Reihe 5a')) === JSON.stringify(['Lange Reihe', '5a']));
check('street split: "Steindamm 62"', JSON.stringify(splitStreet('Steindamm 62')) === JSON.stringify(['Steindamm', '62']));
check('street split: "Straße des 17. Juni 12-14"', JSON.stringify(splitStreet('Straße des 17. Juni 12-14')) === JSON.stringify(['Straße des 17. Juni', '12-14']), splitStreet('Straße des 17. Juni 12-14'));
check('street split: no number', JSON.stringify(splitStreet('Am Markt')) === JSON.stringify(['Am Markt', '']));

dhl.close();
console.log(`\n${results.filter(x => x[1]).length} PASS, ${results.filter(x => !x[1]).length} FAIL`);
process.exit(results.some(x => !x[1]) ? 1 : 0);
