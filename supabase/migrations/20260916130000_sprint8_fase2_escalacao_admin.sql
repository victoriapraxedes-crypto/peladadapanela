-- Sprint 8, fase 2: a escalação passa a ser feita só pelos admins.
-- O jogador não confirma mais presença. Leitura continua igual (is_aprovado).

drop policy if exists pelada_players_insert_own on public.pelada_players;
drop policy if exists pelada_players_delete_own on public.pelada_players;
drop policy if exists pelada_players_admin_all on public.pelada_players;

create policy pelada_players_admin_all on public.pelada_players
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
