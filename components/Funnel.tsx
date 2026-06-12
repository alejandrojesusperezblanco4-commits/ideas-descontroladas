"use client";

import { useState } from "react";
import { Cluster, FunnelResult, Idea } from "@/lib/types";

type Props = {
  ideas: Idea[];
  clusters: Record<string, Cluster>;
  criteria: string[];
  setCriteria: (c: string[]) => void;
  result: FunnelResult | null;
  setResult: (r: FunnelResult | null) => void;
  onSelectIdea: (id: string) => void;
};

export default function Funnel({
  ideas,
  clusters,
  criteria,
  setCriteria,
  result,
  setResult,
  onSelectIdea,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCriterion(index: number, value: string) {
    setCriteria(criteria.map((c, i) => (i === index ? value : c)));
  }

  function removeCriterion(index: number) {
    setCriteria(criteria.filter((_, i) => i !== index));
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideas: ideas.map((i) => ({
            id: i.id,
            title: i.title,
            summary: i.summary,
            tags: i.tags,
          })),
          criteria: criteria.filter((c) => c.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al puntuar");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al puntuar");
    } finally {
      setLoading(false);
    }
  }

  const ideaById = new Map(ideas.map((i) => [i.id, i]));
  const ranked = result
    ? [...result.rankings]
        .map((r) => ({
          ...r,
          total: r.scores.reduce((s, x) => s + x.score, 0) / Math.max(r.scores.length, 1),
        }))
        .sort((a, b) => b.total - a.total)
        .filter((r) => ideaById.has(r.ideaId))
    : [];

  return (
    <div className="anim-fade-up flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
      <section className="glass rounded-2xl p-5">
        <h2 className="font-techno text-xs text-cyan-300/80">Tus criterios</h2>
        <p className="mt-1 text-xs text-slate-500">
          La IA puntuará cada idea de 1 a 10 en cada criterio. Edítalos a tu gusto.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c}
                onChange={(e) => updateCriterion(i, e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60"
              />
              <button
                onClick={() => removeCriterion(i)}
                disabled={criteria.length <= 1}
                className="rounded-full p-2 text-slate-600 transition hover:bg-slate-800 hover:text-slate-300 disabled:opacity-30"
                aria-label="Quitar criterio"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setCriteria([...criteria, ""])}
            disabled={criteria.length >= 5}
            className="rounded-full border border-slate-700 px-4 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
          >
            + Añadir criterio
          </button>
          <button
            onClick={run}
            disabled={loading || ideas.length === 0}
            className="font-display rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-1.5 text-xs font-semibold text-slate-950 transition hover:shadow-[0_0_18px_rgba(139,92,246,0.4)] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "⏳ Puntuando ideas…" : `⚡ Puntuar ${ideas.length} ideas`}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </section>

      {result && ranked.length > 0 && (
        <>
          {ideaById.has(result.recommendation.ideaId) && (
            <section className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 shadow-[0_0_20px_rgba(251,191,36,0.08)] backdrop-blur-xl">
              <h2 className="font-techno text-xs text-amber-300">🏆 Ejecuta esta primero</h2>
              <button
                onClick={() => onSelectIdea(result.recommendation.ideaId)}
                className="mt-2 text-left text-lg font-semibold text-slate-100 hover:text-amber-200"
              >
                {ideaById.get(result.recommendation.ideaId)!.title}
              </button>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {result.recommendation.why}
              </p>
            </section>
          )}

          <section className="flex flex-col gap-3">
            {ranked.map((r, pos) => {
              const idea = ideaById.get(r.ideaId)!;
              const cluster = clusters[idea.clusterId] ?? clusters.inbox;
              return (
                <div
                  key={r.ideaId}
                  className="glass anim-fade-up rounded-2xl p-4"
                  style={{ animationDelay: `${pos * 60}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => onSelectIdea(r.ideaId)}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <span className="text-lg font-bold text-slate-600">#{pos + 1}</span>
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <span className="truncate font-semibold text-slate-100">{idea.title}</span>
                    </button>
                    <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-cyan-300">
                      {r.total.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {r.scores.map((s) => (
                      <div key={s.criterion} className="rounded-xl bg-slate-900/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500" title={s.criterion}>
                            {s.criterion}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{s.score}/10</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                            style={{ width: `${s.score * 10}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs leading-snug text-slate-400">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {!result && !loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="max-w-sm text-center text-sm text-slate-500">
            Define tus criterios y pulsa «Puntuar» — la IA rankeará tus {ideas.length} ideas
            y te dirá cuál ejecutar primero.
          </p>
        </div>
      )}
    </div>
  );
}
