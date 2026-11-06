-- =====================================================================
--  Adam – Shop-Server (Supabase / PostgreSQL 15+)
--  Einmal komplett im Supabase SQL Editor ausführen.
--  Kann gefahrlos erneut ausgeführt werden (Daten bleiben erhalten).
--
--  Sicherheitsprinzip:
--   * Alle Tabellen liegen im Schema "shop", das über die API NICHT erreichbar ist.
--   * Der Browser darf nur die Funktionen unten aufrufen (SECURITY DEFINER).
--   * Jede Funktion prüft Eingaben, Anmeldung, Rolle und Häufigkeit (Rate Limit).
--   * Preise und Summen werden auf dem Server neu berechnet.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists shop;
revoke all on schema shop from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema shop from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema shop from authenticated'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------
create table if not exists shop.kv (
  k text primary key,
  v jsonb not null,
  updated_at timestamptz not null default clock_timestamp()
);
create table if not exists shop.items (
  kind text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (kind, id)
);
create index if not exists items_upd on shop.items (updated_at);
create table if not exists shop.tombstones (
  kind text not null, id text not null, at timestamptz not null default clock_timestamp(), primary key (kind, id)
);
create table if not exists shop.customers (
  id text primary key,
  email text not null unique,
  pw_hash text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create table if not exists shop.admins (
  username text primary key,
  pw_hash text not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default clock_timestamp()
);
create table if not exists shop.sessions (
  token_hash text primary key,
  kind text not null check (kind in ('admin', 'cust')),
  subject text not null,
  role text,
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp()
);
create table if not exists shop.photos (
  id text primary key,
  mime text not null,
  data text not null,
  public boolean not null default false,
  order_no text,
  created_at timestamptz not null default clock_timestamp()
);
create table if not exists shop.hits (key text not null, at timestamptz not null default clock_timestamp());
create index if not exists hits_key on shop.hits (key, at);
create table if not exists shop.secrets (k text primary key, v text not null);
create sequence if not exists shop.order_seq start 10041;

alter table shop.kv enable row level security;
alter table shop.items enable row level security;
alter table shop.tombstones enable row level security;
alter table shop.customers enable row level security;
alter table shop.admins enable row level security;
alter table shop.sessions enable row level security;
alter table shop.photos enable row level security;
alter table shop.hits enable row level security;
alter table shop.secrets enable row level security;

-- ---------------------------------------------------------------------
-- Hilfsfunktionen (intern, nicht über die API aufrufbar)
-- ---------------------------------------------------------------------
create or replace function shop.err(code text) returns void language plpgsql as $$
begin raise exception '%', code using errcode = 'P0001'; end $$;

create or replace function shop.ms(t timestamptz) returns bigint language sql immutable as $$
  select (extract(epoch from t) * 1000)::bigint $$;

create or replace function shop.ip() returns text language plpgsql stable as $$
declare h json; v text;
begin
  begin h := current_setting('request.headers', true)::json; exception when others then h := null; end;
  if h is null then return 'local'; end if;
  v := coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1), h->>'x-real-ip', 'unknown');
  return left(trim(v), 64);
end $$;

-- Häufigkeitsbegrenzung: höchstens n Aufrufe pro Zeitfenster und Schlüssel
create or replace function shop.limit_hits(scope text, n int, win interval, who text default null) returns void language plpgsql as $$
declare k text := scope || ':' || coalesce(who, shop.ip()); c int;
begin
  delete from shop.hits where at < clock_timestamp() - interval '1 day';
  select count(*) into c from shop.hits where key = k and at > clock_timestamp() - win;
  if c >= n then perform shop.err('rate_limited'); end if;
  insert into shop.hits(key) values (k);
end $$;

create or replace function shop.clean(t text, maxlen int) returns text language sql immutable as $$
  select left(trim(regexp_replace(coalesce(t, ''), '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]', '', 'g')), maxlen) $$;

create or replace function shop.is_email(e text) returns boolean language sql immutable as $$
  select e ~* '^[^\s@<>"'']+@[^\s@<>"'']+\.[a-z]{2,}$' and length(e) <= 120 $$;

create or replace function shop.h(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;') $$;

create or replace function shop.new_token() returns text language sql volatile as $$
  select encode(extensions.gen_random_bytes(32), 'hex') $$;

create or replace function shop.thash(t text) returns text language sql immutable as $$
  select encode(extensions.digest(coalesce(t, ''), 'sha256'), 'hex') $$;

create or replace function shop.kvget(key text, def jsonb default null) returns jsonb language sql stable as $$
  select coalesce((select v from shop.kv where k = key), def) $$;

create or replace function shop.kvset(key text, val jsonb) returns void language sql as $$
  insert into shop.kv(k, v, updated_at) values (key, val, clock_timestamp())
  on conflict (k) do update set v = excluded.v, updated_at = clock_timestamp() $$;

create or replace function shop.item_put(knd text, iid text, val jsonb) returns void language sql as $$
  insert into shop.items(kind, id, data, updated_at) values (knd, iid, val, clock_timestamp())
  on conflict (kind, id) do update set data = excluded.data, updated_at = clock_timestamp() $$;

create or replace function shop.log(knd text, txt text, who text) returns void language plpgsql as $$
declare id text := 'l' || shop.ms(clock_timestamp())::text || encode(extensions.gen_random_bytes(3), 'hex');
begin
  perform shop.item_put('activity', id, jsonb_build_object('at', shop.ms(clock_timestamp()), 'kind', knd, 'text', left(txt, 300), 'by', left(coalesce(who, 'system'), 60)));
  delete from shop.items where kind = 'activity' and created_at < clock_timestamp() - interval '180 days';
end $$;

-- Sitzung prüfen: liefert Benutzername/Kunden-ID und Rolle oder Fehler "auth"
create or replace function shop.session(tok text, knd text) returns shop.sessions language plpgsql as $$
declare s shop.sessions;
begin
  if tok is null or length(tok) <> 64 then perform shop.err('auth'); end if;
  select * into s from shop.sessions where token_hash = shop.thash(tok) and kind = knd and expires_at > clock_timestamp();
  if not found then perform shop.err('auth'); end if;
  return s;
end $$;

create or replace function shop.admin(tok text, need_owner boolean default false) returns shop.sessions language plpgsql as $$
declare s shop.sessions;
begin
  s := shop.session(tok, 'admin');
  if not exists (select 1 from shop.admins where username = s.subject) then perform shop.err('auth'); end if;
  if need_owner and s.role <> 'owner' then perform shop.err('forbidden'); end if;
  return s;
end $$;

-- Öffentlich sichtbare Einstellungen (ohne interne Felder)
create or replace function shop.public_settings() returns jsonb language sql stable as $$
  select coalesce(shop.kvget('settings', '{}'::jsonb), '{}'::jsonb) - 'staff' - 'mail' - 'secret' - 'internal' $$;

-- Bestellung für Kunden: ohne interne Notizen
create or replace function shop.order_public(o jsonb) returns jsonb language sql immutable as $$
  select o - 'notes' - 'priceCheck' - 'ip' $$;

-- ---------------------------------------------------------------------
-- E-Mail (optional, über Resend + pg_net). Ohne Schlüssel passiert nichts.
-- ---------------------------------------------------------------------
create or replace function shop.send_mail(to_addr text, subj text, html text, kind text, ref text) returns void language plpgsql as $$
declare key text; sender text; id text;
begin
  id := 'm' || shop.ms(clock_timestamp())::text || encode(extensions.gen_random_bytes(3), 'hex');
  subj := left(regexp_replace(coalesce(subj, ''), '[\r\n\t]+', ' ', 'g'), 200); -- no header injection
  select v into key from shop.secrets where k = 'resend_key';
  select v into sender from shop.secrets where k = 'mail_from';
  perform shop.item_put('email', id, jsonb_build_object('id', id, 'tpl', kind, 'to', to_addr, 'subject', subj, 'no', ref,
    'at', shop.ms(clock_timestamp()), 'sent', key is not null, 'read', false, 'lang', 'de'));
  if key is null or not shop.is_email(to_addr) then return; end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using 'https://api.resend.com/emails',
      jsonb_build_object('from', coalesce(sender, 'Adam <onboarding@resend.dev>'), 'to', jsonb_build_array(to_addr), 'subject', subj, 'html', html),
      jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || key);
exception when others then
  perform shop.log('email', 'E-Mail fehlgeschlagen an ' || to_addr || ': ' || sqlerrm, 'system');
end $$;

create or replace function shop.money(n numeric) returns text language sql immutable as $$
  select replace(to_char(round(n, 2), 'FM999G990D00'), '.', ',') || ' €' $$;

create or replace function shop.mail_order(o jsonb) returns void language plpgsql as $$
declare s jsonb := shop.kvget('settings', '{}'::jsonb); shopname text; shopmail text; lang text := coalesce(o->>'lang', 'de');
  lines text := ''; it jsonb; subj text; body text; hello text; intro text; link text; site text;
