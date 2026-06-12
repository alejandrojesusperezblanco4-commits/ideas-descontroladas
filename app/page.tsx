"use client";

import { useEffect, useState } from "react";
import CaptureBar from "@/components/CaptureBar";
import ChatBrain, { ChatMessage } from "@/components/ChatBrain";
import Funnel from "@/components/Funnel";
import IdeaGraph, { NodePulse } from "@/components/IdeaGraph";
import IdeaList from "@/components/IdeaList";
import IdeaPanel from "@/components/IdeaPanel";
import { SEED_IDEAS } from "@/lib/seed";
import {
  Cluster,
  DEFAULT_CRITERIA,
  FunnelResult,
  Idea,
  IdeaSource,
  SEED_CLUSTERS,
} from "@/lib/types";

const IDEAS_KEY = "id-ideas-v1";
const CLUSTERS_KEY = "id-clusters-v1";

type Tab = "grafo" | "ideas" | "cerebro" | "embudo";

const TABS: { id: Tab; label: string }[] = [
  { id: "grafo", label: "Poligrama" },
  { id: "ideas", label: "Ideas" },
  { id: "cerebro", label: "Cerebro" },
  { id: "embudo", label: "Embudo" },
];

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>(SEED_IDEAS);
  const [clusters, setClusters] = useState<Record<string, Cluster>>(SEED_CLUSTERS);
  const [tab, setTab] = useState<Tab>("grafo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [funnelResult, setFunnelResult] = useState<FunnelResult | null>(null);
  const [pulse, setPulse] = useState<NodePulse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const selected = ideas.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    try {
      const rawIdeas = localStorage.getItem(IDEAS_KEY);
      if (rawIdeas) setIdeas(JSON.parse(rawIdeas));
      const rawClusters = localStorage.getItem(CLUSTERS_KEY);
      if (rawClusters) setClusters({ ...SEED_CLUSTERS, ...JSON.parse(rawClusters) });
    } catch {
      // datos corruptos en localStorage: seguimos con el seed
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(IDEAS_KEY, JSON.stringify(ideas));
    localStorage.setItem(CLUSTERS_KEY, JSON.stringify(clusters));
  }, [ideas, clusters, loaded]);

  function resetDemo() {
    if (!confirm("¿Restaurar la demo? Se borran las ideas capturadas.")) return;
    localStorage.removeItem(IDEAS_KEY);
    localStorage.removeItem(CLUSTERS_KEY);
    setIdeas(SEED_IDEAS);
    setClusters(SEED_CLUSTERS);
    setFunnelResult(null);
    setSelectedId(null);
  }

  function updateIdea(id: string, patch: Partial<Idea>) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function captureIdea(text: string, source: IdeaSource) {
    const id = `idea-${Date.now()}`;
    const idea: Idea = {
      id,
      title: text.length > 60 ? text.slice(0, 57) + "…" : text,
      summary: text,
      tags: [],
      clusterId: "inbox",
      createdAt: new Date().toISOString(),
      source,
      status: "enriqueciendo",
    };
    setIdeas((prev) => [...prev, idea]);
    setSelectedId(id);
    setPulse({ id, at: Date.now() });
    setTab("grafo");

    try {
      const existingTags = [...new Set(ideas.flatMap((i) => i.tags))];
      const clusterList = Object.entries(clusters)
        .filter(([cid]) => cid !== "inbox")
        .map(([cid, c]) => ({ id: cid, name: c.name, color: c.color }));

      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, clusters: clusterList, existingTags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enriquecer");

      let clusterId: string = data.clusterId;
      if (clusterId === "nuevo" || !clusters[clusterId]) {
        if (data.newCluster?.name) {
          clusterId = `c-${Date.now()}`;
          setClusters((prev) => ({
            ...prev,
            [clusterId]: { name: data.newCluster.name, color: data.newCluster.color ?? "#34d399" },
          }));
        } else {
          clusterId = "inbox";
        }
      }

      updateIdea(id, {
        title: data.title,
        summary: data.summary,
        tags: data.tags ?? [],
        clusterId,
        embedding: data.embedding ?? undefined,
        viability: data.viability ?? undefined,
        complexity: data.complexity ?? undefined,
        status: "lista",
      });
      // onda expansiva al conectarse al cluster — el momento del demo
      setPulse({ id, at: Date.now() });
    } catch (err) {
      // la idea queda capturada en inbox aunque falle el enriquecimiento
      updateIdea(id, { status: "lista" });
      console.error(err);
    }
  }

  async function researchIdea(idea: Idea) {
    const res = await fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: idea.title, summary: idea.summary, tags: idea.tags }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Error al investigar");
    updateIdea(idea.id, { research: data.report });
  }

  return (
    <div className="grid-bg relative flex h-dvh w-full flex-col overflow-hidden bg-[#04060d] text-slate-100">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-blob bg-blob-cyan" />
        <div className="bg-blob bg-blob-violet" />
      </div>
      <header className="relative z-10 border-b border-slate-800/80 bg-[#04060d]/70 px-5 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="glow-cyan flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-400/10">
              <span className="font-display bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-sm font-bold text-transparent">
                ID
              </span>
            </span>
            <div>
              <h1 className="font-display text-base font-semibold tracking-wide">
                ID: Ideas Descontroladas
              </h1>
              <p className="font-techno hidden text-[10px] text-slate-500 sm:block">
                llegan descontroladas, salen con identidad
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="glass flex gap-1 rounded-full p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`font-techno rounded-full px-4 py-1.5 text-[11px] transition ${
                    tab === t.id
                      ? "glow-cyan bg-cyan-400/90 font-bold text-slate-950"
                      : "text-slate-400 hover:text-cyan-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <button
              onClick={resetDemo}
              title="Restaurar las ideas de demo"
              className="rounded-full border border-slate-800 p-2 text-slate-600 transition hover:border-slate-600 hover:text-slate-300"
              aria-label="Reset demo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                <path d="M3 12a9 9 0 1 0 2.6-6.3" />
                <path d="M3 4v5h5" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4 px-5 py-4 sm:px-8">
        <CaptureBar onCapture={captureIdea} />

        {tab === "grafo" && (
          <div className="anim-fade-up flex min-h-0 flex-1 gap-4">
            <div className="min-h-0 min-w-0 flex-1">
              <IdeaGraph
                ideas={ideas}
                clusters={clusters}
                selectedId={selectedId}
                pulse={pulse}
                onSelect={(idea) => setSelectedId(idea?.id ?? null)}
              />
            </div>
            {selected && (
              <div key={selected.id} className="anim-slide-in hidden w-80 shrink-0 md:block">
                <IdeaPanel
                  idea={selected}
                  clusters={clusters}
                  onClose={() => setSelectedId(null)}
                  onResearch={researchIdea}
                />
              </div>
            )}
            {/* móvil: bottom sheet en vez de panel lateral */}
            {selected && (
              <div className="md:hidden">
                <div
                  className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
                  onClick={() => setSelectedId(null)}
                />
                <div
                  key={selected.id}
                  className="anim-slide-up fixed inset-x-0 bottom-0 z-30 max-h-[72dvh] overflow-hidden rounded-t-3xl"
                >
                  <div className="mx-auto h-full max-h-[72dvh] overflow-y-auto bg-[#0b0e16]/95 px-1 pt-2 backdrop-blur-2xl">
                    <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-slate-700" />
                    <IdeaPanel
                      idea={selected}
                      clusters={clusters}
                      onClose={() => setSelectedId(null)}
                      onResearch={researchIdea}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ideas" && (
          <div className="anim-fade-up min-h-0 flex-1 overflow-y-auto pb-4">
            <IdeaList
              ideas={ideas}
              clusters={clusters}
              onSelect={(idea) => {
                setSelectedId(idea.id);
                setTab("grafo");
              }}
            />
          </div>
        )}

        {tab === "cerebro" && (
          <ChatBrain
            ideas={ideas.filter((i) => i.status !== "enriqueciendo")}
            clusters={clusters}
            messages={chatMessages}
            setMessages={setChatMessages}
            onSelectIdea={(id) => {
              setSelectedId(id);
              setTab("grafo");
            }}
          />
        )}

        {tab === "embudo" && (
          <Funnel
            ideas={ideas.filter((i) => i.status !== "enriqueciendo")}
            clusters={clusters}
            criteria={criteria}
            setCriteria={setCriteria}
            result={funnelResult}
            setResult={setFunnelResult}
            onSelectIdea={(id) => {
              setSelectedId(id);
              setTab("grafo");
            }}
          />
        )}
      </main>
    </div>
  );
}
