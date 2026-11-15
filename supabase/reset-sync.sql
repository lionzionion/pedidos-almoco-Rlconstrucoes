-- Sincronização entre aparelhos após limpeza de pedidos de teste
-- Aplicado ao projeto Supabase em 15/11/2026.
CREATE TABLE IF NOT EXISTS public.rl_system_state (
 id integer PRIMARY KEY CHECK (id=1),
 reset_generation bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.rl_system_state (id,reset_generation)
VALUES(1,0) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.rl_system_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rl_system_state FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rl_system_state TO authenticated;
DROP POLICY IF EXISTS rl_system_state_select ON public.rl_system_state;
CREATE POLICY rl_system_state_select ON public.rl_system_state FOR SELECT TO authenticated
USING ((SELECT rl_private.is_active()));
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                WHERE pubname='supabase_realtime'
                  AND schemaname='public' AND tablename='rl_system_state') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rl_system_state;
 END IF;
END $$;
-- A função só pode ser chamada pela Edge Function (service_role).
-- Incrementar marcador dentro da própria transação evita estado incompleto.
DO $$
DECLARE source text;
BEGIN
 SELECT pg_get_functiondef('public.rl_reset_test_records(uuid,text)'::regprocedure)
 INTO source;
 IF source IS NULL THEN RAISE EXCEPTION 'Função rl_reset_test_records não encontrada'; END IF;
 IF position('reset_generation=reset_generation+1' IN source)=0 THEN
  source:=replace(source,
   ' RETURN jsonb_build_object(',
   ' UPDATE public.rl_system_state SET reset_generation=reset_generation+1,updated_at=now() WHERE id=1;
 RETURN jsonb_build_object(');
  EXECUTE source;
 END IF;
END $$;
