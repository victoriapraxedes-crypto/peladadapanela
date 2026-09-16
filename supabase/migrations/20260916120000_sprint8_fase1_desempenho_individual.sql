-- Sprint 8, fase 1: organização pelos admins e desempenho individual.
-- Migração só aditiva: não apaga tabela, coluna ou linha existente.
-- As tabelas antigas (matches, match_events, teams, mvp_votes) continuam intactas.

-------------------------------------------------------------------------------
-- 0. Utilitário: "hoje" no fuso da pelada (Natal/RN = UTC-3)
-------------------------------------------------------------------------------
create or replace function public.hoje_local()
returns date
language sql
stable
set search_path to 'public'
as $$
  select (now() at time zone 'America/Fortaleza')::date;
$$;

-------------------------------------------------------------------------------
-- 1. Temporadas: uma ativa por vez, abertas e encerradas pelos admins
-------------------------------------------------------------------------------
create unique index if not exists seasons_uma_ativa on public.seasons ((true)) where ativa;

create or replace function public.abrir_temporada(p_nome text, p_inicio date default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  nova uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem abrir temporadas.' using errcode = '42501';
  end if;
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'Informe o nome da temporada.' using errcode = '22023';
  end if;
  if exists (select 1 from public.seasons where ativa) then
    raise exception 'Já existe uma temporada ativa. Encerre a atual antes de abrir outra.'
      using errcode = 'P0001';
  end if;

  insert into public.seasons (nome, inicio_em, ativa)
  values (trim(p_nome), coalesce(p_inicio, public.hoje_local()), true)
  returning id into nova;
  return nova;
end;
$$;

create or replace function public.encerrar_temporada(p_season_id uuid, p_fim date default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem encerrar temporadas.' using errcode = '42501';
  end if;
  update public.seasons
     set ativa = false,
         fim_em = coalesce(p_fim, public.hoje_local())
   where id = p_season_id and ativa;
  if not found then
    raise exception 'Temporada não encontrada ou já encerrada.' using errcode = 'P0001';
  end if;
end;
$$;

-------------------------------------------------------------------------------
-- 2. Convidados: jogador sem conta pode ficar sem posição
-------------------------------------------------------------------------------
alter table public.players alter column posicao_principal drop not null;

-------------------------------------------------------------------------------
-- 3. Resultado da pelada: rascunho ou publicado
-------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'resultado_status') then
    create type public.resultado_status as enum ('rascunho', 'publicado');
  end if;
end;
$$;

alter table public.peladas
  add column if not exists resultado public.resultado_status not null default 'rascunho',
  add column if not exists publicado_em timestamptz,
  add column if not exists publicado_por uuid references public.profiles (id) on delete set null;

-- A escalação passa a ser a lista de participantes da pelada. O vínculo com as
-- tabelas novas usa a chave composta e acompanha a troca de player_id (vínculo
-- de convidado com conta).
alter table public.pelada_players drop constraint if exists pelada_players_player_id_fkey;
alter table public.pelada_players
  add constraint pelada_players_player_id_fkey
  foreign key (player_id) references public.players (id) on delete cascade on update cascade;

-------------------------------------------------------------------------------
-- 4. Súmula individual
-------------------------------------------------------------------------------
create table if not exists public.pelada_stats (
  pelada_id uuid not null,
  player_id uuid not null,
  gols smallint not null default 0 check (gols >= 0),
  assistencias smallint not null default 0 check (assistencias >= 0),
  carrinhos smallint not null default 0 check (carrinhos >= 0),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references public.profiles (id) on delete set null,
  primary key (pelada_id, player_id),
  foreign key (pelada_id, player_id)
    references public.pelada_players (pelada_id, player_id)
    on delete restrict on update cascade
);

alter table public.pelada_stats enable row level security;

drop policy if exists pelada_stats_select on public.pelada_stats;
create policy pelada_stats_select on public.pelada_stats
  for select to authenticated using (public.is_aprovado());
-- Sem policy de escrita: a súmula só é gravada pelas funções abaixo.

-------------------------------------------------------------------------------
-- 5. Disciplina: carrinho que causou lesão
-------------------------------------------------------------------------------
create table if not exists public.ocorrencias_disciplinares (
  id uuid primary key default gen_random_uuid(),
  pelada_id uuid not null,
  player_id uuid not null,
  tipo text not null default 'carrinho_lesao' check (tipo in ('carrinho_lesao')),
  descricao text,
  data_ocorrencia date not null,
  -- primeiro dia em que o jogador volta a poder ser escalado
  suspenso_ate date not null,
  registrado_por uuid references public.profiles (id) on delete set null,
  registrado_em timestamptz not null default now(),
  anulada boolean not null default false,
  anulada_por uuid references public.profiles (id) on delete set null,
  anulada_em timestamptz,
  justificativa_anulacao text,
  foreign key (pelada_id, player_id)
    references public.pelada_players (pelada_id, player_id)
    on delete restrict on update cascade,
  constraint ocorrencia_anulada_tem_justificativa
    check (not anulada or length(trim(coalesce(justificativa_anulacao, ''))) > 0)
);

create index if not exists ocorrencias_player_idx
  on public.ocorrencias_disciplinares (player_id) where not anulada;

alter table public.ocorrencias_disciplinares enable row level security;

drop policy if exists ocorrencias_select on public.ocorrencias_disciplinares;
create policy ocorrencias_select on public.ocorrencias_disciplinares
  for select to authenticated
  using (public.is_admin() or player_id = public.current_player_id());

-- Suspensão vigente numa data (null = liberado)
create or replace function public.suspensao_na_data(p_player_id uuid, p_data date)
returns date
language sql
stable
security definer
set search_path to 'public'
as $$
  select max(o.suspenso_ate)
    from public.ocorrencias_disciplinares o
   where o.player_id = p_player_id
     and not o.anulada
     and p_data > o.data_ocorrencia
     and p_data < o.suspenso_ate;
$$;

-- Bloqueia escalar jogador suspenso
create or replace function public.bloqueia_escalacao_suspenso()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_data date;
  v_ate date;
begin
  select p.data into v_data from public.peladas p where p.id = new.pelada_id;
  v_ate := public.suspensao_na_data(new.player_id, v_data);
  if v_ate is not null then
    raise exception 'Jogador suspenso até %.', to_char(v_ate - 1, 'DD/MM/YYYY')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pelada_players_suspensao on public.pelada_players;
create trigger trg_pelada_players_suspensao
  before insert on public.pelada_players
  for each row execute function public.bloqueia_escalacao_suspenso();

-------------------------------------------------------------------------------
-- 6. Auditoria de resultados
-------------------------------------------------------------------------------
create table if not exists public.auditoria_resultados (
  id bigint generated always as identity primary key,
  pelada_id uuid,
  player_id uuid,
  entidade text not null,
  acao text not null,
  antes jsonb,
  depois jsonb,
  justificativa text,
  feito_por uuid,
  feito_em timestamptz not null default now()
);

create index if not exists auditoria_pelada_idx on public.auditoria_resultados (pelada_id, feito_em desc);

alter table public.auditoria_resultados enable row level security;

drop policy if exists auditoria_select_admin on public.auditoria_resultados;
create policy auditoria_select_admin on public.auditoria_resultados
  for select to authenticated using (public.is_admin());

create or replace function public.registra_auditoria()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_linha jsonb := to_jsonb(coalesce(new, old));
  v_pelada uuid := (v_linha ->> 'pelada_id')::uuid;
  v_player uuid := (v_linha ->> 'player_id')::uuid;
  v_just text := nullif(current_setting('app.justificativa', true), '');
  v_entidade text := tg_table_name;
  v_acao text := lower(tg_op);
begin
  if tg_table_name = 'peladas' then
    v_pelada := coalesce(new.id, old.id);
    v_player := null;
    v_entidade := 'resultado';
    if tg_op = 'UPDATE' and new.resultado is distinct from old.resultado then
      v_acao := case when new.resultado = 'publicado' then 'publicar' else 'despublicar' end;
    end if;
  elsif tg_table_name = 'pelada_players' then
    -- escalação só é auditada depois de publicada
    if not exists (
      select 1 from public.peladas p where p.id = v_pelada and p.resultado = 'publicado'
    ) then
      return null;
    end if;
    v_entidade := 'escalacao';
  elsif tg_table_name = 'ocorrencias_disciplinares' then
    v_entidade := 'ocorrencia';
    if tg_op = 'UPDATE' and new.anulada and not old.anulada then
      v_acao := 'anular';
      v_just := coalesce(v_just, new.justificativa_anulacao);
    end if;
  end if;

  insert into public.auditoria_resultados
    (pelada_id, player_id, entidade, acao, antes, depois, justificativa, feito_por)
  values (
    v_pelada,
    v_player,
    v_entidade,
    v_acao,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    v_just,
    auth.uid()
  );
  return null;
end;
$$;

drop trigger if exists trg_pelada_stats_auditoria on public.pelada_stats;
create trigger trg_pelada_stats_auditoria
  after insert or update or delete on public.pelada_stats
  for each row execute function public.registra_auditoria();

drop trigger if exists trg_ocorrencias_auditoria on public.ocorrencias_disciplinares;
create trigger trg_ocorrencias_auditoria
  after insert or update on public.ocorrencias_disciplinares
  for each row execute function public.registra_auditoria();

drop trigger if exists trg_peladas_resultado_auditoria on public.peladas;
create trigger trg_peladas_resultado_auditoria
  after update of resultado on public.peladas
  for each row
  when (new.resultado is distinct from old.resultado)
  execute function public.registra_auditoria();

drop trigger if exists trg_pelada_players_auditoria on public.pelada_players;
create trigger trg_pelada_players_auditoria
  after insert or delete on public.pelada_players
  for each row execute function public.registra_auditoria();

-------------------------------------------------------------------------------
-- 7. Escrita da súmula (único caminho)
-------------------------------------------------------------------------------
-- p_linhas: [{"player_id": "...", "gols": 0, "assistencias": 0, "carrinhos": 0}, ...]
create or replace function public.salvar_sumula(
  p_pelada_id uuid,
  p_linhas jsonb,
  p_justificativa text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_publicado boolean;
  v_fora text;
  v_curto text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem lançar resultados.' using errcode = '42501';
  end if;

  select p.resultado = 'publicado' into v_publicado
    from public.peladas p where p.id = p_pelada_id
    for update;
  if v_publicado is null then
    raise exception 'Pelada não encontrada.' using errcode = 'P0001';
  end if;
  if v_publicado and coalesce(trim(p_justificativa), '') = '' then
    raise exception 'Resultado já publicado: informe o motivo da correção.' using errcode = 'P0001';
  end if;

  select string_agg(x ->> 'player_id', ', ') into v_fora
    from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) x
   where not exists (
     select 1 from public.pelada_players pp
      where pp.pelada_id = p_pelada_id and pp.player_id = (x ->> 'player_id')::uuid
   );
  if v_fora is not null then
    raise exception 'Jogador fora da escalação desta pelada.' using errcode = 'P0001';
  end if;

  perform set_config('app.justificativa', coalesce(trim(p_justificativa), ''), true);

  insert into public.pelada_stats as s
    (pelada_id, player_id, gols, assistencias, carrinhos, atualizado_por)
  select p_pelada_id,
         (x ->> 'player_id')::uuid,
         coalesce((x ->> 'gols')::smallint, 0),
         coalesce((x ->> 'assistencias')::smallint, 0),
         coalesce((x ->> 'carrinhos')::smallint, 0),
         auth.uid()
    from jsonb_array_elements(coalesce(p_linhas, '[]'::jsonb)) x
  on conflict (pelada_id, player_id) do update
     set gols = excluded.gols,
         assistencias = excluded.assistencias,
         carrinhos = excluded.carrinhos,
         atualizado_em = now(),
         atualizado_por = excluded.atualizado_por
   where (s.gols, s.assistencias, s.carrinhos)
         is distinct from (excluded.gols, excluded.assistencias, excluded.carrinhos);

  -- Carrinho com lesão também é carrinho
  select string_agg(pl.apelido, ', ') into v_curto
    from (
      select o.player_id, count(*) as lesoes
        from public.ocorrencias_disciplinares o
       where o.pelada_id = p_pelada_id and not o.anulada
       group by o.player_id
    ) l
    join public.players pl on pl.id = l.player_id
    left join public.pelada_stats s on s.pelada_id = p_pelada_id and s.player_id = l.player_id
   where coalesce(s.carrinhos, 0) < l.lesoes;
  if v_curto is not null then
    raise exception 'Carrinhos abaixo das ocorrências de lesão registradas: %.', v_curto
      using errcode = 'P0001';
  end if;

  perform set_config('app.justificativa', '', true);
end;
$$;

create or replace function public.publicar_resultado(p_pelada_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_resultado public.resultado_status;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem publicar resultados.' using errcode = '42501';
  end if;

  select p.resultado into v_resultado from public.peladas p where p.id = p_pelada_id for update;
  if v_resultado is null then
    raise exception 'Pelada não encontrada.' using errcode = 'P0001';
  end if;
  if v_resultado = 'publicado' then
    raise exception 'Este resultado já foi publicado.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.pelada_players pp where pp.pelada_id = p_pelada_id) then
    raise exception 'A pelada não tem participantes.' using errcode = 'P0001';
  end if;

  update public.peladas
     set resultado = 'publicado',
         publicado_em = now(),
         publicado_por = auth.uid(),
         status = 'finalizada'
   where id = p_pelada_id;
end;
$$;

-------------------------------------------------------------------------------
-- 8. Disciplina: registrar e anular
-------------------------------------------------------------------------------
create or replace function public.registrar_carrinho_lesao(
  p_pelada_id uuid,
  p_player_id uuid,
  p_descricao text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_data date;
  v_id uuid;
  v_lesoes int;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem registrar ocorrências.' using errcode = '42501';
  end if;
  select p.data into v_data from public.peladas p where p.id = p_pelada_id;
  if v_data is null then
    raise exception 'Pelada não encontrada.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.pelada_players pp
     where pp.pelada_id = p_pelada_id and pp.player_id = p_player_id
  ) then
    raise exception 'Jogador fora da escalação desta pelada.' using errcode = 'P0001';
  end if;

  perform set_config('app.justificativa', 'Carrinho com lesão registrado', true);

  insert into public.ocorrencias_disciplinares
    (pelada_id, player_id, descricao, data_ocorrencia, suspenso_ate, registrado_por)
  values (
    p_pelada_id, p_player_id, nullif(trim(p_descricao), ''),
    v_data, (v_data + interval '3 months')::date, auth.uid()
  )
  returning id into v_id;

  -- garante que o carrinho conte na súmula
  select count(*) into v_lesoes
    from public.ocorrencias_disciplinares o
   where o.pelada_id = p_pelada_id and o.player_id = p_player_id and not o.anulada;

  insert into public.pelada_stats as s (pelada_id, player_id, carrinhos, atualizado_por)
  values (p_pelada_id, p_player_id, v_lesoes, auth.uid())
  on conflict (pelada_id, player_id) do update
     set carrinhos = greatest(s.carrinhos, excluded.carrinhos),
         atualizado_em = now(),
         atualizado_por = excluded.atualizado_por
   where s.carrinhos < excluded.carrinhos;

  perform set_config('app.justificativa', '', true);
  return v_id;
end;
$$;

create or replace function public.anular_ocorrencia(
  p_ocorrencia_id uuid,
  p_justificativa text,
  p_remover_carrinho boolean default true
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  o public.ocorrencias_disciplinares%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem anular ocorrências.' using errcode = '42501';
  end if;
  if coalesce(trim(p_justificativa), '') = '' then
    raise exception 'Informe o motivo da anulação.' using errcode = 'P0001';
  end if;

  select * into o from public.ocorrencias_disciplinares where id = p_ocorrencia_id for update;
  if o.id is null or o.anulada then
    raise exception 'Ocorrência não encontrada ou já anulada.' using errcode = 'P0001';
  end if;

  perform set_config('app.justificativa', trim(p_justificativa), true);

  update public.ocorrencias_disciplinares
     set anulada = true,
         anulada_por = auth.uid(),
         anulada_em = now(),
         justificativa_anulacao = trim(p_justificativa)
   where id = p_ocorrencia_id;

  if p_remover_carrinho then
    update public.pelada_stats
       set carrinhos = greatest(carrinhos - 1, 0),
           atualizado_em = now(),
           atualizado_por = auth.uid()
     where pelada_id = o.pelada_id and player_id = o.player_id and carrinhos > 0;
  end if;

  perform set_config('app.justificativa', '', true);
end;
$$;

-------------------------------------------------------------------------------
-- 9. Vincular convidado a uma conta
-------------------------------------------------------------------------------
create or replace function public.vincular_convidado(p_convidado_id uuid, p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_conta uuid;
  v_conflito int;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem vincular convidados.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.players where id = p_convidado_id and profile_id is null) then
    raise exception 'Convidado não encontrado ou já vinculado a uma conta.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Conta não encontrada.' using errcode = 'P0001';
  end if;

  select id into v_conta from public.players where profile_id = p_profile_id;

  if v_conta is null then
    update public.players set profile_id = p_profile_id where id = p_convidado_id;
    v_conta := p_convidado_id;
  else
    -- os dois não podem ter jogado a mesma pelada
    select count(*) into v_conflito
      from public.pelada_players a
      join public.pelada_players b on b.pelada_id = a.pelada_id
     where a.player_id = p_convidado_id and b.player_id = v_conta;
    if v_conflito > 0 then
      raise exception 'O convidado e a conta aparecem juntos em % pelada(s). Corrija a escalação antes.', v_conflito
        using errcode = 'P0001';
    end if;

    perform set_config('app.justificativa', 'Vínculo de convidado com conta', true);

    -- pelada_players propaga para pelada_stats e ocorrências (on update cascade)
    update public.pelada_players set player_id = v_conta where player_id = p_convidado_id;
    update public.team_players set player_id = v_conta where player_id = p_convidado_id;
    update public.mvp_votes set voted_player_id = v_conta where voted_player_id = p_convidado_id;
    update public.match_events set player_id = v_conta where player_id = p_convidado_id;
    update public.match_events set assist_player_id = v_conta where assist_player_id = p_convidado_id;
    delete from public.players where id = p_convidado_id;

    perform set_config('app.justificativa', '', true);
  end if;

  insert into public.auditoria_resultados (entidade, acao, player_id, depois, feito_por)
  values ('jogador', 'vincular_convidado', v_conta,
          jsonb_build_object('convidado_id', p_convidado_id, 'profile_id', p_profile_id),
          auth.uid());
  return v_conta;
end;
$$;

-------------------------------------------------------------------------------
-- 10. Fonte única de cálculo
-------------------------------------------------------------------------------
-- Desempenho de cada participante em cada pelada PUBLICADA.
-- Pontos = 4 x gols + 2 x assistências - 5 x carrinhos (pode ser negativo).
create or replace view public.desempenho_pelada
with (security_invoker = on) as
select pp.pelada_id,
       p.season_id,
       p.data,
       pp.player_id,
       coalesce(s.gols, 0)::int as gols,
       coalesce(s.assistencias, 0)::int as assistencias,
       coalesce(s.carrinhos, 0)::int as carrinhos,
       (4 * coalesce(s.gols, 0) + 2 * coalesce(s.assistencias, 0) - 5 * coalesce(s.carrinhos, 0))::int as pontos
  from public.pelada_players pp
  join public.peladas p on p.id = pp.pelada_id and p.resultado = 'publicado'
  left join public.pelada_stats s on s.pelada_id = pp.pelada_id and s.player_id = pp.player_id;

-- Classificação. p_season_id null = histórico geral.
-- p_antes_de: considera só peladas com data anterior (para calcular variação de posição).
create or replace function public.ranking(p_season_id uuid default null, p_antes_de date default null)
returns table (
  player_id uuid,
  jogos int,
  gols int,
  assistencias int,
  carrinhos int,
  pontos int,
  posicao int
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select d.player_id,
         count(*)::int,
         sum(d.gols)::int,
         sum(d.assistencias)::int,
         sum(d.carrinhos)::int,
         sum(d.pontos)::int,
         rank() over (
           order by sum(d.pontos) desc, sum(d.gols) desc, sum(d.assistencias) desc, sum(d.carrinhos) asc
         )::int
    from public.desempenho_pelada d
   where (p_season_id is null or d.season_id = p_season_id)
     and (p_antes_de is null or d.data < p_antes_de)
   group by d.player_id
   order by 7, 1;
$$;

-------------------------------------------------------------------------------
-- 11. Permissões das funções
-------------------------------------------------------------------------------
revoke execute on function public.abrir_temporada(text, date) from public, anon;
revoke execute on function public.encerrar_temporada(uuid, date) from public, anon;
revoke execute on function public.salvar_sumula(uuid, jsonb, text) from public, anon;
revoke execute on function public.publicar_resultado(uuid) from public, anon;
revoke execute on function public.registrar_carrinho_lesao(uuid, uuid, text) from public, anon;
revoke execute on function public.anular_ocorrencia(uuid, text, boolean) from public, anon;
revoke execute on function public.vincular_convidado(uuid, uuid) from public, anon;
revoke execute on function public.ranking(uuid, date) from public, anon;
revoke execute on function public.suspensao_na_data(uuid, date) from public, anon;
revoke execute on function public.bloqueia_escalacao_suspenso() from public, anon, authenticated;
revoke execute on function public.registra_auditoria() from public, anon, authenticated;

grant execute on function public.abrir_temporada(text, date) to authenticated;
grant execute on function public.encerrar_temporada(uuid, date) to authenticated;
grant execute on function public.salvar_sumula(uuid, jsonb, text) to authenticated;
grant execute on function public.publicar_resultado(uuid) to authenticated;
grant execute on function public.registrar_carrinho_lesao(uuid, uuid, text) to authenticated;
grant execute on function public.anular_ocorrencia(uuid, text, boolean) to authenticated;
grant execute on function public.vincular_convidado(uuid, uuid) to authenticated;
grant execute on function public.ranking(uuid, date) to authenticated;
grant execute on function public.suspensao_na_data(uuid, date) to authenticated;
grant execute on function public.hoje_local() to authenticated;

revoke all on public.desempenho_pelada from anon;
revoke all on public.pelada_stats from anon;
revoke all on public.ocorrencias_disciplinares from anon;
revoke all on public.auditoria_resultados from anon;
