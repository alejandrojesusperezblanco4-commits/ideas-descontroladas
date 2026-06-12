import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

export const maxDuration = 120;

const FunnelSchema = z.object({
  rankings: z.array(
    z.object({
      ideaId: z.string().describe("El id exacto de la idea evaluada"),
      scores: z.array(
        z.object({
          criterion: z.string().describe("El criterio evaluado, tal como lo dio el usuario"),
          score: z.number().describe("Puntuación entera de 1 a 10"),
          reason: z.string().describe("Justificación en una frase, concreta y honesta"),
        })
      ),
    })
  ),
  recommendation: z.object({
    ideaId: z.string().describe("El id de la idea que debería ejecutar primero"),
    why: z.string().describe("Por qué esta primero, en 2-3 frases directas"),
  }),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY en .env.local" },
      { status: 500 }
    );
  }

  const { ideas, criteria } = await req.json();
  if (!Array.isArray(ideas) || ideas.length === 0) {
    return NextResponse.json({ error: "No hay ideas que evaluar" }, { status: 400 });
  }
  if (!Array.isArray(criteria) || criteria.length === 0) {
    return NextResponse.json({ error: "Define al menos un criterio" }, { status: 400 });
  }

  const client = new Anthropic();

  const ideaList = ideas
    .map(
      (i: { id: string; title: string; summary: string; tags: string[] }) =>
        `- id: ${i.id}\n  título: ${i.title}\n  resumen: ${i.summary}\n  etiquetas: ${(i.tags ?? []).join(", ")}`
    )
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(FunnelSchema),
    },
    system:
      "Eres el embudo de priorización de 'ID: Ideas Descontroladas'. El usuario es un emprendedor solo o con un equipo " +
      "pequeño y recursos limitados (bootstrap, sin inversión). Evalúa cada idea con los criterios que él define, " +
      "puntuando de 1 a 10 por criterio con justificación de una frase. Sé honesto y discriminante: usa todo el rango " +
      "de puntuaciones, no des a todo un 7. Cierra recomendando cuál ejecutar primero y por qué — considerando también " +
      "si varias ideas convergen y se refuerzan entre sí.",
    messages: [
      {
        role: "user",
        content:
          `Mis criterios (puntúa cada idea de 1 a 10 en cada uno):\n${criteria
            .map((c: string) => `- ${c}`)
            .join("\n")}\n\nMis ideas:\n${ideaList}`,
      },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    return NextResponse.json({ error: "El modelo no devolvió un ranking válido" }, { status: 502 });
  }

  return NextResponse.json(parsed);
}
