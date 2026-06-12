"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Cluster, Idea } from "@/lib/types";

type Props = {
  idea: Idea;
  clusters: Record<string, Cluster>;
  onClose: () => void;
  onResearch: (idea: Idea) => Promise<void>;
};

export default function IdeaPanel({ idea, clusters, onClose, onResearch }: Props) {
  const cluster = clusters[idea.clusterId] ?? clusters.inbox;
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResearch() {
    setResearching(true);
    setError(null);
    try {
      await onResearch(idea);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al investigar");
    } finally {
      setResearching(false);
    }
  }

  return (
    <aside className="glass flex h-full flex-col gap-4 overflow-y-auto rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <span
          className="font-techno inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px]"
          style={{
            backgroundColor: cluster.color + "1a",
            color: cluster.color,
            borderColor: cluster.color + "55",
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cluster.color }} />
          {cluster.name}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
          aria-label="Cerrar panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold tracking-wide text-slate-100">
          {idea.status === "enriqueciendo" ? "✨ Enriqueciendo idea…" : idea.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Capturada por {idea.source} ·{" "}
          {new Date(idea.createdAt).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <p className="text-sm leading-relaxed text-slate-300">{idea.summary}</p>

      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {idea.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs text-slate-400"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {(idea.viability !== undefined || idea.complexity) && (
        <div className="grid grid-cols-2 gap-3">
          {idea.viability !== undefined && (
            <div className="glass rounded-xl p-3">
              <p className="font-techno text-[9px] text-slate-500">Viabilidad</p>
              <p className="font-display mt-1 text-xl font-bold text-cyan-300">
                {idea.viability}%
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                  style={{ width: `${idea.viability}%` }}
                />
              </div>
            </div>
          )}
          {idea.complexity && (
            <div className="glass rounded-xl p-3">
              <p className="font-techno text-[9px] text-slate-500">Complejidad</p>
              <p
                className={`font-display mt-1 text-xl font-bold capitalize ${
                  idea.complexity === "baja"
                    ? "text-emerald-300"
                    : idea.complexity === "media"
                      ? "text-amber-300"
                      : "text-red-300"
                }`}
              >
                {idea.complexity}
              </p>
            </div>
          )}
        </div>
      )}

      {idea.research && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
            Investigación
          </h4>
          <div className="prose-sm text-sm leading-relaxed text-slate-300 [&_a]:text-cyan-300 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-100 [&_li]:ml-4 [&_li]:list-disc [&_p]:mt-1.5 [&_strong]:text-slate-100">
            <ReactMarkdown>{idea.research}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="mt-auto pt-2">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <button
          onClick={handleResearch}
          disabled={researching || idea.status === "enriqueciendo"}
          className="glow-violet w-full rounded-full border border-violet-400/50 bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-200 transition hover:bg-violet-500/30 disabled:cursor-wait disabled:opacity-60"
        >
          {researching
            ? "🔍 Investigando… (puede tardar un minuto)"
            : idea.research
              ? "🔄 Volver a investigar"
              : "🔍 Investigar a fondo"}
        </button>
      </div>
    </aside>
  );
}
