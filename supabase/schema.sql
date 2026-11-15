-- AMBEV Pedidos RL | esquema inicial para projeto Supabase DEDICADO.
-- Execute no SQL Editor de um projeto novo; NÃO aplique em projetos Solutio/LD/CampusFreq existentes.
-- Restringe perfis e pedidos via Auth + Row Level Security.
create schema if not exists rl_private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 3 and 80),
  role text not null default 'colaborador' check (role in ('colaborador','restaurante','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete restrict,
  employee_name text not null,
  order_day date not null default (timezone('America/Recife',now())::date),
  meal text not null check (meal in ('cafe','almoco')),
  dish text not null,
  accompaniments text[] not null default '{}'::text[],
  notes text not null default '' check (length(notes) <= 250),
  price numeric(10,2) not null default 0,
  status text not null default 'confirmado' check (status in ('confirmado','preparo','entregue','cancelado')),
  cancel_reason text,
  cancelled_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists rl_one_active_meal_per_day
  on public.orders(owner,order_day,meal) where status<>'cancelado' and archived=false;
create index if not exists rl_orders_date_idx on public.orders(order_day,meal,status);

create table if not exists public.order_audit (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  actor uuid,
  activity text not null,
  before_data jsonb,
  after_data jsonb,
  changed_at timestamptz not null default now()
);

create or replace function rl_private.has_role(wanted text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role=wanted
  )
$$;
revoke all on function rl_private.has_role(text) from public, anon;
grant usage on schema rl_private to authenticated;
grant execute on function rl_private.has_role(text) to authenticated;

create or replace function rl_private.create_profile()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), split_part(new.email,'@',1)),80))
  on conflict(id) do nothing;
  return new;
end
$$;
revoke all on function rl_private.create_profile() from public, anon, authenticated;
drop trigger if exists rl_auth_profile on auth.users;
create trigger rl_auth_profile after insert on auth.users
for each row execute function rl_private.create_profile();

create or replace function rl_private.allowed_dishes(p_meal text,p_date date)
returns text[] language plpgsql immutable set search_path=''
as $$
declare d integer:=extract(dow from p_date);
begin
  if p_meal='cafe' then
    return case d
      when 0 then array['Cuscuz com frango e vinagrete','Cachorro-quente','Café só com pão']
      when 1 then array['Pão com queijo e mortadela','Cuscuz com frango e vinagrete','Café só com pão']
      when 2 then array['Cuscuz com salsichinha','Pão com queijo e mortadela','Café só com pão']
      when 3 then array['Cachorro-quente','Macaxeira com linguiça toscana acebolada','Café só com pão']
      when 4 then array['Pão com queijo e mortadela','Cuscuz com frango e vinagrete','Café só com pão']
      when 5 then array['Cuscuz com salsichinha','Cachorro-quente','Café só com pão']
      else array['Macaxeira com linguiça toscana','Pão com queijo e mortadela','Café só com pão'] end;
  elsif p_meal='almoco' then
    return case d
      when 0 then array['Arrumadinho misto (carne de sol, frango e calabresa)','Frango à milanesa','Parmegiana de carne']
      when 1 then array['Parmegiana de frango','Arrumadinho de carne de sol','Filé de frango']
      when 2 then array['Frango à milanesa','Arrumadinho misto','Arrumadinho de frango']
      when 3 then array['Bife à milanesa','Parmegiana de carne','Arrumadinho de frango e calabresa']
      when 4 then array['Filé de frango','Arrumadinho de carne de sol','Frango à milanesa']
      when 5 then array['Parmegiana de carne','Bife à milanesa','Arrumadinho misto']
      else array['Arrumadinho de frango','Filé de frango','Parmegiana de frango'] end;
  end if;
  return '{}'::text[];
end
$$;
revoke all on function rl_private.allowed_dishes(text,date) from public, anon;
grant execute on function rl_private.allowed_dishes(text,date) to authenticated;

create or replace function rl_private.guard_order()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare
  current_id uuid:=(select auth.uid());
  current_role text;
  current_name text;
  allowed_sides text[]:=array['Arroz','Feijão mulato','Feijão macassar','Macarrão','Vinagrete','Legumes'];
