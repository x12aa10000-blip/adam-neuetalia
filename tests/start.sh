#!/bin/sh
# starts local Postgres, the Supabase stand-in (:54321) and the test web server (:8780)
cd "$(dirname "$0")/.."
pg_ctlcluster 16 main start 2>/dev/null
pgrep -f /tmp/mock.mjs >/dev/null || { cp tests/mock-supabase.mjs /tmp/mock.mjs; chmod 644 /tmp/mock.mjs; su postgres -c "nohup node /tmp/mock.mjs > /tmp/mock-pg.log 2>&1 &"; }
pgrep -f "tests/serve.mjs" >/dev/null || nohup node tests/serve.mjs . > /tmp/web.log 2>&1 &
# test fixture: fresh stock for every product, no leftover rate-limit counters
su postgres -c "psql -q -d shoptest -c \"update shop.kv set v = (select coalesce(jsonb_object_agg(key, value - 'stock'), '{}'::jsonb) from jsonb_each(v)) where k = 'prodOv'; delete from shop.hits;\"" 2>/dev/null
sleep 1.2; curl -s -o /dev/null -w "web %{http_code} " localhost:8780/index.html; curl -s -o /dev/null -w "api %{http_code}\n" -X POST -H 'apikey: x' localhost:54321/rest/v1/rpc/shop_boot
