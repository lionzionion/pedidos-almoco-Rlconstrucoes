-- Políticas de produção: café no dia seguinte; almoço a partir das 12h no dia seguinte.
-- Aplica modificações pontuais ao trigger ativo, sem remover papel, empresa, preço ou auditoria.
do $upgrade$
declare
  source text;
  old_status text := 'new.status:=''confirmado'';';
  old_dish text := $old$
  if new.dish <> all(rl_private.allowed_dishes(new.meal,new.order_day)) then
    raise exception 'Prato indisponível no cardápio deste dia.';
  end if;
$old$;
  new_status text := $status$
    if new.meal='cafe' then
      new.order_day:=(timezone('America/Recife',now()))::date + 1;
    elsif new.meal='almoco' and (timezone('America/Recife',now()))::time >= time '12:00' then
      new.order_day:=(timezone('America/Recife',now()))::date + 1;
    end if;
    new.status:='confirmado';
$status$;
  new_dish text := $dish$
  if TG_OP='INSERT' then
    if new.dish <> all(rl_private.allowed_dishes(new.meal,new.order_day)) then
      raise exception 'Prato indisponível no cardápio deste dia.';
    end if;
  elsif (new.meal,new.dish,new.order_day) is distinct from (old.meal,old.dish,old.order_day) then
    if new.dish <> all(rl_private.allowed_dishes(new.meal,new.order_day)) then
      raise exception 'Prato indisponível no cardápio deste dia.';
    end if;
  end if;
$dish$;
begin
  select pg_get_functiondef('rl_private.guard_order()'::regprocedure) into source;
  if source is null then raise exception 'Gatilho de pedidos não encontrado'; end if;
  if position('new.meal=''cafe'' then' in source)=0 then
    if position(old_status in source)=0 then raise exception 'Validação de estado inesperada'; end if;
    source:=replace(source,old_status,trim(new_status));
  end if;
  if position(old_dish in source)>0 then
    source:=replace(source,old_dish,chr(10)||trim(new_dish)||chr(10));
  elsif position('(new.meal,new.dish,new.order_day) is distinct from' in source)=0 then
    raise exception 'Validação de prato inesperada; revisão manual necessária';
  end if;
  execute source;
end
$upgrade$;
