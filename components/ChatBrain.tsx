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

type MicState = "idle" | "grabando" | "transcribiendo";

export default function ChatBrain({ ideas, clusters, messages, setMessages, onSelectIdea }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mic, setMic] = useState<MicState>("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      let res = await fetch("/api/foundry-chat", {
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
      if (!res.ok) {
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  }

  // ── Voz ────────────────────────────────────────────────────────────────────
  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setMic("transcribiendo");
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const form = new FormData();
          form.append("audio", blob);
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Error al transcribir");
          if (data.text?.trim()) {
            ask(data.text.trim());
          } else {
            setError("No se entendió el audio, prueba otra vez");
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al transcribir");
        } finally {
          setMic("idle");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setMic("grabando");
    } catch {
      setError("No se pudo acceder al micrófono");
    }
  }

  function stopRecording() { recorderRef.current?.stop(); }

  return (
    <div className="anim-fade-up flex min-h-0 flex-1 flex-col">
      {/* ── Área de mensajes ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-6">

          {/* Estado vacío */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-5 pt-12 text-center">
              <span className="glow-cyan flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-3xl">
                🧠
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold text-slate-100">
                  Pregúntale a tu cerebro
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Busca entre tus {ideas.length} ideas por significado y responde citándolas.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="font-techno rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-400 transition hover:border-cyan-400/50 hover:bg-cyan-400/5 hover:text-cyan-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensajes */}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {/* Avatar IA */}
              {m.role === "assistant" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xs">
                  🧠
                </div>
              )}

              <div className={`flex flex-col gap-2 ${m.role === "user" ? "items-end max-w-[80%]" : "items-start w-full"}`}>
                {/* Burbuja / Card */}
                {m.role === "user" ? (
                  <div className="rounded-2xl rounded-tr-sm bg-cyan-400/15 px-4 py-3 text-sm leading-relaxed text-cyan-50 ring-1 ring-cyan-400/20">
                    {m.content}
                  </div>
                ) : (
                  <div className="glass w-full rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed text-slate-200">
                    <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-cyan-200 [&_li]:text-slate-300 [&_p:first-child]:mt-0 [&_p]:mt-2">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Chips de ideas citadas */}
                {m.role === "assistant" && m.citedIds && m.citedIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-1">
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
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cluster.color }} />
                            {idea.title.length > 32 ? idea.title.slice(0, 30) + "…" : idea.title}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Avatar usuario */}
              {m.role === "user" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs text-slate-300">
                  tú
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-xs">
                🧠
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-5 py-4">
                <span className="font-techno flex items-center gap-1.5 text-[11px] text-cyan-400">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-400 [animation-delay:300ms]" />
                  </span>
                  consultando tu cerebro…
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="mx-auto text-center text-xs text-red-400">{error}</p>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar fijo ── */}
      <div className="border-t border-slate-800/60 bg-[#04060d]/80 px-4 py-4 backdrop-blur-xl">
        <form onSubmit={submit} className="mx-auto flex max-w-[760px] items-end gap-2">
          {/* Botón mic */}
          <button
            type="button"
            onClick={mic === "grabando" ? stopRecording : startRecording}
            disabled={mic === "transcribiendo" || loading}
            title={mic === "grabando" ? "Parar y enviar" : "Hablar con el cerebro"}
            className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
              mic === "grabando"
                ? "animate-pulse border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                : mic === "transcribiendo"
                  ? "border-slate-700 bg-slate-900 text-slate-500"
                  : "border-slate-700 text-slate-500 hover:border-cyan-400/40 hover:text-cyan-400"
            }`}
          >
            {mic === "transcribiendo" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : mic === "grabando" ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            )}
          </button>

          {/* Textarea autoexpandible */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              mic === "grabando" ? "Grabando… pulsa el botón para parar" :
              mic === "transcribiendo" ? "Transcribiendo…" :
              "Pregúntale a tu cerebro… (Enter para enviar)"
            }
            disabled={loading || mic !== "idle"}
            rows={1}
            className="glass min-h-[42px] flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/40 disabled:opacity-60"
            style={{ height: "42px" }}
          />

          {/* Botón enviar */}
          <button
            type="submit"
            disabled={!input.trim() || loading || mic !== "idle"}
            className="font-display mb-0.5 h-10 shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 text-sm font-semibold text-slate-950 transition hover:shadow-[0_0_16px_rgba(0,242,255,0.3)] disabled:opacity-40"
          >
            Enviar
          </button>
        </form>
        <p className="mx-auto mt-1.5 max-w-[760px] px-1 text-[10px] text-slate-600">
          Shift+Enter para nueva línea · impulsado por Azure AI Foundry
        </p>
      </div>
    </div>
  );
}
