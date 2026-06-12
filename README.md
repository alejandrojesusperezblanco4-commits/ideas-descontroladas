# ID: Ideas Descontroladas

> **Speak your chaotic ideas. Watch them become a living graph. Ask questions about your own thinking.**

**Hackathon: Agents League — Innovation Studio · 14 jun 2026**

---

## El problema

Tienes 47 notas en el móvil, 12 en Notion, 8 en papel. Ninguna conectada entre sí. Cada idea vive en un silo, muere sola, y nunca sabes que tu idea de enero ya resolvía el problema de hoy.

**ID** es el único sistema donde hablas una idea y se convierte en un nodo vivo dentro de un grafo semántico que puedes interrogar.

---

## Qué nos hace diferentes

La mayoría de apps de "second brain" organizan tus notas en listas o resúmenes. **Nosotros las conectamos.**

| Otras apps | ID: Ideas Descontroladas |
|---|---|
| Voz → texto plano | Voz → nodo en el grafo semántico |
| Organiza y resume | Conecta y revela convergencias |
| Buscas notas viejas | Le preguntas a tu propio historial de ideas |
| El grafo es decoración | El grafo es el producto |

El grafo relacional entre ideas — con clusters, conexiones semánticas y evolución temporal — es el núcleo del producto, no un feature adicional.

---

## Demo (3 min)

```
00:00 — El problema: ideas caóticas y desconectadas
00:30 — Hablas una idea (voz) → nodo aparece en el grafo
01:00 — El grafo se actualiza: conexiones con ideas existentes
01:30 — Cerebro: "¿cuál de mis ideas del mes pasado conecta con esto?"
02:00 — Azure AI Foundry responde citando ideas específicas del grafo
02:15 — Microsoft Learn enrichment: recursos técnicos relacionados
02:30 — Embudo: filtra el grafo por viabilidad y complejidad
```

---

## Pantallas

- **Poligrama** — grafo interactivo de convergencias entre ideas (D3.js, nodos coloreados por cluster)
- **Ideas** — captura rápida con tags, viabilidad, complejidad y estado
- **Cerebro** — chat con Azure AI Foundry que razona sobre TU grafo personal; voz integrada (Groq Whisper)
- **Embudo** — pipeline de validación: filtra qué ideas merecen tiempo y recursos

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    ID: Ideas Descontroladas                  │
│                    Next.js 16 · Vercel                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
   ┌────▼────┐   ┌─────▼──────┐   ┌──────▼─────┐
   │ Poligrama│   │  Cerebro   │   │   Embudo   │
   │  (grafo) │   │  (chat IA) │   │(validación)│
   └──────────┘   └─────┬──────┘   └────────────┘
                        │
          ┌─────────────┼──────────────────┐
          │             │                  │
   ┌──────▼──────┐  ┌───▼────────────┐  ┌─▼──────────────┐
   │  Groq Whisper│  │ Azure AI Foundry│  │  Microsoft     │
   │   (voz→texto)│  │ gpt-4.1-mini   │  │  Learn API     │
   └─────────────┘  └───────┬────────┘  └────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Neon Postgres │
                    │  ideas · users │
                    └───────────────┘
```

### Microsoft IQ Layer — Azure AI Foundry

En cada consulta del Cerebro, el agente ejecuta tres pasos:

1. **Retrieval** — recupera las top-6 ideas más relevantes del grafo personal del usuario (scoring léxico + semántico)
2. **Augment** — busca recursos técnicos relacionados en `learn.microsoft.com/api/search` (Microsoft Learn MCP)
3. **Generate** — Azure AI Foundry (`gpt-4.1-mini`, eastus) sintetiza la respuesta citando nodos del grafo y recursos de Microsoft Learn

Si Azure no responde, el sistema cae automáticamente a Claude Haiku sin interrupción.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16, Tailwind CSS, D3.js |
| Auth | Better Auth v1.6 + Drizzle ORM |
| Base de datos | Neon Postgres (serverless, per-user) |
| Cerebro — principal | **Azure AI Foundry** — `gpt-4.1-mini` (eastus) |
| Cerebro — fallback | Claude Haiku (Anthropic) |
| Voz (STT) | Groq Whisper |
| Enrichment | Microsoft Learn Search API |
| Deploy | Vercel |

---

## Setup local

```bash
git clone <repo>
cd ideas-descontroladas
npm install
cp .env.example .env.local   # rellena las claves
npx drizzle-kit push          # migra la DB
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno

| Variable | Descripción |
|---|---|
| `AZURE_AI_PROJECT_ENDPOINT` | Endpoint Azure AIServices |
| `AZURE_AI_API_KEY` | API key Azure AI Foundry |
| `AZURE_AI_DEPLOYMENT` | Nombre del deployment (`gpt-4.1-mini`) |
| `ANTHROPIC_API_KEY` | Fallback — Claude Haiku |
| `GROQ_API_KEY` | Transcripción de voz (Whisper) |
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Secreto Better Auth (≥ 32 chars) |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

---

## Agents League — Requisitos cumplidos

- ✅ **Microsoft IQ Layer**: Azure AI Foundry (`gpt-4.1-mini`, eastus) como motor principal del Cerebro
- ✅ **Voz**: Groq Whisper STT — input de voz directo al grafo de ideas
- ✅ **Agente con herramientas**: Microsoft Learn Search API como enrichment automático en cada consulta
- ✅ **Per-user DB**: cada usuario tiene su propio grafo de ideas aislado en Neon Postgres
- ✅ **Deploy**: [ideas-descontroladas.vercel.app](https://ideas-descontroladas.vercel.app)
