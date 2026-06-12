import { Cluster, Idea } from "./types";

export type GraphNode = {
  id: string;
  idea: Idea;
  color: string;
};

export type GraphLink = {
  source: string;
  target: string;
  weight: number;
  shared: string[];
};

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

const SIMILARITY_THRESHOLD = 0.4;

// Afinidad entre ideas: similitud de embeddings cuando ambas lo tienen,
// overlap de etiquetas como fallback (las seed no traen embedding).
export function buildGraphData(
  ideas: Idea[],
  clusters: Record<string, Cluster>
): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = ideas.map((idea) => ({
    id: idea.id,
    idea,
    color: clusters[idea.clusterId]?.color ?? clusters.inbox?.color ?? "#64748b",
  }));

  const links: GraphLink[] = [];
  for (let a = 0; a < ideas.length; a++) {
    for (let b = a + 1; b < ideas.length; b++) {
      const ia = ideas[a];
      const ib = ideas[b];
      const shared = ia.tags.filter((t) => ib.tags.includes(t));

      if (ia.embedding && ib.embedding) {
        const sim = cosine(ia.embedding, ib.embedding);
        if (sim > SIMILARITY_THRESHOLD || shared.length > 0) {
          const weight = Math.max(
            1,
            Math.min(4, Math.round((sim - SIMILARITY_THRESHOLD) * 10) + shared.length)
          );
          links.push({ source: ia.id, target: ib.id, weight, shared });
        }
      } else if (shared.length > 0) {
        links.push({ source: ia.id, target: ib.id, weight: shared.length, shared });
      }
    }
  }
  return { nodes, links };
}
