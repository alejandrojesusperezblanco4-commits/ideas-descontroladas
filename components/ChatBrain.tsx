"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Cluster, Idea } from "@/lib/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citedIds?: string[];
};

type Props = {
  ideas: Idea[];
  clusters: Record<string, Cluster>;
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  onSelectIdea: (id: string) => void;
};

const SUGGESTIONS = [
  "¿En qué convergen mis ideas?",
  "¿Cuál de mis ideas es más viable?",
  "¿Qué ideas tengo sobre WhatsApp?",
];

export default function ChatBrain({ ideas, clusters, messages, setMessages, onSelectIdea }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ideaById = new Map(ideas.map((i) => [i.id, i]));

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      // Intenta Foundry IQ (Azure AI Foundry) primero, fallback a /api/chat
      let res = await fetch("/api/foundry-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history: messages.map(({ role, content }) => ({ role, content })),
          ideas: ideas.map((i) => ({
            id: i.id,
            title: i.title,
            summary: i.summary,
            tags: i.tags,
            viability: i.viability,
            complexity: i.complexity,
            research: i.research,
            embedding: i.embedding,
          })),
        }),
      });
      if (!res.ok) {
        // Fallback a Claude Haiku si Foundry no está disponible
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            history: messages.map(({ role, content }) => ({ role, content })),
            ideas: ideas.map((i) => ({
              id: i.id, title: i.title, summary: i.summary,
              tags: i.tags, viability: i.viability,
              complexity: i.complexity, research: i.research,
            })),
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al consultar el cerebro");
      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.answer, citedIds: data.citedIds ?? [] },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar el cerebro");
      setMessages(nextMessages);
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  return (
    <div className="anim-fade-up flex min-h-0 flex-1 flex-col gap-3">
      <div className="glass flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl p-5">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <span className="glow-cyan flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-2xl">
              🧠
            </span>
            <p className="max-w-sm text-center text-sm text-slate-400">
              Pregúntale a tu cerebro. Busca entre tus {ideas.length} ideas por significado
              y responde citándolas.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="font-techno rounded-full border border-slate-700 px-3 py-1.5 text-[10px] text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`anim-fade-up max-w-[85%] ${m.role === "user" ? "self-end" : "self-start"}`}
          >
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-cyan-400/15 text-cyan-50"
                  : "glass rounded-bl-md text-slate-200"
              }`}
            >
              <div className="[&_li]:ml-4 [&_li]:list-disc [&_p]:mt-1.5 [&_p:first-child]:mt-0 [&_strong]:text-cyan-200">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
            {m.citedIds && m.citedIds.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.citedIds
                  .filter((id) => ideaById.has(id))
                  .map((id) => {
                    const idea = ideaById.get(id)!;
                    const cluster = clusters[idea.clusterId] ?? clusters.inbox;
                    return (
                      <button
                        key={id}
                        onClick={() => onSelectIdea(id)}
                        title="Ver en el poligrama"
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition hover:brightness-125"
                        style={{
                          backgroundColor: cluster.color + "14",
                          borderColor: cluster.color + "44",
                          color: cluster.color,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: cluster.color }}
                        />
                        {idea.title.length > 32 ? idea.title.slice(0, 30) + "…" : idea.title}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="glass self-start rounded-2xl rounded-bl-md px-4 py-2.5">
            <span className="font-techno animate-pulse text-[10px] text-cyan-300">
              consultando tu cerebro…
            </span>
          </div>
        )}
        {error && <p className="self-start text-xs text-red-400">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntale a tu cerebro…"
          disabled={loading}
          className="glass h-11 min-w-0 flex-1 rounded-full px-5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="font-display h-11 shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 text-sm font-semibold text-slate-950 transition hover:shadow-[0_0_18px_rgba(0,242,255,0.35)] disabled:opacity-40"
        >
          Preguntar
        </button>
      </form>
    </div>
  );
}
