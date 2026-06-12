import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Cerebro impulsado por Azure AI Foundry (Foundry IQ — Microsoft IQ layer)
// Retrieval léxico local + búsqueda Microsoft Learn → generación con gpt-4.1-mini

type ChatIdea = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  viability?: number;
  complexity?: string;
  research?: string;
};

type HistoryMessage = { role: "user" | "assistant"; content: string };

const TOP_K = 6;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function lexicalScore(question: string, idea: ChatIdea): number {
  const qTokens = normalize(question).split(/[^a-z0-9ñ]+/).filter((t) => t.length > 3);
  if (qTokens.length === 0) return 0;
  const haystack = normalize(
    `${idea.title} ${idea.summary} ${idea.tags.join(" ")} ${idea.research ?? ""}`
  );
  const hits = qTokens.filter((t) => haystack.includes(t)).length;
  return hits / qTokens.length;
}

async function searchMicrosoftLearn(query: string): Promise<string> {
  try {
    const url = `https://learn.microsoft.com/api/search?search=${encodeURIComponent(query)}&locale=es-es&%24top=3`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      results?: { title: string; url: string; description?: string }[];
    };
    const items = (data.results ?? []).slice(0, 3);
    if (items.length === 0) return "";
    return items
      .map(
        (r) =>
          `• **${r.title}**${r.description ? ` — ${r.description.slice(0, 100)}` : ""}\n  ${r.url}`
      )
      .join("\n");
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.AZURE_AI_API_KEY;
  const endpoint = (process.env.AZURE_AI_PROJECT_ENDPOINT ?? "").replace(/\/$/, "");
  const deployment = process.env.AZURE_AI_DEPLOYMENT ?? "gpt-4.1-mini";

  if (!apiKey || !endpoint) {
    return NextResponse.json(
      { error: "Faltan credenciales Azure AI Foundry en .env.local" },
      { status: 500 }
    );
  }

  const { question, ideas, history } = (await req.json()) as {
    question: string;
    ideas: ChatIdea[];
    history?: HistoryMessage[];
  };

  if (!question?.trim())
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
  if (!Array.isArray(ideas) || ideas.length === 0)
    return NextResponse.json({ error: "No hay ideas en el cerebro todavía" }, { status: 400 });

  // ── 1. RETRIEVAL — top-K ideas por scoring léxico ─────────────────────────
  const scored = ideas
    .map((idea) => ({ idea, score: lexicalScore(question, idea) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const ideasContext = scored
    .map(({ idea, score }) => {
      const research = idea.research ? `\n  investigación: ${idea.research.slice(0, 400)}` : "";
      return (
        `- id: ${idea.id} (relevancia ${score.toFixed(2)})\n` +
        `  título: ${idea.title}\n  resumen: ${idea.summary}\n` +
        `  etiquetas: ${idea.tags.join(", ")}` +
        (idea.viability !== undefined ? `\n  viabilidad: ${idea.viability}%` : "") +
        (idea.complexity ? ` | complejidad: ${idea.complexity}` : "") +
        research
      );
    })
    .join("\n\n");

  // ── 2. AUGMENT — enriquecer con Microsoft Learn ───────────────────────────
  const msLearnResults = await searchMicrosoftLearn(question);

  const msLearnSection = msLearnResults
    ? `\n\n---\nRecursos de Microsoft Learn relacionados:\n${msLearnResults}`
    : "";

  // ── 3. GENERATE — Azure AI Foundry (gpt-4.1-mini) ────────────────────────
  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    deployment,
    apiVersion: "2024-12-01-preview",
  });

  const systemPrompt =
    "Eres el Cerebro de «ID: Ideas Descontroladas», impulsado por Azure AI Foundry. " +
    "Eres el segundo cerebro consultable de un emprendedor. " +
    "Respondes preguntas sobre SUS ideas usando el contexto recuperado. " +
    "Si el contexto no alcanza para responder, dilo honestamente. " +
    "Menciona las ideas por su título en negrita, señala convergencias cuando existan, y sé directo y útil. " +
    "En citedIds incluye SOLO los ids de las ideas que realmente usaste.\n\n" +
    "Responde ÚNICAMENTE con JSON válido en este formato exacto:\n" +
    '{"answer": "<respuesta en markdown>", "citedIds": ["<id1>", "<id2>"]}';

  const userContent =
    `Ideas recuperadas de mi cerebro:\n\n${ideasContext}` +
    msLearnSection +
    `\n\n---\nMi pregunta: ${question}`;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...((history ?? []).slice(-6) as { role: "user" | "assistant"; content: string }[]),
    { role: "user", content: userContent },
  ];

  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      messages,
      response_format: { type: "json_object" },
      max_tokens: 1200,
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    let parsed: { answer?: string; citedIds?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "El modelo no devolvió JSON válido" }, { status: 502 });
    }

    if (!parsed.answer) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });
    }

    return NextResponse.json({
      answer: parsed.answer,
      citedIds: parsed.citedIds ?? [],
      provider: "azure-foundry",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[foundry-chat]", msg);
    return NextResponse.json({ error: `Azure AI Foundry error: ${msg}` }, { status: 502 });
  }
}
