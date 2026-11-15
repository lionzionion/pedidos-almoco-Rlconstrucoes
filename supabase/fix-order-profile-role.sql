-- Correção de erro de autorização dos pedidos da RL Engenharia.
-- PostgreSQL trata CURRENT_ROLE como expressão SQL: por isso
-- "if current_role not in ('colaborador','admin')" comparava com o papel
-- técnico "authenticated", mesmo quando profiles.role='colaborador'.
-- Esta migração foi aplicada ao projeto Supabase da RL em 15/11/2026.
-- Não modifica pedidos, perfis, preços nem histórico financeiro.
DO $fix$
DECLARE
  original text;
BEGIN
  SELECT pg_get_functiondef('rl_private.guard_order()'::regprocedure)
    INTO original;
  IF original IS NULL THEN
    RAISE EXCEPTION 'Função rl_private.guard_order ausente.';
  END IF;
  IF position('v_actor_profile_role' IN original) > 0 THEN
    RETURN; -- migração idempotente
  END IF;
  IF position('current_role' IN original) = 0 THEN
    RAISE EXCEPTION 'Definição da função desconhecida; revisão manual necessária.';
  END IF;
  original := replace(original, 'current_role', 'v_actor_profile_role');
  original := replace(original, 'current_name', 'v_actor_profile_name');
  EXECUTE original;
END $fix$;
