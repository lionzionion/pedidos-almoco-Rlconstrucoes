-- RL Construções + Solutio: separação por empresa e convite seguro
-- IMPORTANTE: não inserir convites/tokens em repositório público.
-- Aplicar após schema.sql, managed-accounts.sql e fix-order-profile-role.sql.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT 'RL'
 CHECK (company IN ('RL','SOLUTIO'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT 'RL'
 CHECK (company IN ('RL','SOLUTIO'));

DO $$
DECLARE s text;
BEGIN
 SELECT pg_get_functiondef('rl_private.guard_order()'::regprocedure) INTO s;
 IF s IS NULL THEN RAISE EXCEPTION 'Função guard_order não encontrada'; END IF;
 IF position('v_actor_company text;' IN s)=0 THEN
  s:=replace(s,'v_actor_profile_name text;',
                 'v_actor_profile_name text; v_actor_company text;');
  s:=replace(s,
   'select role,display_name into v_actor_profile_role,v_actor_profile_name from public.profiles where id=current_id;',
   'select role,display_name,company into v_actor_profile_role,v_actor_profile_name,v_actor_company from public.profiles where id=current_id;');
  s:=replace(s,'new.employee_name:=v_actor_profile_name;',
               'new.employee_name:=v_actor_profile_name; new.company:=v_actor_company;');
  s:=replace(s,'(new.id,new.owner,new.order_day,new.employee_name,new.created_at)',
               '(new.id,new.owner,new.order_day,new.employee_name,new.created_at,new.company)');
  s:=replace(s,'(old.id,old.owner,old.order_day,old.employee_name,old.created_at)',
               '(old.id,old.owner,old.order_day,old.employee_name,old.created_at,old.company)');
  EXECUTE s;
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_invitations (
 username text PRIMARY KEY,
 display_name text NOT NULL,
 company text NOT NULL CHECK(company IN ('RL','SOLUTIO')),
 job_title text NOT NULL DEFAULT '',
 token_hash text UNIQUE NOT NULL CHECK(length(token_hash)=64),
 expires_at timestamptz NOT NULL,
 redeemed_at timestamptz,
 auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_invitations FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS staff_invitations_deny_clients ON public.staff_invitations;
CREATE POLICY staff_invitations_deny_clients ON public.staff_invitations FOR ALL TO authenticated USING(false) WITH CHECK(false);
-- Somente a Edge Function autenticada com SERVICE_ROLE consulta e consome convites.
-- Os links pessoais distribuem apenas token criptográfico, guardado como SHA-256 no banco.
