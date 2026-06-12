import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

// Investigación profunda con la web search server-side de Anthropic.
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY en .env.local" },
      { status: 500 }
    );
  }

  const { title, summary, tags } = await req.json();
  if (!title) {
    return NextResponse.json({ error: "Falta la idea a investigar" }, { status: 400 });
  }

  const client = new Anthropic();

  const userContent =
    `Investiga a fondo esta idea de negocio:\n\n` +
    `**${title}**\n${summary ?? ""}\n` +
    `Etiquetas: ${(tags ?? []).join(", ")}`;

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];
  let response = await createMessage(client, messages);

  // Las tools server-side pueden devolver pause_turn; se reanuda re-enviando el turno.
  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < 5) {
    messages = [
      { role: "user", content: userContent },
      { role: "assistant", content: response.content },
    ];
    response = await createMessage(client, messages);
    continuations++;
  }

  if (response.stop_reason === "refusal") {
    return NextResponse.json(
      { error: "El modelo declinó investigar esta idea" },
      { status: 502 }
    );
  }

  const report = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return NextResponse.json({ report });
}

function createMessage(client: Anthropic, messages: Anthropic.MessageParam[]) {
  return client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    output_config: { effort: "medium" },
    system:
      "Eres el agente de investigación de 'ID: Ideas Descontroladas'. El usuario es un emprendedor evaluando una idea. " +
      "Usa la búsqueda web para validarla y entrega un informe en markdown, en español, con estas secciones: " +
      "## Mercado (tamaño, tendencia, datos con cifras), ## Competencia (quién lo hace ya y cómo), " +
      "## Riesgos (los 2-3 principales), ## Veredicto (una recomendación honesta y accionable en 2-3 frases). " +
      "Sé concreto y cita las fuentes que uses. Máximo ~400 palabras.",
    messages,
    tools: [{ type: "web_search_20260209", name: "web_search" }],
  });
}