begin
  shopname := coalesce(s#>>'{shop,name}', 'Adam'); shopmail := s#>>'{shop,email}';
  site := coalesce(s#>>'{shop,url}', '');
  for it in select * from jsonb_array_elements(o->'items') loop
    lines := lines || '<tr><td style="padding:6px 0">' || (it->>'qty') || '× ' || shop.h(coalesce(it#>>array['name', lang], it#>>'{name,de}', it->>'pid')) ||
      '</td><td style="text-align:right">' || shop.money((it->>'unit')::numeric * (it->>'qty')::int) || '</td></tr>';
  end loop;
  lines := lines || '<tr><td style="padding-top:10px"><b>' || case lang when 'en' then 'Total' when 'ar' then 'المجموع' else 'Gesamt' end ||
    '</b></td><td style="text-align:right;padding-top:10px"><b>' || shop.money((o#>>'{totals,total}')::numeric) || '</b></td></tr>';
  link := case when site <> '' then site || '#/verfolgen/' || (o->>'no') || '?e=' || replace(o#>>'{cust,email}', '@', '%40') else '' end;
  if lang = 'en' then subj := 'Your order ' || (o->>'no') || ' – ' || shopname; hello := 'Hello ' || shop.h(o#>>'{cust,name}') || ',';
    intro := 'thank you for your order. We will start working on it right away.';
  elsif lang = 'ar' then subj := 'طلبك ' || (o->>'no') || ' – ' || shopname; hello := 'مرحباً ' || shop.h(o#>>'{cust,name}') || '،';
    intro := 'شكراً لطلبك. سنبدأ بتحضيره فوراً.';
  else subj := 'Deine Bestellung ' || (o->>'no') || ' – ' || shopname; hello := 'Hallo ' || shop.h(o#>>'{cust,name}') || ',';
    intro := 'vielen Dank für deine Bestellung. Wir machen uns gleich an die Arbeit.';
  end if;
  body := '<div dir="' || case when lang = 'ar' then 'rtl' else 'ltr' end || '" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1c1819">' ||
    '<h2 style="font-weight:600">' || shop.h(shopname) || '</h2><p>' || hello || '</p><p>' || intro || '</p>' ||
    '<p><b>' || shop.h(o->>'no') || '</b></p><table style="width:100%;border-collapse:collapse">' || lines || '</table>' ||
    case when link <> '' then '<p><a href="' || shop.h(link) || '" style="display:inline-block;background:#1c1819;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">' ||
      case lang when 'en' then 'Track order' when 'ar' then 'تتبّع الطلب' else 'Bestellung verfolgen' end || '</a></p>' else '' end ||
    '<p style="color:#777;font-size:12px">' || shop.h(shopname) || ' · ' || shop.h(coalesce(s#>>'{shop,street}', '')) || ' · ' || shop.h(coalesce(s#>>'{shop,zip}', '')) || ' ' || shop.h(coalesce(s#>>'{shop,city}', '')) || '</p></div>';
  perform shop.send_mail(o#>>'{cust,email}', subj, body, 'confirm', o->>'no');
  if shopmail is not null then
    perform shop.send_mail(shopmail, 'Neue Bestellung ' || (o->>'no') || ' · ' || shop.money((o#>>'{totals,total}')::numeric),
      '<div style="font-family:Arial,sans-serif"><h2>Neue Bestellung ' || shop.h(o->>'no') || '</h2><p>' || shop.h(o#>>'{cust,name}') || ' · ' ||
      shop.h(o#>>'{cust,email}') || ' · ' || shop.h(o#>>'{cust,phone}') || '</p><table>' || lines || '</table></div>', 'owner_new', o->>'no');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Preisprüfung: der Server rechnet jede Position und die Summe neu.
-- Die Preisliste ("prices") schreibt der Inhaber-Bereich bei jeder Änderung.
-- ---------------------------------------------------------------------
create or replace function shop.item_price(it jsonb, pr jsonb) returns numeric language plpgsql stable as $$
declare pid text := it->>'pid'; p jsonb; base numeric; o record; ch text; cp numeric; bx jsonb; tb jsonb; n numeric; k text;
begin
  if pid = 'gutschein' then
    base := (it->>'unit')::numeric;
    if base is null or base < 5 or base > 500 then perform shop.err('price'); end if;
    return round(base, 2);
  end if;
  if pid = 'geschenkbox' then
    tb := pr->'_box'; bx := it#>'{D,box}';
    if tb is null or bx is null then perform shop.err('price'); end if;
    base := (tb->'boxes'->>(bx->>'box'))::numeric + (tb->'sizes'->>(bx->>'size'))::numeric + (tb->'fills'->>(bx->>'fill'))::numeric;
    if base is null then perform shop.err('price'); end if;
    for k, n in select key, value::numeric from jsonb_each_text(coalesce(bx->'extras', '{}'::jsonb)) loop
      if n < 0 or n > 999 or n <> trunc(n) or (tb->'extras'->>k) is null then perform shop.err('price'); end if;
      base := base + n * (tb->'extras'->>k)::numeric;
    end loop;
    return round(base, 2);
  end if;
  p := pr->pid;
  if p is null or coalesce((p->>'active')::boolean, true) = false then perform shop.err('product_unavailable'); end if;
  base := (p->>'base')::numeric;
  for o in select key, value from jsonb_each(coalesce(p->'opts', '{}'::jsonb)) loop
    ch := coalesce(it#>>array['D', 'opt', o.key], o.value->>'_def');
    cp := (o.value->'c'->>ch)::numeric;
    if ch is not null and cp is null and not ((o.value->'c') ? ch) then perform shop.err('price'); end if;
    base := base + coalesce(cp, 0);
  end loop;
  return round(base, 2);
end $$;

create or replace function shop.totals(items jsonb, ctx jsonb, s jsonb, out t jsonb, out coupon_code text, out gift_code text) language plpgsql as $$
declare sub numeric := 0; ship numeric := 0; wrap numeric := 0; disc numeric := 0; gift numeric := 0; pre numeric; total numeric;
  it jsonb; m text := ctx->>'method'; c jsonb; g jsonb; by19 numeric := 0; by7 numeric := 0; extra numeric; vat jsonb := '{}'::jsonb; r int; g2 numeric; code text;
begin
  for it in select * from jsonb_array_elements(items) loop
    sub := sub + (it->>'unit')::numeric * (it->>'qty')::int;
    if coalesce((it->>'tax')::int, 19) = 7 then by7 := by7 + (it->>'unit')::numeric * (it->>'qty')::int;
    elsif coalesce((it->>'tax')::int, 19) = 19 then by19 := by19 + (it->>'unit')::numeric * (it->>'qty')::int; end if;
  end loop;
  sub := round(sub, 2);
  if m = 'local' then ship := (s#>>'{shipping,local,price}')::numeric;
  elsif m = 'dhl' then ship := case when sub >= coalesce((s->>'freeFrom')::numeric, 1e9) then 0 else (s#>>'{shipping,dhl,price}')::numeric end;
  elsif m = 'eu' then ship := (s#>>'{shipping,eu,price}')::numeric; end if;
  ship := coalesce(ship, 0);
  if coalesce((ctx->>'wrap')::boolean, false) then wrap := round(coalesce((s->>'wrap')::numeric, 0), 2); end if;
  code := upper(trim(coalesce(ctx->>'coupon', '')));
  if code <> '' then
    select value into c from jsonb_array_elements(shop.kvget('coupons', '[]'::jsonb)) where upper(value->>'code') = code limit 1;
    if c is not null and coalesce((c->>'on')::boolean, false)
       and (coalesce(c->>'until', '') = '' or (c->>'until')::date >= current_date)
       and (coalesce((c->>'max')::int, 0) = 0 or coalesce((c->>'uses')::int, 0) < (c->>'max')::int)
       and sub >= coalesce((c->>'min')::numeric, 0) then
      disc := case when c->>'type' = 'pct' then round(sub * (c->>'value')::numeric / 100, 2) else least(sub, (c->>'value')::numeric) end;
      coupon_code := code;
    end if;
  end if;
  pre := round(sub + ship + wrap - disc, 2);
  code := upper(trim(coalesce(ctx->>'giftcard', '')));
  if code <> '' then
    select data into g from shop.items where kind = 'giftcard' and id = code;
    if g is not null and (g->>'balance')::numeric > 0 then gift := least(pre, (g->>'balance')::numeric); gift_code := code; end if;
  end if;
  total := round(pre - gift, 2);
  extra := ship + wrap - disc;
  foreach r in array array[19, 7] loop
    g2 := case r when 19 then by19 else by7 end;
    if g2 > 0 then g2 := g2 + extra * (g2 / nullif(sub, 0)); vat := vat || jsonb_build_object(r::text, round(g2 - g2 / (1 + r / 100.0), 2)); end if;
  end loop;
  t := jsonb_build_object('sub', sub, 'ship', ship, 'wrap', wrap, 'discount', disc, 'gift', gift, 'total', total, 'vat', vat, 'freeLeft', 0);
end $$;

-- ---------------------------------------------------------------------
-- ÖFFENTLICHE API (Shop)
-- ---------------------------------------------------------------------
create or replace function public.shop_boot() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  return jsonb_build_object(
    'ready', exists (select 1 from shop.admins) and shop.kvget('settings') is not null,
    'settings', shop.public_settings(),
    'prodOv', shop.kvget('prodOv', '{}'::jsonb),
    'customProducts', shop.kvget('customProducts', '[]'::jsonb),
    'catCfg', shop.kvget('catCfg'),
    'site', shop.kvget('site'),
    'promo', coalesce((select jsonb_agg(jsonb_build_object('code', value->>'code', 'type', value->>'type', 'value', value->'value', 'min', value->'min', 'until', value->>'until', 'on', true))
      from jsonb_array_elements(shop.kvget('coupons', '[]'::jsonb)) where coalesce((value->>'public')::boolean, false) and coalesce((value->>'on')::boolean, false)), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(data - 'email' - 'ip' order by created_at desc) from shop.items
      where kind = 'review' and coalesce((data->>'ok')::boolean, false) and not coalesce((data->>'hidden')::boolean, false)), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(data - 'email' - 'ip' order by created_at desc) from shop.items
      where kind = 'question' and coalesce(data->>'answer', '') <> '' and not coalesce((data->>'hidden')::boolean, false)), '[]'::jsonb),
    'now', shop.ms(clock_timestamp()));
end $$;

-- Foto hochladen (Kunde beim Bestellen). ID muss zufällig und lang sein.
create or replace function public.shop_photo_put(p_id text, p_mime text, p_data text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform shop.limit_hits('photo', 40, interval '10 minutes');
  if p_id !~ '^idb:ph[a-z0-9]{20,64}$' then perform shop.err('bad_id'); end if;
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp') then perform shop.err('bad_type'); end if;
  if length(p_data) > 4500000 or p_data !~ '^[A-Za-z0-9+/=]+$' then perform shop.err('too_big'); end if;
  if exists (select 1 from shop.photos where id = p_id) then return true; end if;
  insert into shop.photos(id, mime, data, public) values (p_id, p_mime, p_data, false);
  delete from shop.photos where order_no is null and not public and created_at < clock_timestamp() - interval '3 days';
  return true;
end $$;

-- Foto lesen: öffentliche Bilder für alle, Kundenfotos nur mit der (geheimen, langen) ID
create or replace function public.shop_photo_get(p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r shop.photos;
begin
  perform shop.limit_hits('photo_get', 600, interval '10 minutes');
  select * into r from shop.photos where id = p_id;
  if not found then return null; end if;
  if not r.public and p_id !~ '^idb:ph[a-z0-9]{20,64}$' then return null; end if;
  return jsonb_build_object('mime', r.mime, 'data', r.data);
end $$;

create or replace function public.shop_coupon_check(p_code text, p_sub numeric) returns jsonb language plpgsql security definer set search_path = '' as $$
declare c jsonb; code text := upper(trim(coalesce(p_code, '')));
begin
  perform shop.limit_hits('coupon', 12, interval '5 minutes');
  if code = '' then return jsonb_build_object('err', 'empty'); end if;
  select value into c from jsonb_array_elements(shop.kvget('coupons', '[]'::jsonb)) where upper(value->>'code') = code limit 1;
  if c is null or not coalesce((c->>'on')::boolean, false) then return jsonb_build_object('err', 'invalid'); end if;
  if coalesce(c->>'until', '') <> '' and (c->>'until')::date < current_date then return jsonb_build_object('err', 'expired'); end if;
  if coalesce((c->>'max')::int, 0) > 0 and coalesce((c->>'uses')::int, 0) >= (c->>'max')::int then return jsonb_build_object('err', 'used'); end if;
  if p_sub < coalesce((c->>'min')::numeric, 0) then return jsonb_build_object('err', 'min', 'min', (c->>'min')::numeric); end if;
  return jsonb_build_object('c', jsonb_build_object('code', c->>'code', 'type', c->>'type', 'value', c->'value', 'min', c->'min', 'until', c->>'until', 'on', true));
end $$;

create or replace function public.shop_giftcard_check(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare g jsonb; code text := upper(trim(coalesce(p_code, '')));
begin
  perform shop.limit_hits('giftcard', 10, interval '5 minutes');
  select data into g from shop.items where kind = 'giftcard' and id = code;
  if g is null then return jsonb_build_object('err', 'invalid'); end if;
  if (g->>'balance')::numeric <= 0 then return jsonb_build_object('err', 'empty'); end if;
  return jsonb_build_object('g', jsonb_build_object('code', code, 'balance', (g->>'balance')::numeric));
end $$;

-- ---------------------------------------------------------------------
-- Bestellung aufgeben
-- ---------------------------------------------------------------------
drop function if exists public.shop_order_place(jsonb, text);
create or replace function public.shop_order_place(p jsonb, p_cust_token text default null, p_dry boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s jsonb; pr jsonb; items jsonb := '[]'::jsonb; it jsonb; ni jsonb; unit numeric; prod jsonb; nm jsonb;
  method text; pay text; em text; name text; phone text; cust_id text; cs shop.sessions; tt record; o jsonb; no text; inv text; yr text; n int;
  now_ms bigint := shop.ms(clock_timestamp()); addr jsonb; bill jsonb; d date; appr boolean; any_appr boolean := false; mins int; ph text; pstat text; prev jsonb; mismatch boolean := false;
begin
  if coalesce(p_dry, false) then perform shop.limit_hits('order_check', 30, interval '10 minutes');
  else perform shop.limit_hits('order', 8, interval '10 minutes'); end if;
  if octet_length(p::text) > 3000000 then perform shop.err('too_big'); end if;
  s := shop.kvget('settings'); pr := shop.kvget('prices');
  if s is null or pr is null then perform shop.err('shop_not_ready'); end if;

  -- Kunde
  name := shop.clean(p->>'name', 120); em := lower(shop.clean(p->>'email', 120)); phone := shop.clean(p->>'phone', 40);
  if name = '' or not shop.is_email(em) or length(regexp_replace(phone, '\D', '', 'g')) < 6 then perform shop.err('fields'); end if;

  -- Versand
  method := p->>'method';
  -- 'digital' (no shipping) is only accepted when every item is digital – checked after the item loop
  if method <> 'digital' and (method not in ('pickup', 'local', 'dhl', 'eu') or not coalesce((s#>>array['shipping', method, 'on'])::boolean, false)) then perform shop.err('method'); end if;
  if method not in ('pickup', 'digital') then
    addr := jsonb_build_object('name', shop.clean(p#>>'{addr,name}', 120), 'street', shop.clean(p#>>'{addr,street}', 160), 'zip', shop.clean(p#>>'{addr,zip}', 12),
      'city', shop.clean(p#>>'{addr,city}', 80), 'country', upper(shop.clean(coalesce(p#>>'{addr,country}', 'DE'), 2)));
    if addr->>'street' = '' or addr->>'zip' = '' or addr->>'city' = '' then perform shop.err('fields'); end if;
    if addr->>'name' = '' then addr := addr || jsonb_build_object('name', name); end if;
    if method = 'dhl' and (addr->>'zip') !~ '^\d{5}$' then perform shop.err('zip'); end if;
  end if;
  bill := jsonb_build_object('name', shop.clean(p#>>'{bill,name}', 120), 'street', shop.clean(p#>>'{bill,street}', 160), 'zip', shop.clean(p#>>'{bill,zip}', 12),
    'city', shop.clean(p#>>'{bill,city}', 80), 'country', upper(shop.clean(coalesce(p#>>'{bill,country}', 'DE'), 2)));

  -- Zahlung
  pay := p->>'pay';
  if pay not in ('paypal', 'card', 'vorkasse', 'cash') or not coalesce((s#>>array['payments', pay])::boolean, false) then perform shop.err('pay'); end if;
  if pay = 'cash' and method <> 'pickup' then perform shop.err('pay'); end if;

  -- Positionen prüfen und Preis neu berechnen
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 or jsonb_array_length(p->'items') > 60 then perform shop.err('empty'); end if;
  for it in select * from jsonb_array_elements(p->'items') loop
    if (it->>'qty') !~ '^\d{1,2}$' or (it->>'qty')::int < 1 then perform shop.err('qty'); end if;
    if octet_length(coalesce(it->'D', '{}'::jsonb)::text) > 60000 then perform shop.err('too_big'); end if;
    if coalesce(it->>'preview', '') <> '' and ((it->>'preview') !~ '^data:image/(jpeg|png);base64,[A-Za-z0-9+/=]+$' or length(it->>'preview') > 400000) then perform shop.err('preview'); end if;
    unit := shop.item_price(it, pr);
    -- stock is checked on the server too (the shop also disables the button)
    if it->>'pid' not in ('gutschein', 'geschenkbox') and coalesce((shop.kvget('prodOv', '{}'::jsonb)#>>array[it->>'pid', 'stock'])::int, 25) < (it->>'qty')::int then perform shop.err('product_unavailable'); end if;
    if abs(unit - coalesce((it->>'unit')::numeric, -1)) > 0.009 then mismatch := true; end if;
    prod := pr->(it->>'pid');
    nm := case it->>'pid' when 'gutschein' then coalesce(pr#>'{_names,gutschein}', '{"de":"Geschenkgutschein","en":"Gift card","ar":"بطاقة هدية"}'::jsonb)
                         when 'geschenkbox' then coalesce(pr#>'{_names,geschenkbox}', '{"de":"Geschenkbox","en":"Gift box","ar":"بوكس هدايا"}'::jsonb)
                         else coalesce(prod->'name', '{}'::jsonb) end;
    appr := coalesce((p->>'approval')::boolean, false) and coalesce((it->>'needsApproval')::boolean, false);
    if appr then any_appr := true; end if;
    ni := jsonb_build_object('id', left(coalesce(it->>'id', ''), 40), 'pid', left(it->>'pid', 80), 'D', coalesce(it->'D', '{}'::jsonb), 'qty', (it->>'qty')::int,
      'unit', unit, 'tax', case it->>'pid' when 'gutschein' then 0 when 'geschenkbox' then 19 else coalesce((prod->>'tax')::int, 19) end,
      'name', nm, 'preview', coalesce(it->>'preview', ''), 'at', now_ms,
      'approval', case when appr then jsonb_build_object('status', 'offen', 'token', shop.new_token(), 'comments', '[]'::jsonb) else null end);
    items := items || jsonb_build_array(ni);
  end loop;
  if mismatch then perform shop.err('price_changed'); end if;
  if method = 'digital' and exists (select 1 from jsonb_array_elements(items) x
      where x->>'pid' <> 'gutschein' and not coalesce((pr#>>array[x->>'pid', 'digital'])::boolean, false)) then perform shop.err('method'); end if;

  select * into tt from shop.totals(items, jsonb_build_object('method', method, 'wrap', method <> 'digital' and coalesce((p->>'isGift')::boolean, false) and coalesce((p->>'wrap')::boolean, false),
    'coupon', p->>'coupon', 'giftcard', p->>'giftcard'), s);
  if p ? 'expectTotal' and abs((tt.t->>'total')::numeric - (p->>'expectTotal')::numeric) > 0.009 then perform shop.err('price_changed'); end if;

  -- Lieferdatum
  begin d := nullif(p->>'date', '')::date; exception when others then perform shop.err('date'); end;
  if d is null or d < current_date or d > current_date + 365 then perform shop.err('date'); end if;
  if p_cust_token is not null and p_cust_token <> '' then cs := shop.session(p_cust_token, 'cust'); end if;
  if coalesce(p_dry, false) then return jsonb_build_object('ok', true, 'totals', tt.t); end if;

  -- Kundenkonto oder Gast
  if p_cust_token is not null and p_cust_token <> '' then
    cs := shop.session(p_cust_token, 'cust'); cust_id := cs.subject;
  else
    select c.id into cust_id from shop.customers c where c.email = em;
    if cust_id is null then
      cust_id := 'c' || encode(extensions.gen_random_bytes(8), 'hex');
      insert into shop.customers(id, email, data) values (cust_id, em, jsonb_build_object('name', name, 'phone', phone, 'guest', true,
        'marketing', coalesce((p->>'marketing')::boolean, false), 'addresses', '[]'::jsonb, 'wishlist', '[]'::jsonb, 'designs', '[]'::jsonb));
    end if;
  end if;

  -- Nummern
  n := nextval('shop.order_seq'); no := 'AD-' || n::text;
  yr := to_char(current_date, 'YYYY');
  perform 1 from shop.kv where k = 'seqInv' || yr for update;
  n := coalesce((shop.kvget('seqInv' || yr))::int, 0) + 1; perform shop.kvset('seqInv' || yr, to_jsonb(n));
  inv := 'RE-' || yr || '-' || lpad(n::text, 4, '0');
  mins := coalesce((s->>'cancelMinutes')::int, 60);
  pstat := case when (tt.t->>'total')::numeric = 0 then 'bezahlt' else 'offen' end;

  o := jsonb_build_object('no', no, 'created', now_ms, 'status', 'neu',
    'history', jsonb_build_array(jsonb_build_object('st', 'neu', 'at', now_ms, 'by', 'kunde', 'note', '')),
    'cust', jsonb_build_object('id', cust_id, 'name', name, 'email', em, 'phone', phone),
    'bill', bill,
    'ship', jsonb_build_object('method', method, 'addr', addr, 'date', d::text, 'window', shop.clean(p->>'window', 20), 'recipient', shop.clean(p->>'recipient', 120),
      'store', case when method = 'pickup' and jsonb_typeof(p->'store') = 'object' then jsonb_build_object('name', shop.clean(p#>>'{store,name}', 80), 'street', shop.clean(p#>>'{store,street}', 120), 'zip', shop.clean(p#>>'{store,zip}', 12), 'city', shop.clean(p#>>'{store,city}', 80)) else null end),
    'gift', jsonb_build_object('wrap', method <> 'digital' and coalesce((p->>'isGift')::boolean, false) and coalesce((p->>'wrap')::boolean, false), 'card', shop.clean(p->>'card', 600),
      'hidePrices', coalesce((p->>'hidePrices')::boolean, false), 'isGift', coalesce((p->>'isGift')::boolean, false)),
    'items', items, 'totals', tt.t, 'coupon', coalesce(tt.coupon_code, ''), 'giftcard', coalesce(tt.gift_code, ''),
    'pay', jsonb_build_object('method', pay, 'status', pstat, 'at', case when pstat = 'bezahlt' then to_jsonb(now_ms) else 'null'::jsonb end, 'ref', shop.clean(p->>'payRef', 80)),
    'note', shop.clean(p->>'note', 800), 'lang', case when p->>'lang' in ('de', 'en', 'ar') then p->>'lang' else 'de' end,
    'approval', any_appr, 'tracking', null, 'invoice', inv, 'notes', '[]'::jsonb, 'complaints', '[]'::jsonb,
    'cancelUntil', now_ms + mins * 60000, 'prodDays', least(greatest(coalesce((p->>'prodDays')::int, 2), 0), 60));

  perform shop.item_put('order', no, o);

  -- Bestand, Gutscheincode, Geschenkkarte
  for it in select * from jsonb_array_elements(items) loop
    if it->>'pid' not in ('gutschein', 'geschenkbox') then
      prev := shop.kvget('prodOv', '{}'::jsonb);
      perform shop.kvset('prodOv', jsonb_set(prev, array[it->>'pid'], coalesce(prev->(it->>'pid'), '{}'::jsonb) ||
        jsonb_build_object('stock', greatest(0, coalesce((prev#>>array[it->>'pid', 'stock'])::int, 25) - (it->>'qty')::int))));
    end if;
  end loop;
  if tt.coupon_code is not null then
    perform shop.kvset('coupons', (select jsonb_agg(case when upper(value->>'code') = tt.coupon_code then jsonb_set(value, '{uses}', to_jsonb(coalesce((value->>'uses')::int, 0) + 1)) else value end)
      from jsonb_array_elements(shop.kvget('coupons', '[]'::jsonb))));
  end if;
  if tt.gift_code is not null and (tt.t->>'gift')::numeric > 0 then
    update shop.items set data = jsonb_set(jsonb_set(data, '{balance}', to_jsonb(round((data->>'balance')::numeric - (tt.t->>'gift')::numeric, 2))),
      '{log}', coalesce(data->'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', now_ms, 'amount', -(tt.t->>'gift')::numeric, 'order', no))), updated_at = clock_timestamp()
      where kind = 'giftcard' and id = tt.gift_code and (data->>'balance')::numeric >= (tt.t->>'gift')::numeric;
    if not found then perform shop.err('giftcard'); end if;
  end if;

  -- Kundenfotos dieser Bestellung behalten
  for ph in select distinct (regexp_matches(items::text, 'idb:ph[a-z0-9]{20,64}', 'g'))[1] loop
    update shop.photos set order_no = no where id = ph and order_no is null;
  end loop;

  perform shop.log('auftrag', 'Neue Bestellung ' || no || ' · ' || shop.money((tt.t->>'total')::numeric), 'kunde');
  perform shop.cleanup();
  perform shop.mail_order(o);
  return shop.order_public(o);
end $$;

-- Bestellung ansehen (Nummer + E-Mail)
create or replace function public.shop_order_get(p_no text, p_email text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb;
begin
  perform shop.limit_hits('track', 20, interval '10 minutes');
  perform shop.limit_hits('track_no', 15, interval '1 hour', upper(trim(coalesce(p_no, ''))));
  select data into o from shop.items where kind = 'order' and id = upper(trim(p_no));
  if o is null or lower(o#>>'{cust,email}') <> lower(trim(coalesce(p_email, ''))) then return null; end if;
  return shop.order_public(o);
end $$;

-- Bestellung über den Freigabe-Link ansehen
create or replace function public.shop_order_by_token(p_no text, p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb;
begin
  perform shop.limit_hits('track', 20, interval '10 minutes');
  if p_token is null or length(p_token) <> 64 then return null; end if;
  select data into o from shop.items where kind = 'order' and id = upper(trim(p_no));
  if o is null or not exists (select 1 from jsonb_array_elements(o->'items') x where x#>>'{approval,token}' = p_token) then return null; end if;
  return shop.order_public(o);
end $$;

create or replace function shop.order_for(p_no text, p_email text, p_token text) returns jsonb language plpgsql as $$
declare o jsonb;
begin
  select data into o from shop.items where kind = 'order' and id = upper(trim(p_no)) for update;
  if o is null then return null; end if;
  if p_token is not null and length(p_token) = 64 and exists (select 1 from jsonb_array_elements(o->'items') x where x#>>'{approval,token}' = p_token) then return o; end if;
  if p_email is not null and lower(o#>>'{cust,email}') = lower(trim(p_email)) then return o; end if;
  return null;
end $$;

-- Stornieren durch Kunden (nur innerhalb der Frist, nur Status "neu")
create or replace function public.shop_order_cancel(p_no text, p_email text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb; it jsonb; prev jsonb; now_ms bigint := shop.ms(clock_timestamp());
begin
  perform shop.limit_hits('cancel', 10, interval '10 minutes');
  o := shop.order_for(p_no, p_email, null);
  if o is null then return jsonb_build_object('error_code', 'not_found'); end if;
  if o->>'status' <> 'neu' or now_ms > (o->>'cancelUntil')::bigint then perform shop.err('cancel_late'); end if;
  for it in select * from jsonb_array_elements(o->'items') loop
    if it->>'pid' not in ('gutschein', 'geschenkbox') then
      prev := shop.kvget('prodOv', '{}'::jsonb);
      perform shop.kvset('prodOv', jsonb_set(prev, array[it->>'pid'], coalesce(prev->(it->>'pid'), '{}'::jsonb) ||
        jsonb_build_object('stock', coalesce((prev#>>array[it->>'pid', 'stock'])::int, 25) + (it->>'qty')::int)));
    end if;
  end loop;
  if coalesce(o->>'giftcard', '') <> '' and (o#>>'{totals,gift}')::numeric > 0 then
    update shop.items set data = jsonb_set(data, '{balance}', to_jsonb(round((data->>'balance')::numeric + (o#>>'{totals,gift}')::numeric, 2))), updated_at = clock_timestamp()
      where kind = 'giftcard' and id = o->>'giftcard';
  end if;
  o := jsonb_set(o, '{status}', '"storniert"');
  if o#>>'{pay,status}' = 'bezahlt' then o := jsonb_set(o, '{pay,status}', '"erstattet"'); end if;
  o := jsonb_set(o, '{history}', (o->'history') || jsonb_build_array(jsonb_build_object('st', 'storniert', 'at', now_ms, 'by', 'kunde', 'note', 'vom Kunden')));
  perform shop.item_put('order', o->>'no', o);
  perform shop.log('auftrag', (o->>'no') || ': vom Kunden storniert', 'kunde');
  return shop.order_public(o);
end $$;

-- Entwurf freigeben / Änderung wünschen
create or replace function public.shop_order_approve(p_no text, p_token text, p_idx int, p_ok boolean, p_msg text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb; it jsonb; msg text := shop.clean(p_msg, 600);
begin
  perform shop.limit_hits('approve', 20, interval '10 minutes');
  o := shop.order_for(p_no, null, p_token);
  if o is null then return jsonb_build_object('error_code', 'not_found'); end if;
  if p_idx is null or p_idx < 0 or p_idx >= jsonb_array_length(o->'items') then perform shop.err('not_found'); end if;
  it := o->'items'->p_idx;
  if it->'approval' is null or jsonb_typeof(it->'approval') <> 'object' then perform shop.err('not_found'); end if;
  if it#>>'{approval,token}' <> p_token and not exists (select 1 from jsonb_array_elements(o->'items') x where x#>>'{approval,token}' = p_token) then perform shop.err('not_found'); end if;
  o := jsonb_set(o, array['items', p_idx::text, 'approval', 'status'], to_jsonb(case when p_ok then 'ok' else 'change' end));
  if msg <> '' then
    o := jsonb_set(o, array['items', p_idx::text, 'approval', 'comments'], (o#>array['items', p_idx::text, 'approval', 'comments']) ||
      jsonb_build_array(jsonb_build_object('by', 'kunde', 'text', msg, 'at', shop.ms(clock_timestamp()))));
  end if;
  perform shop.item_put('order', o->>'no', o);
  perform shop.log('freigabe', (o->>'no') || ': Artikel ' || (p_idx + 1) || case when p_ok then ' freigegeben' else ' Änderung gewünscht' end, 'kunde');
  return shop.order_public(o);
end $$;

create or replace function public.shop_order_complaint(p_no text, p_email text, p_text text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb; txt text := shop.clean(p_text, 800);
begin
  perform shop.limit_hits('complaint', 3, interval '10 minutes');
  if txt = '' then perform shop.err('fields'); end if;
  o := shop.order_for(p_no, p_email, null);
  if o is null then return jsonb_build_object('error_code', 'not_found'); end if;
  o := jsonb_set(o, '{complaints}', coalesce(o->'complaints', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', shop.ms(clock_timestamp()), 'text', txt, 'done', false)));
  perform shop.item_put('order', o->>'no', o);
  perform shop.log('reklamation', (o->>'no') || ': ' || left(txt, 60), 'kunde');
  return shop.order_public(o);
end $$;

create or replace function public.shop_review_add(p_pid text, p_stars int, p_name text, p_text text) returns boolean language plpgsql security definer set search_path = '' as $$
declare id text := 'r' || encode(extensions.gen_random_bytes(8), 'hex');
begin
  perform shop.limit_hits('review', 3, interval '10 minutes');
  if shop.clean(p_text, 1500) = '' or p_pid !~ '^[a-z0-9_-]{1,80}$' then perform shop.err('fields'); end if;
  perform shop.item_put('review', id, jsonb_build_object('id', id, 'at', shop.ms(clock_timestamp()), 'ok', false, 'pid', p_pid,
    'stars', least(5, greatest(1, coalesce(p_stars, 5))), 'name', shop.clean(p_name, 60), 'text', shop.clean(p_text, 1500), 'verified', false));
  perform shop.log('bewertung', 'Neue Bewertung für ' || p_pid, 'kunde');
  return true;
end $$;

create or replace function public.shop_question_add(p_pid text, p_text text, p_email text, p_lang text) returns boolean language plpgsql security definer set search_path = '' as $$
declare id text := 'q' || encode(extensions.gen_random_bytes(8), 'hex');
begin
  perform shop.limit_hits('question', 3, interval '10 minutes');
  if shop.clean(p_text, 1000) = '' or p_pid !~ '^[a-z0-9_-]{1,80}$' then perform shop.err('fields'); end if;
  if coalesce(p_email, '') <> '' and not shop.is_email(lower(trim(p_email))) then perform shop.err('fields'); end if;
  perform shop.item_put('question', id, jsonb_build_object('id', id, 'at', shop.ms(clock_timestamp()), 'answer', '', 'pid', p_pid,
    'text', shop.clean(p_text, 1000), 'email', lower(trim(coalesce(p_email, ''))), 'lang', case when p_lang in ('de', 'en', 'ar') then p_lang else 'de' end));
  perform shop.log('frage', 'Neue Frage zu ' || p_pid, 'kunde');
  return true;
end $$;

create or replace function public.shop_newsletter(p_email text, p_lang text) returns boolean language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, '')));
begin
  perform shop.limit_hits('news', 3, interval '10 minutes');
  if not shop.is_email(e) then perform shop.err('fields'); end if;
  perform shop.item_put('newsletter', e, jsonb_build_object('email', e, 'at', shop.ms(clock_timestamp()), 'lang', p_lang, 'confirmed', false));
  return true;
end $$;

-- ---------------------------------------------------------------------
-- Kundenkonten
-- ---------------------------------------------------------------------
create or replace function shop.cust_out(c shop.customers) returns jsonb language sql immutable as $$
  select (c.data - 'pw' - 'notes') || jsonb_build_object('id', c.id, 'email', c.email, 'created', shop.ms(c.created_at)) $$;

create or replace function shop.cust_login_token(cid text) returns text language plpgsql as $$
declare tok text := shop.new_token();
begin
  delete from shop.sessions where expires_at < clock_timestamp();
  insert into shop.sessions(token_hash, kind, subject, expires_at) values (shop.thash(tok), 'cust', cid, clock_timestamp() + interval '30 days');
  return tok;
end $$;

create or replace function public.shop_cust_register(p_name text, p_email text, p_phone text, p_pw text, p_marketing boolean) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, ''))); c shop.customers;
begin
  perform shop.limit_hits('register', 5, interval '30 minutes');
  if not shop.is_email(e) or shop.clean(p_name, 120) = '' then perform shop.err('fields'); end if;
  if length(coalesce(p_pw, '')) < 8 or length(p_pw) > 200 then perform shop.err('pw_short'); end if;
  select * into c from shop.customers where email = e for update;
  if found and c.pw_hash is not null then return jsonb_build_object('error_code', 'exists'); end if;
  if not found then
    insert into shop.customers(id, email, data) values ('c' || encode(extensions.gen_random_bytes(8), 'hex'), e,
      jsonb_build_object('addresses', '[]'::jsonb, 'wishlist', '[]'::jsonb, 'designs', '[]'::jsonb)) returning * into c;
  end if;
  update shop.customers set pw_hash = extensions.crypt(p_pw, extensions.gen_salt('bf', 10)),
    data = (data - 'guest') || jsonb_build_object('name', shop.clean(p_name, 120), 'phone', shop.clean(p_phone, 40), 'marketing', coalesce(p_marketing, false)),
    updated_at = clock_timestamp() where id = c.id returning * into c;
  perform shop.log('kunde', 'Konto erstellt: ' || e, 'kunde');
  return jsonb_build_object('token', shop.cust_login_token(c.id), 'me', shop.cust_out(c));
end $$;

create or replace function public.shop_cust_login(p_email text, p_pw text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, ''))); c shop.customers;
begin
  perform shop.limit_hits('login', 10, interval '15 minutes');
  perform shop.limit_hits('login_acc', 8, interval '15 minutes', e);
  select * into c from shop.customers where email = e;
  if not found or c.pw_hash is null then
    perform extensions.crypt(coalesce(p_pw, ''), extensions.gen_salt('bf', 10)); -- gleiche Laufzeit
    return jsonb_build_object('error_code', 'wrong');
  end if;
  if extensions.crypt(coalesce(p_pw, ''), c.pw_hash) <> c.pw_hash then return jsonb_build_object('error_code', 'wrong'); end if;
  return jsonb_build_object('token', shop.cust_login_token(c.id), 'me', shop.cust_out(c));
end $$;

create or replace function public.shop_cust_logout(p_token text) returns boolean language plpgsql security definer set search_path = '' as $$
begin delete from shop.sessions where token_hash = shop.thash(p_token) and kind = 'cust'; return true; end $$;

create or replace function public.shop_cust_me(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; c shop.customers;
begin
  s := shop.session(p_token, 'cust');
  select * into c from shop.customers where id = s.subject;
  if not found then perform shop.err('auth'); end if;
  return jsonb_build_object('me', shop.cust_out(c),
    'orders', coalesce((select jsonb_agg(shop.order_public(data) order by created_at desc) from shop.items
      where kind = 'order' and (data#>>'{cust,id}' = c.id or lower(data#>>'{cust,email}') = c.email)), '[]'::jsonb));
end $$;

create or replace function public.shop_cust_update(p_token text, p_patch jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; c shop.customers; nd jsonb;
begin
  perform shop.limit_hits('cust_upd', 120, interval '10 minutes');
  s := shop.session(p_token, 'cust');
  if octet_length(p_patch::text) > 200000 then perform shop.err('too_big'); end if;
  select * into c from shop.customers where id = s.subject for update;
  nd := c.data;
  if p_patch ? 'name' then nd := nd || jsonb_build_object('name', shop.clean(p_patch->>'name', 120)); end if;
  if p_patch ? 'phone' then nd := nd || jsonb_build_object('phone', shop.clean(p_patch->>'phone', 40)); end if;
  if p_patch ? 'marketing' then nd := nd || jsonb_build_object('marketing', coalesce((p_patch->>'marketing')::boolean, false)); end if;
  if jsonb_typeof(p_patch->'addresses') = 'array' and jsonb_array_length(p_patch->'addresses') <= 20 then nd := nd || jsonb_build_object('addresses', p_patch->'addresses'); end if;
  if jsonb_typeof(p_patch->'wishlist') = 'array' and jsonb_array_length(p_patch->'wishlist') <= 300 then nd := nd || jsonb_build_object('wishlist', p_patch->'wishlist'); end if;
  if jsonb_typeof(p_patch->'designs') = 'array' and jsonb_array_length(p_patch->'designs') <= 100 then nd := nd || jsonb_build_object('designs', p_patch->'designs'); end if;
  if jsonb_typeof(p_patch->'cart') = 'array' and jsonb_array_length(p_patch->'cart') <= 60 then nd := nd || jsonb_build_object('cart', p_patch->'cart', 'cartAt', shop.ms(clock_timestamp())); end if;
  update shop.customers set data = nd, updated_at = clock_timestamp() where id = c.id returning * into c;
  return shop.cust_out(c);
end $$;

-- Konto löschen (DSGVO). Bestellungen bleiben wegen der Aufbewahrungspflicht (§ 147 AO) erhalten.
create or replace function public.shop_cust_delete(p_token text, p_pw text) returns boolean language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; c shop.customers;
begin
  perform shop.limit_hits('cust_del', 5, interval '15 minutes');
  s := shop.session(p_token, 'cust');
  select * into c from shop.customers where id = s.subject;
  if not found then perform shop.err('auth'); end if;
  delete from shop.sessions where kind = 'cust' and subject = c.id;
  delete from shop.customers where id = c.id;
  insert into shop.tombstones(kind, id) values ('customer', c.id) on conflict (kind, id) do update set at = clock_timestamp();
  perform shop.log('kunde', 'Konto gelöscht (DSGVO): ' || c.email, 'kunde');
  return true;
end $$;

-- ---------------------------------------------------------------------
-- INHABER / TEAM
-- ---------------------------------------------------------------------
create or replace function public.shop_admin_login(p_user text, p_pw text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a shop.admins; tok text;
begin
  perform shop.limit_hits('admin_login', 10, interval '15 minutes');
  perform shop.limit_hits('admin_login_u', 8, interval '15 minutes', lower(coalesce(p_user, '')));
  -- Fehler werden zurückgegeben (nicht geworfen), damit der Zähler für Fehlversuche erhalten bleibt
  select * into a from shop.admins where lower(username) = lower(trim(coalesce(p_user, '')));
  if not found then perform extensions.crypt(coalesce(p_pw, ''), extensions.gen_salt('bf', 10)); return jsonb_build_object('error_code', 'wrong'); end if;
  if extensions.crypt(coalesce(p_pw, ''), a.pw_hash) <> a.pw_hash then
    perform shop.log('sicherheit', 'Fehlgeschlagene Anmeldung: ' || a.username || ' (' || shop.ip() || ')', 'system');
    return jsonb_build_object('error_code', 'wrong');
  end if;
  delete from shop.sessions where expires_at < clock_timestamp();
  tok := shop.new_token();
  insert into shop.sessions(token_hash, kind, subject, role, expires_at) values (shop.thash(tok), 'admin', a.username, a.role, clock_timestamp() + interval '12 hours');
  perform shop.log('sicherheit', 'Anmeldung: ' || a.username, a.username);
  return jsonb_build_object('token', tok, 'user', a.username, 'role', a.role, 'expires', shop.ms(clock_timestamp() + interval '12 hours'));
end $$;

create or replace function public.shop_admin_logout(p_token text) returns boolean language plpgsql security definer set search_path = '' as $$
begin delete from shop.sessions where token_hash = shop.thash(p_token) and kind = 'admin'; return true; end $$;

create or replace function public.shop_admin_users(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform shop.admin(p_token, true);
  return coalesce((select jsonb_agg(jsonb_build_object('user', username, 'role', role) order by created_at) from shop.admins), '[]'::jsonb);
end $$;

-- Team verwalten (nur Inhaber): Benutzer anlegen/ändern/löschen
create or replace function public.shop_admin_user_set(p_token text, p_user text, p_pw text, p_role text, p_delete boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; u text := shop.clean(p_user, 40);
begin
  s := shop.admin(p_token, true);
  if u = '' then perform shop.err('fields'); end if;
  if p_delete then
    if lower(u) = lower(s.subject) then perform shop.err('forbidden'); end if;
    delete from shop.admins where lower(username) = lower(u);
    delete from shop.sessions where kind = 'admin' and lower(subject) = lower(u);
  else
    if p_role not in ('owner', 'staff') then perform shop.err('fields'); end if;
    if exists (select 1 from shop.admins where lower(username) = lower(u)) then
      if coalesce(p_pw, '') <> '' then
        if length(p_pw) < 10 then perform shop.err('pw_short'); end if;
        update shop.admins set pw_hash = extensions.crypt(p_pw, extensions.gen_salt('bf', 10)) where lower(username) = lower(u);
        delete from shop.sessions where kind = 'admin' and lower(subject) = lower(u) and lower(u) <> lower(s.subject);
      end if;
      if lower(u) <> lower(s.subject) then update shop.admins set role = p_role where lower(username) = lower(u); end if;
    else
      if length(coalesce(p_pw, '')) < 10 then perform shop.err('pw_short'); end if;
      insert into shop.admins(username, pw_hash, role) values (u, extensions.crypt(p_pw, extensions.gen_salt('bf', 10)), p_role);
    end if;
  end if;
  perform shop.log('sicherheit', 'Team geändert: ' || u, s.subject);
  return public.shop_admin_users(p_token);
end $$;

drop function if exists public.shop_admin_pw(text, text, text);
create or replace function public.shop_admin_pw(p_token text, p_old text, p_new text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; a shop.admins;
begin
  s := shop.admin(p_token);
  perform shop.limit_hits('admin_pw', 5, interval '15 minutes', s.subject);
  select * into a from shop.admins where username = s.subject;
  if length(coalesce(p_new, '')) < 10 then perform shop.err('pw_short'); end if;
  if extensions.crypt(coalesce(p_old, ''), a.pw_hash) <> a.pw_hash then return jsonb_build_object('error_code', 'wrong'); end if;
  update shop.admins set pw_hash = extensions.crypt(p_new, extensions.gen_salt('bf', 10)) where username = a.username;
  delete from shop.sessions where kind = 'admin' and subject = a.username and token_hash <> shop.thash(p_token);
  perform shop.log('sicherheit', 'Passwort geändert: ' || a.username, a.username);
  return jsonb_build_object('ok', true);
end $$;

-- Alles laden (seit Zeitpunkt p_since in ms; 0 = alles)
create or replace function public.shop_admin_pull(p_token text, p_since bigint) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; since timestamptz := to_timestamp(coalesce(p_since, 0) / 1000.0);
begin
  s := shop.admin(p_token);
  return jsonb_build_object(
    'now', shop.ms(clock_timestamp()),
    'role', s.role, 'user', s.subject,
    'kv', coalesce((select jsonb_object_agg(k, v) from shop.kv where updated_at > since and k not like 'seq%'), '{}'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'id', id, 'data', data) order by created_at)
      from shop.items where updated_at > since and (s.role = 'owner' or kind in ('order', 'email', 'review', 'question'))), '[]'::jsonb),
    'customers', case when s.role = 'owner' then coalesce((select jsonb_agg(shop.cust_out(c) || jsonb_build_object('notes', c.data->'notes', 'hasPw', c.pw_hash is not null)) from shop.customers c where c.updated_at > since), '[]'::jsonb) else '[]'::jsonb end,
    'deleted', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'id', id)) from shop.tombstones where at > since), '[]'::jsonb),
    'mail', exists (select 1 from shop.secrets where k = 'resend_key'));
end $$;

-- Änderungen speichern. Team (staff) darf nur Bestellungen/E-Mails/Bewertungen/Fragen ändern.
create or replace function public.shop_admin_push(p_token text, p_kv jsonb, p_items jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; k text; v jsonb; it jsonb; allowed_kv text[] := array['settings', 'prodOv', 'customProducts', 'catCfg', 'site', 'coupons', 'prices'];
  staff_kinds text[] := array['order', 'email', 'review', 'question', 'activity']; all_kinds text[] := array['order', 'email', 'review', 'question', 'activity', 'giftcard', 'newsletter'];
begin
  s := shop.admin(p_token);
  if octet_length(coalesce(p_kv, '{}'::jsonb)::text) + octet_length(coalesce(p_items, '[]'::jsonb)::text) > 8000000 then perform shop.err('too_big'); end if;
  for k, v in select key, value from jsonb_each(coalesce(p_kv, '{}'::jsonb)) loop
    if not (k = any(allowed_kv)) then perform shop.err('forbidden'); end if;
    if s.role <> 'owner' then perform shop.err('forbidden'); end if;
    if k = 'coupons' and (jsonb_typeof(v) <> 'array' or exists (select 1 from jsonb_array_elements(v) c where jsonb_typeof(c->'value') <> 'number'
        or coalesce(c->>'code', '') !~ '^[A-Z0-9_-]{2,40}$' or coalesce(c->>'type', '') not in ('pct', 'eur'))) then perform shop.err('fields'); end if;
    perform shop.kvset(k, v - 'staff');
  end loop;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if it->>'kind' = 'customer' then
      if s.role <> 'owner' then perform shop.err('forbidden'); end if;
      if coalesce((it->>'deleted')::boolean, false) then
        delete from shop.customers where id = it->>'id';
        delete from shop.sessions where kind = 'cust' and subject = it->>'id';
        insert into shop.tombstones(kind, id) values ('customer', it->>'id') on conflict (kind, id) do update set at = clock_timestamp();
      else
        update shop.customers set data = (data || ((it->'data') - 'id' - 'email' - 'pw' - 'created' - 'hasPw')), updated_at = clock_timestamp() where id = it->>'id';
      end if;
      continue;
    end if;
    if not ((it->>'kind') = any(all_kinds)) then perform shop.err('forbidden'); end if;
    if s.role <> 'owner' and not ((it->>'kind') = any(staff_kinds)) then perform shop.err('forbidden'); end if;
    if coalesce(it->>'id', '') = '' or length(it->>'id') > 120 then perform shop.err('fields'); end if;
    if coalesce((it->>'deleted')::boolean, false) then
      if s.role <> 'owner' then perform shop.err('forbidden'); end if;
      delete from shop.items where kind = it->>'kind' and id = it->>'id';
      insert into shop.tombstones(kind, id) values (it->>'kind', it->>'id') on conflict (kind, id) do update set at = clock_timestamp();
    else
      perform shop.item_put(it->>'kind', it->>'id', it->'data');
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'now', shop.ms(clock_timestamp()));
end $$;

-- Bild aus dem Inhaber-Bereich speichern (Produktbilder, Website-Bilder → öffentlich)
create or replace function public.shop_admin_photo_put(p_token text, p_id text, p_mime text, p_data text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform shop.admin(p_token);
  if p_id !~ '^idb:[A-Za-z0-9_-]{4,80}$' then perform shop.err('bad_id'); end if;
  if p_mime not in ('image/jpeg', 'image/png', 'image/webp') then perform shop.err('bad_type'); end if;
  if length(p_data) > 8000000 or p_data !~ '^[A-Za-z0-9+/=]+$' then perform shop.err('too_big'); end if;
  insert into shop.photos(id, mime, data, public) values (p_id, p_mime, p_data, true)
    on conflict (id) do update set public = true;
  return true;
end $$;

create or replace function public.shop_admin_photo_get(p_token text, p_id text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r shop.photos;
begin
  perform shop.admin(p_token);
  select * into r from shop.photos where id = p_id;
  if not found then return null; end if;
  return jsonb_build_object('mime', r.mime, 'data', r.data);
end $$;

-- E-Mail aus dem Inhaber-Bereich senden (Statusmeldungen). Nur an E-Mail-Adressen aus Bestellungen.
create or replace function public.shop_admin_mail(p_token text, p_no text, p_to text, p_subject text, p_html text, p_kind text) returns boolean language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; o jsonb; e text := lower(trim(coalesce(p_to, '')));
begin
  s := shop.admin(p_token);
  perform shop.limit_hits('admin_mail', 200, interval '1 hour', s.subject);
  select data into o from shop.items where kind = 'order' and id = p_no;
  if o is null then perform shop.err('not_found'); end if;
  if e <> lower(o#>>'{cust,email}') and not exists (select 1 from jsonb_array_elements(o->'items') x where lower(x#>>'{D,f,toEmail}') = e)
     and e <> lower(coalesce(shop.kvget('settings')#>>'{shop,email}', '')) then perform shop.err('forbidden'); end if;
  if length(coalesce(p_html, '')) > 300000 then perform shop.err('too_big'); end if;
  perform shop.send_mail(e, left(shop.clean(p_subject, 200), 200), p_html, left(coalesce(p_kind, 'status'), 30), p_no);
  return true;
end $$;

-- E-Mail-Versand einrichten (nur Inhaber)
create or replace function public.shop_admin_mail_setup(p_token text, p_key text, p_from text) returns boolean language plpgsql security definer set search_path = '' as $$
declare s shop.sessions;
begin
  s := shop.admin(p_token, true);
  if coalesce(p_key, '') = '' then delete from shop.secrets where k in ('resend_key');
  else insert into shop.secrets(k, v) values ('resend_key', trim(p_key)) on conflict (k) do update set v = excluded.v; end if;
  if coalesce(p_from, '') <> '' then insert into shop.secrets(k, v) values ('mail_from', shop.clean(p_from, 120)) on conflict (k) do update set v = excluded.v; end if;
  perform shop.log('sicherheit', 'E-Mail-Versand geändert', s.subject);
  return true;
end $$;

-- ---------------------------------------------------------------------
-- Rechte: nur die öffentlichen Funktionen sind aufrufbar
-- ---------------------------------------------------------------------
revoke all on all tables in schema shop from public;
revoke all on all sequences in schema shop from public;
revoke all on all functions in schema shop from public;
do $$
declare f record; r text;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'shop\_%' and p.proname not like 'shop\_srv\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then execute format('grant execute on function %s to %I', f.sig, r); end if;
    end loop;
  end loop;
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema shop from %I', r);
      execute format('revoke all on all functions in schema shop from %I', r);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Inhaber anlegen / Passwort zurücksetzen (nur im SQL Editor ausführbar):
--   select shop.set_owner('Inhaber', 'EIN-LANGES-PASSWORT');
-- ---------------------------------------------------------------------
create or replace function shop.set_owner(u text, pw text) returns text language plpgsql as $$
begin
  if length(coalesce(pw, '')) < 10 then raise exception 'Passwort mindestens 10 Zeichen'; end if;
  insert into shop.admins(username, pw_hash, role) values (u, extensions.crypt(pw, extensions.gen_salt('bf', 10)), 'owner')
    on conflict (username) do update set pw_hash = excluded.pw_hash, role = 'owner';
  delete from shop.sessions where kind = 'admin' and subject = u;
  return 'OK: ' || u;
end $$;
revoke all on function shop.set_owner(text, text) from public;

-- ---------------------------------------------------------------------
-- Passwort vergessen (Kunden): Link per E-Mail, 1 Stunde gültig.
-- Antwort ist immer gleich, damit niemand herausfinden kann, wer ein Konto hat.
-- ---------------------------------------------------------------------
alter table shop.sessions drop constraint if exists sessions_kind_check;
alter table shop.sessions add constraint sessions_kind_check check (kind in ('admin', 'cust', 'reset'));

create or replace function public.shop_cust_pw_forgot(p_email text, p_lang text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(coalesce(p_email, ''))); c shop.customers; tok text; site text; lang text := case when p_lang in ('de', 'en', 'ar') then p_lang else 'de' end; link text;
begin
  perform shop.limit_hits('pw_forgot', 5, interval '30 minutes');
  perform shop.limit_hits('pw_forgot_e', 3, interval '30 minutes', e);
  select * into c from shop.customers where email = e and pw_hash is not null;
  site := shop.kvget('settings')#>>'{shop,url}';
  if found and coalesce(site, '') ~ '^https://' then
    delete from shop.sessions where kind = 'reset' and subject = c.id;
    tok := shop.new_token();
    insert into shop.sessions(token_hash, kind, subject, expires_at) values (shop.thash(tok), 'reset', c.id, clock_timestamp() + interval '1 hour');
    link := regexp_replace(site, '/+$', '') || '/#/konto/passwort?t=' || tok;
    perform shop.send_mail(e,
      case lang when 'en' then 'Reset your password' when 'ar' then 'إعادة تعيين كلمة السر' else 'Passwort zurücksetzen' end,
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto" dir="' || case when lang = 'ar' then 'rtl' else 'ltr' end || '"><p>' ||
      case lang when 'en' then 'You requested a new password. The link is valid for 1 hour.' when 'ar' then 'طلبت كلمة سر جديدة. الرابط صالح لمدة ساعة.' else 'Du hast ein neues Passwort angefordert. Der Link ist 1 Stunde gültig.' end ||
      '</p><p><a href="' || shop.h(link) || '" style="display:inline-block;background:#1c1819;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">' ||
      case lang when 'en' then 'Set new password' when 'ar' then 'تعيين كلمة سر جديدة' else 'Neues Passwort festlegen' end || '</a></p><p style="color:#777;font-size:12px">' ||
      case lang when 'en' then 'If this was not you, simply ignore this e-mail.' when 'ar' then 'إذا لم تطلب ذلك، تجاهل هذه الرسالة.' else 'Wenn du das nicht warst, ignoriere diese E-Mail einfach.' end || '</p></div>', 'pw_reset', '');
  end if;
  return jsonb_build_object('ok', true, 'mail', exists (select 1 from shop.secrets where k = 'resend_key'));
end $$;

create or replace function public.shop_cust_pw_reset(p_token text, p_pw text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare s shop.sessions; c shop.customers;
begin
  perform shop.limit_hits('pw_reset', 10, interval '30 minutes');
  if length(coalesce(p_pw, '')) < 8 or length(p_pw) > 200 then perform shop.err('pw_short'); end if;
  if p_token is null or length(p_token) <> 64 then return jsonb_build_object('error_code', 'expired'); end if;
  select * into s from shop.sessions where token_hash = shop.thash(p_token) and kind = 'reset' and expires_at > clock_timestamp();
  if not found then return jsonb_build_object('error_code', 'expired'); end if;
  update shop.customers set pw_hash = extensions.crypt(p_pw, extensions.gen_salt('bf', 10)), updated_at = clock_timestamp() where id = s.subject returning * into c;
  delete from shop.sessions where subject = s.subject and kind in ('cust', 'reset');
  perform shop.log('kunde', 'Passwort zurückgesetzt: ' || c.email, 'kunde');
  return jsonb_build_object('token', shop.cust_login_token(c.id), 'me', shop.cust_out(c));
end $$;

-- Kundenfotos 90 Tage nach Abschluss der Bestellung löschen (läuft bei jeder neuen Bestellung mit)
create or replace function shop.cleanup() returns void language sql as $$
  delete from shop.photos p where not p.public and p.order_no is not null and exists (
    select 1 from shop.items i where i.kind = 'order' and i.id = p.order_no and i.data->>'status' in ('zugestellt', 'storniert') and i.updated_at < clock_timestamp() - interval '90 days');
  delete from shop.sessions where expires_at < clock_timestamp();
$$;

do $$
declare f record; r text;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'shop\_%' and p.proname not like 'shop\_srv\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then execute format('grant execute on function %s to %I', f.sig, r); end if;
    end loop;
  end loop;
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on all functions in schema shop from %I', r); end if;
  end loop;
end $$;
revoke all on all functions in schema shop from public;

-- ---------------------------------------------------------------------
-- Härtung: feste search_path für alle internen Funktionen (Supabase-Linter: function_search_path_mutable)
-- ---------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'shop' loop
    execute format('alter function %s set search_path = %L', f.sig, '');
  end loop;
end $$;


-- =====================================================================
--  PayPal: Prüfung auf dem Server (Supabase Edge Functions)
--  Diese Funktionen darf NUR die Server-Rolle (service_role) aufrufen –
--  also nur die Edge Functions mit dem geheimen Schlüssel, nie der Browser.
-- =====================================================================
create table if not exists shop.webhook_events (
  id text primary key, kind text, received_at timestamptz not null default clock_timestamp()
);
alter table shop.webhook_events enable row level security;

-- Bestellung für die Zahlung laden (Nummer + E-Mail wie beim Verfolgen)
create or replace function public.shop_srv_paypal_order(p_no text, p_email text, p_ip text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb;
begin
  perform shop.limit_hits('pp_order', 30, interval '10 minutes', coalesce(p_ip, 'edge'));
  select data into o from shop.items where kind = 'order' and id = upper(trim(coalesce(p_no, '')));
  if o is null or lower(o#>>'{cust,email}') <> lower(trim(coalesce(p_email, ''))) then return jsonb_build_object('error_code', 'not_found'); end if;
  if o#>>'{pay,method}' not in ('paypal', 'card') then return jsonb_build_object('error_code', 'not_paypal'); end if;
  if o->>'status' = 'storniert' then return jsonb_build_object('error_code', 'cancelled'); end if;
  if o#>>'{pay,status}' = 'bezahlt' then return jsonb_build_object('error_code', 'already_paid'); end if;
  return jsonb_build_object('no', o->>'no', 'total', (o#>>'{totals,total}')::numeric, 'currency', 'EUR', 'ppOrder', o#>>'{pay,ppOrder}',
    'shop', coalesce(shop.kvget('settings')#>>'{shop,name}', 'Adam'));
end $$;

-- PayPal-Bestellnummer an unsere Bestellung hängen
create or replace function public.shop_srv_paypal_attach(p_no text, p_pp_order text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb;
begin
  if p_pp_order !~ '^[A-Z0-9]{8,40}$' then return jsonb_build_object('error_code', 'bad_id'); end if;
  select data into o from shop.items where kind = 'order' and id = upper(trim(p_no)) for update;
  if o is null then return jsonb_build_object('error_code', 'not_found'); end if;
  o := jsonb_set(o, '{pay,ppOrder}', to_jsonb(p_pp_order));
  perform shop.item_put('order', o->>'no', o);
  return jsonb_build_object('ok', true);
end $$;

-- Ergebnis von PayPal eintragen. Bezahlt wird nur, wenn Betrag, Währung und Bestellnummer exakt stimmen.
-- payment received: mail to the customer with invoice number and the link to order + invoice (PDF on the tracking page)
create or replace function shop.mail_paid(o jsonb) returns void language plpgsql as $$
declare s jsonb := shop.kvget('settings', '{}'::jsonb); lang text := coalesce(o->>'lang', 'de'); site text; link text; subj text; p1 text; p2 text; b text; shopname text;
begin
  shopname := coalesce(s#>>'{shop,name}', 'Adam'); site := regexp_replace(coalesce(s#>>'{shop,url}', ''), '[#?].*$', '');
  link := case when site ~ '^https://' then site || '#/verfolgen/' || (o->>'no') || '?e=' || replace(o#>>'{cust,email}', '@', '%40') else '' end;
  if lang = 'en' then subj := 'Payment received – your invoice for ' || (o->>'no'); p1 := 'thank you, we have received your payment. Your invoice number is ' || shop.h(o->>'invoice') || '.'; p2 := 'You can download the invoice as a PDF any time with the button below.'; b := 'View order & invoice';
  elsif lang = 'ar' then subj := 'وصل الدفع – فاتورتك للطلب ' || (o->>'no'); p1 := 'شكراً إلك، وصلنا الدفع. رقم فاتورتك ' || shop.h(o->>'invoice') || '.'; p2 := 'فيك تنزّل الفاتورة PDF بأي وقت من الزر تحت.'; b := 'شوف الطلب والفاتورة';
  else subj := 'Zahlung erhalten – deine Rechnung zu ' || (o->>'no'); p1 := 'vielen Dank, deine Zahlung ist bei uns eingegangen. Deine Rechnung hat die Nummer ' || shop.h(o->>'invoice') || '.'; p2 := 'Die Rechnung kannst du jederzeit über den Knopf unten als PDF herunterladen.'; b := 'Bestellung & Rechnung ansehen';
  end if;
  perform shop.send_mail(o#>>'{cust,email}', subj,
    '<div dir="' || case when lang = 'ar' then 'rtl' else 'ltr' end || '" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#333333"><h2 style="font-weight:600">' || shop.h(shopname) || '</h2><p>' ||
    shop.h(o#>>'{cust,name}') || ',</p><p>' || p1 || '</p><p><b>' || shop.money((o#>>'{totals,total}')::numeric) || '</b></p><p>' || p2 || '</p>' ||
    case when link <> '' then '<p><a href="' || shop.h(link) || '" style="display:inline-block;background:#333333;color:#FFFFFF;padding:12px 18px;border-radius:8px;text-decoration:none">' || b || '</a></p>' else '' end || '</div>',
    'paid', o->>'no');
end $$;

create or replace function public.shop_srv_paypal_result(p_no text, p_pp_order text, p_capture text, p_status text, p_amount numeric, p_currency text, p_source text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare o jsonb; total numeric; now_ms bigint := shop.ms(clock_timestamp()); st text;
begin
  select data into o from shop.items where kind = 'order' and id = upper(trim(coalesce(p_no, ''))) for update;
  if o is null then return jsonb_build_object('error_code', 'not_found'); end if;
  total := (o#>>'{totals,total}')::numeric;
  if p_status = 'COMPLETED' then
    if p_currency is distinct from 'EUR' or p_amount is null or abs(p_amount - total) > 0.004 then
      o := jsonb_set(o, '{pay,problem}', to_jsonb('Betrag/Währung passt nicht: ' || coalesce(p_amount::text, '?') || ' ' || coalesce(p_currency, '?') || ' statt ' || total::text || ' EUR'));
      perform shop.item_put('order', o->>'no', o);
      perform shop.log('zahlung', (o->>'no') || ': PayPal-Betrag passt NICHT (' || coalesce(p_amount::text, '?') || ' ' || coalesce(p_currency, '?') || ')', 'paypal');
      return jsonb_build_object('error_code', 'amount_mismatch');
    end if;
    if o#>>'{pay,ppOrder}' is not null and p_pp_order is not null and o#>>'{pay,ppOrder}' <> p_pp_order then
      perform shop.log('zahlung', (o->>'no') || ': PayPal-Zahlung zu anderer PayPal-Bestellung (' || p_pp_order || ')', 'paypal');
      return jsonb_build_object('error_code', 'order_mismatch');
    end if;
    if o#>>'{pay,status}' = 'bezahlt' and o#>>'{pay,capture}' = p_capture then return jsonb_build_object('ok', true, 'already', true); end if;
    o := jsonb_set(o, '{pay}', (o->'pay') || jsonb_build_object('status', 'bezahlt', 'at', now_ms, 'capture', p_capture, 'ppOrder', coalesce(p_pp_order, o#>>'{pay,ppOrder}'),
      'verified', 'paypal-server', 'source', p_source) - 'problem');
    o := jsonb_set(o, '{history}', (o->'history') || jsonb_build_array(jsonb_build_object('st', o->>'status', 'at', now_ms, 'by', 'paypal', 'note', 'Zahlung bestätigt (' || p_source || ')')));
    st := 'bezahlt';
    perform shop.item_put('order', o->>'no', o);
    perform shop.mail_paid(o);
  elsif p_status in ('REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED') then
    o := jsonb_set(o, '{pay}', (o->'pay') || jsonb_build_object('status', case when p_status = 'PARTIALLY_REFUNDED' then 'teilerstattet' else 'erstattet' end, 'refundAt', now_ms));
    st := 'erstattet';
  elsif p_status in ('DENIED', 'DECLINED', 'FAILED') then
    o := jsonb_set(o, '{pay,problem}', to_jsonb('PayPal: ' || p_status));
    st := 'abgelehnt';
  else
    return jsonb_build_object('ok', true, 'ignored', p_status);
  end if;
  perform shop.item_put('order', o->>'no', o);
  perform shop.log('zahlung', (o->>'no') || ': PayPal ' || st || ' (' || p_source || ')', 'paypal');
  return jsonb_build_object('ok', true, 'status', o#>>'{pay,status}');
end $$;

-- Webhook-Ereignisse nur einmal verarbeiten
create or replace function public.shop_srv_webhook_once(p_id text, p_kind text) returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_id is null or p_id = '' or length(p_id) > 100 then return false; end if;
  insert into shop.webhook_events(id, kind) values (p_id, left(p_kind, 60)) on conflict do nothing;
  get diagnostics n = row_count;          -- 1 = new event, 0 = already processed
  delete from shop.webhook_events where received_at < clock_timestamp() - interval '90 days';
  return n = 1;
end $$;

do $$
declare f record; r text;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'shop\_srv\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    foreach r in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = r) then execute format('revoke all on function %s from %I', f.sig, r); end if;
    end loop;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', f.sig); end if;
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'shop' loop
    execute format('alter function %s set search_path = %L', f.sig, '');
  end loop;
end $$;
revoke all on all functions in schema shop from public;
