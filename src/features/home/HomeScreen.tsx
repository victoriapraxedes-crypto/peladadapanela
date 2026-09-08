import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Users, History } from "lucide-react";

import { TopBar } from "@/components/layout/TopBar";
import { InitialsAvatar } from "@/components/layout/Avatar";
import {
  formatDataPorExtenso,
  getPlayer,
  nextPelada,
  playerStats,
  recentMvp,
} from "@/lib/mock";

function NextPeladaCard() {
  const [confirmado, setConfirmado] = useState(false);
  const base = nextPelada.jogadoresConfirmados;
  const total = base.length + (confirmado ? 1 : 0);
  const visiveis = base.slice(0, 6);
  const restantes = total - visiveis.length;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary">
        Próxima pelada
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
        {formatDataPorExtenso(nextPelada.data)}
      </h2>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {nextPelada.horario} · {nextPelada.local}
      </p>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="num text-4xl text-foreground">{total}</span>
        <span className="text-sm text-muted-foreground">confirmados</span>
      </div>

      <div className="mt-3 flex items-center">
        {visiveis.map((id, i) => {
          const p = getPlayer(id);
          if (!p) return null;
          return (
            <span
              key={id}
              className="rounded-full ring-2 ring-surface"
              style={{ marginLeft: i === 0 ? 0 : -8 }}
            >
              <InitialsAvatar apelido={p.apelido} size={32} />
            </span>
          );
        })}
        {restantes > 0 && (
          <span
            className="inline-flex h-8 items-center justify-center rounded-full bg-surface-2 px-2 text-xs font-semibold text-muted-foreground ring-2 ring-surface"
            style={{ marginLeft: -8 }}
          >
            +{restantes}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setConfirmado((v) => !v)}
        className={
          confirmado
            ? "mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-primary bg-transparent font-display text-sm font-semibold uppercase tracking-[-0.01em] text-foreground"
            : "mt-5 flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim"
        }
      >
        {confirmado && <Check size={18} className="text-success" />}
        {confirmado ? "Presença confirmada" : "Confirmar presença"}
      </button>
    </section>
  );
}

function Destaques() {
  const artilheiro = [...playerStats].sort((a, b) => b.gols - a.gols)[0];
  const artPlayer = getPlayer(artilheiro.playerId);
  const mvpPlayer = getPlayer(recentMvp.playerId);

  return (
    <section className="grid grid-cols-2 gap-3">
      <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Artilheiro
        </p>
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <InitialsAvatar apelido={artPlayer?.apelido ?? "??"} size={32} />
          <span className="truncate text-sm font-medium text-foreground">
            {artPlayer?.apelido}
          </span>
        </div>
        <p className="mt-3">
          <span className="num text-2xl text-foreground">{artilheiro.gols}</span>{" "}
          <span className="text-xs text-muted-foreground">gols</span>
        </p>
      </div>

      <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          MVP recente
        </p>
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <InitialsAvatar apelido={mvpPlayer?.apelido ?? "??"} size={32} />
          <span className="truncate text-sm font-medium text-foreground">
            {mvpPlayer?.apelido}
          </span>
        </div>
        <p className="mt-3 truncate text-xs text-muted-foreground">{recentMvp.peladaLabel}</p>
      </div>
    </section>
  );
}

function RankingResumido() {
  const top = [...playerStats]
    .sort((a, b) => b.aproveitamento - a.aproveitamento || b.gols - a.gols)
    .slice(0, 5);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h3 className="truncate font-display text-base font-semibold text-foreground">
          Ranking geral
        </h3>
        <Link to="/ranking" className="text-xs text-muted-foreground hover:text-foreground">
          Ver tudo
        </Link>
      </div>

      <ul className="mt-3">
        {top.map((s, i) => {
          const p = getPlayer(s.playerId);
          return (
            <li
              key={s.playerId}
              className="grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-3 last:border-b-0 last:pb-0"
            >
              <span className={i === 0 ? "num text-base text-primary" : "num text-base text-muted-foreground"}>
                {i + 1}
              </span>
              <InitialsAvatar apelido={p?.apelido ?? "??"} size={32} />
              <span className="truncate text-sm text-foreground">{p?.apelido}</span>
              <span className="num text-sm text-foreground">{s.aproveitamento}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AcessoRapido() {
  const itemClass =
    "grid min-h-[56px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground hover:border-primary/40";
  return (
    <section className="grid gap-3">
      <Link to="/perfil" className={itemClass}>
        <Users size={18} className="text-muted-foreground" />
        <span className="truncate text-left">Jogadores</span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>
      <Link to="/pelada" className={itemClass}>
        <History size={18} className="text-muted-foreground" />
        <span className="truncate text-left">Histórico</span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </Link>
    </section>
  );
}

export function HomeScreen() {
  return (
    <>
      <TopBar />
      <div className="grid gap-6">
        <NextPeladaCard />
        <Destaques />
        <RankingResumido />
        <AcessoRapido />
      </div>
    </>
  );
}
