"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CaptureBar from "@/components/CaptureBar";
import ChatBrain, { ChatMessage } from "@/components/ChatBrain";
import Funnel from "@/components/Funnel";
import IdeaGraph, { NodePulse } from "@/components/IdeaGraph";
import IdeaList from "@/components/IdeaList";
import IdeaPanel from "@/components/IdeaPanel";
import {
  Cluster,
  DEFAULT_CRITERIA,
  FunnelResult,
  Idea,
  IdeaSource,
  SEED_CLUSTERS,
} from "@/lib/types";
import { signOut, useSession } from "@/lib/auth-client";

type Tab = "grafo" | "ideas" | "cerebro" | "embudo";

const TABS: { id: Tab; label: string }[] = [
  { id: "grafo", label: "Poligrama" },
  { id: "ideas", label: "Ideas" },
  { id: "cerebro", label: "Cerebro" },
  { id: "embudo", label: "Embudo" },
];

export default function Home() {
  const { data: session } = useSession();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [clusters, setClusters] = useState<Record<string, Cluster>>(SEED_CLUSTERS);
  const [tab, setTab] = useState<Tab>("grafo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [funnelResult, setFunnelResult] = useState<FunnelResult | null>(null);
  const [pulse, setPulse] = useState<NodePulse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const selected = ideas.find((i) => i.id === selectedId) ?? null;

  // Carga inicial desde la DB
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/ideas")
      .then((r) => r.json())
      .then(({ ideas: dbIdeas, clusters: dbClusters }) => {
        if (dbIdeas?.length) {
          setIdeas(
            dbIdeas.map((i: Record<string, unknown>) => ({
              id: i.id,
              title: i.title,
              summary: i.summary,
              tags: i.tags ?? [],
              clusterId: i.clusterId ?? i.cluster_id ?? "inbox",
              createdAt: i.createdAt ?? i.created_at ?? new Date().toISOString(),
              source: (i.source as IdeaSource) ?? "texto",
              status: (i.status as Idea["status"]) ?? "lista",
              viability: i.viability as number | undefined,
              complexity: i.complexity as Idea["complexity"],
              research: i.research as string | undefined,
            }))
          );
        }
        if (dbClusters?.length) {
          const clusterMap: Record<string, Cluster> = { ...SEED_CLUSTERS };
          for (const c of dbClusters) {
            clusterMap[c.id] = { name: c.name, color: c.color };
          }
          setClusters(clusterMap);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [session?.user]);

  const updateIdea = useCallback((id: string, patch: Partial<Idea>) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(console.error);
  }, []);

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

    // Guarda en DB inmediatamente (sin esperar enriquecimiento)
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idea),
    }).catch(console.error);

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
          const newCluster = { name: data.newCluster.name, color: data.newCluster.color ?? "#34d399" };
          setClusters((prev) => ({ ...prev, [clusterId]: newCluster }));
          // Persistir cluster nuevo
          await fetch("/api/clusters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: clusterId, ...newCluster }),
          }).catch(console.error);
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
      setPulse({ id, at: Date.now() });
    } catch (err) {
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
      <header className="relative z-10 bg-[#04060d]/80 backdrop-blur-xl">
        {/* ── Top bar ── */}
        <div className="border-b border-slate-800/60 px-5 py-3 sm:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/8">
                <span className="font-display bg-gradient-to-br from-cyan-300 to-violet-400 bg-clip-text text-xs font-black text-transparent">
                  ID
                </span>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,242,255,0.8)]">
                  <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400 opacity-60" />
                </span>
              </div>
              <div>
                <h1 className="font-display text-sm font-bold tracking-[.06em] text-slate-100">
                  IDEAS DESCONTROLADAS
                </h1>
                <p className="font-techno hidden text-[9px] tracking-[.12em] text-slate-600 sm:block">
                  LLEGAN SIN CONTROL · SALEN CON IDENTIDAD
                </p>
              </div>
            </div>

            {/* User */}
            {session?.user && (
              <button
                onClick={() => signOut()}
                title={`Salir (${session.user.email})`}
                className="font-techno flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.6)]" />
                {session.user.name?.split(" ")[0] ?? "yo"}
              </button>
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="border-b border-slate-800/60 px-5 sm:px-8">
          <div className="mx-auto flex max-w-6xl">
            {TABS.map((t) => {
              const count =
                t.id === "grafo" || t.id === "ideas" ? ideas.length
                : t.id === "cerebro" ? chatMessages.length
                : null;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`font-techno relative flex items-center gap-1.5 border-b-2 px-4 py-3 text-[11px] uppercase tracking-[.1em] transition-colors ${
                    isActive
                      ? "border-cyan-400 text-cyan-300"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {t.label}
                  {count !== null && count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-px text-[9px] font-bold transition-colors ${
                        isActive
                          ? "bg-cyan-400/20 text-cyan-300"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4 px-5 py-4 sm:px-8">
        {!loaded ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="font-techno animate-pulse text-sm text-slate-500">Cargando ideas…</span>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
