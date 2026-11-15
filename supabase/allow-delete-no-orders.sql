-- AMBEV Pedidos RL: excluir contas SEM pedidos, preservando auditoria.
-- Executado no Supabase dedicado em novembro de 2026.
-- A remoção continua protegida pela Edge Function manage-users e perfil admin.
-- Usuários com histórico em public.orders NÃO são excluídos: devem ser desativados.
ALTER TABLE public.account_audit ALTER COLUMN target DROP NOT NULL;
ALTER TABLE public.account_audit ALTER COLUMN actor DROP NOT NULL;
ALTER TABLE public.account_audit DROP CONSTRAINT IF EXISTS account_audit_target_fkey;
ALTER TABLE public.account_audit ADD CONSTRAINT account_audit_target_fkey
  FOREIGN KEY (target) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.account_audit DROP CONSTRAINT IF EXISTS account_audit_actor_fkey;
ALTER TABLE public.account_audit ADD CONSTRAINT account_audit_actor_fkey
  FOREIGN KEY (actor) REFERENCES public.profiles(id) ON DELETE SET NULL;
