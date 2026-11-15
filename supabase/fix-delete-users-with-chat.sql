-- CORREÇÃO já aplicada no Supabase RL em 15/11/2026.
-- Corrige falha 500 ao excluir conta de restaurante que possui mensagens.
-- Mensagens enviadas por restaurante excluído conservam sender_name;
-- conversas particulares de um colaborador excluído são removidas.
-- Pedidos continuam protegidos pela FK RESTRICT e pela Edge Function ADM.
BEGIN;
ALTER TABLE public.chat_messages
  ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_thread_owner_fkey;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_thread_owner_fkey
  FOREIGN KEY (thread_owner) REFERENCES public.profiles(id)
  ON DELETE CASCADE;
COMMIT;
