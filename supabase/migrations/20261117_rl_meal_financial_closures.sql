-- RL Pedidos | Fechamentos e pagamentos de refeições (ADM)
-- Fechamentos gerados no servidor com snapshot imutável; não alteram pedidos.
create table if not exists public.rl_meal_closures (
  id uuid primary key default gen_random_uuid(),
  company text not null check (company in ('RL','SOLUTIO')),
  period_start date not null,
  period_end date not null,
  coffee_count integer not null check (coffee_count >= 0),
  lunch_count integer not null check (lunch_count >= 0),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_cents integer not null check (delivery_cents >= 0),
  total_cents integer generated always as (subtotal_cents + delivery_cents) stored,
  orders_snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint rl_meal_closure_valid_period check (period_start <= period_end)
);
create index if not exists rl_meal_closures_company_period_idx
  on public.rl_meal_closures(company,period_start,period_end);

create table if not exists public.rl_meal_payments (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.rl_meal_closures(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  payment_day date not null,
  method text not null check (method in ('pix','transferencia','dinheiro','outro')),
  notes text not null default '' check (length(notes) <= 240),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists rl_meal_payments_closure_idx on public.rl_meal_payments(closure_id);

alter table public.rl_meal_closures enable row level security;
alter table public.rl_meal_payments enable row level security;
revoke all on public.rl_meal_closures, public.rl_meal_payments from anon, authenticated;
grant select on public.rl_meal_closures, public.rl_meal_payments to authenticated;
create policy rl_meal_closures_admin_select on public.rl_meal_closures
for select to authenticated using ((select rl_private.has_role('admin')));
create policy rl_meal_payments_admin_select on public.rl_meal_payments
for select to authenticated using ((select rl_private.has_role('admin')));

-- Somente o servidor cria fechamentos; calcula frete rateado em centavos
-- com a mesma regra do app: arredonda parcela RL e entrega resíduo à Solutio.
create or replace function public.rl_create_meal_closure(
  p_company text, p_start date, p_end date
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_coffee int := 0;
  v_lunch int := 0;
  v_subtotal int := 0;
  v_freight int := 0;
  v_share int;
  v_fee int;
  v_count int;
  v_snapshot jsonb;
  r record;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and active = true
  ) then raise exception 'Acesso restrito ao administrador.'; end if;
  if p_company not in ('RL','SOLUTIO') or p_company is null
    or p_start is null or p_end is null
    or p_start > p_end or p_end > (timezone('America/Recife',now())::date)
    or p_end - p_start > 366
  then raise exception 'Empresa ou período de fechamento inválido.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(141285,case when p_company='RL' then 1 else 2 end);
  if exists (
    select 1 from public.rl_meal_closures
    where company=p_company and period_start<=p_end and period_end>=p_start
  ) then raise exception 'Já existe fechamento para esta empresa com datas sobrepostas.'; end if;
  if exists (
    select 1 from public.orders where order_day between p_start and p_end
    and not archived and status not in ('cancelado','entregue')
  ) then raise exception 'Existem pedidos sem entrega confirmada neste período. Finalize as entregas antes do fechamento.'; end if;
  select count(*) filter(where meal='cafe')::int,
         count(*) filter(where meal='almoco')::int,
         coalesce(sum(round(price*100)::int),0)::int,
         coalesce(jsonb_agg(jsonb_build_object(
           'id',id,'day',order_day,'employee_name',employee_name,
           'meal',meal,'dish',dish,'price_cents',round(price*100)::int
         ) order by order_day,meal,employee_name),'[]'::jsonb)
  into v_coffee,v_lunch,v_subtotal,v_snapshot
  from public.orders
  where order_day between p_start and p_end
    and company=p_company and not archived and status='entregue';
  if v_coffee + v_lunch = 0 then
    raise exception 'Não há refeições entregues desta empresa para fechar.'; end if;
  for r in
    select order_day,meal,count(*)::int as all_count,
           count(*) filter(where company='RL')::int as rl_count,
           count(*) filter(where company='SOLUTIO')::int as sol_count
    from public.orders
    where order_day between p_start and p_end and not archived and status='entregue'
    group by order_day,meal
  loop
    v_fee := case when r.meal='cafe' then 800 else 1200 end;
    v_share := round(v_fee::numeric*r.rl_count/r.all_count)::int;
    v_count := case when p_company='RL' then r.rl_count else r.sol_count end;
    if v_count > 0 then
      v_freight := v_freight + case when p_company='RL' then v_share else v_fee-v_share end;
    end if;
  end loop;
  insert into public.rl_meal_closures(
    company,period_start,period_end,coffee_count,lunch_count,
    subtotal_cents,delivery_cents,orders_snapshot,created_by
  ) values (
    p_company,p_start,p_end,v_coffee,v_lunch,v_subtotal,v_freight,
    v_snapshot,(select auth.uid())
  ) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.rl_create_meal_closure(text,date,date) from public,anon,authenticated;
grant execute on function public.rl_create_meal_closure(text,date,date) to authenticated;

-- Pagamentos são somente adicionados, sem sobrescrever o histórico.
-- Bloqueio por linha impede dois lançamentos simultâneos acima do saldo.
create or replace function public.rl_record_meal_payment(
  p_closure_id uuid, p_amount_cents integer, p_payment_day date,
  p_method text, p_notes text default ''
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_total integer; v_paid integer;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles
    where id=(select auth.uid()) and role='admin' and active=true
  ) then raise exception 'Acesso restrito ao administrador.'; end if;
  if p_closure_id is null or p_amount_cents is null or p_amount_cents<=0
    or p_payment_day is null or p_payment_day > (timezone('America/Recife',now())::date)
    or p_method not in ('pix','transferencia','dinheiro','outro') or p_method is null
    or length(coalesce(p_notes,'')) > 240
  then raise exception 'Dados do pagamento inválidos.'; end if;
  select total_cents into v_total from public.rl_meal_closures
  where id=p_closure_id for update;
  if not found then raise exception 'Fechamento não encontrado.'; end if;
  select coalesce(sum(amount_cents),0)::int into v_paid
  from public.rl_meal_payments where closure_id=p_closure_id;
  if p_amount_cents > v_total-v_paid then
    raise exception 'O valor ultrapassa o saldo pendente deste fechamento.'; end if;
  insert into public.rl_meal_payments(
    closure_id,amount_cents,payment_day,method,notes,created_by
  ) values (p_closure_id,p_amount_cents,p_payment_day,p_method,
    coalesce(p_notes,''),(select auth.uid()))
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.rl_record_meal_payment(uuid,integer,date,text,text)
  from public,anon,authenticated;
grant execute on function public.rl_record_meal_payment(uuid,integer,date,text,text)
  to authenticated;

-- Protege auditoria financeira quando alguém tentar "zerar testes" após fechamento.
create or replace function rl_private.rl_guard_closed_meal_delete()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.rl_meal_closures
             where period_start<=old.order_day and period_end>=old.order_day)
  then raise exception 'Existem fechamentos financeiros neste período. Não apague os pedidos.'; end if;
  return old;
end $$;
drop trigger if exists rl_closed_meal_guard_delete on public.orders;
create trigger rl_closed_meal_guard_delete before delete on public.orders
for each row execute function rl_private.rl_guard_closed_meal_delete();
revoke all on function rl_private.rl_guard_closed_meal_delete() from public,anon,authenticated;
