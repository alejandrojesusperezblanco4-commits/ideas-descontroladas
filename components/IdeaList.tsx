"use client";

import { Cluster, Idea } from "@/lib/types";

type Props = {
  ideas: Idea[];
  clusters: Record<string, Cluster>;
  onSelect: (idea: Idea) => void;
};

function ViabilityBar({ value }: { value: number }) {
  const color =
    value >= 75 ? "#22d3ee" : value >= 50 ? "#a78bfa" : value >= 25 ? "#fb923c" : "#6b7280";
  const glow =
    value >= 75
      ? "rgba(34,211,238,0.4)"
      : value >= 50
        ? "rgba(167,139,250,0.4)"
        : value >= 25
          ? "rgba(251,146,60,0.3)"
          : "transparent";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: color,
            boxShadow: `0 0 8px ${glow}`,
          }}
        />
      </div>
      <span className="font-techno w-7 text-right text-[10px]" style={{ color }}>
        {value}%
      </span>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  lista:        "bg-slate-800 text-slate-400 border-slate-700",
  enriqueciendo:"bg-cyan-400/10 text-cyan-300 border-cyan-400/30 animate-pulse",
  investigando: "bg-violet-400/10 text-violet-300 border-violet-400/30",
  descartada:   "bg-red-400/10 text-red-400 border-red-400/20",
};

const STATUS_LABEL: Record<string, string> = {
  lista:         "lista",
  enriqueciendo: "✨ enriqueciendo",
  investigando:  "🔍 investigando",
  descartada:    "descartada",
};

const COMPLEXITY_COLOR: Record<string, string> = {
  baja:   "#22d3ee",
  media:  "#a78bfa",
  alta:   "#fb923c",
};

export default function IdeaList({ ideas, clusters, onSelect }: Props) {
  const sorted = [...ideas].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (ideas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="text-4xl opacity-30">💡</span>
        <p className="text-sm text-slate-500">
          Sin ideas todavía — captura la primera arriba
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((idea, idx) => {
        const cluster = clusters[idea.clusterId] ?? clusters.inbox;
        const statusStyle = (idea.status ? STATUS_STYLES[idea.status] : undefined) ?? STATUS_STYLES.lista;
        const statusLabel = (idea.status ? STATUS_LABEL[idea.status] : undefined) ?? idea.status;
        const isEnriching = idea.status === "enriqueciendo";

        return (
          <button
            key={idea.id}
            onClick={() => onSelect(idea)}
            className="glass anim-fade-up group flex flex-col gap-3 rounded-2xl p-4 text-left transition hover:border-slate-600/60 hover:bg-white/[0.04]"
            style={{ animationDelay: `${Math.min(idx * 40, 400)}ms` }}
          >
            {/* ── Cluster + status ── */}
            <div className="flex items-center justify-between gap-2">
              <div
                className="font-techno flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: cluster.color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: cluster.color,
                    boxShadow: `0 0 5px ${cluster.color}88`,
                  }}
                />
                {cluster.name}
              </div>
              <span
                className={`font-techno rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide ${statusStyle}`}
              >
                {statusLabel}
              </span>
            </div>

            {/* ── Título ── */}
            <h3 className="font-display font-semibold leading-snug tracking-wide text-slate-100 group-hover:text-white">
              {isEnriching ? (
                <span className="text-slate-400">Procesando…</span>
              ) : (
                idea.title
              )}
            </h3>

            {/* ── Resumen ── */}
            {!isEnriching && (
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                {idea.summary}
              </p>
            )}

            {/* ── Viabilidad ── */}
            {idea.viability !== undefined && !isEnriching && (
              <ViabilityBar value={idea.viability} />
            )}

            {/* ── Tags ── */}
            {idea.tags.length > 0 && !isEnriching && (
              <div className="flex flex-wrap gap-1">
                {idea.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-700/80 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
                {idea.tags.length > 4 && (
                  <span className="rounded-full border border-slate-800 px-2 py-0.5 text-[10px] text-slate-600">
                    +{idea.tags.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* ── Footer ── */}
            <div className="mt-auto flex items-center gap-2 border-t border-slate-800/60 pt-2.5">
              <span className="text-[11px] text-slate-600">
                {idea.source === "voz" ? "🎙️" : "⌨️"}
              </span>
              <span className="text-[10px] text-slate-600">
                {new Date(idea.createdAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              {idea.complexity && (
                <>
                  <span className="text-slate-700">·</span>
                  <span
                    className="font-techno text-[10px] uppercase"
                    style={{ color: COMPLEXITY_COLOR[idea.complexity] ?? "#6b7280" }}
                  >
                    {idea.complexity}
                  </span>
                </>
              )}
              {idea.research && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-[10px] text-violet-400">investigada</span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
