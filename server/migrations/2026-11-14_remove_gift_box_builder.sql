-- Removes the "Design your box" builder from the server.
-- New orders with pid 'geschenkbox' are now rejected ('product_unavailable'). Old orders that contain such items stay readable and
-- can still be cancelled (the cancel/stock code keeps skipping the pid). Applied 2026-11-14 after the owner approved.
begin;
create or replace function shop.item_price(it jsonb, pr jsonb) returns numeric language plpgsql stable set search_path = '' as $$
declare pid text := it->>'pid'; p jsonb; base numeric; o record; ch text; cp numeric; 
begin
  if pid = 'gutschein' then
    base := (it->>'unit')::numeric;
    if base is null or base < 5 or base > 500 then perform shop.err('price'); end if;
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
commit;
