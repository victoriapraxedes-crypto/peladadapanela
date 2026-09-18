-- Tirar alguém da escalação falhava com erro de chave estrangeira quando a súmula
-- já tinha uma linha zerada para essa pessoa (o rascunho cria uma linha por escalado).
-- Antes de apagar o vínculo, limpamos a linha da súmula se ela estiver zerada e a
-- pelada ainda não tiver o resultado publicado. Com qualquer número lançado, ou com
-- resultado publicado, a remoção continua bloqueada.

create or replace function public.limpar_sumula_zerada()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_resultado text;
begin
  select resultado::text into v_resultado from public.peladas where id = old.pelada_id;
  if v_resultado is distinct from 'publicado' then
    delete from public.pelada_stats s
     where s.pelada_id = old.pelada_id
       and s.player_id = old.player_id
       and coalesce(s.gols, 0) = 0
       and coalesce(s.assistencias, 0) = 0
       and coalesce(s.carrinhos, 0) = 0;
  end if;
  return old;
end;
$fn$;

drop trigger if exists pelada_players_limpar_sumula on public.pelada_players;

create trigger pelada_players_limpar_sumula
  before delete on public.pelada_players
  for each row execute function public.limpar_sumula_zerada();
