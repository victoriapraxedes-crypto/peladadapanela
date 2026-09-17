import { supabase } from "@/integrations/supabase/client";

/**
 * Leitura do desempenho individual. Toda conta de pontos vem do banco
 * (view `desempenho_pelada` e função `ranking`); aqui só se organiza o resultado.
 */

export interface LinhaRanking {
  playerId: string;
  jogos: number;
  gols: number;
  assistencias: number;
  carrinhos: number;
  pontos: number;
  posicao: number;
  /** positivo = subiu posições desde antes da última pelada publicada */
  variacao: number | null;
}

export interface DesempenhoPelada {
  peladaId: string;
  seasonId: string;
  data: string;
  playerId: string;
  gols: number;
  assistencias: number;
  carrinhos: number;
  pontos: number;
}

export interface JogadorBasico {
  id: string;
  apelido: string;
  nome: string;
  fotoUrl: string | null;
  convidado: boolean;
}

export interface Temporada {
  id: string;
  nome: string;
  ativa: boolean;
  inicio_em: string;
  fim_em: string | null;
}

const num = (v: number | null | undefined) => v ?? 0;

export async function buscarTemporadas(): Promise<Temporada[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("id, nome, ativa, inicio_em, fim_em")
    .order("inicio_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function buscarJogadores(): Promise<Map<string, JogadorBasico>> {
  const { data, error } = await supabase
    .from("players")
    .select("id, apelido, nome, foto_url, profile_id");
  if (error) throw error;
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        apelido: p.apelido,
        nome: p.nome,
        fotoUrl: p.foto_url,
        convidado: p.profile_id === null,
      },
    ]),
  );
}

export async function buscarDesempenhos(filtro: {
  seasonId?: string | null;
  playerId?: string;
  peladaId?: string;
}): Promise<DesempenhoPelada[]> {
  let q = supabase
    .from("desempenho_pelada")
    .select("pelada_id, season_id, data, player_id, gols, assistencias, carrinhos, pontos")
    .order("data", { ascending: true });
  if (filtro.seasonId) q = q.eq("season_id", filtro.seasonId);
  if (filtro.playerId) q = q.eq("player_id", filtro.playerId);
  if (filtro.peladaId) q = q.eq("pelada_id", filtro.peladaId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? [])
    .filter((d) => d.pelada_id && d.player_id)
    .map((d) => ({
      peladaId: d.pelada_id as string,
      seasonId: d.season_id as string,
      data: d.data as string,
      playerId: d.player_id as string,
      gols: num(d.gols),
      assistencias: num(d.assistencias),
      carrinhos: num(d.carrinhos),
      pontos: num(d.pontos),
    }));
}

/**
 * Classificação com variação de posição em relação ao ranking de antes da
 * última pelada publicada do período (null quando não há como comparar).
 */
export async function buscarRanking(seasonId: string | null): Promise<LinhaRanking[]> {
  const args = seasonId ? { p_season_id: seasonId } : {};
  const { data: atual, error } = await supabase.rpc("ranking", args);
  if (error) throw error;

  let ultimaData: string | null = null;
  {
    let q = supabase
      .from("desempenho_pelada")
      .select("data")
      .order("data", { ascending: false })
      .limit(1);
    if (seasonId) q = q.eq("season_id", seasonId);
    const { data } = await q;
    ultimaData = (data?.[0]?.data as string | undefined) ?? null;
  }

  const anterior = new Map<string, number>();
  if (ultimaData) {
    const { data } = await supabase.rpc("ranking", { ...args, p_antes_de: ultimaData });
    for (const r of data ?? []) anterior.set(r.player_id, r.posicao);
  }
  const houveAntes = anterior.size > 0;

  return (atual ?? []).map((r) => {
    const antes = anterior.get(r.player_id);
    return {
      playerId: r.player_id,
      jogos: num(r.jogos),
      gols: num(r.gols),
      assistencias: num(r.assistencias),
      carrinhos: num(r.carrinhos),
      pontos: num(r.pontos),
      posicao: num(r.posicao),
      variacao: !houveAntes ? null : antes === undefined ? null : antes - num(r.posicao),
    };
  });
}

export interface UltimaPelada {
  id: string;
  data: string;
  local: string;
  horario: string;
  seasonId: string;
}

export async function buscarUltimaPeladaPublicada(): Promise<UltimaPelada | null> {
  const { data, error } = await supabase
    .from("peladas")
    .select("id, data, local, horario, season_id")
    .eq("resultado", "publicado")
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    data: data.data,
    local: data.local,
    horario: data.horario,
    seasonId: data.season_id,
  };
}

export interface Destaque {
  titulo: string;
  valor: number;
  unidade: string;
  playerIds: string[];
}

/**
 * Destaques de uma pelada: maior pontuação, artilheiro e líder de assistências.
 * Empates aparecem juntos. Artilheiro e assistências somem quando todo mundo zerou.
 */
export function calcularDestaques(linhas: DesempenhoPelada[]): Destaque[] {
  if (linhas.length === 0) return [];
  const lideres = (f: (l: DesempenhoPelada) => number) => {
    const max = Math.max(...linhas.map(f));
    return { max, ids: linhas.filter((l) => f(l) === max).map((l) => l.playerId) };
  };
  const out: Destaque[] = [];
  const pts = lideres((l) => l.pontos);
  out.push({ titulo: "Maior pontuação", valor: pts.max, unidade: "pts", playerIds: pts.ids });
  const gols = lideres((l) => l.gols);
  if (gols.max > 0) {
    out.push({
      titulo: "Artilheiro",
      valor: gols.max,
      unidade: gols.max === 1 ? "gol" : "gols",
      playerIds: gols.ids,
    });
  }
  const ast = lideres((l) => l.assistencias);
  if (ast.max > 0) {
    out.push({
      titulo: "Garçom",
      valor: ast.max,
      unidade: ast.max === 1 ? "assistência" : "assistências",
      playerIds: ast.ids,
    });
  }
  return out;
}

export interface SuspensaoPropria {
  descricao: string | null;
  dataOcorrencia: string;
  /** primeiro dia livre */
  suspensoAte: string;
}

/** O jogador só lê as próprias ocorrências (RLS). */
export async function buscarMinhaSuspensao(
  playerId: string,
  hoje: string,
): Promise<SuspensaoPropria | null> {
  const { data } = await supabase
    .from("ocorrencias_disciplinares")
    .select("descricao, data_ocorrencia, suspenso_ate")
    .eq("player_id", playerId)
    .eq("anulada", false)
    .gt("suspenso_ate", hoje)
    .order("suspenso_ate", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    descricao: data.descricao,
    dataOcorrencia: data.data_ocorrencia,
    suspensoAte: data.suspenso_ate,
  };
}

export function nomesDe(ids: string[], jogadores: Map<string, JogadorBasico>): string {
  const nomes = ids.map((id) => jogadores.get(id)?.apelido ?? "Jogador");
  if (nomes.length <= 1) return nomes[0] ?? "";
  if (nomes.length <= 3) return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
  return `${nomes.slice(0, 2).join(", ")} e mais ${nomes.length - 2}`;
}
