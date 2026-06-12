"use client";

import { Cluster, Idea } from "@/lib/types";

type Props = {
  ideas: Idea[];
  clusters: Record<string, Cluster>;
  onSelect: (idea: Idea) => void;
};

export default function IdeaList({ ideas, clusters, onSelect }: Props) {
  const sorted = [...ideas].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((idea, idx) => {
        const cluster = clusters[idea.clusterId] ?? clusters.inbox;
        return (
          <button
            key={idea.id}
            onClick={() => onSelect(idea)}
            className="glass anim-fade-up group flex flex-col gap-2 rounded-2xl p-4 text-left transition hover:border-cyan-400/40 hover:bg-white/[0.07]"
            style={{ animationDelay: `${Math.min(idx * 45, 500)}ms` }}
          >
            <div className="font-techno flex items-center gap-2 text-[10px]" style={{ color: cluster.color }}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: cluster.color, boxShadow: `0 0 6px ${cluster.color}` }}
              />
              {cluster.name}
            </div>
            <h3 className="font-display font-semibold tracking-wide text-slate-100 group-hover:text-white">
              {idea.status === "enriqueciendo" ? "✨ Enriqueciendo…" : idea.title}
            </h3>
            <p className="line-clamp-3 text-sm text-slate-400">{idea.summary}</p>
            <p className="mt-auto pt-1 text-xs text-slate-600">
              {idea.source === "voz" ? "🎙️ voz" : "⌨️ texto"} ·{" "}
              {new Date(idea.createdAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
              {idea.research && " · 🔍 investigada"}
            </p>
          </button>
        );
      })}
    </div>
  );
}
