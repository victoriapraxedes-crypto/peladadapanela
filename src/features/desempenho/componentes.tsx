import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, ShieldAlert } from "lucide-react";

import { InitialsAvatar } from "@/components/layout/Avatar";
import type { DesempenhoPelada, SuspensaoPropria } from "@/features/desempenho/dados";
import { formatDataCurta, somarDias } from "@/lib/format";
import { PONTOS, formatPontos } from "@/lib/pontuacao";
import { cn } from "@/lib/utils";

export const SECTION_LABEL =
  "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

export function FotoJogador({
  apelido,
  fotoUrl,
  size = 36,
  className,
}: {
  apelido: string;
  fotoUrl: string | null | undefined;
  size?: number;
  className?: string | undefined;
}) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={apelido}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className={className}>
      <InitialsAvatar apelido={apelido} size={size} />
    </span>
  );
}

export function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="sr-only">sem comparação</span>;
  }
  if (valor === 0) {
    return (
      <span
        className="inline-flex items-center text-muted-foreground"
        aria-label="manteve a posição"
      >
        <Minus size={12} />
      </span>
    );
  }
  const subiu = valor > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold",
        subiu ? "text-success" : "text-destructive",
      )}
      aria-label={
        subiu
          ? `subiu ${valor} ${valor === 1 ? "posição" : "posições"}`
          : `caiu ${-valor} ${valor === -1 ? "posição" : "posições"}`
      }
    >
      {subiu ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(valor)}
    </span>
  );
}

export function StatTile({
  rotulo,
  valor,
  destaque,
  negativo,
  children,
}: {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
  negativo?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-3",
        destaque ? "border-primary/60 bg-primary/10" : "border-border bg-surface-2",
      )}
    >
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {rotulo}
      </p>
      <p
        className={cn(
          "num mt-1 text-2xl",
          negativo ? "text-destructive" : destaque ? "text-primary" : "text-foreground",
        )}
      >
        {valor}
      </p>
      {children}
    </div>
  );
}

/** Barras de pontos por pelada. Positivo em amarelo, negativo em vermelho. */
export function GraficoEvolucao({
  pontos,
  altura = 96,
}: {
  pontos: Pick<DesempenhoPelada, "data" | "pontos" | "peladaId">[];
  altura?: number;
}) {
  if (pontos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        A evolução aparece depois da primeira pelada publicada.
      </p>
    );
  }
  const max = Math.max(4, ...pontos.map((p) => p.pontos));
  const min = Math.min(0, ...pontos.map((p) => p.pontos));
  const faixa = max - min || 1;
  const zero = (max / faixa) * 100;
  const resumo = pontos
    .map((p) => `${formatDataCurta(p.data).slice(0, 5)}: ${formatPontos(p.pontos)}`)
    .join(", ");

  return (
    <figure>
      <div
        role="img"
        aria-label={`Pontos por pelada. ${resumo}`}
        className="relative flex items-stretch gap-1.5"
        style={{ height: altura }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-border"
          style={{ top: `${zero}%` }}
        />
        {pontos.map((p, i) => {
          const h = (Math.abs(p.pontos) / faixa) * 100;
          const positivo = p.pontos >= 0;
          return (
            <div key={p.peladaId} className="relative min-w-0 flex-1">
              <div
                className={cn(
                  "animar-crescer absolute inset-x-0 rounded-sm",
                  positivo ? "bg-primary" : "bg-destructive",
                )}
                style={{
                  top: positivo ? `${zero - h}%` : `${zero}%`,
                  height: `${Math.max(h, p.pontos === 0 ? 1.5 : 0)}%`,
                  animationDelay: `${i * 40}ms`,
                  transformOrigin: positivo ? "bottom" : "top",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5">
        {pontos.map((p) => (
          <span
            key={p.peladaId}
            aria-hidden="true"
            className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground"
          >
            {formatDataCurta(p.data).slice(0, 5)}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function RegraPontuacao({ compacta }: { compacta?: boolean }) {
  return (
    <section
      aria-label="Regra de pontuação"
      className={cn("rounded-2xl border border-primary/40 bg-surface", compacta ? "p-3" : "p-5")}
    >
      {!compacta && <p className={SECTION_LABEL}>Como se pontua</p>}
      <div className={cn("grid grid-cols-3 gap-2 text-center", !compacta && "mt-3")}>
        <div>
          <p className="num text-2xl text-primary">+{PONTOS.gol}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">gol</p>
        </div>
        <div>
          <p className="num text-2xl text-primary">+{PONTOS.assistencia}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">assistência</p>
        </div>
        <div>
          <p className="num text-2xl text-destructive">{formatPontos(PONTOS.carrinho)}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">carrinho</p>
        </div>
      </div>
      {!compacta && (
        <p className="mt-3 text-xs text-muted-foreground">
          Carrinho que machucar alguém também suspende por 3 meses. Pontuação pode ficar negativa.
          Desempate: gols, depois assistências, depois menos carrinhos.
        </p>
      )}
    </section>
  );
}

export function AvisoSuspensao({ suspensao }: { suspensao: SuspensaoPropria }) {
  return (
    <section
      role="status"
      className="flex gap-3 rounded-2xl border border-destructive/60 bg-destructive/10 p-4"
    >
      <ShieldAlert size={20} className="mt-0.5 shrink-0 text-destructive" />
      <div className="min-w-0">
        <p className="font-display text-sm font-semibold text-foreground">
          Você está suspenso até {formatDataCurta(somarDias(suspensao.suspensoAte, -1))}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {suspensao.descricao ?? "Carrinho que causou lesão"} (pelada de{" "}
          {formatDataCurta(suspensao.dataOcorrencia)}). Seu painel e o histórico continuam abertos;
          a partir de {formatDataCurta(suspensao.suspensoAte)} você volta a ser escalado.
        </p>
      </div>
    </section>
  );
}
