"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildGraphData } from "@/lib/graph";
import { Cluster, Idea } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-500">
      Cargando grafo…
    </div>
  ),
});

export type NodePulse = { id: string; at: number };

type Props = {
  ideas: Idea[];
  clusters: Record<string, Cluster>;
  selectedId: string | null;
  pulse: NodePulse | null;
  onSelect: (idea: Idea | null) => void;
};

// Fase de "respiración" estable por nodo, derivada del id
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return h;
}

export default function IdeaGraph({ ideas, clusters, selectedId, pulse, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setDims({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => buildGraphData(ideas, clusters), [ideas, clusters]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 px-1 pb-3">
        {Object.entries(clusters).map(([id, c]) => {
          const count = ideas.filter((i) => i.clusterId === id).length;
          if (count === 0) return null;
          return (
            <span
              key={id}
              className="font-techno inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px]"
              style={{
                backgroundColor: c.color + "14",
                borderColor: c.color + "44",
                color: c.color,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color, boxShadow: `0 0 6px ${c.color}` }}
              />
              {c.name} · {count}
            </span>
          );
        })}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 border-t-cyan-400/20 bg-[#070a14]/70 backdrop-blur-sm"
      >
        {dims.w > 0 && (
          <ForceGraph2D
            width={dims.w}
            height={dims.h}
            graphData={data}
            backgroundColor="rgba(0,0,0,0)"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onNodeClick={(node: any) => onSelect(node.idea ?? null)}
            onBackgroundClick={() => onSelect(null)}
            linkColor={() => "rgba(148,163,184,0.16)"}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            linkWidth={(link: any) => link.weight * 1.1}
            // Partículas de "datos" fluyendo por las aristas — mantienen el canvas vivo
            linkDirectionalParticles={2}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            linkDirectionalParticleSpeed={(link: any) => 0.0035 + link.weight * 0.0008}
            linkDirectionalParticleWidth={2.2}
            linkDirectionalParticleColor={() => "rgba(0,242,255,0.75)"}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, scale: number) => {
              const isSelected = node.id === selectedId;
              const isEnriching = node.idea.status === "enriqueciendo";
              const r = isSelected ? 9 : 6;
              const t = performance.now();

              // Respiración: el glow oscila suavemente, desfasado por nodo
              const breath = Math.sin(t / 650 + phaseOf(node.id)) * 4;

              ctx.save();
              ctx.shadowColor = node.color;
              ctx.shadowBlur = (isSelected ? 22 : 11) + breath;
              ctx.globalAlpha = isEnriching ? 0.55 : 1;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = node.color;
              ctx.fill();
              ctx.restore();

              // Onda expansiva al capturar / conectar una idea
              if (pulse && node.id === pulse.id) {
                const elapsed = Date.now() - pulse.at;
                if (elapsed < 1400) {
                  const p = elapsed / 1400;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r + 4 + p * 30, 0, 2 * Math.PI);
                  ctx.strokeStyle = `rgba(0,242,255,${(1 - p) * 0.8})`;
                  ctx.lineWidth = 2 / scale;
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, r + 4 + p * 16, 0, 2 * Math.PI);
                  ctx.strokeStyle = `rgba(139,92,246,${(1 - p) * 0.5})`;
                  ctx.lineWidth = 1.5 / scale;
                  ctx.stroke();
                }
              }

              if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + 3, 0, 2 * Math.PI);
                ctx.strokeStyle = "rgba(255,255,255,0.8)";
                ctx.lineWidth = 1.5 / scale;
                ctx.stroke();
              }

              const fontSize = Math.max(11 / scale, 2.5);
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = isSelected ? "#f1f5f9" : "rgba(203,213,225,0.85)";
              const label: string = isEnriching ? "✨ enriqueciendo…" : node.idea.title;
              const short = label.length > 34 ? label.slice(0, 32) + "…" : label;
              ctx.fillText(short, node.x, node.y + r + 3);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
              ctx.fill();
            }}
            cooldownTicks={120}
          />
        )}
      </div>
    </div>
  );
}
