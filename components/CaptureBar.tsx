"use client";

import { FormEvent, useRef, useState } from "react";
import { IdeaSource } from "@/lib/types";

type Props = {
  onCapture: (text: string, source: IdeaSource) => void;
};

type MicState = "idle" | "grabando" | "transcribiendo";

export default function CaptureBar({ onCapture }: Props) {
  const [text, setText] = useState("");
  const [mic, setMic] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onCapture(trimmed, "texto");
    setText("");
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
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
            onCapture(data.text.trim(), "voz");
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

  function stopRecording() {
    recorderRef.current?.stop();
  }

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={mic === "grabando" ? stopRecording : startRecording}
          disabled={mic === "transcribiendo"}
          title={mic === "grabando" ? "Parar y transcribir" : "Grabar idea por voz"}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
            mic === "grabando"
              ? "animate-pulse border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              : mic === "transcribiendo"
                ? "border-slate-700 bg-slate-900 text-slate-500"
                : "glow-cyan border-cyan-400/50 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
          }`}
        >
          {mic === "transcribiendo" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : mic === "grabando" ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
            </svg>
          )}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            mic === "grabando"
              ? "Grabando… pulsa el botón para parar"
              : mic === "transcribiendo"
                ? "Transcribiendo…"
                : "Suelta una idea descontrolada…"
          }
          disabled={mic !== "idle"}
          className="glass h-11 min-w-0 flex-1 rounded-full px-5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-cyan-400/60 focus:shadow-[0_0_15px_rgba(0,242,255,0.15)] disabled:opacity-60"
        />
        <button
          type="submit"
          className="font-display h-11 shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-5 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-violet-400 hover:shadow-[0_0_18px_rgba(0,242,255,0.35)] disabled:opacity-40"
          disabled={!text.trim() || mic !== "idle"}
        >
          Capturar ⚡
        </button>
      </form>
      {error && <p className="mt-1.5 px-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
