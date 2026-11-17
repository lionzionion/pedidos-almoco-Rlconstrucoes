-- 17/11/2026: realocacao financeira automatica RL/Solutio.
-- Compativel com funcao Edge manage-users: perfil alterado no servidor com chave administrativa.
-- Uma atualizacao do perfil reclassifica TODOS os pedidos associados, inclusive historicos.
-- Preserva preco, status, data e quantidade; o trigger order_audit guarda a alteracao.
-- O contexto so pode autorizar alteracao da empresa dentro do trigger de profile.
-- As duas protecoes guard_order e ensure_active_order_actor permanecem ativas para pedidos normais.

CREATE OR REPLACE FUNCTION rl_private.ensure_active_order_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP='UPDATE'
     AND pg_trigger_depth() >= 2
     AND coalesce(current_setting('rl.company_move_owner',true),'') = OLD.owner::text
     AND NEW.company IS DISTINCT FROM OLD.company
     AND NEW.company = (SELECT p.company FROM public.profiles p WHERE p.id=OLD.owner)
     AND (to_jsonb(NEW)-'company') IS NOT DISTINCT FROM (to_jsonb(OLD)-'company')
  THEN
    -- Somente reclassificacao iniciada pelo trigger de profiles.
    RETURN NEW;
  END IF;
  IF NOT rl_private.is_active() THEN
    RAISE EXCEPTION 'Acesso bloqueado: conta não habilitada pela administração.';
  END IF;
  RETURN NEW;
END
$function$
;

CREATE OR REPLACE FUNCTION rl_private.guard_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  current_id uuid:=(select auth.uid());
  v_actor_profile_role text;
  v_actor_profile_name text;
  v_actor_company text;
  allowed_sides text[]:=array['Arroz','Feijão mulato','Feijão macassar','Macarrão','Vinagrete','Legumes'];
begin
  IF TG_OP='UPDATE'
     AND pg_trigger_depth() >= 2
     AND coalesce(current_setting('rl.company_move_owner',true),'') = OLD.owner::text
     AND NEW.company IS DISTINCT FROM OLD.company
     AND NEW.company = (SELECT p.company FROM public.profiles p WHERE p.id=OLD.owner)
     AND (to_jsonb(NEW)-'company') IS NOT DISTINCT FROM (to_jsonb(OLD)-'company')
  THEN
    -- Somente reclassificacao iniciada pelo trigger de profiles.
    RETURN NEW;
  END IF;
  select role,display_name,company into v_actor_profile_role,v_actor_profile_name,v_actor_company from public.profiles where id=current_id;
  if current_id is null or v_actor_profile_role is null then
    raise exception 'Acesso não autorizado.';
  end if;
  if TG_OP='INSERT' then
    if v_actor_profile_role not in ('colaborador','admin') then
      raise exception 'Somente colaboradores podem criar pedidos.';
    end if;
    new.owner:=current_id;
    new.employee_name:=v_actor_profile_name;
    new.company:=v_actor_company;
    
new.order_day:=coalesce(new.order_day,(timezone('America/Recife',now()))::date);
    if new.order_day not between (timezone('America/Recife',now()))::date
      and ((timezone('America/Recife',now()))::date + 1) then
      raise exception 'Só é permitido fazer pedidos para hoje ou amanhã (Recife).';
    end if;

    
    if new.meal='cafe' then
      new.order_day:=(timezone('America/Recife',now()))::date + 1;
    elsif new.meal='almoco' and (timezone('America/Recife',now()))::time >= time '12:00' then
      new.order_day:=(timezone('America/Recife',now()))::date + 1;
    end if;
    new.status:='confirmado';

    new.archived:=false;
    new.created_at:=now();
    new.cancel_reason:=null;
    new.cancelled_at:=null;
  else
    if (new.id,new.owner,new.order_day,new.employee_name,new.created_at,new.company)
       is distinct from (old.id,old.owner,old.order_day,old.employee_name,old.created_at,old.company) then
      raise exception 'Identificação e data não podem ser alteradas.';
    end if;
    if v_actor_profile_role='admin' then
      -- Gestor pode corrigir, cancelar, arquivar e restaurar, mas a operação fica auditada.
      null;
    elsif v_actor_profile_role='restaurante' then
      if not ((old.status='confirmado' and new.status='preparo')
           or (old.status='preparo' and new.status='entregue')) then
        raise exception 'Restaurante só pode avançar preparo ou entrega.';
      end if;
      if (to_jsonb(new)-array['status','updated_at']) <>
         (to_jsonb(old)-array['status','updated_at']) then
        raise exception 'Restaurante não pode alterar detalhes de pedido.';
      end if;
    elsif v_actor_profile_role='colaborador' and old.owner=current_id then
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


  if TG_OP='INSERT' then
    if new.dish <> all(rl_private.allowed_dishes(new.meal,new.order_day)) then
      raise exception 'Prato indisponível no cardápio deste dia.';
    end if;
  elsif (new.meal,new.dish,new.order_day) is distinct from (old.meal,old.dish,old.order_day) then
    if new.dish <> all(rl_private.allowed_dishes(new.meal,new.order_day)) then
      raise exception 'Prato indisponível no cardápio deste dia.';
    end if;
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
$function$
;

CREATE OR REPLACE FUNCTION rl_private.sync_company_orders_after_profile_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE previous_context text;
BEGIN
  IF NEW.company NOT IN ('RL','SOLUTIO') THEN
    RAISE EXCEPTION 'Empresa invalida para reclassificacao de pedidos';
  END IF;
  previous_context:=current_setting('rl.company_move_owner',true);
  PERFORM set_config('rl.company_move_owner',NEW.id::text,true);
  -- Uma transacao so: altera perfil E todas as refeicoes vinculadas ao usuario.
  -- Nao modifica status, quantidade, data, preco ou valor global.
  -- Abrange cancelados e arquivados para que o historico permaneça coerente.
  UPDATE public.orders o
     SET company=NEW.company
   WHERE o.owner=NEW.id
     AND o.company IS DISTINCT FROM NEW.company;
  PERFORM set_config('rl.company_move_owner',coalesce(previous_context,''),true);
  RETURN NEW;
END
$function$
;

DROP TRIGGER IF EXISTS rl_reclassify_orders_company ON public.profiles;
CREATE TRIGGER rl_reclassify_orders_company
AFTER UPDATE OF company ON public.profiles
FOR EACH ROW EXECUTE FUNCTION rl_private.sync_company_orders_after_profile_update();
REVOKE ALL ON FUNCTION rl_private.sync_company_orders_after_profile_update() FROM PUBLIC,anon,authenticated;

-- Reparar divergencias anteriores se existirem (sem alterar empresa do cadastro).
UPDATE public.profiles p SET company=p.company
WHERE EXISTS (
 SELECT 1 FROM public.orders o WHERE o.owner=p.id
 AND o.company IS DISTINCT FROM p.company
);
