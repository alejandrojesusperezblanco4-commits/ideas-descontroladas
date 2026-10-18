import { NextRequest, NextResponse } from "next/server";
import { guard, LIMITES } from "@/lib/server/guard";

export const maxDuration = 60;

// Anthropic no ofrece transcripción; usamos Whisper de OpenAI.
export async function POST(req: NextRequest) {
  const g = await guard("transcribe", LIMITES.transcribe);
  if (g instanceof NextResponse) return g;
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Falta GROQ_API_KEY en .env.local (necesaria para Whisper)" },
      { status: 500 }
    );
  }

  const incoming = await req.formData();
  const audio = incoming.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Falta el archivo de audio" }, { status: 400 });
  }
  if (audio.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El audio es demasiado grande (máximo 10 MB)" }, { status: 400 });
  }

  const form = new FormData();
  form.append("file", audio, "idea.webm");
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "es");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: `Whisper falló (${res.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  return NextResponse.json({ text: data.text ?? "" });
}
