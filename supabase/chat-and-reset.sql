-- RL Construções | Gestão de refeições v2
-- Aplicar DEPOIS de schema.sql + managed-accounts.sql.
-- Script de referência da implantação feita em 15/11/2026.
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_owner uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Remetente pode ser NULL após exclusão da conta; o nome da mensagem é preservado.
-- A conversa particular de um colaborador é removida ao excluir esse colaborador,
-- para não ficar acessível na conversa administrativa do restaurante.
CREATE INDEX IF NOT EXISTS rl_chat_thread_idx ON public.chat_messages(thread_owner,created_at DESC);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
DROP POLICY IF EXISTS rl_chat_read ON public.chat_messages;
CREATE POLICY rl_chat_read ON public.chat_messages FOR SELECT TO authenticated
USING (
  (SELECT rl_private.has_role('admin'))
  OR (SELECT rl_private.has_role('restaurante'))
  OR ((SELECT rl_private.has_role('colaborador')) AND thread_owner=(SELECT auth.uid()))
);
DROP POLICY IF EXISTS rl_chat_send ON public.chat_messages;
CREATE POLICY rl_chat_send ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id=(SELECT auth.uid()) AND (
    ((SELECT rl_private.has_role('colaborador')) AND thread_owner=(SELECT auth.uid()))
    OR (
      ((SELECT rl_private.has_role('admin')) OR (SELECT rl_private.has_role('restaurante')))
      AND (thread_owner IS NULL OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id=thread_owner AND p.role='colaborador'
      ))
    )
  )
);
CREATE OR REPLACE FUNCTION rl_private.chat_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
  NEW.sender_id:=(SELECT auth.uid());
  SELECT p.display_name INTO NEW.sender_name FROM public.profiles p
  WHERE p.id=NEW.sender_id AND p.active;
  IF NEW.sender_name IS NULL THEN
    RAISE EXCEPTION 'Conta não autorizada para mensagens.';
  END IF;
  NEW.created_at=now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION rl_private.chat_guard() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS rl_chat_guard ON public.chat_messages;
CREATE TRIGGER rl_chat_guard BEFORE INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION rl_private.chat_guard();
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime'
   AND schemaname='public' AND tablename='chat_messages') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
 END IF;
END $$;

-- Reset atômico do teste, autorizado SOMENTE pelo servidor com service_role.
CREATE OR REPLACE FUNCTION public.rl_reset_test_records(p_actor uuid,p_confirm text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_orders integer; v_messages integer; v_audits integer;
BEGIN
 IF p_confirm <> 'ZERAR TESTES' THEN RAISE EXCEPTION 'Confirmação inválida.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND active AND role='admin')
 THEN RAISE EXCEPTION 'Somente administrador ativo pode solicitar limpeza.'; END IF;
 SELECT count(*) INTO v_orders FROM public.orders;
 SELECT count(*) INTO v_messages FROM public.chat_messages;
 SELECT count(*) INTO v_audits FROM public.order_audit;
 DELETE FROM public.order_audit;
 DELETE FROM public.orders;
 DELETE FROM public.chat_messages;
 INSERT INTO public.account_audit(actor,target,action,details)
 VALUES(p_actor,p_actor,'reset_test_data',
 jsonb_build_object('orders_deleted',v_orders,'messages_deleted',v_messages,'order_audit_deleted',v_audits));
 RETURN jsonb_build_object('orders_deleted',v_orders,'messages_deleted',v_messages,'order_audit_deleted',v_audits);
END $$;
REVOKE ALL ON FUNCTION public.rl_reset_test_records(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rl_reset_test_records(uuid,text) TO service_role;
