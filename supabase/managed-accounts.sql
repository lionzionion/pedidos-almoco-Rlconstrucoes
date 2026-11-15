-- Execute APÓS supabase/schema.sql, se estiver criando um ambiente novo.
-- Já aplicado no banco do projeto AMBEV Pedidos RL em 15/11/2026.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS rl_profiles_username_unique ON public.profiles(username) WHERE username IS NOT NULL;

-- O primeiro ADM deve ser promovido MANUALMENTE após confirmação de identidade.
-- Exemplo para ambiente novo:
-- UPDATE public.profiles SET role='admin',active=true WHERE id='UUID_DO_ADM';
-- Não promova automaticamente o primeiro usuário que se cadastrar.

CREATE OR REPLACE FUNCTION rl_private.has_role(wanted text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid())
    AND p.role = wanted AND p.active = true
  )
$$;
REVOKE ALL ON FUNCTION rl_private.has_role(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION rl_private.has_role(text) TO authenticated;

CREATE OR REPLACE FUNCTION rl_private.is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.active = true
  )
$$;
REVOKE ALL ON FUNCTION rl_private.is_active() FROM public, anon;
GRANT EXECUTE ON FUNCTION rl_private.is_active() TO authenticated;

DROP POLICY IF EXISTS "profile_select" ON public.profiles;
CREATE POLICY "profile_select" ON public.profiles FOR SELECT TO authenticated
USING ((id = (SELECT auth.uid()) AND (SELECT rl_private.is_active()))
 OR (SELECT rl_private.has_role('admin')) OR (SELECT rl_private.has_role('restaurante')));

DROP POLICY IF EXISTS "order_select" ON public.orders;
CREATE POLICY "order_select" ON public.orders FOR SELECT TO authenticated
USING ((owner = (SELECT auth.uid()) AND (SELECT rl_private.is_active()))
 OR (SELECT rl_private.has_role('admin')) OR (SELECT rl_private.has_role('restaurante')));
DROP POLICY IF EXISTS "order_insert" ON public.orders;
CREATE POLICY "order_insert" ON public.orders FOR INSERT TO authenticated
WITH CHECK (owner = (SELECT auth.uid()) AND
 ((SELECT rl_private.has_role('colaborador')) OR (SELECT rl_private.has_role('admin'))));
DROP POLICY IF EXISTS "order_update" ON public.orders;
CREATE POLICY "order_update" ON public.orders FOR UPDATE TO authenticated
USING ((owner = (SELECT auth.uid()) AND (SELECT rl_private.is_active()))
 OR (SELECT rl_private.has_role('admin')) OR (SELECT rl_private.has_role('restaurante')))
WITH CHECK ((owner = (SELECT auth.uid()) AND (SELECT rl_private.is_active()))
 OR (SELECT rl_private.has_role('admin')) OR (SELECT rl_private.has_role('restaurante')));

CREATE OR REPLACE FUNCTION rl_private.ensure_active_order_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF NOT rl_private.is_active() THEN
    RAISE EXCEPTION 'Acesso bloqueado: conta não habilitada pela administração.';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION rl_private.ensure_active_order_actor() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS rl_active_order ON public.orders;
CREATE TRIGGER rl_active_order BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION rl_private.ensure_active_order_actor();

CREATE TABLE IF NOT EXISTS public.account_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  target uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "account_audit_admin_read" ON public.account_audit;
CREATE POLICY "account_audit_admin_read" ON public.account_audit FOR SELECT TO authenticated
USING ((SELECT rl_private.has_role('admin')));
REVOKE ALL ON public.account_audit FROM anon, authenticated;
GRANT SELECT ON public.account_audit TO authenticated;
