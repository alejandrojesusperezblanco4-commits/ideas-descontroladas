import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Cerebro impulsado por Azure AI Foundry (Foundry IQ — Microsoft IQ layer)
// Retrieval léxico local → generación con gpt-4.1-mini en Azure AI Foundry

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

export async function POST(req: NextRequest) {
  const endpoint = process.env.AZURE_AI_PROJECT_ENDPOINT;
  const apiKey = process.env.AZURE_AI_API_KEY;
  const deployment = process.env.AZURE_AI_DEPLOYMENT ?? "gpt-4.1-mini";

  if (!endpoint || !apiKey) {
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

  // ---- RETRIEVAL (léxico) ----
  const scored = ideas
    .map((idea) => ({ idea, score: lexicalScore(question, idea) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const context = scored
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

  const systemPrompt =
    `Eres el Cerebro de "ID: Ideas Descontroladas", impulsado por Azure AI Foundry (Microsoft Foundry IQ). ` +
    `Eres el segundo cerebro consultable de un emprendedor. ` +
    `Respondes preguntas sobre SUS ideas usando únicamente el contexto recuperado — si el contexto no alcanza para responder, dilo honestamente. ` +
    `Menciona las ideas por su título en negrita, señala convergencias entre ellas cuando existan, y sé directo y útil. ` +
    `Al final de tu respuesta añade una línea exactamente así: CITED_IDS: id1,id2\n\n` +
    `IDEAS RECUPERADAS:\n${context}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: question },
  ];

  // ---- GENERATE vía Azure AI Foundry ----
  const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=2024-12-01-preview`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({ messages, max_tokens: 1024, temperature: 0.7 }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: `Azure AI Foundry error (${res.status}): ${detail.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  const citedMatch = text.match(/CITED_IDS:\s*([^\n]+)/);
  const citedIds = citedMatch
    ? citedMatch[1].split(",").map((id: string) => id.trim()).filter(Boolean)
    : [];
  const answer = text.replace(/\nCITED_IDS:.*$/m, "").trim();

  return NextResponse.json({ answer, citedIds, provider: "azure-foundry" });
}
