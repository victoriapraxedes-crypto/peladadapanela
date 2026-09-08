import type { Pelada, Season } from "@/types/domain";

export const currentSeason: Season = {
  id: "s2026",
  nome: "Temporada 2026",
  inicioEm: "2026-01-08",
  fimEm: null,
  ativa: true,
};

export const seasons: Season[] = [
  currentSeason,
  { id: "s2025", nome: "Temporada 2025", inicioEm: "2025-01-09", fimEm: "2025-12-18", ativa: false },
];

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Próxima quinta-feira a partir de hoje (se hoje for quinta, a seguinte). */
function proximaQuinta(): Date {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const delta = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

/** As duas quintas-feiras anteriores a hoje, a mais recente primeiro. */
function quintasAnteriores(): [Date, Date] {
  const hoje = new Date();
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const delta = ((d.getDay() - 4 + 7) % 7) || 7;
  const recente = new Date(d);
  recente.setDate(d.getDate() - delta);
  const anterior = new Date(recente);
  anterior.setDate(recente.getDate() - 7);
  return [recente, anterior];
}

function formatDDMM(iso: string): string {
  const parts = iso.split("-");
  return `${parts[2] ?? ""}/${parts[1] ?? ""}`;
}

const dataProxima = toISODate(proximaQuinta());
const [quintaRecente, quintaAnterior] = quintasAnteriores();
const dataRecente = toISODate(quintaRecente);
const dataAnterior = toISODate(quintaAnterior);

export const nextPelada: Pelada = {
  id: "pl-next",
  data: dataProxima,
  horario: "20h00",
  local: "Society do Parque",
  seasonId: "s2026",
  status: "confirmacao",
  jogadoresConfirmados: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p9", "p11"],
  times: [],
  partidas: [],
};

export const pastPeladas: Pelada[] = [
  {
    id: "pl-2",
    data: dataRecente,
    horario: "20h00",
    local: "Society do Parque",
    seasonId: "s2026",
    status: "finalizada",
    jogadoresConfirmados: ["p1", "p2", "p3", "p4", "p5", "p6", "p8", "p9", "p10", "p13"],
    times: [],
    partidas: [],
  },
  {
    id: "pl-1",
    data: dataAnterior,
    horario: "20h00",
    local: "Quadra da Vila",
    seasonId: "s2026",
    status: "finalizada",
    jogadoresConfirmados: ["p1", "p3", "p4", "p5", "p6", "p7", "p8", "p11", "p12", "p13"],
    times: [],
    partidas: [],
  },
];

export const peladas: Pelada[] = [nextPelada, ...pastPeladas];

/** MVP da última pelada finalizada (mock). */
export const recentMvp = {
  playerId: "p6",
  peladaId: "pl-2",
  peladaLabel: `Pelada de ${formatDDMM(dataRecente)}`,
};

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatDataPorExtenso(iso: string): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DIAS[date.getUTCDay()] ?? ""}, ${d} de ${MESES[m - 1] ?? ""}`;
}
