-- RL Pedidos | Integridade de períodos já faturados.
-- Bloqueia recategorização, cancelamento, arquivamento e alteração monetária
-- quando existe fechamento para qualquer empresa naquela data.
create or replace function rl_private.rl_guard_closed_meal_update()
returns trigger language plpgsql set search_path=''
as $$
begin
  if (new.company,new.status,new.archived,new.price,new.meal,new.order_day)
     is distinct from
     (old.company,old.status,old.archived,old.price,old.meal,old.order_day)
     and exists (
       select 1 from public.rl_meal_closures c
       where (old.order_day between c.period_start and c.period_end)
          or (new.order_day between c.period_start and c.period_end)
     )
  then raise exception 'Já existe fechamento financeiro nessa data. Alteração bloqueada para proteger os valores faturados.'; end if;
  return new;
end $$;
drop trigger if exists zz_rl_closed_meal_guard_update on public.orders;
create trigger zz_rl_closed_meal_guard_update
before update on public.orders
for each row execute function rl_private.rl_guard_closed_meal_update();
revoke all on function rl_private.rl_guard_closed_meal_update() from public,anon,authenticated;
