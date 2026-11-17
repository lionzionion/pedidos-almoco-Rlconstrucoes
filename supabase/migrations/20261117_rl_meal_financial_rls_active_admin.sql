-- Consulta financeira exige ADM ativo, inclusive quando existir token antigo.
drop policy if exists rl_meal_closures_admin_select on public.rl_meal_closures;
create policy rl_meal_closures_admin_select on public.rl_meal_closures
for select to authenticated
using (exists(select 1 from public.profiles p
  where p.id=(select auth.uid()) and p.role='admin' and p.active=true));

drop policy if exists rl_meal_payments_admin_select on public.rl_meal_payments;
create policy rl_meal_payments_admin_select on public.rl_meal_payments
for select to authenticated
using (exists(select 1 from public.profiles p
  where p.id=(select auth.uid()) and p.role='admin' and p.active=true));
