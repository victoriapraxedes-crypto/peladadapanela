import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PeladaStatus = Database["public"]["Enums"]["pelada_status"];

const STATUS_OPCOES: { value: PeladaStatus; label: string }[] = [
  { value: "aberta", label: "Aberta" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "times_definidos", label: "Times definidos" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "finalizada", label: "Finalizada" },
];

const INPUT =
  "h-[52px] rounded-xl border border-border bg-surface-2 px-4 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const SECTION_LABEL = "font-display text-xs font-semibold uppercase tracking-[0.08em] text-primary";

interface PeladaRow {
  id: string;
  data: string;
  horario: string;
  local: string;
  status: PeladaStatus;
  season_id: string;
}

interface SeasonRow {
  id: string;
  nome: string;
  ativa: boolean;
}

function formatDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d ?? ""}/${m ?? ""}/${y ?? ""}`;
}

export function AdminPeladaScreen() {
  const [peladas, setPeladas] = useState<PeladaRow[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState("");
  const [horario, setHorario] = useState("20h00");
  const [local, setLocal] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [status, setStatus] = useState<PeladaStatus>("aberta");

  const modoCriacao = selecionadaId === null;

  const preencher = useCallback((p: PeladaRow) => {
    setData(p.data);
    setHorario(p.horario);
    setLocal(p.local);
    setSeasonId(p.season_id);
    setStatus(p.status);
  }, []);

  const carregar = useCallback(async () => {
    const [{ data: peladaRows }, { data: seasonRows }] = await Promise.all([
      supabase
        .from("peladas")
        .select("id, data, horario, local, status, season_id")
        .order("data", { ascending: false }),
      supabase.from("seasons").select("id, nome, ativa").order("inicio_em", { ascending: false }),
    ]);

    const lista = peladaRows ?? [];
    const temporadas = seasonRows ?? [];
    setPeladas(lista);
    setSeasons(temporadas);
    return { lista, temporadas };
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { lista, temporadas } = await carregar();
      if (!ativo) return;

      const hoje = new Date().toISOString().slice(0, 10);
      const proxima = [...lista]
        .filter((p) => p.data >= hoje && p.status !== "finalizada")
        .sort((a, b) => a.data.localeCompare(b.data))[0];

      if (proxima) {
        setSelecionadaId(proxima.id);
        preencher(proxima);
      } else {
        setSelecionadaId(null);
        const ativaSeason = temporadas.find((s) => s.ativa) ?? temporadas[0];
        setSeasonId(ativaSeason?.id ?? "");
      }
      setLoading(false);
    })();
    return () => {
      ativo = false;
    };
  }, [carregar, preencher]);

  const temporadaAtiva = useMemo(() => seasons.find((s) => s.ativa) ?? seasons[0], [seasons]);

  const selecionar = (id: string) => {
    if (id === "") {
      novaPelada();
      return;
    }
    const p = peladas.find((row) => row.id === id);
    if (!p) return;
    setSelecionadaId(id);
    preencher(p);
  };

  const novaPelada = () => {
    setSelecionadaId(null);
    setData("");
    setHorario("20h00");
    setLocal("");
    setSeasonId(temporadaAtiva?.id ?? "");
    setStatus("aberta");
  };

  const valido =
    data.trim() !== "" && horario.trim() !== "" && local.trim() !== "" && seasonId !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || saving) return;
    setSaving(true);

    const payload = {
      data,
      horario: horario.trim(),
      local: local.trim(),
      season_id: seasonId,
      status,
    };

    if (modoCriacao) {
      const { data: criada, error } = await supabase
        .from("peladas")
        .insert(payload)
        .select("id, data, horario, local, status, season_id")
        .single();

      if (error || !criada) {
        toast.error(error?.message ?? "Não foi possível criar a pelada.");
        setSaving(false);
        return;
      }
      await carregar();
      setSelecionadaId(criada.id);
      preencher(criada);
      toast.success("Pelada criada.");
    } else {
      const { error } = await supabase.from("peladas").update(payload).eq("id", selecionadaId!);
      if (error) {
        toast.error("Não foi possível salvar a pelada. " + error.message);
        setSaving(false);
        return;
      }
      await carregar();
      toast.success("Alterações salvas.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <>
        <TopBar />
        <Skeleton className="mt-2 h-8 w-2/3" />
        <Skeleton className="mt-5 h-[52px] w-full rounded-xl" />
        <Skeleton className="mt-5 h-[420px] w-full rounded-2xl" />
      </>
    );
  }

  return (
    <>
      <TopBar />

      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-foreground">
          Gerenciar pelada
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma pelada para editar ou crie uma nova.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <select
          aria-label="Selecionar pelada"
          value={selecionadaId ?? ""}
          onChange={(e) => selecionar(e.target.value)}
          className={`${INPUT} w-full`}
        >
          <option value="">Nova pelada</option>
          {peladas.map((p) => (
            <option key={p.id} value={p.id}>
              {formatDDMMYYYY(p.data)} · {p.local}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={novaPelada}
          className="flex h-[52px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-surface-2 px-4 text-sm font-medium text-foreground"
        >
          Nova
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 grid gap-5 rounded-2xl border border-border bg-surface p-5"
      >
        <p className={SECTION_LABEL}>{modoCriacao ? "Nova pelada" : "Editar pelada"}</p>

        <div className="grid gap-2">
          <label htmlFor="pelada-data" className="text-sm font-medium text-foreground">
            Data
          </label>
          <input
            id="pelada-data"
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="pelada-horario" className="text-sm font-medium text-foreground">
            Horário
          </label>
          <input
            id="pelada-horario"
            type="text"
            required
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="pelada-local" className="text-sm font-medium text-foreground">
            Local
          </label>
          <input
            id="pelada-local"
            type="text"
            required
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="pelada-season" className="text-sm font-medium text-foreground">
            Temporada
          </label>
          <select
            id="pelada-season"
            required
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className={INPUT}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label htmlFor="pelada-status" className="text-sm font-medium text-foreground">
            Status
          </label>
          <select
            id="pelada-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PeladaStatus)}
            className={INPUT}
          >
            {STATUS_OPCOES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!valido || saving}
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold uppercase tracking-[-0.01em] text-primary-foreground hover:bg-primary-dim disabled:opacity-50"
        >
          {saving ? "Salvando..." : modoCriacao ? "Criar pelada" : "Salvar alterações"}
        </button>
      </form>

      <Link
        to="/pelada"
        className="mt-3 flex h-[52px] w-full items-center justify-center rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground"
      >
        Ver a pelada
      </Link>
    </>
  );
}
