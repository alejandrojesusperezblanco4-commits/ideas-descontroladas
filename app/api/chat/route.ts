import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { cosine } from "@/lib/graph";
import { getEmbedding } from "@/lib/server/embeddings";

export const maxDuration = 60;

// RAG sobre el cerebro de ideas del usuario:
// 1. RETRIEVAL — embedding de la pregunta + similitud coseno contra las ideas
//    (con fallback léxico para ideas sin embedding, como las seed)
// 2. AUGMENT — las top-k ideas se inyectan como contexto
// 3. GENERATE — Claude responde citando solo las ideas recuperadas

type ChatIdea = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  viability?: number;
  complexity?: string;
  research?: string;
  embedding?: number[];
};

type HistoryMessage = { role: "user" | "assistant"; content: string };

const TOP_K = 6;

const AnswerSchema = z.object({
  answer: z
    .string()
    .describe("Respuesta en español, markdown ligero, mencionando las ideas por su título"),
  citedIds: z
    .array(z.string())
    .describe("Los ids exactos de las ideas del contexto que usaste para responder"),
});

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, '');
}

function lexicalScore(question: string, idea: ChatIdea): number {
  const qTokens = normalize(question)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length > 3);
  if (qTokens.length === 0) return 0;
  const haystack = normalize(
    `${idea.title} ${idea.summary} ${idea.tags.join(" ")} ${idea.research ?? ""}`
  );
  const hits = qTokens.filter((t) => haystack.includes(t)).length;
  return hits / qTokens.length;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY en .env.local" },
      { status: 500 }
    );
  }

  const { question, ideas, history } = (await req.json()) as {
    question: string;
    ideas: ChatIdea[];
    history?: HistoryMessage[];
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
  }
  if (!Array.isArray(ideas) || ideas.length === 0) {
    return NextResponse.json({ error: "No hay ideas en el cerebro todavía" }, { status: 400 });
  }

  // ---- 1. RETRIEVAL ----
  const qEmbedding = await getEmbedding(question);
  const scored = ideas
    .map((idea) => {
      const semantic =
        qEmbedding && idea.embedding ? cosine(qEmbedding, idea.embedding) : 0;
      // el coseno (cuando existe) domina; lo léxico cubre ideas sin embedding
      return { idea, score: semantic * 1.0 + lexicalScore(question, idea) * 0.6 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const context = scored
    .map(({ idea, score }) => {
      const research = idea.research ? `\n  investigación: ${idea.research.slice(0, 600)}` : "";
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

  // ---- 2 + 3. AUGMENT + GENERATE ----
  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).slice(-6).map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user" as const,
      content:
        `Ideas recuperadas de mi cerebro (contexto):\n\n${context}\n\n` +
        `Mi pregunta: ${question}`,
    },
  ];

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    output_config: {
      effort: "low",
      format: zodOutputFormat(AnswerSchema),
    },
    system:
      "Eres el Cerebro de 'ID: Ideas Descontroladas': el segundo cerebro consultable de un emprendedor. " +
      "Respondes preguntas sobre SUS ideas usando únicamente el contexto recuperado — si el contexto no alcanza " +
      "para responder, dilo honestamente en vez de inventar. Menciona las ideas por su título en negrita, " +
      "señala convergencias entre ellas cuando existan, y sé directo y útil, no genérico. " +
      "En citedIds incluye solo los ids de las ideas que realmente usaste.",
    messages,
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    return NextResponse.json({ error: "El modelo no devolvió respuesta válida" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
