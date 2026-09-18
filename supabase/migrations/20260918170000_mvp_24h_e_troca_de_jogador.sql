-- MVP: voto único, sem volta, e janela de 24 horas contada a partir da
-- publicação do resultado. O vencedor só aparece depois que a votação fecha.
-- Escalação: admin pode adicionar, tirar e trocar jogador mesmo com o
-- resultado já publicado, escolhendo se os números vão junto.

-------------------------------------------------------------------------------
-- 1. Janela de votação
-------------------------------------------------------------------------------
create or replace function public.votacao_mvp_fecha_em(p_pelada_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.publicado_em + interval '24 hours'
    from public.peladas p
   where p.id = p_pelada_id
     and p.resultado = 'publicado'
     and p.publicado_em is not null;
$$;

create or replace function public.valida_voto_mvp()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_fecha timestamptz;
begin
  v_fecha := public.votacao_mvp_fecha_em(new.pelada_id);
  if v_fecha is null then
    raise exception 'A votação do MVP abre quando o resultado da pelada é publicado.'
      using errcode = 'P0001';
  end if;
  if now() >= v_fecha then
    raise exception 'A votação desta pelada já encerrou.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.pelada_players pp
    where pp.pelada_id = new.pelada_id and pp.player_id = new.voter_player_id
  ) then
    raise exception 'Só quem participou da pelada pode votar.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.pelada_players pp
    where pp.pelada_id = new.pelada_id and pp.player_id = new.voted_player_id
  ) then
    raise exception 'Só é possível votar em quem participou desta pelada.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Sem policy de update nem de delete: depois de votar, o voto fica.
-- (As exclusões em cascata do banco continuam funcionando, porque rodam
--  como dono da tabela e não passam pela RLS.)
drop policy if exists mvp_votes_delete_own on public.mvp_votes;
drop policy if exists mvp_votes_update_own on public.mvp_votes;

drop policy if exists mvp_votes_insert_own on public.mvp_votes;
create policy mvp_votes_insert_own on public.mvp_votes
  for insert to authenticated
  with check (voter_player_id = public.current_player_id());

-------------------------------------------------------------------------------
-- 2. Vencedor só depois que a votação fecha
-------------------------------------------------------------------------------
create or replace view public.mvp_winners
with (security_invoker = on) as
select t.pelada_id,
       t.voted_player_id as player_id,
       t.votos
  from (
    select v.pelada_id,
           v.voted_player_id,
           count(*) as votos,
           rank() over (partition by v.pelada_id order by count(*) desc) as pos
      from public.mvp_votes v
     group by v.pelada_id, v.voted_player_id
  ) t
  join public.peladas p on p.id = t.pelada_id
 where t.pos = 1
   and p.resultado = 'publicado'
   and p.publicado_em is not null
   and now() >= p.publicado_em + interval '24 hours';

-------------------------------------------------------------------------------
-- 3. Mexer na escalação depois de publicado
-------------------------------------------------------------------------------
create or replace function public.editar_escalacao(
  p_pelada_id uuid,
  p_sai uuid default null,
  p_entra uuid default null,
  p_levar_numeros boolean default false,
  p_justificativa text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_resultado public.resultado_status;
  v_publicado boolean;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem mexer na escalação.' using errcode = '42501';
  end if;

  select p.resultado into v_resultado from public.peladas p where p.id = p_pelada_id for update;
  if v_resultado is null then
    raise exception 'Pelada não encontrada.' using errcode = 'P0001';
  end if;
  v_publicado := v_resultado = 'publicado';

  if p_sai is null and p_entra is null then
    raise exception 'Diga quem sai, quem entra, ou os dois.' using errcode = 'P0001';
  end if;
  if p_sai is not null and p_sai = p_entra then
    raise exception 'Quem sai e quem entra são a mesma pessoa.' using errcode = 'P0001';
  end if;
  if v_publicado and coalesce(btrim(p_justificativa), '') = '' then
    raise exception 'O resultado já foi publicado: escreva o motivo da mudança.'
      using errcode = 'P0001';
  end if;

  perform set_config('app.justificativa', coalesce(p_justificativa, ''), true);

  if p_entra is not null then
    insert into public.pelada_players (pelada_id, player_id)
    values (p_pelada_id, p_entra)
    on conflict do nothing;
  end if;

  if p_sai is not null then
    if not exists (
      select 1 from public.pelada_players pp
      where pp.pelada_id = p_pelada_id and pp.player_id = p_sai
    ) then
      raise exception 'Essa pessoa não está na escalação desta pelada.' using errcode = 'P0001';
    end if;

    if exists (
      select 1 from public.ocorrencias_disciplinares o
      where o.pelada_id = p_pelada_id and o.player_id = p_sai and not o.anulada
    ) then
      raise exception 'Tem carrinho com lesão registrado para essa pessoa nesta pelada. Anule a ocorrência antes de tirar da escalação.'
        using errcode = 'P0001';
    end if;

    if p_levar_numeros then
      if p_entra is null then
        raise exception 'Para levar os números junto, diga quem entra no lugar.'
          using errcode = 'P0001';
      end if;
      if exists (
        select 1 from public.pelada_stats s
        where s.pelada_id = p_pelada_id and s.player_id = p_entra
      ) then
        raise exception 'Quem entra já tem números nesta pelada. Ajuste os números na mão em vez de transferir.'
          using errcode = 'P0001';
      end if;
      update public.pelada_stats
         set player_id = p_entra,
             atualizado_em = now(),
             atualizado_por = auth.uid()
       where pelada_id = p_pelada_id and player_id = p_sai;

      -- votos que apontavam para o nome errado passam para a pessoa certa
      delete from public.mvp_votes
       where pelada_id = p_pelada_id
         and voter_player_id = p_entra
         and voted_player_id = p_sai;
      update public.mvp_votes
         set voted_player_id = p_entra
       where pelada_id = p_pelada_id and voted_player_id = p_sai;
      delete from public.mvp_votes
       where pelada_id = p_pelada_id
         and voter_player_id = p_sai
         and exists (
           select 1 from public.mvp_votes v2
           where v2.pelada_id = p_pelada_id and v2.voter_player_id = p_entra
         );
      update public.mvp_votes
         set voter_player_id = p_entra
       where pelada_id = p_pelada_id and voter_player_id = p_sai;
    else
      delete from public.pelada_stats
       where pelada_id = p_pelada_id and player_id = p_sai;
      delete from public.mvp_votes
       where pelada_id = p_pelada_id
         and (voter_player_id = p_sai or voted_player_id = p_sai);
    end if;

    delete from public.pelada_players
     where pelada_id = p_pelada_id and player_id = p_sai;
  end if;

  perform set_config('app.justificativa', '', true);
end;
$$;

revoke all on function public.editar_escalacao(uuid, uuid, uuid, boolean, text) from public;
grant execute on function public.editar_escalacao(uuid, uuid, uuid, boolean, text) to authenticated;
