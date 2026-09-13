create or replace function public.bloqueia_evento_em_partida_finalizada()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Admins podem preencher/corrigir a sumula depois da partida encerrada.
  if public.is_admin() then
    return new;
  end if;

  if exists (
    select 1 from public.matches m
    where m.id = new.match_id and m.status = 'finalizada'
  ) then
    raise exception 'Partida finalizada: nao e possivel registrar novo evento.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$function$;