import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clusters, ideas } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// GET /api/ideas — devuelve ideas + clusters del usuario en sesión
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [userIdeas, userClusters] = await Promise.all([
    db.select().from(ideas).where(eq(ideas.userId, session.user.id)).orderBy(desc(ideas.createdAt)),
    db.select().from(clusters).where(eq(clusters.userId, session.user.id)),
  ]);

  return NextResponse.json({ ideas: userIdeas, clusters: userClusters });
}

// POST /api/ideas — crea una idea nueva
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const id = body.id ?? `idea-${Date.now()}`;

  await db.insert(ideas).values({
    id,
    userId: session.user.id,
    title: body.title,
    summary: body.summary,
    tags: body.tags ?? [],
    clusterId: body.clusterId ?? "inbox",
    source: body.source ?? "texto",
    status: body.status ?? "lista",
    viability: body.viability ?? null,
    complexity: body.complexity ?? null,
    research: body.research ?? null,
    isPublic: body.isPublic ?? false,
  });

  return NextResponse.json({ id });
}
