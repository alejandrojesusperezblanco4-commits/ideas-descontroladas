export type IdeaSource = "voz" | "texto";

export type IdeaStatus = "enriqueciendo" | "lista";

export type Idea = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  clusterId: string;
  createdAt: string;
  source: IdeaSource;
  status?: IdeaStatus;
  embedding?: number[];
  research?: string;
  viability?: number; // 0-100
  complexity?: "baja" | "media" | "alta";
};

export type Cluster = {
  name: string;
  color: string;
};

export type FunnelScore = {
  ideaId: string;
  scores: { criterion: string; score: number; reason: string }[];
};

export type FunnelResult = {
  rankings: FunnelScore[];
  recommendation: { ideaId: string; why: string };
};

export const DEFAULT_CRITERIA = [
  "Tamaño de mercado y disposición a pagar",
  "Viabilidad: ¿puedo construirlo yo con IA en semanas?",
  "Esfuerzo de venta: ¿qué tan difícil es conseguir los primeros clientes?",
];

// "inbox" = capturada pero aún sin clasificar por la IA.
// La IA puede crear clusters nuevos en runtime; estos son los de partida.
export const SEED_CLUSTERS: Record<string, Cluster> = {
  comercios: { name: "Automatización para comercios locales", color: "#22d3ee" },
  contenido: { name: "Máquina de contenido", color: "#a78bfa" },
  fisico: { name: "Productos físicos personalizados", color: "#fb923c" },
  inbox: { name: "Sin clasificar", color: "#64748b" },
};
