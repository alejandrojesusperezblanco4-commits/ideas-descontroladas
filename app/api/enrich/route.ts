import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getEmbedding } from "@/lib/server/embeddings";

export const maxDuration = 60;

const EnrichmentSchema = z.object({
  title: z.string().describe("Título corto y vendedor de la idea, máx 8 palabras"),
  summary: z.string().describe("Resumen de 1-2 frases: el problema y la oportunidad"),
  tags: z
    .array(z.string())
    .describe("3-5 etiquetas en minúsculas. REUSA etiquetas existentes cuando apliquen"),
  clusterId: z
    .string()
    .describe("ID de un cluster existente, o la cadena 'nuevo' si ninguno encaja"),
  newCluster: z
    .object({
      name: z.string().describe("Nombre corto y memorable para el nuevo cluster"),
      color: z.string().describe("Color hex vibrante que no choque con los existentes"),
    })
    .nullable()
    .describe("Solo si clusterId es 'nuevo'; si no, null"),
  viability: z
    .number()
    .describe(
      "Viabilidad 0-100 para un emprendedor solo con IA y poco capital. Sé discriminante: usa todo el rango"
    ),
  complexity: z
    .enum(["baja", "media", "alta"])
    .describe("Complejidad de construir un MVP funcional"),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY en .env.local" },
      { status: 500 }
    );
  }

  const { text, clusters, existingTags } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Falta el texto de la idea" }, { status: 400 });
  }

  const client = new Anthropic();

  const clusterList = (clusters ?? [])
    .map((c: { id: string; name: string; color: string }) => `- ${c.id}: "${c.name}" (${c.color})`)
    .join("\n");
  const tagList = (existingTags ?? []).join(", ");

  const [response, embedding] = await Promise.all([
    client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      output_config: {
        effort: "low",
        format: zodOutputFormat(EnrichmentSchema),
      },
      system:
        "Eres el motor de enriquecimiento de 'ID: Ideas Descontroladas', una app para emprendedores que capturan ideas al vuelo. " +
        "Recibes una idea en bruto (transcrita de voz o escrita) y la conviertes en una ficha estructurada en español. " +
        "Las etiquetas son críticas: el grafo de convergencias conecta ideas por etiquetas compartidas, así que reutiliza " +
        "las etiquetas existentes siempre que tengan sentido, y crea nuevas solo cuando haga falta. " +
        "Asigna la idea al cluster temático existente que mejor encaje; crea uno nuevo solo si realmente no pertenece a ninguno.",
      messages: [
        {
          role: "user",
          content:
            `Idea en bruto: "${text}"\n\n` +
            `Clusters existentes:\n${clusterList || "(ninguno)"}\n\n` +
            `Etiquetas existentes: ${tagList || "(ninguna)"}`,
        },
      ],
    }),
    getEmbedding(text),
  ]);

  const parsed = response.parsed_output;
  if (!parsed) {
    return NextResponse.json({ error: "El modelo no devolvió una ficha válida" }, { status: 502 });
  }

  return NextResponse.json({ ...parsed, embedding });
}