begin
  select role,display_name into current_role,current_name from public.profiles where id=current_id;
  if current_id is null or current_role is null then
    raise exception 'Acesso não autorizado.';
  end if;
  if TG_OP='INSERT' then
    if current_role not in ('colaborador','admin') then
      raise exception 'Somente colaboradores podem criar pedidos.';
    end if;
    new.owner:=current_id;
    new.employee_name:=current_name;
    new.order_day:=(timezone('America/Recife',now()))::date;
    new.status:='confirmado';
    new.archived:=false;
    new.created_at:=now();
    new.cancel_reason:=null;
    new.cancelled_at:=null;
  else
    if (new.id,new.owner,new.order_day,new.employee_name,new.created_at)
       is distinct from (old.id,old.owner,old.order_day,old.employee_name,old.created_at) then
      raise exception 'Identificação e data não podem ser alteradas.';
    end if;
    if current_role='admin' then
      -- Gestor pode corrigir, cancelar, arquivar e restaurar, mas a operação fica auditada.
      null;
    elsif current_role='restaurante' then
      if not ((old.status='confirmado' and new.status='preparo')
           or (old.status='preparo' and new.status='entregue')) then
        raise exception 'Restaurante só pode avançar preparo ou entrega.';
      end if;
      if (to_jsonb(new)-array['status','updated_at']) <>
         (to_jsonb(old)-array['status','updated_at']) then
        raise exception 'Restaurante não pode alterar detalhes de pedido.';
      end if;
    elsif current_role='colaborador' and old.owner=current_id then
      if old.status<>'confirmado' or old.archived then
        raise exception 'Pedido já em preparo, cancelado ou arquivado.';
      end if;
      if new.status='cancelado' then
        if (to_jsonb(new)-array['status','cancel_reason','cancelled_at','updated_at']) <>
           (to_jsonb(old)-array['status','cancel_reason','cancelled_at','updated_at']) then
          raise exception 'Cancelamento não pode alterar outros campos.';
        end if;
      elsif new.status='confirmado' then
        if (to_jsonb(new)-array['meal','dish','accompaniments','notes','price','updated_at']) <>
           (to_jsonb(old)-array['meal','dish','accompaniments','notes','price','updated_at']) then
          raise exception 'Colaborador só pode editar a refeição e observações.';
        end if;
      else
        raise exception 'Colaborador não pode alterar este status.';
      end if;
    else
      raise exception 'Sem permissão para modificar este pedido.';
    end if;
  end if;

  if new.dish <> all(rl_private.allowed_dishes(new.meal,new.order_day)) then
    raise exception 'Prato indisponível no cardápio deste dia.';
  end if;
  if new.meal='cafe' and cardinality(new.accompaniments)>0 then
    raise exception 'Acompanhamentos são exclusivos do almoço.';
  end if;
  if exists(select 1 from unnest(new.accompaniments) s where not(s=any(allowed_sides))) then
    raise exception 'Acompanhamento inválido.';
  end if;
  if 'Feijão mulato'=any(new.accompaniments) and 'Feijão macassar'=any(new.accompaniments) then
    raise exception 'Selecione apenas um tipo de feijão.';
  end if;

  new.price:=case when new.meal='almoco' then 22
                  when new.dish='Café só com pão' then 10 else 17 end;
  if TG_OP='UPDATE' and new.status='cancelado' and old.status<>'cancelado' then
    new.cancelled_at:=now();
  elsif TG_OP='UPDATE' and old.status='cancelado' and new.status<>'cancelado' then
    new.cancelled_at:=null;
    new.cancel_reason:=null;
  end if;
  new.updated_at:=now();
  return new;
end
$$;
revoke all on function rl_private.guard_order() from public, anon, authenticated;
drop trigger if exists rl_guard_order on public.orders;
create trigger rl_guard_order before insert or update on public.orders
for each row execute function rl_private.guard_order();

create or replace function rl_private.track_order()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.order_audit(order_id,actor,activity,before_data,after_data)
  values(new.id,(select auth.uid()),lower(TG_OP),
         case when TG_OP='INSERT' then null else to_jsonb(old) end,
         to_jsonb(new));
  return new;
end
$$;
revoke all on function rl_private.track_order() from public, anon, authenticated;
drop trigger if exists rl_track_order on public.orders;
create trigger rl_track_order after insert or update on public.orders
for each row execute function rl_private.track_order();

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_audit enable row level security;
drop policy if exists "profile_select" on public.profiles;
create policy "profile_select" on public.profiles for select to authenticated
using (id=(select auth.uid()) or (select rl_private.has_role('admin')) or (select rl_private.has_role('restaurante')));
drop policy if exists "profile_admin_update" on public.profiles;
create policy "profile_admin_update" on public.profiles for update to authenticated
using ((select rl_private.has_role('admin'))) with check ((select rl_private.has_role('admin')));

drop policy if exists "order_select" on public.orders;
create policy "order_select" on public.orders for select to authenticated
using (owner=(select auth.uid()) or (select rl_private.has_role('admin')) or (select rl_private.has_role('restaurante')));
drop policy if exists "order_insert" on public.orders;
create policy "order_insert" on public.orders for insert to authenticated
with check (owner=(select auth.uid()) and ((select rl_private.has_role('colaborador')) or (select rl_private.has_role('admin'))));
drop policy if exists "order_update" on public.orders;
create policy "order_update" on public.orders for update to authenticated
using (owner=(select auth.uid()) or (select rl_private.has_role('admin')) or (select rl_private.has_role('restaurante')))
with check (owner=(select auth.uid()) or (select rl_private.has_role('admin')) or (select rl_private.has_role('restaurante')));

drop policy if exists "audit_admin_read" on public.order_audit;
create policy "audit_admin_read" on public.order_audit for select to authenticated
using ((select rl_private.has_role('admin')));

revoke all on public.profiles,public.orders,public.order_audit from anon;
revoke all on public.profiles,public.orders,public.order_audit from authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,role) on public.profiles to authenticated; -- política restringe a gestores
grant select,insert on public.orders to authenticated;
grant update(meal,dish,accompaniments,notes,status,cancel_reason,archived) on public.orders to authenticated;
grant select on public.order_audit to authenticated;
-- Exclusão física não é exposta à aplicação. "Apagar" = arquivar, preservando auditoria.
-- Primeiro gestor (substitua e-mail por cadastro já confirmado):
-- update public.profiles set role='admin' where id=(select id from auth.users where email='GESTOR@EXEMPLO.COM');
-- Restaurante:
-- update public.profiles set role='restaurante' where id=(select id from auth.users where email='RESTAURANTE@EXEMPLO.COM');
-- Em Database > Replication, habilite Realtime para public.orders (atualização instantânea).
