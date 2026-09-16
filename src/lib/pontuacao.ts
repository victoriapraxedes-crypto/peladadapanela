/**
 * Regra de pontuação individual.
 *
 * A conta OFICIAL é feita no banco (view `desempenho_pelada` e função `ranking`).
 * Estes valores existem só para a prévia na súmula e para o texto da regra na tela.
 * Se a regra mudar, mude primeiro a view no banco e depois aqui.
 */
export const PONTOS = {
  gol: 4,
  assistencia: 2,
  carrinho: -5,
} as const;

export const SUSPENSAO_MESES = 3;

export function previaPontos(s: { gols: number; assistencias: number; carrinhos: number }) {
  return s.gols * PONTOS.gol + s.assistencias * PONTOS.assistencia + s.carrinhos * PONTOS.carrinho;
}

export function formatPontos(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}
