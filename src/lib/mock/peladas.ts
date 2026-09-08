import type { AuthUser, Pelada, Season } from "@/types/domain";

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

export const nextPelada: Pelada = {
  id: "pl-next",
  data: "2026-03-12",
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
    data: "2026-03-05",
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
    data: "2026-02-26",
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
export const recentMvp = { playerId: "p6", peladaId: "pl-2", peladaLabel: "Pelada de 05/03" };

export const currentUser: AuthUser = {
  id: "u1",
  playerId: "p1",
  role: "admin",
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
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DIAS[date.getUTCDay()]}, ${d} de ${MESES[m - 1]}`;
}
