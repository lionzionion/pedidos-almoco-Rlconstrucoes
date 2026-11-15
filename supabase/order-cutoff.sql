-- RL Construções: servidor impõe limites da operação em Recife.
-- Horários: café até 08:00 e almoço até 13:00; frete único R$8 por tipo no resumo.
-- Aplicar após schema.sql. Não altera pedidos existentes.
DO $$
DECLARE source text;
BEGIN
 SELECT pg_get_functiondef('rl_private.guard_order()'::regprocedure) INTO source;
 IF source IS NULL THEN RAISE EXCEPTION 'guard_order ausente'; END IF;
 IF position('Prazo de pedidos encerrado' IN source)=0 THEN
  source:=replace(source,
   'new.order_day:=(timezone(''America/Recife'',now()))::date;',
   'new.order_day:=(timezone(''America/Recife'',now()))::date;
    IF (new.meal=''cafe'' AND (timezone(''America/Recife'',now()))::time >= time ''08:00'')
       OR (new.meal=''almoco'' AND (timezone(''America/Recife'',now()))::time >= time ''13:00'') THEN
      RAISE EXCEPTION ''Prazo de pedidos encerrado. Café até 08:00; almoço até 13:00 (Recife).'';
    END IF;');
  source:=replace(source,
   'elsif v_actor_profile_role=''colaborador'' and old.owner=current_id then',
   'elsif v_actor_profile_role=''colaborador'' and old.owner=current_id then
      IF (old.meal=''cafe'' AND (timezone(''America/Recife'',now()))::time >= time ''08:00'')
       OR (old.meal=''almoco'' AND (timezone(''America/Recife'',now()))::time >= time ''13:00'') THEN
        RAISE EXCEPTION ''Prazo de pedidos encerrado. Edição e cancelamento não permitidos após o fechamento.'';
      END IF;');
 END IF;
 IF position('Mudança de refeição após prazo' IN source)=0 THEN
  source:=replace(source,
   'elsif v_actor_profile_role=''colaborador'' and old.owner=current_id then',
   'elsif v_actor_profile_role=''colaborador'' and old.owner=current_id then
      IF (new.meal=''cafe'' AND (timezone(''America/Recife'',now()))::time >= time ''08:00'')
       OR (new.meal=''almoco'' AND (timezone(''America/Recife'',now()))::time >= time ''13:00'') THEN
        RAISE EXCEPTION ''Mudança de refeição após prazo não permitida.'';
      END IF;');
 END IF;
 EXECUTE source;
END $$;
