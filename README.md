# ID: Ideas Descontroladas

**Hackathon: Agents League — Innovation Studio · Deadline 14 jun 2026**

Un sistema de inteligencia colectiva para capturar, conectar y explorar ideas usando IA. Habla con tu segundo cerebro por voz o texto, y deja que encuentre convergencias entre tus ideas que tú no veías.

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
   │  (grafo) │   │  (chat IA) │   │(convergenc)│
   └──────────┘   └─────┬──────┘   └────────────┘
                        │
          ┌─────────────┼──────────────────┐
          │             │                  │
   ┌──────▼──────┐  ┌───▼────────────┐  ┌─▼──────────────┐
   │  /api/voice  │  │ Azure AI Foundry│  │  Microsoft     │
   │  Groq Whisper│  │ gpt-4.1-mini   │  │  Learn API     │
   │  (STT)      │  │ (Foundry IQ ✓) │  │  (enrichment)  │
   └─────────────┘  └───────┬────────┘  └────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Neon Postgres │
                    │  (ideas/users) │
                    └───────────────┘
```

### Microsoft IQ Layer — Azure AI Foundry

El Cerebro usa **Azure AI Foundry** (recurso `ideas-hackathon-ai`, modelo `gpt-4.1-mini`) como capa de generación principal. En cada consulta:

1. **Retrieval léxico** — recupera las top-6 ideas más relevantes del corpus personal del usuario
2. **Augment con Microsoft Learn** — busca recursos de documentación técnica relacionados con la pregunta en `learn.microsoft.com/api/search`
3. **Generate** — Azure AI Foundry sintetiza la respuesta citando las ideas originales y los recursos de Microsoft Learn

Si Azure no está disponible, el sistema cae automáticamente a Claude Haiku (Anthropic) sin interrupción para el usuario.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16, Tailwind CSS, React |
| Auth | Better Auth v1.6 + Drizzle ORM |
| Base de datos | Neon Postgres (serverless) |
| Cerebro (principal) | **Azure AI Foundry** — `gpt-4.1-mini` |
| Cerebro (fallback) | Claude Haiku (Anthropic) |
| Voz (STT) | Groq Whisper |
| Enrichment | Microsoft Learn Search API |
| Deploy | Vercel |

---

## Setup local

```bash
git clone <repo>
cd ideas-descontroladas
npm install

# Copia las credenciales
cp .env.example .env.local
# Edita .env.local con tus claves (ver sección de variables)

# Migrar la base de datos
npx drizzle-kit push

# Iniciar
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `AZURE_AI_PROJECT_ENDPOINT` | Endpoint de tu recurso Azure AIServices |
| `AZURE_AI_API_KEY` | API key de Azure AI Foundry |
| `AZURE_AI_DEPLOYMENT` | Nombre del deployment (ej: `gpt-4.1-mini`) |
| `ANTHROPIC_API_KEY` | Fallback — Claude Haiku |
| `GROQ_API_KEY` | Para transcripción de voz (Whisper) |
| `DATABASE_URL` | Conexión a Neon Postgres |
| `BETTER_AUTH_SECRET` | Secreto para Better Auth (≥32 chars) |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

---

## Pantallas

- **Poligrama** — grafo de convergencias entre ideas (D3.js)
- **Ideas** — lista/kanban de todas tus ideas con metadatos
- **Cerebro** — chat con tu segundo cerebro, voz integrada
- **Embudo** — pipeline de validación por viabilidad y complejidad

---

## Demo

1. Crea una cuenta en `/register`
2. Añade 3-5 ideas en la pantalla Ideas
3. Ve al Cerebro y pregunta: *"¿En qué convergen mis ideas?"*
4. El sistema recupera las ideas relevantes, las enriquece con recursos de Microsoft Learn, y responde con Azure AI Foundry
5. Haz clic en cualquier chip de idea citada para verla en el Poligrama

---

## Agentes League — Requisitos cumplidos

- ✅ **Microsoft IQ Layer**: Azure AI Foundry (`gpt-4.1-mini`, eastus)
- ✅ **Voz**: Groq Whisper STT integrado en el chat
- ✅ **Agente con herramientas**: búsqueda Microsoft Learn como enrichment automático
- ✅ **Per-user DB**: cada usuario tiene su propio espacio de ideas en Neon Postgres
- ✅ **Deploy en Vercel**: [ideas-descontroladas.vercel.app](https://ideas-descontroladas.vercel.app)
