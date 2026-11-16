-- 16/11/2026: permite apenas pedidos para hoje ou amanhã (America/Recife).
-- Preserva todas as regras existentes do trigger de produção (perfil, empresa, cardápio, preços, auditoria).
-- Seguro para reaplicar: não duplica alterações.
do $upgrade$
declare
  source text;
  patched text;
  original text := 'new.order_day:=(timezone(''America/Recife'',now()))::date;';
  replacement text := $sql$
new.order_day:=coalesce(new.order_day,(timezone('America/Recife',now()))::date);
    if new.order_day not between (timezone('America/Recife',now()))::date
      and ((timezone('America/Recife',now()))::date + 1) then
      raise exception 'Só é permitido fazer pedidos para hoje ou amanhã (Recife).';
    end if;
$sql$;
begin
  select pg_get_functiondef('rl_private.guard_order()'::regprocedure) into source;
  if source is null then raise exception 'Função rl_private.guard_order não encontrada'; end if;
  if position('Só é permitido fazer pedidos para hoje ou amanhã' in source)>0 then return; end if;
  if position(original in source)=0 then
    raise exception 'A regra de data atual não corresponde ao código esperado. Revisar trigger manualmente.';
  end if;
  patched:=replace(source,original,trim(replacement));
  execute patched;
end
$upgrade$;
